import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { deleteSaveForPrincipal, getSaveForPrincipal, listSavesForPrincipal, saveForPrincipal, serializeSave } from '../services/saveService.js';
import { refreshLeaderboards } from '../services/leaderboardService.js';

const router = express.Router();

const saveSchema = z.object({
  name: z.string().max(64).optional(),
  state: z.record(z.any())
});

router.use(requireAuth);

router.get('/saves', async (req, res) => {
  const saves = await listSavesForPrincipal(req.principal);
  return res.json({
    saves: saves.map(serializeSave)
  });
});

router.get('/saves/:slotId', async (req, res) => {
  const slotId = String(req.params.slotId || '').trim();
  const save = await getSaveForPrincipal(req.principal, slotId);
  if (!save) {
    return res.status(404).json({ error: 'SAVE_NOT_FOUND' });
  }

  return res.json({
    save: {
      ...serializeSave(save),
      state: save.state
    }
  });
});

router.put('/saves/:slotId', async (req, res) => {
  const slotId = String(req.params.slotId || '').trim();
  if (!slotId || slotId.length > 64) {
    return res.status(400).json({ error: 'INVALID_SLOT_ID' });
  }

  try {
    const parsed = saveSchema.parse(req.body || {});
    const result = await saveForPrincipal({
      principal: req.principal,
      slotId,
      name: parsed.name,
      state: parsed.state
    });

    await refreshLeaderboards();

    return res.json({
      save: serializeSave(result.save),
      flagged: result.flagged
    });
  } catch (error) {
    if (error.message === 'SAVE_LIMIT_REACHED') {
      return res.status(409).json({ error: 'SAVE_LIMIT_REACHED', maxSaves: 5 });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'SAVE_FAILED' });
  }
});

router.delete('/saves/:slotId', async (req, res) => {
  const slotId = String(req.params.slotId || '').trim();
  if (!slotId) {
    return res.status(400).json({ error: 'INVALID_SLOT_ID' });
  }

  const deleted = await deleteSaveForPrincipal(req.principal, slotId);
  if (!deleted) {
    return res.status(404).json({ error: 'SAVE_NOT_FOUND' });
  }

  await refreshLeaderboards();
  return res.status(204).send();
});

export default router;
