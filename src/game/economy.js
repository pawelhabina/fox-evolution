import {
  ALL_FOX_TIERS,
  BASE_GEM_DROP_RATE,
  BASE_HIGHER_TIER_CHANCE,
  BASE_MAX_TIER,
  BASE_TICK_SECONDS,
  EVOLUTION_TYPES,
  MAX_FOXES_LIMIT,
  MAX_TIER,
  MIN_TICK_SECONDS_WITH_BOOST,
  MIN_TICK_SECONDS,
  MIN_FOXES_LIMIT,
  TEMP_BOOST_EFFECTS,
  TILE_SIZE,
  UPGRADE_DEFS
} from './constants';
import { getHydraLevel, getHydraPowerMultiplier } from './bossBattle';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampCurrency(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export function getTierData(tier) {
  const safeTier = clamp(Number(tier) || 1, 1, MAX_TIER);
  return ALL_FOX_TIERS[safeTier - 1];
}

export function getEvolutionData(evolutionId) {
  if (!evolutionId) {
    return null;
  }
  return EVOLUTION_TYPES[evolutionId] || null;
}

export function getUpgradeCost(upgradeId, level) {
  const config = UPGRADE_DEFS[upgradeId];
  if (!config) {
    return Infinity;
  }
  const safeLevel = Math.max(0, level);
  if (upgradeId === 'gemFoxLimit') {
    return config.flatCost;
  }
  if (upgradeId === 'gemIncomeMultiplier') {
    return 50 + safeLevel * 50;
  }
  return Math.max(1, Math.floor(config.baseCost * config.growth ** safeLevel));
}

export function getLegacyRebirthShopRefund(upgrades = {}) {
  const foxLimitLevel = clamp(Math.floor(Number(upgrades.foxLimit) || 0), 0, 45);
  const tickSpeedLevel = clamp(Math.floor(Number(upgrades.tickSpeed) || 0), 0, 40);
  let refund = 0;

  for (let level = 0; level < foxLimitLevel; level += 1) {
    refund += Math.max(1, Math.floor(1.35 ** level));
  }
  for (let level = 0; level < tickSpeedLevel; level += 1) {
    refund += level < 20 ? 5 + level * 5 : 110 + (level - 20) * 10;
  }

  return clampCurrency(refund);
}

export function getBasePurchaseTier(state) {
  const level = state.upgrades.basePurchaseTier || 0;
  return clamp(1 + level, 1, BASE_MAX_TIER - 1);
}

export function isTemporaryBoostActive(state, boostId, nowTs = Date.now()) {
  const untilTs = Number(state.temporaryBoosts?.[boostId]) || 0;
  return untilTs > nowTs;
}

export function getTemporaryBoostRemainingSeconds(state, boostId, nowTs = Date.now()) {
  const untilTs = Number(state.temporaryBoosts?.[boostId]) || 0;
  return Math.max(0, Math.ceil((untilTs - nowTs) / 1000));
}

export function getPassiveIncomeMultiplier(state, nowTs = Date.now()) {
  const passiveLevel = state.upgrades.passiveIncome || 0;
  const rebirthTokens = state.currencies.rebirthTokens || 0;
  const baseMultiplier = (1 + passiveLevel * 0.05) * (1 + rebirthTokens * 0.025) * getGemIncomeMultiplier(state);
  const tempMultiplier = isTemporaryBoostActive(state, 'passiveBurst', nowTs) ? TEMP_BOOST_EFFECTS.passiveBurstMultiplier : 1;
  return baseMultiplier * tempMultiplier;
}

export function getClickMultiplier(state, nowTs = Date.now()) {
  const clickLevel = state.upgrades.clickBonus || 0;
  const baseMultiplier = (1 + clickLevel * 0.02) * getGemIncomeMultiplier(state);
  const tempMultiplier = isTemporaryBoostActive(state, 'clickFrenzy', nowTs) ? TEMP_BOOST_EFFECTS.clickFrenzyMultiplier : 1;
  return baseMultiplier * tempMultiplier;
}

export function getBuyDiscountMultiplier(state, nowTs = Date.now()) {
  const discountLevel = state.upgrades.buyDiscount || 0;
  const discount = clamp(discountLevel * 0.02, 0, 0.7);
  const baseMultiplier = 1 - discount;
  const tempMultiplier = isTemporaryBoostActive(state, 'buyCoupon', nowTs) ? TEMP_BOOST_EFFECTS.buyCouponMultiplier : 1;
  return baseMultiplier * tempMultiplier;
}

export function getFoxLimit(state) {
  const coinLevel = state.upgrades.foxLimit || 0;
  const gemLevel = state.upgrades.gemFoxLimit || 0;
  return clamp(MIN_FOXES_LIMIT + coinLevel + gemLevel, MIN_FOXES_LIMIT, MAX_FOXES_LIMIT);
}

export function getGemIncomeMultiplier(state) {
  const level = state.upgrades.gemIncomeMultiplier || 0;
  return 1 + level * 0.1;
}

export function getTickDurationSeconds(state, nowTs = Date.now()) {
  const level = state.upgrades.tickSpeed || 0;
  const baseDuration = clamp(BASE_TICK_SECONDS - level * 0.1, MIN_TICK_SECONDS, BASE_TICK_SECONDS);
  const boostMultiplier = isTemporaryBoostActive(state, 'turboTick', nowTs) ? TEMP_BOOST_EFFECTS.turboTickMultiplier : 1;
  const minDuration = boostMultiplier < 1 ? MIN_TICK_SECONDS_WITH_BOOST : MIN_TICK_SECONDS;
  return clamp(baseDuration * boostMultiplier, minDuration, BASE_TICK_SECONDS);
}

export function getHigherTierChance(state) {
  const level = state.upgrades.purchaseTierChance || 0;
  return clamp(BASE_HIGHER_TIER_CHANCE + level * 0.01, BASE_HIGHER_TIER_CHANCE, 1);
}

export function getGemDropRate(state) {
  const level = state.upgrades.gemDropRate || 0;
  return clamp(BASE_GEM_DROP_RATE + level * 0.002, BASE_GEM_DROP_RATE, 0.25);
}

export function getBuyFoxCost(state, nowTs = Date.now()) {
  const purchaseCount = state.purchaseCount || 0;
  const baseCost = 25;
  const earlyPurchases = Math.min(purchaseCount, 60);
  const midPurchases = Math.min(Math.max(purchaseCount - 60, 0), 120);
  const latePurchases = Math.max(purchaseCount - 180, 0);
  const effectivePurchaseCount = earlyPurchases + midPurchases * 0.45 + latePurchases * 0.18;
  const curve = Math.floor(baseCost * 1.17 ** effectivePurchaseCount);
  return Math.max(5, Math.floor(curve * getBuyDiscountMultiplier(state, nowTs)));
}

export function getFoxIncomePerTick(fox, state, nowTs = Date.now()) {
  const waterBuffMap = buildWaterBuffMap(state);
  return getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap, nowTs);
}

function getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap, nowTs = Date.now()) {
  const tierData = getTierData(fox.tier);
  const hydraIncome = fox.kind === 'hydra'
    ? Object.values(fox.elementTiers || {}).reduce((sum, tier) => sum + getTierData(tier).baseIncomePerTick, 0)
    : null;
  const evolutionMultiplier = fox.kind === 'hydra'
    ? EVOLUTION_TYPES.electric.incomeMultiplier
    : getEvolutionData(fox.evolution)?.incomeMultiplier || 1;
  const waterMultiplier = getWaterBuffMultiplier(fox.id, waterBuffMap);
  const hydraMultiplier = fox.kind === 'hydra' ? getHydraPowerMultiplier(fox) : 1;
  const value = (hydraIncome || tierData.baseIncomePerTick) * hydraMultiplier * getPassiveIncomeMultiplier(state, nowTs) * evolutionMultiplier * waterMultiplier;
  return Math.max(1, Math.floor(value));
}

export function getFoxClickValue(fox, state, nowTs = Date.now()) {
  const waterBuffMap = buildWaterBuffMap(state);
  return getFoxClickValueWithBuffs(fox, state, waterBuffMap, nowTs);
}

function getFoxClickValueWithBuffs(fox, state, waterBuffMap, nowTs = Date.now()) {
  const tierData = getTierData(fox.tier);
  const hydraClick = fox.kind === 'hydra'
    ? Object.values(fox.elementTiers || {}).reduce((sum, tier) => sum + getTierData(tier).clickValue, 0)
    : null;
  const evolutionMultiplier = fox.kind === 'hydra'
    ? EVOLUTION_TYPES.fire.clickMultiplier
    : getEvolutionData(fox.evolution)?.clickMultiplier || 1;
  const waterMultiplier = getWaterBuffMultiplier(fox.id, waterBuffMap);
  const hydraMultiplier = fox.kind === 'hydra' ? getHydraPowerMultiplier(fox) : 1;
  const value = (hydraClick || tierData.clickValue) * hydraMultiplier * getClickMultiplier(state, nowTs) * evolutionMultiplier * waterMultiplier;
  return Math.max(1, Math.floor(value));
}

export function getFoxSellValue(fox, state, nowTs = Date.now()) {
  const waterBuffMap = buildWaterBuffMap(state);
  return getFoxSellValueWithBuffs(fox, state, waterBuffMap, nowTs);
}

function getFoxSellValueWithBuffs(fox, state, waterBuffMap, nowTs = Date.now()) {
  if (fox.kind === 'hydra') {
    return 0;
  }
  const tierData = getTierData(fox.tier);
  const waterMultiplier = getWaterBuffMultiplier(fox.id, waterBuffMap);
  const value = tierData.sellValue * getPassiveIncomeMultiplier(state, nowTs) * waterMultiplier;
  return Math.max(1, Math.floor(value));
}

export function getExpectedCoinsPerSecond(state, nowTs = Date.now()) {
  const waterBuffMap = buildWaterBuffMap(state);
  const dropRate = getGemDropRate(state);
  const totalPerTick = state.foxes.reduce((sum, fox) => sum + getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap, nowTs) * (1 - dropRate), 0);
  return totalPerTick / getTickDurationSeconds(state, nowTs);
}

export function buildWaterBuffMap(state) {
  const buffs = new Map();
  const waterFoxes = state.foxes.filter((fox) => fox.evolution === 'water' || fox.kind === 'hydra');

  waterFoxes.forEach((waterFox) => {
    let nearestTargetId = null;
    let nearestDistanceSq = Infinity;

    state.foxes.forEach((candidate) => {
      if (candidate.id === waterFox.id) {
        return;
      }

      const dx = candidate.x - waterFox.x;
      const dy = candidate.y - waterFox.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestTargetId = candidate.id;
      }
    });

    if (nearestTargetId !== null) {
      buffs.set(nearestTargetId, (buffs.get(nearestTargetId) || 0) + (waterFox.kind === 'hydra' ? getHydraLevel(waterFox) : 1));
    }
  });

  return buffs;
}

function getWaterBuffMultiplier(foxId, waterBuffMap) {
  const stackCount = waterBuffMap.get(foxId) || 0;
  return 1.5 ** stackCount;
}

export function getFoxIncomePerTickCached(fox, state, waterBuffMap, nowTs = Date.now()) {
  return getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap, nowTs);
}

export function getFoxClickValueCached(fox, state, waterBuffMap, nowTs = Date.now()) {
  return getFoxClickValueWithBuffs(fox, state, waterBuffMap, nowTs);
}

export function getFoxSellValueCached(fox, state, waterBuffMap, nowTs = Date.now()) {
  return getFoxSellValueWithBuffs(fox, state, waterBuffMap, nowTs);
}

export function gemsFromDrop(dropCounter, gemDropUpgradeLevel) {
  return {
    gems: 1,
    nextCounter: dropCounter + 1
  };
}

export function clampFoxPosition(x, y, arenaWidth, arenaHeight) {
  const maxX = Math.max(0, arenaWidth - TILE_SIZE);
  const maxY = Math.max(0, arenaHeight - TILE_SIZE);
  return {
    x: clamp(Math.round(x), 0, maxX),
    y: clamp(Math.round(y), 0, maxY)
  };
}

export function getSafeSpawnPosition(arena, offsetSeed = Math.random()) {
  const centerX = arena.width / 2 - TILE_SIZE / 2;
  const centerY = arena.height / 2 - TILE_SIZE / 2;
  const randomX = (offsetSeed * 2 - 1) * 90;
  const randomY = (Math.random() * 2 - 1) * 90;
  return clampFoxPosition(centerX + randomX, centerY + randomY, arena.width, arena.height);
}

export function getRebirthTokensEarned(state) {
  const points = state.foxes.reduce((sum, fox) => {
    if (fox.tier < 15) {
      return sum;
    }
    const tierPoints = 2 ** (fox.tier - 15);
    return sum + tierPoints;
  }, 0);

  return Math.max(0, Math.floor(points));
}
