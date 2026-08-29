export function isRemoteTimestampNewer(currentTs, nextTs) {
  if (!nextTs) return false;
  const nextMs = new Date(nextTs).getTime();
  if (!Number.isFinite(nextMs)) return false;
  const currentMs = currentTs ? new Date(currentTs).getTime() : 0;
  if (!Number.isFinite(currentMs)) return true;
  return nextMs > currentMs;
}

export function getRemoteChangeAction(currentTs, remoteMeta, syncClientId) {
  if (!isRemoteTimestampNewer(currentTs, remoteMeta?.updatedAt)) return 'none';
  if (remoteMeta?.lastWriterId === 'admin') return 'reload';
  if (!remoteMeta?.lastWriterId) return 'acknowledge-unattributed';
  if (remoteMeta.lastWriterId === syncClientId) return 'acknowledge-own';
  return 'conflict';
}
