export const SPIRIT_MINE_ELEMENTS = ['fire', 'electric', 'water'];
export const SPIRIT_MINE_MAX_ROOMS = 10;

export const SPIRIT_MINE_CURRENCY_KEYS = {
  fire: 'fireCoins',
  electric: 'electricCoins',
  water: 'waterCoins'
};

const BASE_RATE = {
  fire: 0.16,
  electric: 0.2,
  water: 0.13
};

export function getMineRoomElement(room) {
  const safeRoom = Math.max(1, Math.floor(Number(room) || 1));
  return SPIRIT_MINE_ELEMENTS[(safeRoom - 1) % SPIRIT_MINE_ELEMENTS.length];
}

export function createMineShaft(room = 1) {
  const safeRoom = Math.max(1, Math.floor(Number(room) || 1));
  return {
    id: safeRoom,
    room: safeRoom,
    element: getMineRoomElement(safeRoom),
    level: 1,
    miners: 1,
    stored: 0
  };
}

export function createSpiritMineState() {
  return {
    unlocked: false,
    totalCollected: 0,
    lastAdvancedAt: null,
    elevatorLevel: 1,
    warehouseLevel: 1,
    shafts: [createMineShaft(1)]
  };
}

export function getMineShaftRate(shaft, mine) {
  const elevatorMultiplier = 1 + Math.max(0, (mine?.elevatorLevel || 1) - 1) * 0.18;
  const depthMultiplier = 1 + Math.max(0, (shaft?.room || 1) - 1) * 0.12;
  return (BASE_RATE[shaft.element] || 0.1) * shaft.level * shaft.miners * elevatorMultiplier * depthMultiplier;
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

export function getMineNextRoom(mine) {
  const unlockedRooms = Math.min(SPIRIT_MINE_MAX_ROOMS, mine?.shafts?.length || 0);
  if (unlockedRooms >= SPIRIT_MINE_MAX_ROOMS) {
    return null;
  }
  const room = unlockedRooms + 1;
  const previousElement = getMineRoomElement(Math.max(1, room - 1));
  return {
    ...createMineShaft(room),
    cost: Math.floor(20 * 1.55 ** Math.max(0, unlockedRooms - 1)),
    currencyElement: previousElement,
    currencyKey: SPIRIT_MINE_CURRENCY_KEYS[previousElement]
  };
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

export function getMineStoredByElement(mine) {
  const totals = Object.fromEntries(SPIRIT_MINE_ELEMENTS.map((element) => [element, 0]));
  (mine?.shafts || []).forEach((shaft) => {
    if (Object.hasOwn(totals, shaft.element)) {
      totals[shaft.element] += Math.max(0, Number(shaft.stored) || 0);
    }
  });
  return totals;
}

export function getMineCollectableByElement(mine) {
  return Object.fromEntries(
    Object.entries(getMineStoredByElement(mine)).map(([element, amount]) => [element, Math.floor(amount)])
  );
}

export function getMineStoredTotal(mine) {
  return Object.values(getMineCollectableByElement(mine)).reduce((sum, amount) => sum + amount, 0);
}
