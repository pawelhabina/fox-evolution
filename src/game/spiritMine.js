export const SPIRIT_MINE_ELEMENTS = ['fire', 'electric', 'water'];
export const SPIRIT_MINE_MAX_FLOORS = 10;
export const SPIRIT_MINE_MAX_LEVEL = 100;

export const SPIRIT_MINE_CURRENCY_KEYS = {
  fire: 'fireCoins',
  electric: 'electricCoins',
  water: 'waterCoins'
};

export const SPIRIT_MINE_UNLOCKS = {
  electric: { currencyElement: 'fire', currencyKey: 'fireCoins', cost: 500 },
  water: { currencyElement: 'electric', currencyKey: 'electricCoins', cost: 1_500 }
};

const BASE_RATE = { fire: 0.42, electric: 0.52, water: 0.36 };

export function getMineRoomElement(room) {
  const safeRoom = Math.max(1, Math.floor(Number(room) || 1));
  return SPIRIT_MINE_ELEMENTS[(safeRoom - 1) % SPIRIT_MINE_ELEMENTS.length];
}

export function getMineWorkerCount(level) {
  const safeLevel = Math.max(1, Math.min(SPIRIT_MINE_MAX_LEVEL, Math.floor(Number(level) || 1)));
  if (safeLevel >= 100) return 5;
  if (safeLevel >= 50) return 4;
  if (safeLevel >= 25) return 3;
  if (safeLevel >= 10) return 2;
  return 1;
}

export function createMineFloor(floor = 1) {
  const safeFloor = Math.max(1, Math.min(SPIRIT_MINE_MAX_FLOORS, Math.floor(Number(floor) || 1)));
  return { id: safeFloor, floor: safeFloor, level: 1, chestStored: 0 };
}

export function createElementMine(element, unlocked = element === 'fire') {
  const safeElement = SPIRIT_MINE_ELEMENTS.includes(element) ? element : 'fire';
  return {
    id: safeElement,
    element: safeElement,
    unlocked: Boolean(unlocked),
    elevatorLevel: 1,
    warehouseLevel: 1,
    warehouseStored: 0,
    floors: [createMineFloor(1)]
  };
}

// Compatibility helper for old imports. A shaft is now a floor inside a mine.
export function createMineShaft(room = 1) {
  const floor = createMineFloor(room);
  return { ...floor, room: floor.floor, miners: getMineWorkerCount(floor.level), stored: floor.chestStored };
}

export function createSpiritMineState() {
  return {
    unlocked: false,
    totalCollected: 0,
    lastAdvancedAt: null,
    mines: SPIRIT_MINE_ELEMENTS.map((element) => createElementMine(element, element === 'fire'))
  };
}

export function getElementMine(spiritMine, element) {
  return spiritMine?.mines?.find((mine) => mine.element === element) || null;
}

export function getMineUnlock(element) {
  return SPIRIT_MINE_UNLOCKS[element] || null;
}

export function canUnlockElementMine(spiritMine, element) {
  const index = SPIRIT_MINE_ELEMENTS.indexOf(element);
  if (index <= 0) return false;
  const mine = getElementMine(spiritMine, element);
  const previous = getElementMine(spiritMine, SPIRIT_MINE_ELEMENTS[index - 1]);
  return Boolean(mine && !mine.unlocked && previous?.unlocked);
}

export function getMineFloorRate(floor, mine) {
  const level = Math.max(1, Number(floor?.level) || 1);
  const depth = Math.max(1, Number(floor?.floor || floor?.id) || 1);
  return (BASE_RATE[mine?.element] || 0.35)
    * level ** 1.34
    * getMineWorkerCount(level)
    * (1 + (depth - 1) * 0.22);
}

export function getMineFloorChestCapacity(floor) {
  const level = Math.max(1, Number(floor?.level) || 1);
  const depth = Math.max(1, Number(floor?.floor || floor?.id) || 1);
  return Math.floor(55 * 1.105 ** (level - 1) * (1 + (depth - 1) * 0.28));
}

export function getMineFloorUpgradeCost(floor) {
  const level = Math.max(1, Number(floor?.level) || 1);
  const depth = Math.max(1, Number(floor?.floor || floor?.id) || 1);
  return Math.floor(12 * 1.17 ** (level - 1) * (1 + (depth - 1) * 0.38));
}

export function getMineShaftRate(shaft, mine) {
  return getMineFloorRate({ ...shaft, floor: shaft?.floor || shaft?.room }, mine || { element: shaft?.element });
}

export function getMineShaftCapacity(shaft) {
  return getMineFloorChestCapacity({ ...shaft, floor: shaft?.floor || shaft?.room });
}

export function getMineShaftUpgradeCost(shaft) {
  return getMineFloorUpgradeCost({ ...shaft, floor: shaft?.floor || shaft?.room });
}

export function getMineMinerCost() {
  return Number.POSITIVE_INFINITY;
}

export function getMineElevatorLoad(level) {
  return Math.floor(35 * 1.16 ** Math.max(0, (Number(level) || 1) - 1));
}

export function getMineElevatorCycleSeconds(level) {
  return Math.max(1.35, 8.5 / (1 + Math.max(0, (Number(level) || 1) - 1) * 0.045));
}

export function getMineElevatorThroughput(level) {
  return getMineElevatorLoad(level) / getMineElevatorCycleSeconds(level);
}

export function getMineWarehouseCapacity(level) {
  return Math.floor(240 * 1.17 ** Math.max(0, (Number(level) || 1) - 1));
}

export function getMineFacilityCost(level, facility = 'elevator') {
  const base = facility === 'warehouse' ? 110 : 90;
  return Math.floor(base * 1.19 ** Math.max(0, (Number(level) || 1) - 1));
}

export function getMineNextFloor(mine) {
  const count = Math.min(SPIRIT_MINE_MAX_FLOORS, mine?.floors?.length || 0);
  if (count >= SPIRIT_MINE_MAX_FLOORS) return null;
  const floor = count + 1;
  return { ...createMineFloor(floor), cost: Math.floor(80 * 2.05 ** Math.max(0, floor - 2)) };
}

export function getMineNextRoom(mine) {
  return getMineNextFloor(mine);
}

function advanceElementMine(mine, elapsedSeconds) {
  if (!mine?.unlocked) return mine;
  const floors = mine.floors.map((floor) => ({
    ...floor,
    chestStored: Math.min(
      getMineFloorChestCapacity(floor),
      Math.max(0, Number(floor.chestStored) || 0) + getMineFloorRate(floor, mine) * elapsedSeconds
    )
  }));

  const warehouseCapacity = getMineWarehouseCapacity(mine.warehouseLevel);
  const warehouseStored = Math.min(warehouseCapacity, Math.max(0, Number(mine.warehouseStored) || 0));
  const freeWarehouseSpace = Math.max(0, warehouseCapacity - warehouseStored);
  const pendingTotal = floors.reduce((sum, floor) => sum + floor.chestStored, 0);
  const transportBudget = Math.min(
    pendingTotal,
    freeWarehouseSpace,
    getMineElevatorThroughput(mine.elevatorLevel) * elapsedSeconds
  );

  if (transportBudget <= 0 || pendingTotal <= 0) {
    return { ...mine, warehouseStored, floors };
  }

  let transported = 0;
  const transportedFloors = floors.map((floor, index) => {
    const share = index === floors.length - 1
      ? Math.min(floor.chestStored, Math.max(0, transportBudget - transported))
      : Math.min(floor.chestStored, transportBudget * floor.chestStored / pendingTotal);
    transported += share;
    return { ...floor, chestStored: Math.max(0, floor.chestStored - share) };
  });

  return {
    ...mine,
    warehouseStored: Math.min(warehouseCapacity, warehouseStored + transported),
    floors: transportedFloors
  };
}

export function advanceSpiritMine(spiritMine, elapsedSeconds, nowTs = Date.now()) {
  if (!spiritMine?.unlocked || elapsedSeconds <= 0) return spiritMine;
  const safeSeconds = Math.min(12 * 60 * 60, Math.max(0, Number(elapsedSeconds) || 0));
  return {
    ...spiritMine,
    lastAdvancedAt: new Date(nowTs).toISOString(),
    mines: spiritMine.mines.map((mine) => advanceElementMine(mine, safeSeconds))
  };
}

export function getMinePendingTotal(mine) {
  return (mine?.floors || []).reduce((sum, floor) => sum + Math.max(0, Number(floor.chestStored) || 0), 0);
}

export function getMineStoredByElement(spiritMine) {
  const totals = Object.fromEntries(SPIRIT_MINE_ELEMENTS.map((element) => [element, 0]));
  (spiritMine?.mines || []).forEach((mine) => {
    if (mine.unlocked && Object.hasOwn(totals, mine.element)) {
      totals[mine.element] = Math.max(0, Number(mine.warehouseStored) || 0);
    }
  });
  return totals;
}

export function getMineCollectableByElement(spiritMine) {
  return Object.fromEntries(
    Object.entries(getMineStoredByElement(spiritMine)).map(([element, amount]) => [element, Math.floor(amount)])
  );
}

export function getMineStoredTotal(spiritMine) {
  return Object.values(getMineCollectableByElement(spiritMine)).reduce((sum, amount) => sum + amount, 0);
}
