import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  acceptFriendRequest,
  listFriends,
  removeFriendship,
  searchFriendCandidates,
  sendFriendRequest
} from '../services/friendService.js';

const router = express.Router();

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.principal.type !== 'USER') {
    return res.status(403).json({ error: 'USER_ACCOUNT_REQUIRED' });
  }
  return next();
});

router.get('/', async (req, res) => {
  try {
    return res.json(await listFriends(req.principal.id));
  } catch (_error) {
    return res.status(500).json({ error: 'FRIENDS_LIST_FAILED' });
  }
});

router.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 2 || query.length > 64) {
    return res.status(400).json({ error: 'INVALID_SEARCH_QUERY' });
  }
  try {
    return res.json({ users: await searchFriendCandidates(req.principal.id, query) });
  } catch (_error) {
    return res.status(500).json({ error: 'FRIEND_SEARCH_FAILED' });
  }
});

router.post('/requests', async (req, res) => {
  const schema = z.object({ targetUuid: z.string().uuid() });
  try {
    const parsed = schema.parse(req.body || {});
    const friendship = await sendFriendRequest(req.principal.id, parsed.targetUuid);
    return res.status(201).json({ friendship });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.flatten() });
    }
    const statusByError = {
      FRIEND_TARGET_NOT_FOUND: 404,
      FRIEND_SELF_NOT_ALLOWED: 400,
      FRIENDSHIP_ALREADY_EXISTS: 409
    };
    const status = statusByError[error.message] || 500;
    return res.status(status).json({ error: error.message || 'FRIEND_REQUEST_FAILED' });
  }
});

router.post('/requests/:friendshipId/accept', async (req, res) => {
  try {
    const friendship = await acceptFriendRequest(req.principal.id, String(req.params.friendshipId || ''));
    return res.json({ friendship });
  } catch (error) {
    const status = error.message === 'FRIEND_REQUEST_NOT_FOUND' ? 404 : 500;
    return res.status(status).json({ error: error.message || 'FRIEND_ACCEPT_FAILED' });
  }
});

router.delete('/:friendshipId', async (req, res) => {
  try {
    await removeFriendship(req.principal.id, String(req.params.friendshipId || ''));
    return res.status(204).send();
  } catch (error) {
    const status = error.message === 'FRIENDSHIP_NOT_FOUND' ? 404 : 500;
    return res.status(status).json({ error: error.message || 'FRIEND_REMOVE_FAILED' });
  }
});

export default router;
