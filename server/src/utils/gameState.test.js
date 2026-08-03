import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeState } from './gameState.js';

test('save summary preserves the lifetime highest tier after the board is reset', () => {
  const summary = summarizeState({
    currencies: { coins: 120, gems: 5 },
    foxes: [],
    stats: {
      highestTier: 22,
      daily: { maxTier: 1 }
    }
  });

  assert.equal(summary.topTier, 22);
});
