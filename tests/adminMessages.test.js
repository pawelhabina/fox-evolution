const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('game polls account messages and acknowledges the displayed delivery', () => {
  const app = read('src/App.jsx');
  const remoteSession = read('src/storage/remoteSession.js');
  const modal = read('src/components/AdminMessageModal.jsx');

  assert.match(remoteSession, /apiRequest\('\/api\/messages\/pending'\)/);
  assert.match(remoteSession, /api\/messages\/\$\{encodeURIComponent\(deliveryId\)\}\/read/);
  assert.match(app, /setInterval\(\(\) => \{ void refreshAdminMessage\(\); \}, 30000\)/);
  assert.match(app, /acknowledgeGameAdminMessage\(message\.deliveryId\)/);
  assert.match(modal, /Wiadomość od administracji/);
  assert.match(modal, /Rozumiem/);
});
