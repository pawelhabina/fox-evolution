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
