const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

test('accepts no more than ten fox clicks in any rolling second', async () => {
  const { registerFoxClick } = await import('../src/game/clickRateLimit.mjs');
  let timestamps = [];

  for (let index = 0; index < 10; index += 1) {
    const result = registerFoxClick(timestamps, 1_000 + index * 90);
    assert.equal(result.accepted, true);
    timestamps = result.timestamps;
  }

  const blocked = registerFoxClick(timestamps, 1_900);
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.timestamps.length, 10);
});

test('accepts another click after the rolling window expires', async () => {
  const { registerFoxClick } = await import('../src/game/clickRateLimit.mjs');
  const timestamps = Array.from({ length: 10 }, (_, index) => 1_000 + index * 90);

  const result = registerFoxClick(timestamps, 2_000);

  assert.equal(result.accepted, true);
  assert.equal(result.timestamps.length, 10);
  assert.equal(result.timestamps.at(-1), 2_000);
});

test('game applies the shared limiter before rewarding a fox click', () => {
  const app = fs.readFileSync(path.join(projectRoot, 'src/App.jsx'), 'utf8');

  assert.match(app, /registerFoxClick\(foxClickTimestampsRef\.current, nowTs\)/);
  assert.match(app, /if \(!clickAttempt\.accepted\) \{\s*return 0;/);
});

test('settings icon has explicit gear teeth and a center opening', () => {
  const pixelIcon = fs.readFileSync(path.join(projectRoot, 'src/components/PixelIcon.jsx'), 'utf8');
  const settingsIcon = pixelIcon.match(/settings: \([\s\S]*?\n  \),\n  play:/);

  assert.ok(settingsIcon, 'settings icon definition is missing');
  assert.match(settingsIcon[0], /M8 1h8v3/);
  assert.match(settingsIcon[0], /M9 8h6v2/);
  assert.match(settingsIcon[0], /x="10" y="10" width="4" height="4" fill=\{COLORS\.ink\}/);
});
