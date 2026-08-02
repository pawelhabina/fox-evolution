const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

test('accepts no more than six fox clicks in any rolling second', async () => {
  const { registerFoxClick } = await import('../src/game/clickRateLimit.mjs');
  let timestamps = [];

  for (let index = 0; index < 6; index += 1) {
    const result = registerFoxClick(timestamps, 1_000 + index * 150);
    assert.equal(result.accepted, true);
    timestamps = result.timestamps;
  }

  const blocked = registerFoxClick(timestamps, 1_900);
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.timestamps.length, 6);
});

test('accepts another click after the rolling window expires', async () => {
  const { registerFoxClick } = await import('../src/game/clickRateLimit.mjs');
  const timestamps = Array.from({ length: 6 }, (_, index) => 1_000 + index * 150);

  const result = registerFoxClick(timestamps, 2_000);

  assert.equal(result.accepted, true);
  assert.equal(result.timestamps.length, 6);
  assert.equal(result.timestamps.at(-1), 2_000);
});

test('game applies the shared limiter before rewarding a fox click', () => {
  const app = fs.readFileSync(path.join(projectRoot, 'src/App.jsx'), 'utf8');

  assert.match(app, /registerFoxClick\(foxClickTimestampsRef\.current, nowTs\)/);
  assert.match(app, /if \(!clickAttempt\.accepted\) \{\s*return 0;/);
});

test('settings icon has explicit gear teeth and a center opening', () => {
  const pixelIcon = fs.readFileSync(path.join(projectRoot, 'src/components/PixelIcon.jsx'), 'utf8');
  const settingsIcon = pixelIcon.match(/settings: \([\s\S]*?\r?\n  \),\r?\n  play:/);

  assert.ok(settingsIcon, 'settings icon definition is missing');
  assert.match(settingsIcon[0], /M11 0h10v5/);
  assert.match(settingsIcon[0], /fill=\{COLORS\.gray\}/);
  assert.match(settingsIcon[0], /M13 13h6v6h-6v-6Z/);
  assert.match(pixelIcon, /settings: '0 0 32 32'/);
});
