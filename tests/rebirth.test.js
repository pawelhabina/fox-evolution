const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');

const projectRoot = path.resolve(__dirname, '..');

function loadGameModules() {
  const bundle = buildSync({
    stdin: {
      contents: [
        "export { ACTIONS, gameReducer } from './src/game/reducer.js';",
        "export { createInitialState } from './src/storage/defaultState.js';",
        "export { getRebirthLinearPricingRefund, getUpgradeCost } from './src/game/economy.js';"
      ].join('\n'),
      resolveDir: projectRoot,
      sourcefile: 'rebirth-test-entry.js'
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false
  });
  const bundledModule = new Module(path.join(projectRoot, 'rebirth-test-bundle.cjs'), module);
  bundledModule.filename = path.join(projectRoot, 'rebirth-test-bundle.cjs');
  bundledModule.paths = Module._nodeModulePaths(projectRoot);
  bundledModule._compile(bundle.outputFiles[0].text, bundledModule.filename);
  return bundledModule.exports;
}

test('rebirth consumes a hydra once while preserving the unlocked mine realm', () => {
  const { ACTIONS, createInitialState, gameReducer } = loadGameModules();
  const nowTs = Date.UTC(2026, 7, 29, 12);
  const state = createInitialState(nowTs);
  state.foxes = [{
    id: 1,
    kind: 'hydra',
    tier: 20,
    hydraLevel: 1,
    evolution: null,
    elementTiers: { fire: 20, electric: 20, water: 20 },
    x: 100,
    y: 100
  }];
  state.realms.spiritMine.unlocked = true;
  state.realms.spiritMine.totalCollected = 321;
  state.realms.spiritMine.mines[0].elevatorLevel = 7;
  state.currencies.fireCoins = 456;

  const rebirthed = gameReducer(state, { type: ACTIONS.REBIRTH, nowTs: nowTs + 1_000 });

  assert.equal(rebirthed.currencies.rebirthTokens, 32);
  assert.deepEqual(rebirthed.foxes, []);
  assert.deepEqual(rebirthed.realms.spiritMine, state.realms.spiritMine);
  assert.equal(rebirthed.currencies.fireCoins, 456);

  const repeated = gameReducer(rebirthed, { type: ACTIONS.REBIRTH, nowTs: nowTs + 2_000 });
  assert.equal(repeated.currencies.rebirthTokens, 32, 'a consumed hydra must not award another 32 points');
  assert.deepEqual(repeated.foxes, []);
  assert.equal(repeated.realms.spiritMine.unlocked, true);
});

test('every rebirth upgrade starts at two points and increases by two', () => {
  const { getRebirthLinearPricingRefund, getUpgradeCost } = loadGameModules();
  const rebirthUpgradeIds = ['foxLimit', 'tickSpeed', 'purchaseTierChance', 'gemDropRate'];

  rebirthUpgradeIds.forEach((upgradeId) => {
    assert.deepEqual(
      [0, 1, 2, 3].map((level) => getUpgradeCost(upgradeId, level)),
      [2, 4, 6, 8],
      `${upgradeId} should use linear +2 pricing`
    );
  });

  assert.equal(getRebirthLinearPricingRefund({
    foxLimit: 3,
    tickSpeed: 3,
    purchaseTierChance: 3,
    gemDropRate: 3
  }), 27);
});
