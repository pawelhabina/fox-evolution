export const ACTIVE_SAVE_WRITER_WINDOW_MS = 30_000;

export function getSaveWriteBlockReason(existing, clientId, nowTs = Date.now()) {
  if (!clientId) {
    return 'SYNC_CLIENT_UPDATE_REQUIRED';
  }
  if (!existing || !existing.lastWriterId || existing.lastWriterId === 'admin' || existing.lastWriterId === clientId) {
    return null;
  }

  const updatedAtMs = new Date(existing.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) {
    return null;
  }
  return nowTs - updatedAtMs < ACTIVE_SAVE_WRITER_WINDOW_MS ? 'SAVE_ACTIVE_ELSEWHERE' : null;
}
