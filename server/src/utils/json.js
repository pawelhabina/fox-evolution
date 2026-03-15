export function stringifyJson(data) {
  return JSON.stringify(data, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export function sendJson(res, payload, status = 200) {
  res.status(status).type('application/json').send(stringifyJson(payload));
}

export function toSafeBigInt(value, fallback = 0n) {
  if (typeof value === 'bigint') {
    return value >= 0n ? value : 0n;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return BigInt(Math.max(0, Math.floor(value)));
  }
  if (typeof value === 'string') {
    if (!value.trim()) {
      return fallback;
    }
    try {
      const parsed = BigInt(value);
      return parsed >= 0n ? parsed : 0n;
    } catch (_error) {
      return fallback;
    }
  }
  return fallback;
}

export function clampInt(value, min, max, fallback = min) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(num)));
}
