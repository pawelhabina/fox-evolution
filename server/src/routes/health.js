import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ ok: true, service: 'fox-evolution-server', ts: new Date().toISOString() });
});

export default router;
