import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPendingPlayerMessage, markPlayerMessageRead } from '../services/messageService.js';

const router = express.Router();

router.use(requireAuth);

router.get('/pending', async (req, res) => {
  if (req.principal.type !== 'USER') {
    return res.json({ message: null });
  }
  return res.json({ message: await getPendingPlayerMessage(req.principal) });
});

router.post('/:deliveryId/read', async (req, res) => {
  if (req.principal.type !== 'USER') {
    return res.status(403).json({ error: 'USER_ACCOUNT_REQUIRED' });
  }
  const read = await markPlayerMessageRead(req.principal, String(req.params.deliveryId || ''));
  if (!read) {
    return res.status(404).json({ error: 'MESSAGE_DELIVERY_NOT_FOUND' });
  }
  return res.json({ read: true });
});

export default router;
