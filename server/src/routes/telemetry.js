import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

const router = express.Router();

const eventSchema = z.object({
  eventType: z.string().min(1).max(64),
  payload: z.record(z.any()).optional(),
  ts: z.number().optional()
});

router.use(requireAuth);

router.post('/events', async (req, res) => {
  const schema = z.object({
    events: z.array(eventSchema).min(1).max(100)
  });

  try {
    const parsed = schema.parse(req.body || {});

    await prisma.telemetryEvent.createMany({
      data: parsed.events.map((event) => ({
        principalType: req.principal.type,
        userId: req.principal.type === 'USER' ? req.principal.id : null,
        deviceId: req.principal.type === 'DEVICE' ? req.principal.id : null,
        eventType: event.eventType,
        payload: event.payload || null,
        createdAt: Number.isFinite(event.ts) ? new Date(event.ts) : new Date()
      }))
    });

    return res.status(202).json({ ok: true, accepted: parsed.events.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    return res.status(500).json({ error: 'TELEMETRY_FAILED' });
  }
});

export default router;
