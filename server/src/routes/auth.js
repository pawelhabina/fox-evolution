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

function parseRedirectState(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf-8'));
    return parsed?.redirect || null;
  } catch (_error) {
    return null;
  }
}

function sendOauthSuccess(res, session, redirect) {
  const target = redirect || env.oauthSuccessRedirect;
  const url = new URL(target);
  url.searchParams.set('accessToken', session.accessToken);
  url.searchParams.set('refreshToken', session.refreshToken);
  url.searchParams.set('principalType', session.principal.type);
  return res.redirect(url.toString());
}

router.post('/register', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2).max(32).optional(),
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

  const redirect = String(req.query.redirect || '').trim();
  const state = redirect ? Buffer.from(JSON.stringify({ redirect }), 'utf-8').toString('base64url') : undefined;

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state
  })(req, res, next);
});

router.get('/oauth/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, session) => {
    if (err || !session) {
      return res.status(401).json({ error: 'GOOGLE_OAUTH_FAILED' });
    }

    const redirect = parseRedirectState(req.query.state);
    return sendOauthSuccess(res, session, redirect);
  })(req, res, next);
});

router.get('/oauth/steam/start', (req, res, next) => {
  if (!passport._strategy('steam')) {
    return res.status(503).json({ error: 'STEAM_OAUTH_NOT_CONFIGURED' });
  }

  return passport.authenticate('steam', { session: false })(req, res, next);
});

router.get('/oauth/steam/callback', (req, res, next) => {
  passport.authenticate('steam', { session: false }, (err, session) => {
    if (err || !session) {
      return res.status(401).json({ error: 'STEAM_OAUTH_FAILED' });
    }
    return sendOauthSuccess(res, session, String(req.query.redirect || '').trim() || null);
  })(req, res, next);
});

export default router;
