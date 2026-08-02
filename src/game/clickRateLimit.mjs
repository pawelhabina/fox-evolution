export const FOX_CLICK_LIMIT = 10;
export const FOX_CLICK_WINDOW_MS = 1_000;

export function registerFoxClick(
  previousTimestamps,
  nowTs = Date.now(),
  limit = FOX_CLICK_LIMIT,
  windowMs = FOX_CLICK_WINDOW_MS
) {
  const safeNowTs = Number.isFinite(nowTs) ? nowTs : Date.now();
  const safeLimit = Math.max(1, Math.floor(Number(limit) || FOX_CLICK_LIMIT));
  const safeWindowMs = Math.max(1, Math.floor(Number(windowMs) || FOX_CLICK_WINDOW_MS));
  const cutoffTs = safeNowTs - safeWindowMs;
  const timestamps = Array.isArray(previousTimestamps)
    ? previousTimestamps.filter((timestamp) => (
      Number.isFinite(timestamp) && timestamp > cutoffTs && timestamp <= safeNowTs
    ))
    : [];

  if (timestamps.length >= safeLimit) {
    return { accepted: false, timestamps };
  }

  return {
    accepted: true,
    timestamps: [...timestamps, safeNowTs]
  };
}
