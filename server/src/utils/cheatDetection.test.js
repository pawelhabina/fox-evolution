import assert from 'node:assert/strict';
import test from 'node:test';
import { detectCheatSignals } from './cheatDetection.js';

function state(rebirthTokens, meta = {}) {
  return {
    currencies: { coins: 0, gems: 0, rebirthTokens },
    foxes: [],
    stats: { lifetimeCoinsEarned: 0, highestTier: 0, daily: { maxTier: 1 } },
    meta
  };
}

test('one-time rebirth pricing refunds are not treated as illicit token gains', () => {
  const previous = state(10, { rebirthPricingRefundV128Applied: true });
  const migrated = state(100_000, {
    rebirthPricingRefundV128Applied: true,
    rebirthLinearPricingRefundV1214Applied: true
  });
  const regularJump = state(100_000, { rebirthPricingRefundV128Applied: true });

  assert.doesNotMatch(
    detectCheatSignals({ prevState: previous, nextState: migrated, elapsedSeconds: 10 }).reasons.join('; '),
    /Rebirth token increase/
  );
  assert.match(
    detectCheatSignals({ prevState: previous, nextState: regularJump, elapsedSeconds: 10 }).reasons.join('; '),
    /Rebirth token increase/
  );
});
