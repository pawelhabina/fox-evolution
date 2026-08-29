export const SAVE_DATA_VERSION = 3;

const BASE_MAX_TIER = 15;
const MAX_TIER = 30;
export const POKEDEX_EVOLUTION_IDS = ['fire', 'electric', 'water'];
const EVOLUTION_IDS = new Set(POKEDEX_EVOLUTION_IDS);
export const POKEDEX_ENTRY_COUNT = BASE_MAX_TIER + POKEDEX_EVOLUTION_IDS.length * (MAX_TIER - BASE_MAX_TIER + 1);

export function getAllFoxDiscoveryKeys() {
  const keys = [];
  for (let tier = 1; tier <= BASE_MAX_TIER; tier += 1) {
    keys.push(`base:${tier}`);
  }
  POKEDEX_EVOLUTION_IDS.forEach((evolution) => {
    for (let tier = BASE_MAX_TIER; tier <= MAX_TIER; tier += 1) {
      keys.push(`${evolution}:${tier}`);
    }
  });
  return keys;
}

export function getFoxDiscoveryKey(fox) {
  const tier = Math.floor(Number(fox?.tier) || 0);
  const evolution = fox?.evolution || null;

  if (!evolution && tier >= 1 && tier <= BASE_MAX_TIER) {
    return `base:${tier}`;
  }
  if (EVOLUTION_IDS.has(evolution) && tier >= BASE_MAX_TIER && tier <= MAX_TIER) {
    return `${evolution}:${tier}`;
  }
  return null;
}

export function isValidFoxDiscoveryKey(key) {
  if (typeof key !== 'string') {
    return false;
  }
  const [kind, rawTier, extra] = key.split(':');
  if (extra !== undefined) {
    return false;
  }
  const tier = Number(rawTier);
  if (!Number.isInteger(tier)) {
    return false;
  }
  if (kind === 'base') {
    return tier >= 1 && tier <= BASE_MAX_TIER;
  }
  return EVOLUTION_IDS.has(kind) && tier >= BASE_MAX_TIER && tier <= MAX_TIER;
}

function toIsoTimestamp(value, fallbackTs) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(fallbackTs).toISOString();
}

export function sanitizePokedex(rawPokedex, foxes = [], nowTs = Date.now()) {
  const discoveries = {};
  const rawDiscoveries = rawPokedex?.discoveries;

  if (rawDiscoveries && typeof rawDiscoveries === 'object' && !Array.isArray(rawDiscoveries)) {
    Object.entries(rawDiscoveries).forEach(([key, discoveredAt]) => {
      if (isValidFoxDiscoveryKey(key)) {
        discoveries[key] = toIsoTimestamp(discoveredAt, nowTs);
      }
    });
  }

  foxes.forEach((fox) => {
    const key = getFoxDiscoveryKey(fox);
    if (key && !discoveries[key]) {
      discoveries[key] = new Date(nowTs).toISOString();
    }
  });

  return { discoveries };
}

export function recordFoxDiscovery(pokedex, fox, nowTs = Date.now()) {
  const key = getFoxDiscoveryKey(fox);
  if (!key || pokedex?.discoveries?.[key]) {
    return pokedex || { discoveries: {} };
  }

  return {
    ...(pokedex || {}),
    discoveries: {
      ...(pokedex?.discoveries || {}),
      [key]: new Date(nowTs).toISOString()
    }
  };
}
