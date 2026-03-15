import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

const port = Number(process.env.PORT || 4000);
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
let apiOrigin = `http://localhost:${port}`;
try {
  apiOrigin = new URL(apiBaseUrl).origin;
} catch (_error) {
  apiOrigin = `http://localhost:${port}`;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  apiBaseUrl,
  corsOrigins: unique(parseCsv(process.env.CORS_ORIGIN || `http://localhost:5173,${apiOrigin}`)),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 30),
  deviceHashSalt: required('DEVICE_HASH_SALT', 'dev-device-salt'),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || 'Admin',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  steamApiKey: process.env.STEAM_API_KEY || '',
  steamRealm: process.env.STEAM_REALM || '',
  steamReturnUrl: process.env.STEAM_RETURN_URL || '',
  oauthSuccessRedirect: process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:5173/oauth-success'
};

export const isProduction = env.nodeEnv === 'production';
