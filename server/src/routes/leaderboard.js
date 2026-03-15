import express from 'express';
import { getLeaderboard, parseLeaderboardCategory } from '../services/leaderboardService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(optionalAuth);

router.get('/:category', async (req, res) => {
  const category = parseLeaderboardCategory(req.params.category);
  if (!category) {
    return res.status(400).json({ error: 'INVALID_CATEGORY', allowed: ['coins', 'gems', 'top_tier'] });
  }

  const data = await getLeaderboard({
    category,
    limit: Number(req.query.limit || 10),
    principal: req.principal
  });

  return res.json(data);
});

export default router;
