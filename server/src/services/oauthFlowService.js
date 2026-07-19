import crypto from 'crypto';
import { env } from '../config/env.js';

const pendingGrants = new Map();

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', env.oauthStateSecret).update(value).digest('base64url');
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function canonicalRedirect(value) {
  try {
    const url = new URL(String(value || ''));
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (_error) {
    return null;
  }
}

function allowedRedirectSet() {
  return new Set(env.oauthAllowedRedirects.map(canonicalRedirect).filter(Boolean));
}

function normalizeCodeChallenge(value) {
  const challenge = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) {
    throw new Error('OAUTH_CODE_CHALLENGE_INVALID');
  }
  return challenge;
}

function cleanupExpiredGrants() {
  const now = Date.now();
  for (const [code, grant] of pendingGrants.entries()) {
    if (grant.expiresAt <= now) {
      pendingGrants.delete(code);
    }
  }
}

export function createOAuthState({ provider, redirect, codeChallenge }) {
  const normalizedRedirect = canonicalRedirect(redirect || env.oauthSuccessRedirect);
  if (!normalizedRedirect || !allowedRedirectSet().has(normalizedRedirect)) {
    throw new Error('OAUTH_REDIRECT_NOT_ALLOWED');
  }

  const payload = {
    provider: String(provider || '').trim().toLowerCase(),
    redirect: normalizedRedirect,
    codeChallenge: normalizeCodeChallenge(codeChallenge),
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString('base64url')
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function parseOAuthState(value, expectedProvider) {
  const [encoded, signature, ...rest] = String(value || '').split('.');
  if (!encoded || !signature || rest.length > 0 || !constantTimeEqual(signature, sign(encoded))) {
    throw new Error('OAUTH_STATE_INVALID');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
  } catch (_error) {
    throw new Error('OAUTH_STATE_INVALID');
  }

  const provider = String(expectedProvider || '').trim().toLowerCase();
  const redirect = canonicalRedirect(payload?.redirect);
  if (
    payload?.provider !== provider ||
    !redirect ||
    !allowedRedirectSet().has(redirect) ||
    Number(payload?.expiresAt) <= Date.now()
  ) {
    throw new Error('OAUTH_STATE_INVALID');
  }

  return {
    provider,
    redirect,
    codeChallenge: normalizeCodeChallenge(payload.codeChallenge)
  };
}

export function createOAuthGrant(session, flow) {
  cleanupExpiredGrants();
  const code = crypto.randomBytes(32).toString('base64url');
  pendingGrants.set(code, {
    session,
    codeChallenge: flow.codeChallenge,
    expiresAt: Date.now() + env.oauthCodeTtlSeconds * 1000
  });
  return code;
}

export function exchangeOAuthGrant(code, codeVerifier) {
  cleanupExpiredGrants();
  const normalizedCode = String(code || '').trim();
  const grant = pendingGrants.get(normalizedCode);
  pendingGrants.delete(normalizedCode);
  if (!grant || grant.expiresAt <= Date.now()) {
    throw new Error('OAUTH_CODE_INVALID');
  }

  const verifier = String(codeVerifier || '').trim();
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
    throw new Error('OAUTH_VERIFIER_INVALID');
  }
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  if (!constantTimeEqual(challenge, grant.codeChallenge)) {
    throw new Error('OAUTH_VERIFIER_INVALID');
  }

  return grant.session;
}
