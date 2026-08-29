const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('spirit mine models floor chests, elevator transport and a surface warehouse', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  const spiritMine = { ...mineApi.createSpiritMineState(), unlocked: true };
  assert.equal(spiritMine.mines.length, 3);
  assert.deepEqual(spiritMine.mines.map((mine) => mine.unlocked), [true, false, false]);

  const advanced = mineApi.advanceSpiritMine(spiritMine, 60, Date.UTC(2026, 7, 29));
  const fire = mineApi.getElementMine(advanced, 'fire');
  assert.ok(fire.warehouseStored > 0);
  assert.ok(fire.warehouseStored <= mineApi.getMineWarehouseCapacity(fire.warehouseLevel));
  assert.ok(fire.floors[0].chestStored <= mineApi.getMineFloorChestCapacity(fire.floors[0]));

  const fullCapacity = mineApi.getMineWarehouseCapacity(fire.warehouseLevel);
  const blocked = mineApi.advanceSpiritMine({
    ...advanced,
    mines: advanced.mines.map((mine) => mine.element === 'fire'
      ? { ...mine, warehouseStored: fullCapacity, floors: mine.floors.map((floor) => ({ ...floor, chestStored: 0 })) }
      : mine)
  }, 30);
  const blockedFire = mineApi.getElementMine(blocked, 'fire');
  assert.equal(blockedFire.warehouseStored, fullCapacity);
  assert.ok(blockedFire.floors[0].chestStored > 0, 'workers should fill the floor chest while the full warehouse blocks the elevator');
});

test('worker count is derived from floor level at exact progression thresholds', async () => {
  const { getMineWorkerCount } = await import('../src/game/spiritMine.js');
  assert.deepEqual([1, 9, 10, 24, 25, 49, 50, 99, 100].map(getMineWorkerCount), [1, 1, 2, 2, 3, 3, 4, 4, 5]);
});

test('map always contains three mines unlocked with previous element currency', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  const spiritMine = { ...mineApi.createSpiritMineState(), unlocked: true };
  assert.deepEqual(spiritMine.mines.map((mine) => mine.element), ['fire', 'electric', 'water']);
  assert.equal(mineApi.canUnlockElementMine(spiritMine, 'electric'), true);
  assert.equal(mineApi.canUnlockElementMine(spiritMine, 'water'), false);
  assert.deepEqual(mineApi.getMineUnlock('electric'), { currencyElement: 'fire', currencyKey: 'fireCoins', cost: 500 });
  assert.deepEqual(mineApi.getMineUnlock('water'), { currencyElement: 'electric', currencyKey: 'electricCoins', cost: 1500 });
});

test('every concrete mine supports up to ten independently upgraded floors', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  let fire = mineApi.createElementMine('fire', true);
  while (fire.floors.length < mineApi.SPIRIT_MINE_MAX_FLOORS) {
    const next = mineApi.getMineNextFloor(fire);
    assert.equal(next.floor, fire.floors.length + 1);
    assert.ok(next.cost > 0);
    fire = { ...fire, floors: [...fire.floors, mineApi.createMineFloor(next.floor)] };
  }
  assert.equal(mineApi.getMineNextFloor(fire), null);
});

test('only surface warehouse contents are collectable as elemental currencies', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  const spiritMine = mineApi.createSpiritMineState();
  const populated = {
    ...spiritMine,
    unlocked: true,
    mines: spiritMine.mines.map((mine, index) => ({
      ...mine,
      unlocked: true,
      warehouseStored: [3.6, 4.2, 5.9][index],
      floors: [{ ...mine.floors[0], chestStored: 99 }]
    }))
  };
  assert.deepEqual(mineApi.getMineCollectableByElement(populated), { fire: 3, electric: 4, water: 5 });
  assert.equal(mineApi.getMineStoredTotal(populated), 12);
});

test('desktop and renderer use wall clock progress when the game is minimized', () => {
  const root = path.resolve(__dirname, '..');
  const electronMain = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
  assert.match(electronMain, /backgroundThrottling: false/);
  assert.match(app, /nowTs - clock\.lastTs/);
  assert.match(app, /lastEconomyAt/);
  assert.match(app, /visibilitychange/);
});

test('hydra fusion unlocks the realm and reducer exposes mine and floor actions', () => {
  const root = path.resolve(__dirname, '..');
  const reducer = fs.readFileSync(path.join(root, 'src/game/reducer.js'), 'utf8');
  assert.match(reducer, /kind: 'hydra'/);
  assert.match(reducer, /spiritMine:[\s\S]*?unlocked: true/);
  assert.match(reducer, /MINE_UNLOCK_MINE/);
  assert.match(reducer, /MINE_UNLOCK_FLOOR/);
  assert.match(reducer, /getMineFloorUpgradeCost/);
});

test('legacy room saves migrate into three element mines and sequential floors', () => {
  const root = path.resolve(__dirname, '..');
  const storage = fs.readFileSync(path.join(root, 'src/storage/gameStorage.js'), 'utf8');
  assert.match(storage, /legacyShafts/);
  assert.match(storage, /legacyElementShafts/);
  assert.match(storage, /rawElementMines/);
  assert.match(storage, /SPIRIT_MINE_MAX_FLOORS/);
  assert.match(storage, /warehouseStored/);
});

test('mine UI shows three-card map, animated workers, floor chests, elevator and warehouse', () => {
  const root = path.resolve(__dirname, '..');
  const component = fs.readFileSync(path.join(root, 'src/components/SpiritMineRealm.jsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(component, /Trzy kopalnie/);
  assert.match(component, /label="Odblokuj kopalnię"/);
  assert.match(component, /element-mine-chest/);
  assert.match(component, /getMineWorkerCount/);
  assert.match(component, /Odbierz \+/);
  assert.match(component, /onUnlockFloor/);
  assert.match(styles, /@keyframes element-worker-cycle/);
  assert.match(styles, /transition: top var\(--cab-travel-time\) linear/);
  assert.match(component, /is-affordable/);
  assert.match(component, /BRAKUJE/);
  assert.match(styles, /\.mine-purchase-button\.is-affordable/);
  assert.match(styles, /\.mine-purchase-button\.is-unaffordable/);
});

test('boss QTE timer animates continuously for the full prompt duration', () => {
  const root = path.resolve(__dirname, '..');
  const modal = fs.readFileSync(path.join(root, 'src/components/ElementalBossModal.jsx'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(modal, /requestAnimationFrame\(updateTimer\)/);
  assert.match(modal, /--boss-qte-duration/);
  assert.match(styles, /boss-qte-countdown var\(--boss-qte-duration\) linear forwards/);
});
