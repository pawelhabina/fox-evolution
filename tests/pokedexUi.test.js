const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('Pokedex renders every catalog entry with collection filters and discovery details', () => {
  const modal = read('src/components/PokedexModal.jsx');

  assert.match(modal, /getAllFoxDiscoveryKeys\(\)/);
  assert.match(modal, /POKEDEX_ENTRY_COUNT/);
  ['Wszystkie', 'Zwykłe', 'Ogień', 'Prąd', 'Woda'].forEach((label) => assert.match(modal, new RegExp(label)));
  assert.match(modal, /Odkryto:/);
  assert.match(modal, /entry\.income/);
  assert.match(modal, /entry\.click/);
  assert.match(modal, /entry\.sell/);
  assert.match(modal, /Nieodkryty lis/);
});

test('Pokedex is available from the in-game system menu', () => {
  const app = read('src/App.jsx');

  assert.match(app, /const \[pokedexOpen, setPokedexOpen\] = useState\(false\)/);
  assert.match(app, /setPokedexOpen\(true\)/);
  assert.match(app, /<PokedexModal pokedex=\{state\.pokedex\}/);
});
