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

  assert.match(constants, /BASE_GEM_DROP_RATE = 0\.01/);
  assert.match(constants, /early: 15/);
  assert.match(constants, /common: 30/);
  assert.match(quests, /nextStreakDay <= 3/);
  assert.match(quests, /amount = LOGIN_REWARD_VALUES\.early/);
});

test('click income and click upgrades use the slower economy', () => {
  const constants = read('src/game/constants.js');
  const economy = read('src/game/economy.js');

  assert.match(constants, /CLICK_VALUE_RATIO = 0\.1125/);
  assert.match(constants, /Math\.max\(previousClickValue \+ 1, Math\.round\(baseIncomePerTick \* CLICK_VALUE_RATIO\)\)/);
  assert.match(constants, /description: '\+2% wartości kliknięcia na poziom\.'/);
  assert.match(economy, /clickLevel \* 0\.02/);
});

test('fox limit is a persistent rebirth upgrade instead of a coin upgrade', () => {
  const constants = read('src/game/constants.js');
  const foxLimitUpgrade = constants.match(/foxLimit: \{[\s\S]*?\r?\n  \},\r?\n  gemIncomeMultiplier:/);

  assert.ok(foxLimitUpgrade, 'fox limit upgrade definition is missing');
  assert.match(foxLimitUpgrade[0], /shop: 'rebirth'/);
  assert.match(foxLimitUpgrade[0], /currency: 'rebirthTokens'/);
  assert.match(foxLimitUpgrade[0], /baseCost: 1/);
});

test('session refresh is shared between concurrent startup requests', () => {
  const remoteSession = read('src/storage/remoteSession.js');

  assert.match(remoteSession, /let refreshAccessTokenPromise = null/);
  assert.match(remoteSession, /refreshAccessTokenPromise = performRefreshAccessToken\(\)\.finally/);
  assert.match(remoteSession, /getStoredSession\(\)\.refreshToken === refreshToken/);
});

test('daily and weekly quests use achievable idle-game targets', () => {
  const constants = read('src/game/constants.js');
  const quests = read('src/game/quests.js');

  assert.match(constants, /target: 800, type: 'clicks'/);
  assert.match(constants, /target: 10000, type: 'clicks'/);
  assert.match(constants, /target: 350, type: 'merges'/);
  assert.match(constants, /target: 600, type: 'buys'/);
  assert.match(constants, /target: 25000000, type: 'coinsEarned'/);
  assert.match(quests, /syncQuestDefinitions\(nextState\.quests\.weekly/);
});

test('every rebirth shop cost doubles on each level and gem drop starts at 1%', () => {
  const constants = read('src/game/constants.js');
  const economy = read('src/game/economy.js');

  assert.match(constants.match(/foxLimit: \{[\s\S]*?\r?\n  \},\r?\n  gemIncomeMultiplier:/)?.[0] || '', /growth: 2/);
  assert.match(constants.match(/tickSpeed: \{[\s\S]*?\r?\n  \},\r?\n  purchaseTierChance:/)?.[0] || '', /growth: 2/);
  assert.match(constants.match(/purchaseTierChance: \{[\s\S]*?\r?\n  \},\r?\n  gemDropRate:/)?.[0] || '', /growth: 2/);
  assert.match(constants.match(/gemDropRate: \{[\s\S]*?\r?\n  \}\r?\n\};/)?.[0] || '', /growth: 2/);
  assert.doesNotMatch(economy, /upgradeId === 'tickSpeed'/);
  assert.match(constants, /BASE_GEM_DROP_RATE = 0\.01/);
});

test('legacy rebirth shop purchases receive a one-time refund without losing levels', () => {
  const economy = read('src/game/economy.js');
  const storage = read('src/storage/gameStorage.js');
  const defaults = read('src/storage/defaultState.js');

  assert.match(economy, /getLegacyRebirthShopRefund/);
  assert.match(economy, /Math\.floor\(1\.35 \*\* level\)/);
  assert.match(economy, /level < 20 \? 5 \+ level \* 5 : 110/);
  assert.match(storage, /rebirthPricingRefundV128Applied === true/);
  assert.match(storage, /rebirthTokens: clampCurrency\([\s\S]*?\+ legacyRebirthRefund\)/);
  assert.match(storage, /rebirthPricingRefundV128Applied: true/);
  assert.match(defaults, /rebirthPricingRefundV128Applied: true/);
});

test('fox purchase always shows its price, including when blocked', () => {
  const arena = read('src/components/Arena.jsx');

  assert.match(arena, /\{formatNumber\(buyCost\)\} monet\{buyBlockedReason/);
});

test('fox merge lock is persisted and highlighted with compatible targets', () => {
  const reducer = read('src/game/reducer.js');
  const storage = read('src/storage/gameStorage.js');
  const arena = read('src/components/Arena.jsx');
  const contextMenu = read('src/components/FoxContextMenu.jsx');

  assert.match(reducer, /TOGGLE_FOX_LOCK/);
  assert.match(reducer, /source\.locked \|\| target\.locked/);
  assert.match(storage, /locked: Boolean\(fox\.locked\)/);
  assert.match(arena, /fox-tile--same-family/);
  assert.match(arena, /fox-tile--merge-compatible/);
  assert.match(arena, /fox-tile--merge-hover-ok/);
  assert.match(contextMenu, /Zablokuj przed łączeniem/);
});

test('late fox purchases use a soft-capped growth curve', () => {
  const economy = read('src/game/economy.js');

  assert.match(economy, /earlyPurchases = Math\.min\(purchaseCount, 60\)/);
  assert.match(economy, /midPurchases \* 0\.45 \+ latePurchases \* 0\.18/);
});

test('selling a fox requires an in-game confirmation modal', () => {
  const app = read('src/App.jsx');
  const modal = read('src/components/DeleteFoxModal.jsx');

  assert.match(app, /<DeleteFoxModal/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /Usuń i sprzedaj/);
  assert.doesNotMatch(modal, /window\.confirm/);
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
