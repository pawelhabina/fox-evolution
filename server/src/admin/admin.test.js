import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const adminDir = path.dirname(fileURLToPath(import.meta.url));
const serverSrc = path.resolve(adminDir, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(serverSrc, relativePath), 'utf8');
}

test('admin panel renders dashboard views instead of raw JSON outputs', () => {
  const html = read('admin/public/index.html');
  const script = read('admin/public/app.js');
  const styles = read('admin/public/style.css');

  for (const view of ['overview', 'users', 'telemetry', 'audit']) {
    assert.match(html, new RegExp(`data-view-panel="${view}"`));
  }
  assert.match(html, /id="users-table"/);
  assert.match(html, /id="telemetry-chart"/);
  assert.match(html, /id="save-form"/);
  assert.doesNotMatch(html, /Save state JSON/);
  assert.match(script, /renderActivityChart/);
  assert.match(script, /renderUserDetails/);
  assert.match(styles, /\.metric-grid/);
  assert.match(styles, /\.data-table/);
});

test('admin save edits use partial patches and optimistic concurrency', () => {
  const route = read('routes/admin.js');
  const service = read('services/saveService.js');
  const script = read('admin/public/app.js');

  assert.match(route, /statePatch: adminStatePatchSchema/);
  assert.match(route, /adminStatePatchSchema = z\.object/);
  assert.match(route, /expectedUpdatedAt: z\.string\(\)\.datetime\(\)/);
  assert.match(route, /status\(409\)/);
  assert.doesNotMatch(route, /state: z\.record/);
  assert.match(service, /mergeStatePatch\(existing\.state, statePatch\)/);
  assert.match(service, /updatedAt: existing\.updatedAt/);
  assert.match(script, /payload\.statePatch = statePatch/);
  assert.match(script, /expectedUpdatedAt: original\.updatedAt/);
});

test('admin player profile exposes full identifiers with copy controls', () => {
  const service = read('services/adminService.js');
  const script = read('admin/public/app.js');

  assert.match(service, /publicId: user\.publicId/);
  assert.match(service, /publicId: \{ contains: query \}/);
  assert.match(script, /Pełne ID konta/);
  assert.match(script, /Publiczne UUID/);
  assert.match(script, /data-copy-value/);
  assert.doesNotMatch(script, /user\.id\.slice\(0,12\).*ID konta/);
});

test('admin password reset is one-time, audited and invalidates all user sessions', () => {
  const schema = read('../prisma/schema.prisma');
  const route = read('routes/admin.js');
  const service = read('services/adminService.js');
  const auth = read('services/authService.js');
  const html = read('admin/public/index.html');
  const script = read('admin/public/app.js');

  assert.match(schema, /sessionVersion\s+Int\s+@default\(0\)/);
  assert.match(route, /users\/:userId\/reset-password/);
  assert.match(service, /generateTemporaryPassword\(\)/);
  assert.match(service, /sessionVersion: \{ increment: 1 \}/);
  assert.match(service, /refreshToken\.updateMany/);
  assert.match(service, /ADMIN_RESET_USER_PASSWORD/);
  assert.doesNotMatch(service, /details: \{[^}]*temporaryPassword/);
  assert.match(auth, /record\.sessionVersion !== \(user\.sessionVersion \|\| 0\)/);
  assert.match(auth, /Number\(payload\.sv \|\| 0\) !== \(user\.sessionVersion \|\| 0\)/);
  assert.match(html, /id="generated-password"/);
  assert.match(script, /byId\('generated-password'\)\.textContent = ''/);
});

test('admin messages support global and individual one-time deliveries', () => {
  const schema = read('../prisma/schema.prisma');
  const adminRoute = read('routes/admin.js');
  const playerRoute = read('routes/messages.js');
  const service = read('services/messageService.js');
  const html = read('admin/public/index.html');
  const script = read('admin/public/app.js');

  assert.match(schema, /model AdminMessage \{/);
  assert.match(schema, /model AdminMessageDelivery \{/);
  assert.match(schema, /@@unique\(\[messageId, userId\]\)/);
  assert.match(adminRoute, /z\.enum\(\['GLOBAL', 'USER'\]\)/);
  assert.match(service, /where: \{ role: 'USER' \}/);
  assert.match(service, /adminMessageDelivery\.createMany/);
  assert.match(service, /ADMIN_SEND_PLAYER_MESSAGE/);
  assert.match(playerRoute, /getPendingPlayerMessage/);
  assert.match(playerRoute, /markPlayerMessageRead/);
  assert.match(html, /data-view-panel="messages"/);
  assert.match(script, /composeMessageForUser/);
  assert.match(script, /Odczytano:/);
});
