export const SPIRIT_MINE_ELEMENTS = ['fire', 'electric', 'water'];

const BASE_RATE = {
  fire: 0.16,
  electric: 0.2,
  water: 0.13
};

export function createSpiritMineState() {
  return {
    unlocked: false,
    totalCollected: 0,
    lastAdvancedAt: null,
    elevatorLevel: 1,
    warehouseLevel: 1,
    shafts: SPIRIT_MINE_ELEMENTS.map((element) => ({
      element,
      level: 1,
      miners: 1,
      stored: 0
    }))
  };
}

export function getMineShaftRate(shaft, mine) {
  const elevatorMultiplier = 1 + Math.max(0, (mine?.elevatorLevel || 1) - 1) * 0.18;
  return (BASE_RATE[shaft.element] || 0.1) * shaft.level * shaft.miners * elevatorMultiplier;
}

export function getMineShaftCapacity(shaft, mine) {
  const warehouseMultiplier = 1 + Math.max(0, (mine?.warehouseLevel || 1) - 1) * 0.5;
  return Math.floor((18 + shaft.level * 12 + shaft.miners * 5) * warehouseMultiplier);
}

export function getMineShaftUpgradeCost(shaft) {
  return Math.max(8, Math.floor(8 * 1.55 ** Math.max(0, shaft.level - 1)));
}

export function getMineMinerCost(shaft) {
  return Math.max(12, Math.floor(12 * 1.7 ** Math.max(0, shaft.miners - 1)));
}

export function getMineFacilityCost(level) {
  return Math.max(25, Math.floor(25 * 2 ** Math.max(0, level - 1)));
}

export function advanceSpiritMine(mine, elapsedSeconds, nowTs = Date.now()) {
  if (!mine?.unlocked || elapsedSeconds <= 0) {
    return mine;
  }

  const safeSeconds = Math.min(12 * 60 * 60, Math.max(0, Number(elapsedSeconds) || 0));
  return {
    ...mine,
    lastAdvancedAt: new Date(nowTs).toISOString(),
    shafts: mine.shafts.map((shaft) => ({
      ...shaft,
      stored: Math.min(
        getMineShaftCapacity(shaft, mine),
        Math.max(0, Number(shaft.stored) || 0) + getMineShaftRate(shaft, mine) * safeSeconds
      )
    }))
  };
}

export function getMineStoredTotal(mine) {
  return Math.floor((mine?.shafts || []).reduce((sum, shaft) => sum + (Number(shaft.stored) || 0), 0));
}
