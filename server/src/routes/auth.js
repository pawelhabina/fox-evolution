import express from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { passport } from '../config/passport.js';
import { requireAuth } from '../middleware/auth.js';
import {
  linkDeviceToUser,
  loginDevice,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshToken
} from '../services/authService.js';
import { serializeUserPrincipal, updateUserNickname } from '../services/profileService.js';
import {
  createOAuthGrant,
  createOAuthState,
  exchangeOAuthGrant,
  parseOAuthState
} from '../services/oauthFlowService.js';

const router = express.Router();

function requestContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || ''
  };
}

function authPayload(session) {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    principal: session.principal
  };
}

function readCookie(req, name) {
  const prefix = `${name}=`;
  const entry = String(req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

function sendOauthSuccess(res, session, flow) {
  const url = new URL(flow.redirect);
  url.searchParams.set('code', createOAuthGrant(session, flow));
  return res.redirect(url.toString());
}

function parseStartFlow(req, provider) {
  return createOAuthState({
    provider,
    redirect: String(req.query.redirect || '').trim(),
    codeChallenge: String(req.query.codeChallenge || '').trim(),
    deviceId: String(req.query.deviceId || '').trim()
  });
}

router.post('/register', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N}_ -]+$/u),
    deviceId: z.string().min(8).max(255).optional(),
    migrateDeviceSaves: z.boolean().optional()
  });

  try {
    const parsed = schema.parse(req.body || {});
    const session = await registerUser({
      ...parsed,
      context: requestContext(req)
    });
    return res.status(201).json(authPayload(session));
  } catch (error) {
    if (error.message === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'EMAIL_TAKEN' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'REGISTER_FAILED' });
  }
});

router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    deviceId: z.string().min(8).max(255).optional(),
    migrateDeviceSaves: z.boolean().optional()
  });

  try {
    const parsed = schema.parse(req.body || {});
    const session = await loginUser({
      ...parsed,
      context: requestContext(req)
    });
    return res.json(authPayload(session));
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'LOGIN_FAILED' });
  }
});

router.post('/device', async (req, res) => {
  const schema = z.object({
    deviceId: z.string().min(8).max(255),
    label: z.string().max(64).optional()
  });

  try {
    const parsed = schema.parse(req.body || {});
    const session = await loginDevice({
      ...parsed,
      context: requestContext(req)
    });
    return res.json(authPayload(session));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'DEVICE_AUTH_FAILED' });
  }
});

router.post('/refresh', async (req, res) => {
  const schema = z.object({
    refreshToken: z.string().min(20)
  });

  try {
    const parsed = schema.parse(req.body || {});
    const session = await refreshSession({
      refreshToken: parsed.refreshToken,
      context: requestContext(req)
    });
    return res.json(authPayload(session));
  } catch (error) {
    if (error.message === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'REFRESH_FAILED' });
  }
});

router.post('/logout', async (req, res) => {
  const schema = z.object({
    refreshToken: z.string().min(20)
  });

  try {
    const parsed = schema.parse(req.body || {});
    await revokeRefreshToken(parsed.refreshToken);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'LOGOUT_FAILED' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ principal: req.principal });
});

router.patch('/profile/nickname', requireAuth, async (req, res) => {
  if (req.principal.type !== 'USER') {
    return res.status(403).json({ error: 'USER_ACCOUNT_REQUIRED' });
  }
  const schema = z.object({ nickname: z.string().trim().min(2).max(24) });
  try {
    const parsed = schema.parse(req.body || {});
    const user = await updateUserNickname(req.principal.id, parsed.nickname);
    return res.json({ principal: serializeUserPrincipal(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    if (error.message === 'NICKNAME_COOLDOWN') {
      return res.status(429).json({ error: 'NICKNAME_COOLDOWN', availableAt: error.availableAt });
    }
    if (['NICKNAME_LENGTH_INVALID', 'NICKNAME_CHARACTERS_INVALID'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'NICKNAME_UPDATE_FAILED' });
  }
});

router.post('/link-device', requireAuth, async (req, res) => {
  if (req.principal.type !== 'USER') {
    return res.status(403).json({ error: 'USER_ACCOUNT_REQUIRED' });
  }

  const schema = z.object({
    deviceId: z.string().min(8).max(255),
    migrateSaves: z.boolean().optional()
  });

  try {
    const parsed = schema.parse(req.body || {});
    const device = await linkDeviceToUser({
      userId: req.principal.id,
      deviceId: parsed.deviceId,
      migrateSaves: parsed.migrateSaves ?? true
    });
    if (!device) {
      return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
    }
    return res.json({ linked: true, deviceId: device.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'LINK_DEVICE_FAILED' });
  }
});

router.get('/oauth/google/start', (req, res, next) => {
  if (!passport._strategy('google')) {
    return res.status(503).json({ error: 'GOOGLE_OAUTH_NOT_CONFIGURED' });
  }

  let state;
  try {
    state = parseStartFlow(req, 'google');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state
  })(req, res, next);
});

router.get('/oauth/google/callback', (req, res, next) => {
  let flow;
  try {
    flow = parseOAuthState(req.query.state, 'google');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  passport.authenticate('google', { session: false }, async (err, session) => {
    if (err || !session) {
      return res.status(401).json({ error: 'GOOGLE_OAUTH_FAILED' });
    }
    try {
      if (flow.deviceId) {
        await linkDeviceToUser({ userId: session.principal.id, deviceId: flow.deviceId, migrateSaves: true });
      }
      return sendOauthSuccess(res, session, flow);
    } catch (_error) {
      return res.status(500).json({ error: 'GOOGLE_ACCOUNT_LINK_FAILED' });
    }
  })(req, res, next);
});

router.get('/oauth/steam/start', (req, res, next) => {
  if (!passport._strategy('steam')) {
    return res.status(503).json({ error: 'STEAM_OAUTH_NOT_CONFIGURED' });
  }

  let state;
  try {
    state = parseStartFlow(req, 'steam');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  res.cookie('fox_oauth_state', state, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth/oauth/steam'
  });
  return passport.authenticate('steam', { session: false })(req, res, next);
});

router.get('/oauth/steam/callback', (req, res, next) => {
  let flow;
  try {
    flow = parseOAuthState(readCookie(req, 'fox_oauth_state'), 'steam');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  res.clearCookie('fox_oauth_state', { path: '/api/auth/oauth/steam' });

  passport.authenticate('steam', { session: false }, async (err, session) => {
    if (err || !session) {
      return res.status(401).json({ error: 'STEAM_OAUTH_FAILED' });
    }
    try {
      if (flow.deviceId) {
        await linkDeviceToUser({ userId: session.principal.id, deviceId: flow.deviceId, migrateSaves: true });
      }
      return sendOauthSuccess(res, session, flow);
    } catch (_error) {
      return res.status(500).json({ error: 'STEAM_ACCOUNT_LINK_FAILED' });
    }
  })(req, res, next);
});

router.post('/oauth/exchange', (req, res) => {
  const schema = z.object({
    code: z.string().min(32).max(128),
    codeVerifier: z.string().min(43).max(128)
  });

  try {
    const parsed = schema.parse(req.body || {});
    return res.json(authPayload(exchangeOAuthGrant(parsed.code, parsed.codeVerifier)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(401).json({ error: error.message || 'OAUTH_EXCHANGE_FAILED' });
  }
});

export default router;
