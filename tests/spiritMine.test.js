const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('spirit mine produces while time elapses and respects storage capacity', async () => {
  const mineApi = await import('../src/game/spiritMine.js');
  const mine = { ...mineApi.createSpiritMineState(), unlocked: true };
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
});
