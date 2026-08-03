const test = require('node:test');
const assert = require('node:assert/strict');

test('pokedex keys cover base and elemental fox variants', async () => {
  const { getAllFoxDiscoveryKeys, getFoxDiscoveryKey, isValidFoxDiscoveryKey, POKEDEX_ENTRY_COUNT } = await import('../src/game/progression.mjs');

  assert.equal(getFoxDiscoveryKey({ tier: 1, evolution: null }), 'base:1');
  assert.equal(getFoxDiscoveryKey({ tier: 15, evolution: 'fire' }), 'fire:15');
  assert.equal(getFoxDiscoveryKey({ tier: 30, evolution: 'water' }), 'water:30');
  assert.equal(getFoxDiscoveryKey({ tier: 16, evolution: null }), null);
  assert.equal(isValidFoxDiscoveryKey('electric:22'), true);
  assert.equal(isValidFoxDiscoveryKey('base:30'), false);

  const allKeys = getAllFoxDiscoveryKeys();
  assert.equal(POKEDEX_ENTRY_COUNT, 63);
  assert.equal(allKeys.length, 63);
  assert.equal(new Set(allKeys).size, 63);
  assert.equal(allKeys[0], 'base:1');
  assert.equal(allKeys.at(-1), 'water:30');
  allKeys.forEach((key) => assert.equal(isValidFoxDiscoveryKey(key), true));
});

test('save migration preserves discoveries and infers current foxes', async () => {
  const { sanitizePokedex } = await import('../src/game/progression.mjs');
  const nowTs = Date.UTC(2026, 7, 3, 12);
  const migrated = sanitizePokedex(
    { discoveries: { 'base:2': '2026-07-01T10:00:00.000Z', 'invalid:99': 'bad' } },
    [{ tier: 4, evolution: null }, { tier: 18, evolution: 'fire' }],
    nowTs
  );

  assert.deepEqual(Object.keys(migrated.discoveries).sort(), ['base:2', 'base:4', 'fire:18']);
  assert.equal(migrated.discoveries['base:2'], '2026-07-01T10:00:00.000Z');
  assert.equal(migrated.discoveries['base:4'], new Date(nowTs).toISOString());
});

test('recording the same discovery keeps its original timestamp', async () => {
  const { recordFoxDiscovery } = await import('../src/game/progression.mjs');
  const original = { discoveries: { 'base:1': '2026-01-01T00:00:00.000Z' } };
  const unchanged = recordFoxDiscovery(original, { tier: 1 }, Date.UTC(2026, 7, 3));

  assert.equal(unchanged, original);
});
