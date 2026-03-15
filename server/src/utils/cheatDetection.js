import { summarizeState, validateStateShape } from './gameState.js';
import { toSafeBigInt } from './json.js';

function bigintDelta(nextValue, prevValue) {
  return nextValue >= prevValue ? nextValue - prevValue : 0n;
}

export function detectCheatSignals({ prevState, nextState, elapsedSeconds }) {
  const reasons = [];
  let score = 0;

  const shape = validateStateShape(nextState);
  if (!shape.valid) {
    for (const issue of shape.issues) {
      reasons.push(issue);
    }
    score += 60;
  }

  const prevSummary = summarizeState(prevState || {});
  const nextSummary = summarizeState(nextState || {});
  const safeElapsed = Math.max(1, Number(elapsedSeconds || 1));

  const coinGain = bigintDelta(nextSummary.coins, prevSummary.coins);
  const gemGain = bigintDelta(nextSummary.gems, prevSummary.gems);
  const tierDelta = Math.max(0, Number(nextSummary.topTier) - Number(prevSummary.topTier));

  const previousLifetimeCoins = toSafeBigInt(prevState?.stats?.lifetimeCoinsEarned, 0n);
  const nextLifetimeCoins = toSafeBigInt(nextState?.stats?.lifetimeCoinsEarned, 0n);

  if (nextLifetimeCoins < previousLifetimeCoins) {
    reasons.push('lifetimeCoinsEarned went backwards');
    score += 25;
  }

  if (tierDelta > 4 && safeElapsed < 60) {
    reasons.push(`Top tier jumped by ${tierDelta} in ${safeElapsed}s`);
    score += 30;
  }

  if (coinGain > 0n) {
    const maxReasonableBurst = prevSummary.coins * 10n + 2_000_000_000n;
    if (coinGain > maxReasonableBurst && safeElapsed < 120) {
      reasons.push('Coin gain burst exceeds heuristic threshold');
      score += 25;
    }

    const lifetimeGain = bigintDelta(nextLifetimeCoins, previousLifetimeCoins);
    if (coinGain > lifetimeGain + 1_000_000n) {
      reasons.push('Wallet coin gain is inconsistent with lifetime coins gained');
      score += 20;
    }
  }

  if (gemGain > 5_000_000n && safeElapsed < 120) {
    reasons.push('Gem gain burst exceeds heuristic threshold');
    score += 20;
  }

  const rebirthDelta = Number(toSafeBigInt(nextState?.currencies?.rebirthTokens, 0n) - toSafeBigInt(prevState?.currencies?.rebirthTokens, 0n));
  if (rebirthDelta > 1000 && safeElapsed < 300) {
    reasons.push('Rebirth token increase too high for elapsed time');
    score += 20;
  }

  const shouldFlag = score >= 50;

  return {
    shouldFlag,
    score,
    reasons,
    summary: nextSummary
  };
}
