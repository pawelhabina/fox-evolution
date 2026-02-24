export function formatNumber(value) {
  const safe = Number(value) || 0;
  const abs = Math.abs(safe);
  const units = [
    { value: 1e15, suffix: 'Qa' },
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' }
  ];

  for (const unit of units) {
    if (abs >= unit.value) {
      return `${trimTrailingZeros((safe / unit.value).toFixed(2))}${unit.suffix}`;
    }
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
