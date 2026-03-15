export function requireAdmin(req, res, next) {
  if (!req.principal || req.principal.type !== 'USER') {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }
  if (req.principal.role !== 'ADMIN') {
    return res.status(403).json({ error: 'ADMIN_REQUIRED' });
  }
  return next();
}
