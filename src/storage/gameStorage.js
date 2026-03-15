import { clamp, clampCurrency, clampFoxPosition } from '../game/economy';
import { MAX_FOXES_LIMIT, MAX_TIER } from '../game/constants';
import { createInitialState } from './defaultState';

const STORAGE_LEGACY_KEY = 'fox-evolution-save-v1';
const STORAGE_META_KEY = 'fox-evolution-meta-v2';
const STORAGE_SLOT_PREFIX = 'fox-evolution-slot-';

function getBridge() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.foxEvolution || null;
}

function createDefaultMeta() {
  return {
    lastPlayedSlotId: null,
    settings: {
      defaultSound: true,
      defaultAnimations: true,
      defaultMusicVolume: 70,
      defaultSfxVolume: 80
    },
    slots: []
  };
}

function sanitizeMeta(meta) {
  const base = createDefaultMeta();
  if (!meta || typeof meta !== 'object') {
    return base;
  }
  const parsedDefaultMusicVolume = Number(meta.settings?.defaultMusicVolume);
  const parsedDefaultSfxVolume = Number(meta.settings?.defaultSfxVolume);
  const safeDefaultMusicVolume = Number.isFinite(parsedDefaultMusicVolume)
    ? clamp(Math.round(parsedDefaultMusicVolume), 0, 100)
    : base.settings.defaultMusicVolume;
  const safeDefaultSfxVolume = Number.isFinite(parsedDefaultSfxVolume)
    ? clamp(Math.round(parsedDefaultSfxVolume), 0, 100)
    : base.settings.defaultSfxVolume;

  const slots = Array.isArray(meta.slots)
    ? meta.slots
        .filter((slot) => slot && typeof slot.id === 'string')
        .map((slot, idx) => ({
          id: slot.id,
          name: typeof slot.name === 'string' ? slot.name : `Save ${idx + 1}`,
          createdAt: slot.createdAt || new Date().toISOString(),
          updatedAt: slot.updatedAt || new Date().toISOString(),
          summary: {
            coins: clampCurrency(slot.summary?.coins || 0),
            gems: clampCurrency(slot.summary?.gems || 0),
            rebirthTokens: clampCurrency(slot.summary?.rebirthTokens || 0),
            lifetimeCoins: clampCurrency(slot.summary?.lifetimeCoins || 0),
            lifetimeRebirths: clampCurrency(slot.summary?.lifetimeRebirths || 0),
            foxCount: clampCurrency(slot.summary?.foxCount || 0),
            maxTier: clamp(Number(slot.summary?.maxTier) || 1, 1, MAX_TIER),
            highestTier: clamp(Number(slot.summary?.highestTier ?? slot.summary?.maxTier) || 1, 1, MAX_TIER)
          }
        }))
    : [];

  return {
    lastPlayedSlotId:
      typeof meta.lastPlayedSlotId === 'string' && slots.some((slot) => slot.id === meta.lastPlayedSlotId)
        ? meta.lastPlayedSlotId
        : slots[0]?.id || null,
    settings: {
      defaultSound: Boolean(meta.settings?.defaultSound ?? base.settings.defaultSound),
      defaultAnimations: Boolean(meta.settings?.defaultAnimations ?? base.settings.defaultAnimations),
      defaultMusicVolume: safeDefaultMusicVolume,
      defaultSfxVolume: safeDefaultSfxVolume
    },
    slots: slots.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  };
}

function sanitizeState(rawState, nowTs = Date.now()) {
  const base = createInitialState(nowTs);
  if (!rawState || typeof rawState !== 'object') {
    return base;
  }

  const rawMusicVolume = Number(rawState.settings?.musicVolume);
  const rawSfxVolume = Number(rawState.settings?.sfxVolume);

  const currencies = {
    coins: clampCurrency(rawState.currencies?.coins ?? base.currencies.coins),
    gems: clampCurrency(rawState.currencies?.gems ?? base.currencies.gems),
    rebirthTokens: clampCurrency(rawState.currencies?.rebirthTokens ?? base.currencies.rebirthTokens)
  };

  const upgrades = {
    basePurchaseTier: clamp(Number(rawState.upgrades?.basePurchaseTier) || 0, 0, 13),
    passiveIncome: clamp(Number(rawState.upgrades?.passiveIncome) || 0, 0, 60),
    buyDiscount: clamp(Number(rawState.upgrades?.buyDiscount) || 0, 0, 35),
    clickBonus: clamp(Number(rawState.upgrades?.clickBonus) || 0, 0, 40),
    foxLimit: clamp(Number(rawState.upgrades?.foxLimit) || 0, 0, 45),
    gemIncomeMultiplier: clampCurrency(rawState.upgrades?.gemIncomeMultiplier ?? 0),
    gemFoxLimit: clamp(Number(rawState.upgrades?.gemFoxLimit) || 0, 0, 50),
    tickSpeed: clamp(Number(rawState.upgrades?.tickSpeed) || 0, 0, 40),
    purchaseTierChance: clamp(Number(rawState.upgrades?.purchaseTierChance) || 0, 0, 95),
    gemDropRate: clamp(Number(rawState.upgrades?.gemDropRate ?? rawState.upgrades?.gemDropBonus) || 0, 0, 120)
  };

  const temporaryBoosts = {
    turboTick: Math.max(0, Math.floor(Number(rawState.temporaryBoosts?.turboTick) || 0)),
    passiveBurst: Math.max(0, Math.floor(Number(rawState.temporaryBoosts?.passiveBurst) || 0)),
    clickFrenzy: Math.max(0, Math.floor(Number(rawState.temporaryBoosts?.clickFrenzy) || 0)),
    buyCoupon: Math.max(0, Math.floor(Number(rawState.temporaryBoosts?.buyCoupon) || 0))
  };

  const arenaWidth = Math.max(300, Math.floor(rawState.arena?.width || base.arena.width));
  const arenaHeight = Math.max(260, Math.floor(rawState.arena?.height || base.arena.height));

  const foxes = Array.isArray(rawState.foxes)
    ? rawState.foxes
        .slice(0, MAX_FOXES_LIMIT)
        .map((fox) => {
          const tier = clamp(Number(fox.tier) || 1, 1, MAX_TIER);
          const pos = clampFoxPosition(Number(fox.x) || 0, Number(fox.y) || 0, arenaWidth, arenaHeight);
          return {
            id: Number(fox.id) || Math.floor(Math.random() * 1e9),
            tier,
            x: pos.x,
            y: pos.y,
            evolution: fox.evolution || null
          };
        })
    : [];

  const daily = rawState.stats?.daily || {};
  const weekly = rawState.stats?.weekly || {};
  const stats = {
    lifetimeCoinsEarned: clampCurrency(rawState.stats?.lifetimeCoinsEarned ?? base.stats.lifetimeCoinsEarned),
    lifetimeMerges: clampCurrency(rawState.stats?.lifetimeMerges ?? base.stats.lifetimeMerges),
    lifetimeClicks: clampCurrency(rawState.stats?.lifetimeClicks ?? base.stats.lifetimeClicks),
    lifetimeBuys: clampCurrency(rawState.stats?.lifetimeBuys ?? base.stats.lifetimeBuys),
    lifetimeRebirths: clampCurrency(rawState.stats?.lifetimeRebirths ?? base.stats.lifetimeRebirths),
    lifetimeGemDrops: clampCurrency(rawState.stats?.lifetimeGemDrops ?? base.stats.lifetimeGemDrops),
    daily: {
      merges: clampCurrency(daily.merges ?? 0),
      clicks: clampCurrency(daily.clicks ?? 0),
      buys: clampCurrency(daily.buys ?? 0),
      coinsEarned: clampCurrency(daily.coinsEarned ?? 0),
      maxTier: clamp(Number(daily.maxTier) || 1, 1, MAX_TIER)
    },
    weekly: {
      merges: clampCurrency(weekly.merges ?? 0),
      clicks: clampCurrency(weekly.clicks ?? 0),
      buys: clampCurrency(weekly.buys ?? 0),
      coinsEarned: clampCurrency(weekly.coinsEarned ?? 0),
      maxTier: clamp(Number(weekly.maxTier) || 1, 1, MAX_TIER)
    }
  };

  const safeDailyQuests = Array.isArray(rawState.quests?.daily)
    ? rawState.quests.daily
        .filter((quest) => quest && typeof quest.id === 'string')
        .map((quest, idx) => ({
          id: quest.id,
          label: typeof quest.label === 'string' ? quest.label : `Zadanie ${idx + 1}`,
          target: Math.max(1, clampCurrency(quest.target ?? 1)),
          type: typeof quest.type === 'string' ? quest.type : 'coinsEarned',
          reward: Math.max(1, clampCurrency(quest.reward ?? 5)),
          progress: clampCurrency(quest.progress ?? 0),
          claimed: Boolean(quest.claimed)
        }))
    : base.quests.daily;

  const safeWeeklyQuests = Array.isArray(rawState.quests?.weekly)
    ? rawState.quests.weekly
        .filter((quest) => quest && typeof quest.id === 'string')
        .map((quest, idx) => ({
          id: quest.id,
          label: typeof quest.label === 'string' ? quest.label : `Zadanie ${idx + 1}`,
          target: Math.max(1, clampCurrency(quest.target ?? 1)),
          type: typeof quest.type === 'string' ? quest.type : 'coinsEarned',
          reward: Math.max(1, clampCurrency(quest.reward ?? 20)),
          progress: clampCurrency(quest.progress ?? 0),
          claimed: Boolean(quest.claimed)
        }))
    : base.quests.weekly;

  const quests = {
    dailyKey: typeof rawState.quests?.dailyKey === 'string' ? rawState.quests.dailyKey : base.quests.dailyKey,
    weeklyKey: typeof rawState.quests?.weeklyKey === 'string' ? rawState.quests.weeklyKey : base.quests.weeklyKey,
    daily: safeDailyQuests.length > 0 ? safeDailyQuests : base.quests.daily,
    weekly: safeWeeklyQuests.length > 0 ? safeWeeklyQuests : base.quests.weekly,
    loginRewards: {
      lastClaimDailyKey:
        typeof rawState.quests?.loginRewards?.lastClaimDailyKey === 'string'
          ? rawState.quests.loginRewards.lastClaimDailyKey
          : null,
      streakDay: clampCurrency(rawState.quests?.loginRewards?.streakDay ?? 0),
      totalClaims: clampCurrency(rawState.quests?.loginRewards?.totalClaims ?? 0)
    }
  };

  return {
    ...base,
    version: rawState.version || base.version,
    currencies,
    upgrades,
    temporaryBoosts,
    foxes,
    purchaseCount: clampCurrency(rawState.purchaseCount ?? base.purchaseCount),
    settings: {
      sound: Boolean(rawState.settings?.sound ?? base.settings.sound),
      animations: Boolean(rawState.settings?.animations ?? base.settings.animations),
      musicVolume: clamp(Math.round(Number.isFinite(rawMusicVolume) ? rawMusicVolume : base.settings.musicVolume), 0, 100),
      sfxVolume: clamp(Math.round(Number.isFinite(rawSfxVolume) ? rawSfxVolume : base.settings.sfxVolume), 0, 100)
    },
    stats,
    quests,
    meta: {
      nextFoxId: Math.max(
        base.meta.nextFoxId,
        clampCurrency(rawState.meta?.nextFoxId ?? base.meta.nextFoxId),
        foxes.reduce((max, fox) => Math.max(max, fox.id + 1), 1)
      ),
      gemDropCounter: clampCurrency(rawState.meta?.gemDropCounter ?? base.meta.gemDropCounter)
    },
    arena: {
      width: arenaWidth,
      height: arenaHeight
    }
  };
}

function loadLocalMeta() {
  try {
    return sanitizeMeta(JSON.parse(localStorage.getItem(STORAGE_META_KEY) || '{}'));
  } catch (_error) {
    return createDefaultMeta();
  }
}

function writeLocalMeta(meta) {
  localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
}

function getSlotStorageKey(slotId) {
  return `${STORAGE_SLOT_PREFIX}${slotId}`;
}

function buildLocalSummary(state) {
  const foxMaxTier = Array.isArray(state.foxes) ? state.foxes.reduce((max, fox) => Math.max(max, fox?.tier || 1), 1) : 1;
  const highestTier = Math.max(foxMaxTier, Number(state.stats?.daily?.maxTier) || 1);
  return {
    coins: clampCurrency(state.currencies?.coins || 0),
    gems: clampCurrency(state.currencies?.gems || 0),
    rebirthTokens: clampCurrency(state.currencies?.rebirthTokens || 0),
    lifetimeCoins: clampCurrency(state.stats?.lifetimeCoinsEarned || 0),
    lifetimeRebirths: clampCurrency(state.stats?.lifetimeRebirths || 0),
    foxCount: clampCurrency(state.foxes?.length || 0),
    maxTier: clamp(highestTier, 1, MAX_TIER),
    highestTier: clamp(highestTier, 1, MAX_TIER)
  };
}

function makeLocalSlotId() {
  return `slot-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function migrateLegacyLocalSaveIfNeeded() {
  const rawLegacy = localStorage.getItem(STORAGE_LEGACY_KEY);
  if (!rawLegacy) {
    return;
  }

  const currentMeta = loadLocalMeta();
  if (currentMeta.slots.length > 0) {
    localStorage.removeItem(STORAGE_LEGACY_KEY);
    return;
  }

  try {
    const state = sanitizeState(JSON.parse(rawLegacy));
    const slotId = makeLocalSlotId();
    localStorage.setItem(getSlotStorageKey(slotId), JSON.stringify(state));
    const now = new Date().toISOString();
    const nextMeta = sanitizeMeta({
      ...currentMeta,
      lastPlayedSlotId: slotId,
      slots: [
        {
          id: slotId,
          name: 'Save 1',
          createdAt: now,
          updatedAt: now,
          summary: buildLocalSummary(state)
        }
      ]
    });
    writeLocalMeta(nextMeta);
    localStorage.removeItem(STORAGE_LEGACY_KEY);
  } catch (_error) {
    localStorage.removeItem(STORAGE_LEGACY_KEY);
  }
}

export async function listSaveMeta() {
  const bridge = getBridge();
  if (bridge?.listSaves) {
    return sanitizeMeta(await bridge.listSaves());
  }

  migrateLegacyLocalSaveIfNeeded();
  return loadLocalMeta();
}

export async function loadSlotState(slotId) {
  const bridge = getBridge();
  if (bridge?.loadSlot) {
    const loaded = await bridge.loadSlot(slotId);
    if (!loaded) {
      return null;
    }
    return sanitizeState(loaded);
  }

  const raw = localStorage.getItem(getSlotStorageKey(slotId));
  if (!raw) {
    return null;
  }

  try {
    return sanitizeState(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

export async function saveSlotState({ slotId, state, name }) {
  const bridge = getBridge();
  if (bridge?.saveSlot) {
    return bridge.saveSlot({ slotId, state, name });
  }

  migrateLegacyLocalSaveIfNeeded();
  const meta = loadLocalMeta();
  const effectiveSlotId = slotId || makeLocalSlotId();
  localStorage.setItem(getSlotStorageKey(effectiveSlotId), JSON.stringify(state));

  const now = new Date().toISOString();
  const existing = meta.slots.find((slot) => slot.id === effectiveSlotId);
  const nextSlot = {
    id: effectiveSlotId,
    name: name || existing?.name || `Save ${meta.slots.length + 1}`,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    summary: buildLocalSummary(state)
  };

  const withoutCurrent = meta.slots.filter((slot) => slot.id !== effectiveSlotId);
  const nextMeta = sanitizeMeta({
    ...meta,
    lastPlayedSlotId: effectiveSlotId,
    slots: [nextSlot, ...withoutCurrent]
  });

  writeLocalMeta(nextMeta);
  return { slotId: effectiveSlotId };
}

export function saveSlotStateSync({ slotId, state, name }) {
  const bridge = getBridge();
  if (bridge?.saveSlotSync) {
    return bridge.saveSlotSync({ slotId, state, name });
  }

  const effectiveSlotId = slotId || makeLocalSlotId();
  localStorage.setItem(getSlotStorageKey(effectiveSlotId), JSON.stringify(state));
  const meta = loadLocalMeta();
  const now = new Date().toISOString();
  const existing = meta.slots.find((slot) => slot.id === effectiveSlotId);
  const nextSlot = {
    id: effectiveSlotId,
    name: name || existing?.name || `Save ${meta.slots.length + 1}`,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    summary: buildLocalSummary(state)
  };

  const withoutCurrent = meta.slots.filter((slot) => slot.id !== effectiveSlotId);
  const nextMeta = sanitizeMeta({
    ...meta,
    lastPlayedSlotId: effectiveSlotId,
    slots: [nextSlot, ...withoutCurrent]
  });
  writeLocalMeta(nextMeta);
  return { slotId: effectiveSlotId };
}

export async function updateMenuSettings(settings) {
  const bridge = getBridge();
  if (bridge?.updateMetaSettings) {
    return bridge.updateMetaSettings(settings);
  }

  const meta = loadLocalMeta();
  const nextMeta = sanitizeMeta({
    ...meta,
    settings: {
      ...meta.settings,
      ...(settings || {})
    }
  });
  writeLocalMeta(nextMeta);
  return nextMeta.settings;
}

export async function deleteSlot(slotId) {
  const bridge = getBridge();
  if (bridge?.deleteSlot) {
    return bridge.deleteSlot(slotId);
  }

  const meta = loadLocalMeta();
  localStorage.removeItem(getSlotStorageKey(slotId));
  const slots = meta.slots.filter((slot) => slot.id !== slotId);
  const nextMeta = sanitizeMeta({
    ...meta,
    slots,
    lastPlayedSlotId: meta.lastPlayedSlotId === slotId ? slots[0]?.id || null : meta.lastPlayedSlotId
  });
  writeLocalMeta(nextMeta);
  return true;
}

export async function readGameVersion() {
  const bridge = getBridge();
  if (bridge?.getVersion) {
    return bridge.getVersion();
  }
  return 'dev';
}

export async function quitGameApp() {
  const bridge = getBridge();
  if (bridge?.quitApp) {
    return bridge.quitApp();
  }
  window.close();
  return true;
}
