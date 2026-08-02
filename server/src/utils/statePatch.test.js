import assert from 'node:assert/strict';
import test from 'node:test';
import { listStatePatchPaths, mergeStatePatch } from './statePatch.js';

test('state patch changes only supplied nested fields', () => {
  const current = {
    currencies: { coins: 100, gems: 5, rebirthTokens: 2 },
    upgrades: { clickBonus: 3, passiveIncome: 7 },
    foxes: [{ id: 1, tier: 4 }]
  };

  const merged = mergeStatePatch(current, {
    currencies: { coins: 250 },
    upgrades: { clickBonus: 4 }
  });

  assert.deepEqual(merged, {
    currencies: { coins: 250, gems: 5, rebirthTokens: 2 },
    upgrades: { clickBonus: 4, passiveIncome: 7 },
    foxes: [{ id: 1, tier: 4 }]
  });
  assert.deepEqual(current.currencies, { coins: 100, gems: 5, rebirthTokens: 2 });
});

test('state patch reports exact edited paths for audit logs', () => {
  assert.deepEqual(
    listStatePatchPaths({ currencies: { gems: 20 }, purchaseCount: 8 }),
    ['currencies.gems', 'purchaseCount']
  );
});
