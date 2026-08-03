const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('statistics modal presents all major save categories and tolerates older saves', () => {
  const modal = read('src/components/StatisticsModal.jsx');

  [
    'Save i progresja',
    'Ekonomia monet',
    'Diamenty i Rebirth',
    'Lisy i kolekcja',
    'Aktywność i rozwój'
  ].forEach((section) => assert.match(modal, new RegExp(section)));

  assert.match(modal, /const stats = state\.stats \|\| \{\}/);
  assert.match(modal, /Array\.isArray\(state\.foxes\)/);
  assert.match(modal, /state\.pokedex\?\.discoveries \|\| \{\}/);
  assert.match(modal, /getExpectedCoinsPerSecond\(state\)/);
  assert.match(modal, /getFoxLimit\(state\)/);
  assert.match(modal, /lifetimeCoinsEarned/);
  assert.match(modal, /lifetimeGemsEarned/);
  assert.match(modal, /playTimeSeconds/);
});

test('statistics can be opened for a selected save and during gameplay', () => {
  const app = read('src/App.jsx');
  const menu = read('src/components/MainMenu.jsx');

  assert.match(menu, /onStats\(slot\)/);
  assert.match(menu, />\s*Statystyki\s*<\/button>/);
  assert.match(app, /onOpenStats=\{async \(slot\) =>/);
  assert.match(app, /loadSlotStateWithMeta\(slot\.id\)/);
  assert.match(app, /state: stateRef\.current/);
  assert.equal((app.match(/<StatisticsModal /g) || []).length, 2);
});
