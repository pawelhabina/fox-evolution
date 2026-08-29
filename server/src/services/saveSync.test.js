import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVE_SAVE_WRITER_WINDOW_MS, getSaveWriteBlockReason } from './saveSync.js';

test('cloud saves require a writer identity', () => {
  assert.equal(getSaveWriteBlockReason(null, null), 'SYNC_CLIENT_UPDATE_REQUIRED');
  assert.equal(getSaveWriteBlockReason(null, 'client-a'), null);
});

test('an active save cannot be overwritten by another installation', () => {
  const nowTs = Date.UTC(2026, 7, 29, 13);
  const existing = { lastWriterId: 'client-a', updatedAt: new Date(nowTs - 5_000) };

  assert.equal(getSaveWriteBlockReason(existing, 'client-a', nowTs), null);
  assert.equal(getSaveWriteBlockReason(existing, 'client-b', nowTs), 'SAVE_ACTIVE_ELSEWHERE');
  assert.equal(getSaveWriteBlockReason({ ...existing, lastWriterId: 'admin' }, 'client-b', nowTs), null);
  assert.equal(getSaveWriteBlockReason({ ...existing, updatedAt: new Date(nowTs - ACTIVE_SAVE_WRITER_WINDOW_MS) }, 'client-b', nowTs), null);
});
