const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('base tier progression uses the slower economy curve', () => {
  const constants = read('src/game/constants.js');
  const tierUpgrade = constants.match(/basePurchaseTier: \{[\s\S]*?\r?\n  \},\r?\n  passiveIncome:/);

  assert.ok(tierUpgrade, 'base tier upgrade definition is missing');
  assert.match(tierUpgrade[0], /baseCost: 1000/);
  assert.match(tierUpgrade[0], /growth: 2\.15/);

  const finalUpgradeCost = Math.floor(1000 * 2.15 ** 12);
  assert.ok(finalUpgradeCost > 9_000_000, `final base tier upgrade is still too cheap: ${finalUpgradeCost}`);
});

test('gem rewards are reduced without removing regular drops', () => {
  const constants = read('src/game/constants.js');
  const quests = read('src/game/quests.js');

  assert.match(constants, /BASE_GEM_DROP_RATE = 0\.008/);
  assert.match(constants, /early: 15/);
  assert.match(constants, /common: 30/);
  assert.match(quests, /nextStreakDay <= 3/);
  assert.match(quests, /amount = LOGIN_REWARD_VALUES\.early/);
});

test('click income and click upgrades use the slower economy', () => {
  const constants = read('src/game/constants.js');
  const economy = read('src/game/economy.js');

  assert.match(constants, /CLICK_VALUE_RATIO = 0\.1125/);
  assert.match(constants, /description: '\+2% wartości kliknięcia na poziom\.'/);
  assert.match(economy, /clickLevel \* 0\.02/);
});

test('daily and weekly quests require sustained play', () => {
  const constants = read('src/game/constants.js');
  const quests = read('src/game/quests.js');

  assert.match(constants, /target: 3000, type: 'clicks'/);
  assert.match(constants, /target: 60000, type: 'clicks'/);
  assert.match(constants, /target: 2400, type: 'merges'/);
  assert.match(constants, /target: 5000, type: 'buys'/);
  assert.match(constants, /target: 500000000, type: 'coinsEarned'/);
  assert.match(quests, /syncQuestDefinitions\(nextState\.quests\.weekly/);
});

test('fox purchase always shows its price, including when blocked', () => {
  const arena = read('src/components/Arena.jsx');

  assert.match(arena, /\{formatNumber\(buyCost\)\} monet\{buyBlockedReason/);
});

test('evolution and rebirth use in-game confirmation modals', () => {
  const evolution = read('src/components/EvolutionModal.jsx');
  const shop = read('src/components/ShopPanel.jsx');

  assert.doesNotMatch(evolution, /window\.confirm/);
  assert.doesNotMatch(shop, /window\.confirm/);
  assert.match(evolution, /role="dialog"/);
  assert.match(evolution, /Potwierdź ewolucję/);
  assert.match(shop, /id="rebirth-confirm-title"/);
  assert.match(shop, /Potwierdź Rebirth/);
});
