export function formatNumber(value) {
  const safe = Number(value) || 0;
  if (safe >= 1000000) {
    return `${(safe / 1000000).toFixed(2)}M`;
  }
  if (safe >= 1000) {
    return `${(safe / 1000).toFixed(1)}K`;
  }
  return Math.floor(safe).toString();
}

export function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}
