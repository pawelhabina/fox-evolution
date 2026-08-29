const ELEMENTS = ['fire', 'electric', 'water'];
const MAX_MINE_FLOORS = 10;

export const ADMIN_SAVE_PRESETS = [
  'HYDRA_READY',
  'RICH_TEST',
  'MAX_GEM_SHOP',
  'MAX_REBIRTH_SHOP',
  'BOOSTS_30_MIN',
  'UNLOCK_SPIRIT_MINE',
  'MAX_SPIRIT_MINE'
];

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

function nextAvailableFoxId(state, foxes) {
  const highestFoxId = foxes.reduce((highest, fox) => Math.max(highest, safeInteger(fox?.id)), 0);
  return Math.max(1, safeInteger(state?.meta?.nextFoxId, 1), highestFoxId + 1);
}

function createMineFloor(floor, level = 1) {
  return { id: floor, floor, level, chestStored: 0 };
}

function createElementMine(element, unlocked = element === 'fire', maxed = false) {
  return {
    id: element,
    element,
    unlocked,
    elevatorLevel: maxed ? 100 : 1,
    warehouseLevel: maxed ? 100 : 1,
    warehouseStored: 0,
    floors: Array.from({ length: maxed ? MAX_MINE_FLOORS : 1 }, (_, index) => createMineFloor(index + 1, maxed ? 100 : 1))
  };
}

function buildHydraReadyPatch(state) {
  const foxes = Array.isArray(state?.foxes) ? state.foxes.map((fox) => ({
    ...fox,
    ...(fox?.elementTiers ? { elementTiers: { ...fox.elementTiers } } : {})
  })) : [];
  const usedIds = new Set();
  let nextId = nextAvailableFoxId(state, foxes);
  const arenaWidth = Math.max(600, Number(state?.arena?.width) || 900);
  const arenaHeight = Math.max(360, Number(state?.arena?.height) || 520);

  ELEMENTS.forEach((evolution, elementIndex) => {
    let candidateIndex = foxes
      .map((fox, index) => ({ fox, index }))
      .filter(({ fox }) => fox?.kind !== 'hydra' && fox?.evolution === evolution && !usedIds.has(fox.id))
      .sort((a, b) => Number(b.fox.tier || 1) - Number(a.fox.tier || 1))[0]?.index;

    if (candidateIndex === undefined) {
      candidateIndex = foxes
        .map((fox, index) => ({ fox, index }))
        .filter(({ fox }) => fox?.kind !== 'hydra' && !fox?.evolution && !usedIds.has(fox.id))
        .sort((a, b) => Number(b.fox.tier || 1) - Number(a.fox.tier || 1))[0]?.index;
    }

    if (candidateIndex === undefined) {
      foxes.push({
        id: nextId,
        tier: 20,
        x: Math.round(arenaWidth * (0.32 + elementIndex * 0.18)),
        y: Math.round(arenaHeight * 0.52),
        evolution
      });
      usedIds.add(nextId);
      nextId += 1;
      return;
    }

    const candidate = foxes[candidateIndex];
    foxes[candidateIndex] = {
      ...candidate,
      tier: Math.max(20, Number(candidate.tier) || 1),
      evolution
    };
    usedIds.add(candidate.id);
  });

  const highestTier = foxes.reduce((highest, fox) => Math.max(highest, Number(fox?.tier) || 1), 0);
  return {
    foxes,
    bossBattle: {
      status: 'idle',
      defeated: false,
      bossHp: 3400,
      teamHp: 140,
      attacks: 0,
      lastDamage: 0,
      critical: false,
      combo: 0,
      bestCombo: 0,
      lastResult: null,
      teamFoxIds: [],
      teamSnapshot: [],
      cooldownUntil: null,
      lastDefeatAt: null
    },
    tutorials: { elementalFusionSeen: true },
    stats: {
      highestTier: Math.max(20, safeInteger(state?.stats?.highestTier), highestTier),
      highestElementalTier: Math.max(20, safeInteger(state?.stats?.highestElementalTier))
    },
    meta: { nextFoxId: Math.max(nextId, nextAvailableFoxId(state, foxes)) }
  };
}

function buildSpiritMinePatch(state, maxed) {
  const currentMine = state?.realms?.spiritMine || {};
  const currentMines = Array.isArray(currentMine.mines) && currentMine.mines.length === 3
    ? currentMine.mines
    : ELEMENTS.map((element) => createElementMine(element, element === 'fire'));
  const mines = ELEMENTS.map((element, index) => {
    if (maxed) return createElementMine(element, true, true);
    const current = currentMines.find((mine) => mine?.element === element) || createElementMine(element, index === 0);
    const floors = Array.isArray(current.floors) && current.floors.length > 0 ? current.floors : [createMineFloor(1)];
    return {
      id: element,
      element,
      unlocked: index === 0 ? true : Boolean(current.unlocked && currentMines[index - 1]?.unlocked),
      elevatorLevel: Math.max(1, safeInteger(current.elevatorLevel, 1)),
      warehouseLevel: Math.max(1, safeInteger(current.warehouseLevel, 1)),
      warehouseStored: Math.max(0, Number(current.warehouseStored) || 0),
      floors: floors.slice(0, MAX_MINE_FLOORS).map((floor, floorIndex) => ({
        id: floorIndex + 1,
        floor: floorIndex + 1,
        level: Math.max(1, safeInteger(floor.level, 1)),
        chestStored: Math.max(0, Number(floor.chestStored) || 0)
      }))
    };
  });

  return {
    currencies: {
      essence: Math.max(safeInteger(state?.currencies?.essence), maxed ? 100000 : 1000),
      fireCoins: Math.max(safeInteger(state?.currencies?.fireCoins), maxed ? 100000 : 500),
      electricCoins: Math.max(safeInteger(state?.currencies?.electricCoins), maxed ? 100000 : 500),
      waterCoins: Math.max(safeInteger(state?.currencies?.waterCoins), maxed ? 100000 : 500)
    },
    realms: {
      spiritMine: {
        ...currentMine,
        unlocked: true,
        totalCollected: safeInteger(currentMine.totalCollected),
        lastAdvancedAt: currentMine.lastAdvancedAt || null,
        mines
      }
    }
  };
}

export function buildAdminSavePresetPatch(state, preset) {
  switch (preset) {
    case 'HYDRA_READY':
      return buildHydraReadyPatch(state);
    case 'RICH_TEST':
      return {
        currencies: {
          coins: 1_000_000_000_000,
          gems: 100_000,
          rebirthTokens: 100_000,
          essence: 100_000,
          fireCoins: 100_000,
          electricCoins: 100_000,
          waterCoins: 100_000
        }
      };
    case 'MAX_GEM_SHOP':
      return { upgrades: { gemIncomeMultiplier: 100, gemFoxLimit: 50 } };
    case 'MAX_REBIRTH_SHOP':
      return { upgrades: { foxLimit: 45, tickSpeed: 40, purchaseTierChance: 95, gemDropRate: 120 } };
    case 'BOOSTS_30_MIN':
      return { temporaryBoosts: { turboTick: 1800, passiveBurst: 1800, clickFrenzy: 1800, buyCoupon: 1800 } };
    case 'UNLOCK_SPIRIT_MINE':
      return buildSpiritMinePatch(state, false);
    case 'MAX_SPIRIT_MINE':
      return buildSpiritMinePatch(state, true);
    default:
      throw new Error('UNKNOWN_ADMIN_SAVE_PRESET');
  }
}
