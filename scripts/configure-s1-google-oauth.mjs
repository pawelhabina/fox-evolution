import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';

const destination = 'admin-main@51.38.148.31';
const port = '2201';
const targetApi = '/var/www/fox-evo/api';
const keychainService = 'codex-server:ovh-s1';
const keychainAccount = 'admin-main';
const credentialsPath = process.argv[2];

if (!credentialsPath) {
  throw new Error('Usage: node scripts/configure-s1-google-oauth.mjs <credentials.json>');
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
if (
  !credentials.clientId?.endsWith('.apps.googleusercontent.com') ||
  !/^[A-Za-z0-9._-]+$/.test(credentials.clientId) ||
  !credentials.clientSecret ||
  !/^[A-Za-z0-9._-]+$/.test(credentials.clientSecret)
) {
  throw new Error('Invalid Google OAuth credentials file');
}

function captured(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`${name} exited with code ${result.status}`);
  }
  return result.stdout.trim();
}

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {
    env: options.env || process.env,
    input: options.input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  if (result.error || result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim();
    throw result.error || new Error(`${name} exited with code ${result.status}${details ? `: ${details}` : ''}`);
  }
  return result.stdout.trim();
}

const password = captured('/usr/bin/security', [
  'find-generic-password',
  '-s',
  keychainService,
  '-a',
  keychainAccount,
  '-w'
]);
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fox-evo-oauth-'));
const askpassPath = path.join(temporaryDir, 'askpass.sh');
fs.writeFileSync(
  askpassPath,
  `#!/bin/sh\nexec /usr/bin/security find-generic-password -s '${keychainService}' -a '${keychainAccount}' -w\n`,
  { mode: 0o700 }
);

const sshEnvironment = {
  ...process.env,
  DISPLAY: 'codex',
  SSH_ASKPASS: askpassPath,
  SSH_ASKPASS_REQUIRE: 'force'
};
const sshBase = ['-o', 'StrictHostKeyChecking=accept-new', '-p', port, destination];

function ssh(remoteCommand, input = '') {
  return command('ssh', [...sshBase, remoteCommand], { env: sshEnvironment, input });
}

function encodedNodeCommand(source, { module = false } = {}) {
  const encoded = Buffer.from(source).toString('base64');
  const moduleFlag = module ? ' --input-type=module' : '';
  return `node${moduleFlag} -e "eval(Buffer.from('${encoded}','base64').toString())"`;
}

try {
  const updateEnvironment = String.raw`
const fs = require('fs');
const envPath = '/var/www/fox-evo/api/.env';
const credentials = JSON.parse(fs.readFileSync(0, 'utf8'));
const required = {
  GOOGLE_CLIENT_ID: credentials.clientId,
  GOOGLE_CLIENT_SECRET: credentials.clientSecret,
  GOOGLE_CALLBACK_URL: 'https://foxevo.mionix.pl/api/auth/oauth/google/callback'
};
const existing = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const seen = new Set();
const next = existing.map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=/);
  if (!match || !(match[1] in required)) return line;
  seen.add(match[1]);
  return match[1] + '=' + required[match[1]];
});
for (const [key, value] of Object.entries(required)) {
  if (!seen.has(key)) next.push(key + '=' + value);
}
fs.writeFileSync(envPath, next.filter((line, index, lines) => line || index < lines.length - 1).join('\n') + '\n', { mode: 0o640 });
fs.chownSync(envPath, Number(process.env.SUDO_UID), Number(process.env.SUDO_GID));
`;

  ssh(
    `sudo -S -p '' ${encodedNodeCommand(updateEnvironment)}`,
    `${password}\n${JSON.stringify(credentials)}`
  );
  ssh(`sudo -S -p '' systemctl restart foxevo-api.service`, `${password}\n`);

  const verifyConfiguration = String.raw`
(async () => {
require('dotenv').config();

for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    const health = await fetch('http://127.0.0.1:4000/api/health');
    if (health.ok) break;
  } catch {}
  if (attempt === 29) throw new Error('API healthcheck timed out');
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: 'codex-intentionally-invalid-authorization-code',
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL
  })
});
const tokenResult = await tokenResponse.json();
if (tokenResult.error !== 'invalid_grant') {
  throw new Error('Google rejected OAuth client authentication: ' + (tokenResult.error || 'unexpected_response'));
}
console.log('health=ok');
console.log('google_client_auth=ok');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
`;
  const verification = ssh(
    `cd ${targetApi} && ${encodedNodeCommand(verifyConfiguration)}`
  );

  const startUrl =
    'https://foxevo.mionix.pl/api/auth/oauth/google/start' +
    '?redirect=fox-evolution%3A%2F%2Foauth%2Fcallback' +
    '&codeChallenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const startResponse = await fetch(startUrl, { redirect: 'manual' });
  const location = startResponse.headers.get('location');
  if (startResponse.status !== 302 || !location || new URL(location).hostname !== 'accounts.google.com') {
    throw new Error(`Unexpected Google OAuth start response: ${startResponse.status}`);
  }

  console.log(verification);
  console.log('google_oauth_redirect=ok');
  console.log('Google OAuth configuration on s1 verified.');
  fs.rmSync(credentialsPath, { force: true });
} finally {
  credentials.clientSecret = '';
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
