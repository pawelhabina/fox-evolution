const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('in-game help covers the complete player journey', () => {
  const content = read('src/game/helpContent.js');
  const modal = read('src/components/HelpModal.jsx');

  ['Pierwsze kroki', 'Ekonomia i sklep', 'Ewolucje żywiołów', 'Rebirth', 'Zadania i kolekcja', 'Zapisy i konto', 'Problemy i bezpieczeństwo']
    .forEach((title) => assert.match(content, new RegExp(title)));
  assert.equal((content.match(/id: '/g) || []).length, 7);
  assert.match(content, /Fire Fox.*\+50%/s);
  assert.match(content, /Electric Fox.*\+50%/s);
  assert.match(content, /Water Fox.*50%/s);
  assert.match(content, /Twardy reset.*nie można cofnąć/s);
  assert.match(modal, /HELP_SECTIONS\.map/);
  assert.match(modal, /aria-label="Kategorie pomocy"/);
});

test('help is reachable from the main menu and the in-game system menu', () => {
  const app = read('src/App.jsx');
  const menu = read('src/components/MainMenu.jsx');

  assert.match(menu, /onClick=\{onOpenHelp\}/);
  assert.match(menu, /Pomocne informacje/);
  assert.ok((app.match(/setHelpOpen\(true\)/g) || []).length >= 2);
  assert.equal((app.match(/<HelpModal /g) || []).length, 2);
});
