const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('save schema includes the complete statistics foundation', () => {
  const defaults = read('src/storage/defaultState.js');
  const requiredStats = [
    'playTimeSeconds',
    'lifetimeCoinsSpent',
    'lifetimeCoinsFromClicks',
    'lifetimeCoinsFromPassive',
    'lifetimeCoinsFromSales',
    'lifetimeCoinsFromInstantCash',
    'lifetimeGemsEarned',
    'lifetimeGemsSpent',
    'lifetimeRebirthTokensEarned',
    'lifetimeRebirthTokensSpent',
    'lifetimeSells',
    'lifetimeEvolutions',
    'lifetimeUpgradesBought',
    'lifetimeTemporaryBoostsBought',
    'highestTier',
    'highestBaseTier',
    'highestElementalTier'
  ];

  requiredStats.forEach((field) => assert.match(defaults, new RegExp(`${field}: 0`), `missing ${field}`));
  assert.match(defaults, /dataVersion: SAVE_DATA_VERSION/);
  assert.match(defaults, /pokedex: \{\s*discoveries: \{\}/);
});

test('gameplay actions feed currency, activity, time and discovery counters', () => {
  const reducer = read('src/game/reducer.js');
  const app = read('src/App.jsx');
  const quests = read('src/game/quests.js');

  assert.match(reducer, /withCoinsGain\(next, gain, 'click'\)/);
  assert.match(reducer, /withCoinsGain\(next, coinsGained, 'passive'\)/);
  assert.match(reducer, /withCoinsGain\(withoutFox, gain, 'sale'\)/);
  assert.match(reducer, /lifetimeRebirthTokensEarned/);
  assert.match(reducer, /recordFoxDiscovery/);
  assert.match(app, /ACTIONS\.RECORD_PLAY_TIME, seconds: 1/);
  assert.match(quests, /lifetimeDailyQuestsClaimed/);
  assert.match(quests, /lifetimeWeeklyQuestsClaimed/);
  assert.match(quests, /lifetimeLoginRewardsClaimed/);
});
