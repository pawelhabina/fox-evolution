const test = require('node:test');
const assert = require('node:assert/strict');

test('cloud sync acknowledges this installation own newer autosave without reloading', async () => {
  const { getRemoteChangeAction } = await import('../src/storage/cloudSync.mjs');
  const current = '2026-08-29T09:00:00.000Z';
  const newer = '2026-08-29T09:00:10.000Z';

  assert.equal(getRemoteChangeAction(current, { updatedAt: newer, lastWriterId: 'client-a' }, 'client-a'), 'acknowledge-own');
});

test('cloud sync reloads only a newer save written by admin or another installation', async () => {
  const { getRemoteChangeAction } = await import('../src/storage/cloudSync.mjs');
  const current = '2026-08-29T09:00:00.000Z';
  const newer = '2026-08-29T09:00:10.000Z';

  assert.equal(getRemoteChangeAction(current, { updatedAt: newer, lastWriterId: 'admin' }, 'client-a'), 'reload');
  assert.equal(getRemoteChangeAction(current, { updatedAt: newer, lastWriterId: 'client-b' }, 'client-a'), 'reload');
  assert.equal(getRemoteChangeAction(newer, { updatedAt: current, lastWriterId: 'client-b' }, 'client-a'), 'none');
});
