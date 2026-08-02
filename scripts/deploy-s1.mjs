import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = 'admin-main@51.38.148.31';
const port = '2201';
const targetApi = '/var/www/fox-evo/api';
const targetUpdates = '/var/www/fox-evo/updates';
const keychainService = 'codex-server:ovh-s1';
const keychainAccount = 'admin-main';

if (targetApi !== '/var/www/fox-evo/api' || targetUpdates !== '/var/www/fox-evo/updates') {
  throw new Error('Unexpected deployment target');
}

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {
    cwd: projectRoot,
    env: options.env || process.env,
    input: options.input,
    stdio: options.input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit']
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${name} exited with code ${result.status}`);
  }
}

function captured(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf-8' });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`${name} exited with code ${result.status}`);
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
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fox-evo-deploy-'));
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

function sshScript(script, { sudo = false } = {}) {
  const remoteCommand = sudo ? 'sudo -S -p "" bash -se' : 'bash -se';
  const input = sudo ? `${password}\n${script}` : script;
  command('ssh', [...sshBase, remoteCommand], { env: sshEnvironment, input });
}

try {
  sshScript(
    `set -eu
install -d -o admin-main -g admin-main /var/www/fox-evo ${targetApi}
install -d -o admin-main -g www-data -m 775 ${targetUpdates}
if [ ! -f ${targetApi}/.env ] && [ -f /opt/fox-evolution/server/.env ]; then
  install -o admin-main -g www-data -m 640 /opt/fox-evolution/server/.env ${targetApi}/.env
fi
# The legacy directory is a one-time migration source. Re-importing it on every
# deployment wastes the small production disk and can prevent a new release.
if [ -d /var/www/foxevo/updates ] && [ ! -f ${targetUpdates}/latest.yml ] && [ ! -f ${targetUpdates}/latest-mac.yml ]; then
  for artifact in /var/www/foxevo/updates/*.exe /var/www/foxevo/updates/*.exe.blockmap /var/www/foxevo/updates/*.zip /var/www/foxevo/updates/*.zip.blockmap /var/www/foxevo/updates/*.dmg /var/www/foxevo/updates/*.dmg.blockmap /var/www/foxevo/updates/latest.yml /var/www/foxevo/updates/latest-mac.yml; do
    [ -f "$artifact" ] || continue
    cp -n "$artifact" ${targetUpdates}/
  done
  chown admin-main:www-data ${targetUpdates}/* 2>/dev/null || true
fi
`,
    { sudo: true }
  );

  command(
    'rsync',
    [
      '-az',
      '--delete',
      '--exclude=.env',
      '--exclude=node_modules',
      '--exclude=updates',
      '-e',
      `ssh -o StrictHostKeyChecking=accept-new -p ${port}`,
      `${path.join(projectRoot, 'server')}/`,
      `${destination}:${targetApi}/`
    ],
    { env: sshEnvironment }
  );

  sshScript(`set -eu
cd ${targetApi}
npm ci
npm run prisma:generate
node src/scripts/configureProductionEnv.js
npx prisma db push
`);

  const serviceBase64 = fs.readFileSync(path.join(projectRoot, 'deploy/s1/foxevo-api.service')).toString('base64');
  const nginxBase64 = fs.readFileSync(path.join(projectRoot, 'deploy/s1/foxevo.mionix.pl.nginx')).toString('base64');
  sshScript(
    `set -eu
printf '%s' '${serviceBase64}' | base64 -d > /etc/systemd/system/foxevo-api.service
printf '%s' '${nginxBase64}' | base64 -d > /etc/nginx/sites-available/foxevo.mionix.pl
ln -sfn /etc/nginx/sites-available/foxevo.mionix.pl /etc/nginx/sites-enabled/foxevo.mionix.pl
chown -R admin-main:www-data ${targetApi}
chmod 750 ${targetApi}
chmod 640 ${targetApi}/.env
chown -R admin-main:www-data ${targetUpdates}
chmod 775 ${targetUpdates}
systemctl daemon-reload
nginx -t
systemctl enable foxevo-api.service
systemctl restart foxevo-api.service
systemctl reload nginx
`,
    { sudo: true }
  );

  const localUpdates = path.join(projectRoot, 'server/updates');
  const updateFilePattern = /^(?:latest.*\.yml|.*\.(?:exe|zip|dmg)(?:\.blockmap)?)$/i;
  if (fs.existsSync(localUpdates) && fs.readdirSync(localUpdates).some((name) => updateFilePattern.test(name))) {
    command(
      'rsync',
      [
        '-az',
        '--include=*.exe',
        '--include=*.exe.blockmap',
        '--include=*.zip',
        '--include=*.zip.blockmap',
        '--include=*.dmg',
        '--include=*.dmg.blockmap',
        '--include=latest.yml',
        '--include=latest-mac.yml',
        '--exclude=*',
        '-e',
        `ssh -o StrictHostKeyChecking=accept-new -p ${port}`,
        `${localUpdates}/`,
        `${destination}:${targetUpdates}/`
      ],
      { env: sshEnvironment }
    );
    sshScript(`chown -R admin-main:www-data ${targetUpdates}\nchmod 775 ${targetUpdates}`, { sudo: true });
  }

  sshScript(`set -eu
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:4000/api/health
printf '\n'
curl -fsSI http://127.0.0.1:4000/download/windows | head -n 10
systemctl is-active foxevo-api.service
`);
  console.log('Deployment to s1 completed.');
} finally {
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
