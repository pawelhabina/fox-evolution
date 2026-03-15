import { getPrincipalFromJwtPayload } from '../services/authService.js';
import { verifyAccessToken } from '../utils/jwt.js';

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

export async function optionalAuth(req, _res, next) {
  const token = readBearerToken(req);
  if (!token) {
    req.principal = null;
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.principal = await getPrincipalFromJwtPayload(payload);
  } catch (_error) {
    req.principal = null;
  }

  return next();
}

export async function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const payload = verifyAccessToken(token);
    const principal = await getPrincipalFromJwtPayload(payload);
    if (!principal) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
    req.principal = principal;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}
