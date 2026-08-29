import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_SAVE_PRESETS, buildAdminSavePresetPatch } from './adminSavePresets.js';

function baseState() {
  return {
    currencies: {
      coins: 120,
      gems: 0,
      rebirthTokens: 0,
      essence: 0,
      fireCoins: 0,
      electricCoins: 0,
      waterCoins: 0
    },
    foxes: [
      { id: 1, tier: 15, x: 100, y: 100, evolution: null },
      { id: 2, tier: 15, x: 200, y: 100, evolution: null },
      { id: 3, tier: 15, x: 300, y: 100, evolution: null }
    ],
    upgrades: {},
    stats: { highestTier: 15, highestElementalTier: 0 },
    bossBattle: { status: 'victory', defeated: true },
    tutorials: { elementalFusionSeen: false },
    realms: {
      spiritMine: {
        unlocked: false,
        totalCollected: 0,
        lastAdvancedAt: null,
        mines: ['fire', 'electric', 'water'].map((element, index) => ({
          id: element,
          element,
          unlocked: index === 0,
          elevatorLevel: 1,
          warehouseLevel: 1,
          warehouseStored: 0,
          floors: [{ id: 1, floor: 1, level: 1, chestStored: 0 }]
        }))
      }
    },
    meta: { nextFoxId: 4 },
    arena: { width: 900, height: 520 }
  };
}

test('HYDRA_READY turns three existing foxes into a complete level 20 elemental team', () => {
  const original = baseState();
  const patch = buildAdminSavePresetPatch(original, 'HYDRA_READY');

  assert.equal(patch.foxes.length, 3);
  for (const element of ['fire', 'electric', 'water']) {
    const fox = patch.foxes.find((candidate) => candidate.evolution === element);
    assert.ok(fox, `missing ${element} fox`);
    assert.equal(fox.tier, 20);
  }
  assert.deepEqual(original.foxes.map((fox) => fox.evolution), [null, null, null]);
  assert.equal(patch.bossBattle.status, 'idle');
  assert.equal(patch.bossBattle.defeated, false);
  assert.equal(patch.tutorials.elementalFusionSeen, true);
  assert.equal(patch.meta.nextFoxId, 4);
});

test('HYDRA_READY preserves unrelated foxes and creates only missing elements', () => {
  const state = baseState();
  state.foxes = [
    { id: 4, tier: 23, x: 20, y: 20, evolution: 'fire' },
    { id: 7, tier: 10, x: 40, y: 40, evolution: null }
  ];
  state.meta.nextFoxId = 10;
  const patch = buildAdminSavePresetPatch(state, 'HYDRA_READY');

  assert.equal(patch.foxes.find((fox) => fox.id === 4).tier, 23);
  assert.equal(patch.foxes.find((fox) => fox.id === 7).tier, 20);
  assert.deepEqual(new Set(patch.foxes.map((fox) => fox.evolution)), new Set(['fire', 'electric', 'water']));
  assert.equal(patch.meta.nextFoxId, 11);
});

test('shop and wallet presets set all test values', () => {
  const state = baseState();
  const wallet = buildAdminSavePresetPatch(state, 'RICH_TEST');
  const rebirth = buildAdminSavePresetPatch(state, 'MAX_REBIRTH_SHOP');
  const gems = buildAdminSavePresetPatch(state, 'MAX_GEM_SHOP');

  assert.equal(Object.keys(wallet.currencies).length, 7);
  assert.equal(wallet.currencies.coins, 1_000_000_000_000);
  assert.deepEqual(rebirth.upgrades, { foxLimit: 45, tickSpeed: 40, purchaseTierChance: 95, gemDropRate: 120 });
  assert.deepEqual(gems.upgrades, { gemIncomeMultiplier: 100, gemFoxLimit: 50 });
});

test('MAX_SPIRIT_MINE unlocks three mines with ten maxed floors each', () => {
  const patch = buildAdminSavePresetPatch(baseState(), 'MAX_SPIRIT_MINE');
  const mine = patch.realms.spiritMine;

  assert.equal(mine.unlocked, true);
  assert.deepEqual(mine.mines.map((elementMine) => elementMine.element), ['fire', 'electric', 'water']);
  assert.ok(mine.mines.every((elementMine) => elementMine.unlocked));
  assert.ok(mine.mines.every((elementMine) => elementMine.floors.length === 10));
  assert.ok(mine.mines.every((elementMine) => elementMine.floors.every((floor, index) => floor.id === index + 1 && floor.floor === index + 1 && floor.level === 100)));
  assert.ok(mine.mines.every((elementMine) => elementMine.elevatorLevel === 100 && elementMine.warehouseLevel === 100));
});

test('preset catalog rejects unknown operations', () => {
  assert.ok(ADMIN_SAVE_PRESETS.includes('HYDRA_READY'));
  assert.throws(() => buildAdminSavePresetPatch(baseState(), 'DELETE_SAVE'), /UNKNOWN_ADMIN_SAVE_PRESET/);
});
