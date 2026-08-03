import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAdminOverview, getSaveDetails, getTelemetryStats, getUserDetails, listUsers, recentAuditLogs, resetUserPassword, setUserFlag } from '../services/adminService.js';
import { adminUpdateSave } from '../services/saveService.js';
import { refreshLeaderboards } from '../services/leaderboardService.js';
import { createAdminMessage, listAdminMessages } from '../services/messageService.js';

const router = express.Router();
const adminStateNumber = z.number().finite().int().nonnegative();
const adminStatePatchSchema = z.object({
  currencies: z.object({
    coins: adminStateNumber.optional(),
    gems: adminStateNumber.optional(),
    rebirthTokens: adminStateNumber.optional()
  }).strict().optional(),
  purchaseCount: adminStateNumber.optional(),
  upgrades: z.object({
    basePurchaseTier: adminStateNumber.optional(),
    passiveIncome: adminStateNumber.optional(),
    buyDiscount: adminStateNumber.optional(),
    clickBonus: adminStateNumber.optional(),
    foxLimit: adminStateNumber.optional(),
    gemIncomeMultiplier: adminStateNumber.optional(),
    gemFoxLimit: adminStateNumber.optional(),
    tickSpeed: adminStateNumber.optional()
  }).strict().optional(),
  stats: z.object({
    lifetimeCoinsEarned: adminStateNumber.optional(),
    lifetimeMerges: adminStateNumber.optional(),
    lifetimeClicks: adminStateNumber.optional(),
    lifetimeBuys: adminStateNumber.optional(),
    lifetimeRebirths: adminStateNumber.optional(),
    lifetimeGemDrops: adminStateNumber.optional()
  }).strict().optional()
}).strict();

router.use(requireAuth, requireAdmin);

router.get('/overview', async (_req, res) => {
  const overview = await getAdminOverview();
  return res.json(overview);
});

router.get('/users', async (req, res) => {
  const data = await listUsers({
    page: Number(req.query.page || 1),
    pageSize: Number(req.query.pageSize || 20),
    search: String(req.query.search || ''),
    filter: String(req.query.filter || 'all')
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

router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const result = await resetUserPassword({
      adminUserId: req.principal.id,
      userId: req.params.userId
    });
    res.set('Cache-Control', 'no-store');
    return res.json(result);
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    if (['CANNOT_RESET_OWN_PASSWORD', 'PASSWORD_LOGIN_UNAVAILABLE'].includes(error.message)) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'PASSWORD_RESET_FAILED' });
  }
});

router.get('/messages', async (req, res) => {
  return res.json({ messages: await listAdminMessages(Number(req.query.limit || 50)) });
});

router.post('/messages', async (req, res) => {
  const schema = z.object({
    audience: z.enum(['GLOBAL', 'USER']),
    userId: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(2000)
  }).refine((data) => data.audience !== 'USER' || Boolean(data.userId), {
    message: 'userId is required for USER audience',
    path: ['userId']
  });

  try {
    const parsed = schema.parse(req.body || {});
    const result = await createAdminMessage({
      adminUserId: req.principal.id,
      ...parsed
    });
    return res.status(201).json({ message: result.message, deliveryCount: result.deliveryCount });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'MESSAGE_SEND_FAILED' });
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
    name: z.string().trim().min(1).max(64).optional(),
    statePatch: adminStatePatchSchema.optional(),
    expectedUpdatedAt: z.string().datetime()
  }).refine((data) => data.name !== undefined || data.statePatch !== undefined, {
    message: 'At least one changed field is required'
  });

  try {
    const parsed = schema.parse(req.body || {});
    const updated = await adminUpdateSave({
      adminUserId: req.principal.id,
      saveId: req.params.saveId,
      name: parsed.name,
      statePatch: parsed.statePatch,
      expectedUpdatedAt: parsed.expectedUpdatedAt
    });
    await refreshLeaderboards();
    return res.json({ save: await getSaveDetails(updated.id) });
  } catch (error) {
    if (error.message === 'SAVE_NOT_FOUND') {
      return res.status(404).json({ error: 'SAVE_NOT_FOUND' });
    }
    if (error.message === 'SAVE_CONFLICT') {
      return res.status(409).json({
        error: 'SAVE_CONFLICT',
        current: await getSaveDetails(req.params.saveId)
      });
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
