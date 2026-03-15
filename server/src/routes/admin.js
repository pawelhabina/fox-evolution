import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAdminOverview, getSaveDetails, getTelemetryStats, getUserDetails, listUsers, recentAuditLogs, setUserFlag } from '../services/adminService.js';
import { adminUpdateSave, serializeSave } from '../services/saveService.js';
import { refreshLeaderboards } from '../services/leaderboardService.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/overview', async (_req, res) => {
  const overview = await getAdminOverview();
  return res.json(overview);
});

router.get('/users', async (req, res) => {
  const data = await listUsers({
    page: Number(req.query.page || 1),
    pageSize: Number(req.query.pageSize || 20),
    search: String(req.query.search || '')
  });
  return res.json(data);
});

router.get('/users/:userId', async (req, res) => {
  const user = await getUserDetails(req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND' });
  }
  return res.json(user);
});

router.patch('/users/:userId/flag', async (req, res) => {
  const schema = z.object({
    flagged: z.boolean(),
    reason: z.string().max(300).optional()
  });

  try {
    const parsed = schema.parse(req.body || {});
    await setUserFlag({
      adminUserId: req.principal.id,
      userId: req.params.userId,
      flagged: parsed.flagged,
      reason: parsed.reason
    });
    await refreshLeaderboards();
    return res.json({ ok: true });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'FLAG_UPDATE_FAILED' });
  }
});

router.get('/saves/:saveId', async (req, res) => {
  const save = await getSaveDetails(req.params.saveId);
  if (!save) {
    return res.status(404).json({ error: 'SAVE_NOT_FOUND' });
  }
  return res.json(save);
});

router.patch('/saves/:saveId', async (req, res) => {
  const schema = z.object({
    name: z.string().max(64).optional(),
    state: z.record(z.any()).optional()
  });

  try {
    const parsed = schema.parse(req.body || {});
    const updated = await adminUpdateSave({
      adminUserId: req.principal.id,
      saveId: req.params.saveId,
      name: parsed.name,
      state: parsed.state
    });
    await refreshLeaderboards();
    return res.json({ save: serializeSave(updated) });
  } catch (error) {
    if (error.message === 'SAVE_NOT_FOUND') {
      return res.status(404).json({ error: 'SAVE_NOT_FOUND' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'SAVE_UPDATE_FAILED' });
  }
});

router.get('/audit', async (req, res) => {
  const logs = await recentAuditLogs(Number(req.query.limit || 50));
  return res.json({ logs });
});

router.get('/stats/telemetry', async (req, res) => {
  const stats = await getTelemetryStats(Number(req.query.days || 30));
  return res.json(stats);
});

export default router;
