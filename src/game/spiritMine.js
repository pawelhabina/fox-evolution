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
const ELEVATOR_IDLE_CHECK_SECONDS = 0.75;
const ELEVATOR_PHASES = new Set(['idle', 'travel-down', 'loading', 'travel-up', 'unloading', 'warehouse-full']);

export function createMineElevatorState() {
  return {
    phase: 'idle',
    floorId: 0,
    cargo: 0,
    elapsed: 0,
    duration: ELEVATOR_IDLE_CHECK_SECONDS,
    transferAmount: 0
  };
}

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
    elevator: createMineElevatorState(),
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

export function getMineElevatorTravelSeconds(level, floor = 1) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const safeFloor = Math.max(1, Number(floor) || 1);
  const speedMultiplier = 1 + (safeLevel - 1) * 0.045;
  return Math.max(0.45, (1.55 + safeFloor * 0.24) / speedMultiplier);
}

export function getMineElevatorLoadSeconds(level, amount, capacity = getMineElevatorLoad(level)) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const safeCapacity = Math.max(1, Number(capacity) || 1);
  const fillRatio = Math.max(0, Math.min(1, (Number(amount) || 0) / safeCapacity));
  const fullLoadSeconds = Math.max(0.8, 4.4 / (1 + (safeLevel - 1) * 0.035));
  return Math.max(0.35, fullLoadSeconds * (0.16 + fillRatio * 0.84));
}

export function getMineElevatorUnloadSeconds(level, amount, capacity = getMineElevatorLoad(level)) {
  return Math.max(0.3, getMineElevatorLoadSeconds(level, amount, capacity) * 0.72);
}

export function getMineElevatorCycleSeconds(level) {
  const capacity = getMineElevatorLoad(level);
  return getMineElevatorTravelSeconds(level, 1) * 2
    + getMineElevatorLoadSeconds(level, capacity, capacity)
    + getMineElevatorUnloadSeconds(level, capacity, capacity);
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

function normalizeElevatorState(mine) {
  const fallback = createMineElevatorState();
  const raw = mine?.elevator || fallback;
  const capacity = getMineElevatorLoad(mine?.elevatorLevel);
  const floorIds = new Set((mine?.floors || []).map((floor) => floor.id));
  const phase = ELEVATOR_PHASES.has(raw.phase) ? raw.phase : fallback.phase;
  const floorId = floorIds.has(Number(raw.floorId)) ? Number(raw.floorId) : 0;
  const duration = Math.max(0.05, Number(raw.duration) || fallback.duration);
  return {
    phase,
    floorId,
    cargo: Math.min(capacity, Math.max(0, Number(raw.cargo) || 0)),
    elapsed: Math.min(duration, Math.max(0, Number(raw.elapsed) || 0)),
    duration,
    transferAmount: Math.max(0, Number(raw.transferAmount) || 0)
  };
}

function produceOnFloors(floors, mine, seconds) {
  if (seconds <= 0) return floors;
  return floors.map((floor) => ({
    ...floor,
    chestStored: Math.min(
      getMineFloorChestCapacity(floor),
      Math.max(0, Number(floor.chestStored) || 0) + getMineFloorRate(floor, mine) * seconds
    )
  }));
}

function selectElevatorFloor(floors) {
  return floors
    .filter((floor) => floor.chestStored > 0.001)
    .sort((a, b) => b.chestStored - a.chestStored || b.floor - a.floor)[0] || null;
}

function nextElevatorPhase(elevator, floors, mine, warehouseStored) {
  const capacity = getMineElevatorLoad(mine.elevatorLevel);
  const warehouseCapacity = getMineWarehouseCapacity(mine.warehouseLevel);
  const selectedFloor = floors.find((floor) => floor.id === elevator.floorId);

  if (elevator.phase === 'idle') {
    if (elevator.cargo > 0) {
      const freeSpace = Math.max(0, warehouseCapacity - warehouseStored);
      const amount = Math.min(elevator.cargo, freeSpace);
      return amount > 0
        ? { ...elevator, phase: 'unloading', floorId: 0, elapsed: 0, duration: getMineElevatorUnloadSeconds(mine.elevatorLevel, amount, capacity), transferAmount: amount }
        : { ...elevator, phase: 'warehouse-full', floorId: 0, elapsed: 0, duration: ELEVATOR_IDLE_CHECK_SECONDS, transferAmount: 0 };
    }
    const target = selectElevatorFloor(floors);
    return target
      ? { ...elevator, phase: 'travel-down', floorId: target.id, elapsed: 0, duration: getMineElevatorTravelSeconds(mine.elevatorLevel, target.floor), transferAmount: 0 }
      : { ...elevator, elapsed: 0, duration: ELEVATOR_IDLE_CHECK_SECONDS, transferAmount: 0 };
  }

  if (elevator.phase === 'travel-down') {
    const amount = Math.min(Math.max(0, capacity - elevator.cargo), Math.max(0, selectedFloor?.chestStored || 0));
    return amount > 0
      ? { ...elevator, phase: 'loading', elapsed: 0, duration: getMineElevatorLoadSeconds(mine.elevatorLevel, amount, capacity), transferAmount: amount }
      : { ...elevator, phase: 'travel-up', elapsed: 0, duration: getMineElevatorTravelSeconds(mine.elevatorLevel, selectedFloor?.floor || 1), transferAmount: 0 };
  }

  if (elevator.phase === 'loading') {
    const amount = Math.min(elevator.transferAmount, Math.max(0, selectedFloor?.chestStored || 0), Math.max(0, capacity - elevator.cargo));
    if (amount > 0 && selectedFloor) {
      selectedFloor.chestStored = Math.max(0, selectedFloor.chestStored - amount);
    }
    return {
      ...elevator,
      phase: 'travel-up',
      cargo: Math.min(capacity, elevator.cargo + amount),
      elapsed: 0,
      duration: getMineElevatorTravelSeconds(mine.elevatorLevel, selectedFloor?.floor || 1),
      transferAmount: 0
    };
  }

  if (elevator.phase === 'travel-up') {
    const freeSpace = Math.max(0, warehouseCapacity - warehouseStored);
    const amount = Math.min(elevator.cargo, freeSpace);
    return amount > 0
      ? { ...elevator, phase: 'unloading', floorId: 0, elapsed: 0, duration: getMineElevatorUnloadSeconds(mine.elevatorLevel, amount, capacity), transferAmount: amount }
      : { ...elevator, phase: 'warehouse-full', floorId: 0, elapsed: 0, duration: ELEVATOR_IDLE_CHECK_SECONDS, transferAmount: 0 };
  }

  if (elevator.phase === 'unloading') {
    const amount = Math.min(elevator.transferAmount, elevator.cargo, Math.max(0, warehouseCapacity - warehouseStored));
    return {
      elevator: {
        ...elevator,
        phase: elevator.cargo - amount > 0.001 ? 'warehouse-full' : 'idle',
        floorId: 0,
        cargo: Math.max(0, elevator.cargo - amount),
        elapsed: 0,
        duration: ELEVATOR_IDLE_CHECK_SECONDS,
        transferAmount: 0
      },
      warehouseStored: warehouseStored + amount
    };
  }

  if (elevator.phase === 'warehouse-full') {
    if (elevator.cargo <= 0.001) {
      return { ...elevator, phase: 'idle', cargo: 0, elapsed: 0, duration: ELEVATOR_IDLE_CHECK_SECONDS, transferAmount: 0 };
    }
    const freeSpace = Math.max(0, warehouseCapacity - warehouseStored);
    const amount = Math.min(elevator.cargo, freeSpace);
    return amount > 0
      ? { ...elevator, phase: 'unloading', elapsed: 0, duration: getMineElevatorUnloadSeconds(mine.elevatorLevel, amount, capacity), transferAmount: amount }
      : { ...elevator, elapsed: 0, duration: ELEVATOR_IDLE_CHECK_SECONDS, transferAmount: 0 };
  }

  return createMineElevatorState();
}

function advanceElementMine(mine, elapsedSeconds) {
  if (!mine?.unlocked) return mine;
  let floors = mine.floors.map((floor) => ({ ...floor }));
  let elevator = normalizeElevatorState(mine);
  const warehouseCapacity = getMineWarehouseCapacity(mine.warehouseLevel);
  let warehouseStored = Math.min(warehouseCapacity, Math.max(0, Number(mine.warehouseStored) || 0));
  let remaining = Math.max(0, elapsedSeconds);
  let transitions = 0;

  while (remaining > 0.0001 && transitions < 20_000) {
    if (elevator.phase === 'warehouse-full' && warehouseStored >= warehouseCapacity - 0.001) {
      floors = produceOnFloors(floors, mine, remaining);
      elevator = { ...elevator, elapsed: (elevator.elapsed + remaining) % elevator.duration };
      remaining = 0;
      break;
    }

    const phaseRemaining = Math.max(0.0001, elevator.duration - elevator.elapsed);
    const step = Math.min(remaining, phaseRemaining);
    floors = produceOnFloors(floors, mine, step);
    elevator = { ...elevator, elapsed: elevator.elapsed + step };
    remaining -= step;

    if (elevator.elapsed + 0.0001 < elevator.duration) continue;
    const transition = nextElevatorPhase(elevator, floors, mine, warehouseStored);
    if (transition?.elevator) {
      elevator = transition.elevator;
      warehouseStored = Math.min(warehouseCapacity, transition.warehouseStored);
    } else {
      elevator = transition;
    }
    transitions += 1;
  }

  if (remaining > 0) floors = produceOnFloors(floors, mine, remaining);
  return { ...mine, warehouseStored, elevator, floors };
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

export function getMineElevatorProgress(mine) {
  const elevator = normalizeElevatorState(mine);
  return Math.max(0, Math.min(1, elevator.elapsed / Math.max(0.05, elevator.duration)));
}

export function sanitizeMineElevatorState(elevator, mine) {
  return normalizeElevatorState({ ...mine, elevator });
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
