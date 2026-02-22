import {
  ALL_FOX_TIERS,
  BASE_MAX_TIER,
  EVOLUTION_TYPES,
  MAX_TIER,
  TICK_SECONDS,
  TILE_SIZE,
  UPGRADE_DEFS
} from './constants';

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
  return Math.max(1, Math.floor(config.baseCost * config.growth ** safeLevel));
}

export function getBasePurchaseTier(state) {
  const level = state.upgrades.basePurchaseTier || 0;
  return clamp(1 + level, 1, BASE_MAX_TIER - 1);
}

export function getPassiveIncomeMultiplier(state) {
  const passiveLevel = state.upgrades.passiveIncome || 0;
  const rebirthTokens = state.currencies.rebirthTokens || 0;
  return (1 + passiveLevel * 0.12) * (1 + rebirthTokens * 0.025);
}

export function getClickMultiplier(state) {
  const clickLevel = state.upgrades.clickBonus || 0;
  return 1 + clickLevel * 0.15;
}

export function getBuyDiscountMultiplier(state) {
  const discountLevel = state.upgrades.buyDiscount || 0;
  const discount = clamp(discountLevel * 0.04, 0, 0.7);
  return 1 - discount;
}

export function getBuyFoxCost(state) {
  const purchaseCount = state.purchaseCount || 0;
  const baseCost = 25;
  const curve = Math.floor(baseCost * 1.17 ** purchaseCount);
  return Math.max(5, Math.floor(curve * getBuyDiscountMultiplier(state)));
}

export function getFoxIncomePerTick(fox, state) {
  const waterBuffMap = buildWaterBuffMap(state);
  return getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap);
}

function getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap) {
  const tierData = getTierData(fox.tier);
  const evolutionMultiplier = getEvolutionData(fox.evolution)?.incomeMultiplier || 1;
  const waterMultiplier = getWaterBuffMultiplier(fox.id, waterBuffMap);
  const value = tierData.baseIncomePerTick * getPassiveIncomeMultiplier(state) * evolutionMultiplier * waterMultiplier;
  return Math.max(1, Math.floor(value));
}

export function getFoxClickValue(fox, state) {
  const waterBuffMap = buildWaterBuffMap(state);
  return getFoxClickValueWithBuffs(fox, state, waterBuffMap);
}

function getFoxClickValueWithBuffs(fox, state, waterBuffMap) {
  const tierData = getTierData(fox.tier);
  const evolutionMultiplier = getEvolutionData(fox.evolution)?.clickMultiplier || 1;
  const waterMultiplier = getWaterBuffMultiplier(fox.id, waterBuffMap);
  const value = tierData.clickValue * getClickMultiplier(state) * evolutionMultiplier * waterMultiplier;
  return Math.max(1, Math.floor(value));
}

export function getFoxSellValue(fox, state) {
  const waterBuffMap = buildWaterBuffMap(state);
  return getFoxSellValueWithBuffs(fox, state, waterBuffMap);
}

function getFoxSellValueWithBuffs(fox, state, waterBuffMap) {
  const tierData = getTierData(fox.tier);
  const waterMultiplier = getWaterBuffMultiplier(fox.id, waterBuffMap);
  const value = tierData.sellValue * getPassiveIncomeMultiplier(state) * waterMultiplier;
  return Math.max(1, Math.floor(value));
}

export function getExpectedCoinsPerSecond(state) {
  const waterBuffMap = buildWaterBuffMap(state);
  const totalPerTick = state.foxes.reduce((sum, fox) => sum + getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap) * 0.99, 0);
  return totalPerTick / TICK_SECONDS;
}

export function buildWaterBuffMap(state) {
  const buffs = new Map();
  const waterFoxes = state.foxes.filter((fox) => fox.evolution === 'water');

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
      buffs.set(nearestTargetId, (buffs.get(nearestTargetId) || 0) + 1);
    }
  });

  return buffs;
}

function getWaterBuffMultiplier(foxId, waterBuffMap) {
  const stackCount = waterBuffMap.get(foxId) || 0;
  return 1.5 ** stackCount;
}

export function getFoxIncomePerTickCached(fox, state, waterBuffMap) {
  return getFoxIncomePerTickWithBuffs(fox, state, waterBuffMap);
}

export function getFoxClickValueCached(fox, state, waterBuffMap) {
  return getFoxClickValueWithBuffs(fox, state, waterBuffMap);
}

export function getFoxSellValueCached(fox, state, waterBuffMap) {
  return getFoxSellValueWithBuffs(fox, state, waterBuffMap);
}

export function gemsFromDrop(dropCounter, gemDropUpgradeLevel) {
  const nextCounter = dropCounter + 1;
  let gems = 1;
  const everyNthExtra = Math.max(10 - gemDropUpgradeLevel, 2);

  if (nextCounter % everyNthExtra === 0) {
    gems += 1;
  }
  if (gemDropUpgradeLevel >= 10 && nextCounter % 5 === 0) {
    gems += 1;
  }

  return {
    gems,
    nextCounter
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
  const megaCount = state.foxes.filter((fox) => fox.tier >= 15).length;
  if (megaCount <= 0) {
    return 0;
  }
  const lifetimeCoins = state.stats.lifetimeCoinsEarned || 0;
  const raw = megaCount + Math.sqrt(lifetimeCoins / 50000);
  return Math.max(1, Math.floor(raw));
}
