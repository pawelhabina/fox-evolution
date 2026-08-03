import { clampInt, toSafeBigInt } from './json.js';

const MAX_TOP_TIER = 30;
const MAX_FOXES = 100;

export function summarizeState(state) {
  const coins = toSafeBigInt(state?.currencies?.coins, 0n);
  const gems = toSafeBigInt(state?.currencies?.gems, 0n);

  const foxMaxTier = Array.isArray(state?.foxes)
    ? state.foxes.reduce((maxTier, fox) => Math.max(maxTier, clampInt(fox?.tier, 1, MAX_TOP_TIER, 1)), 1)
    : 1;
  const statsTier = Math.max(
    clampInt(state?.stats?.daily?.maxTier, 1, MAX_TOP_TIER, 1),
    clampInt(state?.stats?.highestTier, 0, MAX_TOP_TIER, 0)
  );
  const topTier = Math.max(foxMaxTier, statsTier);

  return {
    coins,
    gems,
    topTier
  };
}

export function validateStateShape(state) {
  const issues = [];

  if (!state || typeof state !== 'object') {
    issues.push('State payload is missing or invalid');
    return { valid: false, issues };
  }

  if (!state.currencies || typeof state.currencies !== 'object') {
    issues.push('Missing currencies object');
  }

  if (Array.isArray(state.foxes) && state.foxes.length > MAX_FOXES) {
    issues.push(`Too many foxes: ${state.foxes.length} > ${MAX_FOXES}`);
  }

  if (Array.isArray(state.foxes)) {
    for (const fox of state.foxes) {
      const tier = clampInt(fox?.tier, 1, MAX_TOP_TIER, 1);
      if (tier !== Number(fox?.tier)) {
        issues.push('Fox tier out of bounds');
        break;
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
