import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAdminOverview, getSaveDetails, getTelemetryStats, getUserDetails, listUsers, recentAuditLogs, resetUserPassword, setUserFlag } from '../services/adminService.js';
import { adminApplySavePreset, adminUpdateSave } from '../services/saveService.js';
import { refreshLeaderboards } from '../services/leaderboardService.js';
import { createAdminMessage, listAdminMessages } from '../services/messageService.js';
import { ADMIN_SAVE_PRESETS } from '../utils/adminSavePresets.js';

const router = express.Router();
const adminStateNumber = z.number().finite().int().min(0).max(Number.MAX_SAFE_INTEGER);
const adminLevel = (max) => z.number().finite().int().min(0).max(max);
const adminFoxPosition = z.number().finite().min(0).max(10000);
const foxEvolution = z.enum(['fire', 'electric', 'water']);
const adminNormalFoxSchema = z.object({
  id: z.number().finite().int().min(1).max(Number.MAX_SAFE_INTEGER),
  tier: z.number().finite().int().min(1).max(30),
  x: adminFoxPosition,
  y: adminFoxPosition,
  locked: z.boolean(),
  evolution: foxEvolution.nullable()
}).strict();
const adminHydraFoxSchema = z.object({
  id: z.number().finite().int().min(1).max(Number.MAX_SAFE_INTEGER),
  kind: z.literal('hydra'),
  tier: z.number().finite().int().min(20).max(30),
  hydraLevel: z.number().finite().int().min(1).max(5),
  x: adminFoxPosition,
  y: adminFoxPosition,
  locked: z.boolean(),
  evolution: z.null(),
  elementTiers: z.object({
    fire: z.number().finite().int().min(20).max(30),
    electric: z.number().finite().int().min(20).max(30),
    water: z.number().finite().int().min(20).max(30)
  }).strict()
}).strict();
const adminMineShaftSchema = z.object({
  id: z.number().finite().int().min(1).max(10),
  room: z.number().finite().int().min(1).max(10),
  element: foxEvolution,
  level: z.number().finite().int().min(1).max(100),
  miners: z.number().finite().int().min(1).max(25),
  stored: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER)
}).strict();
const adminBossTeamFoxSchema = z.object({
  evolution: foxEvolution,
  tier: z.number().finite().int().min(20).max(30)
}).strict();
const adminStatsPatchSchema = z.object({
  playTimeSeconds: adminStateNumber.optional(),
  lifetimeCoinsEarned: adminStateNumber.optional(),
  lifetimeCoinsSpent: adminStateNumber.optional(),
  lifetimeCoinsFromClicks: adminStateNumber.optional(),
  lifetimeCoinsFromPassive: adminStateNumber.optional(),
  lifetimeCoinsFromSales: adminStateNumber.optional(),
  lifetimeCoinsFromInstantCash: adminStateNumber.optional(),
  lifetimeGemsEarned: adminStateNumber.optional(),
  lifetimeGemsSpent: adminStateNumber.optional(),
  lifetimeGemsFromDrops: adminStateNumber.optional(),
  lifetimeGemsFromQuests: adminStateNumber.optional(),
  lifetimeGemsFromLoginRewards: adminStateNumber.optional(),
  lifetimeRebirthTokensEarned: adminStateNumber.optional(),
  lifetimeRebirthTokensSpent: adminStateNumber.optional(),
  lifetimeMerges: adminStateNumber.optional(),
  lifetimeClicks: adminStateNumber.optional(),
  lifetimeBuys: adminStateNumber.optional(),
  lifetimeSells: adminStateNumber.optional(),
  lifetimeRebirths: adminStateNumber.optional(),
  lifetimeGemDrops: adminStateNumber.optional(),
  lifetimeEvolutions: adminStateNumber.optional(),
  lifetimeBossVictories: adminStateNumber.optional(),
  lifetimeUpgradesBought: adminStateNumber.optional(),
  lifetimeTemporaryBoostsBought: adminStateNumber.optional(),
  lifetimeInstantCashBuys: adminStateNumber.optional(),
  lifetimeDailyQuestsClaimed: adminStateNumber.optional(),
  lifetimeWeeklyQuestsClaimed: adminStateNumber.optional(),
  lifetimeLoginRewardsClaimed: adminStateNumber.optional(),
  highestTier: adminLevel(30).optional(),
  highestBaseTier: adminLevel(15).optional(),
  highestElementalTier: adminLevel(30).optional()
}).strict();
const adminStatePatchSchema = z.object({
  currencies: z.object({
    coins: adminStateNumber.optional(),
    gems: adminStateNumber.optional(),
    rebirthTokens: adminStateNumber.optional(),
    essence: adminStateNumber.optional(),
    fireCoins: adminStateNumber.optional(),
    electricCoins: adminStateNumber.optional(),
    waterCoins: adminStateNumber.optional()
  }).strict().optional(),
  foxes: z.array(z.union([adminNormalFoxSchema, adminHydraFoxSchema])).max(100).optional(),
  purchaseCount: adminStateNumber.optional(),
  upgrades: z.object({
    basePurchaseTier: adminLevel(13).optional(),
    passiveIncome: adminLevel(60).optional(),
    buyDiscount: adminLevel(35).optional(),
    clickBonus: adminLevel(40).optional(),
    foxLimit: adminLevel(45).optional(),
    gemIncomeMultiplier: adminStateNumber.optional(),
    gemFoxLimit: adminLevel(50).optional(),
    tickSpeed: adminLevel(40).optional(),
    purchaseTierChance: adminLevel(95).optional(),
    gemDropRate: adminLevel(120).optional()
  }).strict().optional(),
  temporaryBoosts: z.object({
    turboTick: adminStateNumber.optional(),
    passiveBurst: adminStateNumber.optional(),
    clickFrenzy: adminStateNumber.optional(),
    buyCoupon: adminStateNumber.optional()
  }).strict().optional(),
  stats: adminStatsPatchSchema.optional(),
  bossBattle: z.object({
    status: z.enum(['idle', 'battle', 'victory', 'defeat']).optional(),
    defeated: z.boolean().optional(),
    bossHp: adminLevel(3400).optional(),
    teamHp: adminLevel(140).optional(),
    attacks: adminStateNumber.optional(),
    lastDamage: adminStateNumber.optional(),
    critical: z.boolean().optional(),
    combo: adminStateNumber.optional(),
    bestCombo: adminStateNumber.optional(),
    lastResult: z.enum(['success', 'miss']).nullable().optional(),
    teamFoxIds: z.array(adminStateNumber).max(3).optional(),
    teamSnapshot: z.array(adminBossTeamFoxSchema).max(3).optional(),
    cooldownUntil: z.string().max(40).nullable().optional(),
    lastDefeatAt: z.string().max(40).nullable().optional()
  }).strict().optional(),
  tutorials: z.object({ elementalFusionSeen: z.boolean().optional() }).strict().optional(),
  realms: z.object({
    spiritMine: z.object({
      unlocked: z.boolean().optional(),
      totalCollected: adminStateNumber.optional(),
      elevatorLevel: z.number().finite().int().min(1).max(100).optional(),
      warehouseLevel: z.number().finite().int().min(1).max(100).optional(),
      shafts: z.array(adminMineShaftSchema).min(1).max(10).optional()
    }).strict().optional()
  }).strict().optional(),
  meta: z.object({
    nextFoxId: z.number().finite().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
    gemDropCounter: adminStateNumber.optional()
  }).strict().optional()
}).strict().superRefine((patch, context) => {
  if (patch.foxes) {
    const ids = new Set();
    patch.foxes.forEach((fox, index) => {
      if (ids.has(fox.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['foxes', index, 'id'], message: 'Fox IDs must be unique' });
      }
      ids.add(fox.id);
    });
  }
  if (patch.realms?.spiritMine?.shafts) {
    patch.realms.spiritMine.shafts.forEach((shaft, index) => {
      if (shaft.id !== index + 1 || shaft.room !== index + 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['realms', 'spiritMine', 'shafts', index], message: 'Mine rooms must be sequential' });
      }
    });
  }
});

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

router.post('/saves/:saveId/preset', async (req, res) => {
  const schema = z.object({
    preset: z.enum(ADMIN_SAVE_PRESETS),
    expectedUpdatedAt: z.string().datetime()
  }).strict();

  try {
    const parsed = schema.parse(req.body || {});
    const updated = await adminApplySavePreset({
      adminUserId: req.principal.id,
      saveId: req.params.saveId,
      preset: parsed.preset,
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
    return res.status(500).json({ error: 'SAVE_PRESET_FAILED' });
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
