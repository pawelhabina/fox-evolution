export function formatNumber(value) {
  const safe = Number(value) || 0;
  if (safe >= 1000000) {
    return `${trimTrailingZeros((safe / 1000000).toFixed(2))}M`;
  }
  if (safe >= 1000) {
    return `${trimTrailingZeros((safe / 1000).toFixed(1))}K`;
  }
  return Math.floor(safe).toString();
}

function trimTrailingZeros(value) {
  return value.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function formatCompact(value, decimals = 1) {
  const safe = Number(value) || 0;
  if (safe >= 1000) {
    return formatNumber(safe);
  }
  if (Number.isInteger(safe)) {
    return safe.toString();
  }
  return trimTrailingZeros(safe.toFixed(decimals));
}

export function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}
