import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.env.FOX_ENV_FILE || path.join(__dirname, '../../.env'));

function parseLines(content) {
  const values = new Map();
  for (const line of String(content || '').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) {
      values.set(match[1], match[2]);
    }
  }
  return values;
}

function upsert(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.replace(/\s*$/, '')}\n${line}\n`;
}

let content = await fs.readFile(envPath, 'utf-8');
const existing = parseLines(content);
const productionValues = {
  NODE_ENV: 'production',
  PORT: '4000',
  API_BASE_URL: 'https://foxevo.mionix.pl',
  CORS_ORIGIN: 'https://foxevo.mionix.pl,http://localhost:5173,http://127.0.0.1:5173',
  GOOGLE_CALLBACK_URL: 'https://foxevo.mionix.pl/api/auth/oauth/google/callback',
  STEAM_REALM: 'https://foxevo.mionix.pl/',
  STEAM_RETURN_URL: 'https://foxevo.mionix.pl/api/auth/oauth/steam/callback',
  OAUTH_SUCCESS_REDIRECT: 'fox-evolution://oauth/callback',
  OAUTH_ALLOWED_REDIRECTS:
    'fox-evolution://oauth/callback,http://localhost:5173/oauth-success,http://127.0.0.1:5173/oauth-success',
  OAUTH_CODE_TTL_SECONDS: '180',
  TRUST_PROXY: '1',
  UPDATE_FILES_DIR: '/var/www/fox-evo/updates'
};

if (!existing.get('OAUTH_STATE_SECRET')) {
  productionValues.OAUTH_STATE_SECRET = crypto.randomBytes(48).toString('base64url');
}

for (const [key, value] of Object.entries(productionValues)) {
  content = upsert(content, key, value);
}

await fs.writeFile(envPath, content, { encoding: 'utf-8', mode: 0o640 });
console.log(`Production environment updated at ${envPath}`);
