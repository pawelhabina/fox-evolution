const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('spirit mine produces while time elapses and respects storage capacity', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  const mine = { ...mineApi.createSpiritMineState(), unlocked: true };
  assert.equal(mine.shafts.length, 1);
  assert.equal(mine.shafts[0].element, 'fire');
  const advanced = mineApi.advanceSpiritMine(mine, 60, Date.UTC(2026, 7, 27));
  assert.ok(mineApi.getMineStoredTotal(advanced) > 0);
  advanced.shafts.forEach((shaft) => {
    assert.ok(shaft.stored <= mineApi.getMineShaftCapacity(shaft, advanced));
  });

  const capped = mineApi.advanceSpiritMine(advanced, 24 * 60 * 60);
  capped.shafts.forEach((shaft) => {
    assert.equal(shaft.stored, mineApi.getMineShaftCapacity(shaft, capped));
  });
});

test('spirit mine unlocks fire, electric and water rooms in order up to ten', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  let mine = { ...mineApi.createSpiritMineState(), unlocked: true };
  const expected = ['fire', 'electric', 'water', 'fire', 'electric', 'water', 'fire', 'electric', 'water', 'fire'];

  assert.equal(mineApi.getMineNextRoom(mine).element, 'electric');
  assert.equal(mineApi.getMineNextRoom(mine).currencyElement, 'fire');
  assert.equal(mineApi.getMineNextRoom(mine).cost, 20);

  while (mine.shafts.length < mineApi.SPIRIT_MINE_MAX_ROOMS) {
    const room = mineApi.getMineNextRoom(mine);
    assert.ok(room.cost > 0);
    assert.equal(room.currencyElement, mine.shafts.at(-1).element);
    mine = { ...mine, shafts: [...mine.shafts, mineApi.createMineShaft(room.room)] };
  }

  assert.deepEqual(mine.shafts.map((shaft) => shaft.element), expected);
  assert.equal(mineApi.getMineNextRoom(mine), null);
});

test('mine collection is separated into elemental currencies without losing remainders', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  const mine = {
    ...mineApi.createSpiritMineState(),
    unlocked: true,
    shafts: [
      { ...mineApi.createMineShaft(1), stored: 3.6 },
      { ...mineApi.createMineShaft(2), stored: 4.2 },
      { ...mineApi.createMineShaft(3), stored: 5.9 },
      { ...mineApi.createMineShaft(4), stored: 2.6 }
    ]
  };
  assert.deepEqual(mineApi.getMineCollectableByElement(mine), {
    fire: 6,
    electric: 4,
    water: 5
  });
  assert.equal(mineApi.getMineStoredTotal(mine), 15);
  assert.deepEqual(mineApi.SPIRIT_MINE_CURRENCY_KEYS, {
    fire: 'fireCoins',
    electric: 'electricCoins',
    water: 'waterCoins'
  });
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

test('hydra fusion grants essence, unlocks the mine and replaces the selected foxes', () => {
  const root = path.resolve(__dirname, '..');
  const reducer = fs.readFileSync(path.join(root, 'src/game/reducer.js'), 'utf8');
  assert.match(reducer, /kind: 'hydra'/);
  assert.match(reducer, /foxes\.filter\(\(fox\) => !teamIdSet\.has\(fox\.id\)\)/);
  assert.match(reducer, /ELEMENTAL_BOSS_REWARD_ESSENCE/);
  assert.match(reducer, /spiritMine:[\s\S]*?unlocked: true/);
  assert.match(reducer, /MINE_UNLOCK_ROOM/);
  assert.match(reducer, /SPIRIT_MINE_CURRENCY_KEYS/);
});

test('existing three-room mine saves are preserved by the save migration', () => {
  const root = path.resolve(__dirname, '..');
  const storage = fs.readFileSync(path.join(root, 'src/storage/gameStorage.js'), 'utf8');
  assert.match(storage, /rawMine\.shafts\.slice\(0, SPIRIT_MINE_MAX_ROOMS\)/);
  assert.match(storage, /rawShafts\.map\(\(rawShaft, index\)/);
  assert.match(storage, /fireCoins:[\s\S]*electricCoins:[\s\S]*waterCoins:/);
});
