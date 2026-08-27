import { clamp, clampCurrency, clampFoxPosition } from '../game/economy';
import { MAX_FOXES_LIMIT, MAX_TIER } from '../game/constants';
import { createInitialState } from './defaultState';
import { SAVE_DATA_VERSION, sanitizePokedex } from '../game/progression.mjs';
import {
  ELEMENTAL_BOSS_MAX_HP,
  ELEMENTAL_TEAM_MAX_HP,
  createBossBattleState
} from '../game/bossBattle';
import { SPIRIT_MINE_ELEMENTS, createSpiritMineState, getMineShaftCapacity } from '../game/spiritMine';
import {
  apiRequest,
  acknowledgeAdminMessage,
  acceptFriendRequest,
  completeOAuthLogin,
  consumeOAuthTokensFromUrl,
  ensureGuestSession,
  fetchFriends,
  fetchMe,
  fetchLeaderboard,
  fetchPendingAdminMessage,
  getCurrentPrincipal,
  isRemoteApiEnabled,
  loginAccount,
  logoutAccount,
  onOAuthCallback,
  registerAccount,
  removeFriendship,
  searchFriends,
  sendFriendRequest,
  startOAuthLogin,
  sendTelemetryEvents,
  updateNickname
} from './remoteSession';

const STORAGE_LEGACY_KEY = 'fox-evolution-save-v1';
const STORAGE_META_KEY = 'fox-evolution-meta-v2';
const STORAGE_SLOT_PREFIX = 'fox-evolution-slot-';

function toUiNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return clampCurrency(num);
}

function sanitizeIsoTimestamp(value, fallback) {
  const parsed = typeof value === 'string' ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function getUiVersionFallback() {
  if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__) {
    return __APP_VERSION__;
  }
  return 'dev';
}

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
      defaultMusicVolume: 30,
      defaultSfxVolume: 70,
      defaultMusicMuted: false,
      defaultSfxMuted: false,
      defaultFullscreen: false,
      audioDefaultsVersion: 3
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
  const usesCurrentAudioDefaults = Number(meta.settings?.audioDefaultsVersion) >= 2;
  const candidateMusicVolume = Number.isFinite(parsedDefaultMusicVolume) ? parsedDefaultMusicVolume : base.settings.defaultMusicVolume;
  const candidateSfxVolume = Number.isFinite(parsedDefaultSfxVolume) ? parsedDefaultSfxVolume : base.settings.defaultSfxVolume;
  const safeDefaultMusicVolume = clamp(Math.round(!usesCurrentAudioDefaults && candidateMusicVolume === 70 ? 30 : candidateMusicVolume), 0, 100);
  const safeDefaultSfxVolume = clamp(Math.round(!usesCurrentAudioDefaults && candidateSfxVolume === 80 ? 70 : candidateSfxVolume), 0, 100);

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
      defaultSfxVolume: safeDefaultSfxVolume,
      defaultMusicMuted: Boolean(meta.settings?.defaultMusicMuted ?? base.settings.defaultMusicMuted),
      defaultSfxMuted: Boolean(meta.settings?.defaultSfxMuted ?? base.settings.defaultSfxMuted),
      defaultFullscreen: Boolean(meta.settings?.defaultFullscreen ?? base.settings.defaultFullscreen),
      audioDefaultsVersion: 3
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
    rebirthTokens: clampCurrency(rawState.currencies?.rebirthTokens ?? base.currencies.rebirthTokens),
    essence: clampCurrency(rawState.currencies?.essence ?? base.currencies.essence)
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

  let foxes = Array.isArray(rawState.foxes)
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
            evolution: fox.kind === 'hydra' ? null : fox.evolution || null,
            ...(fox.kind === 'hydra' ? {
              kind: 'hydra',
              elementTiers: {
                fire: clamp(Number(fox.elementTiers?.fire) || tier, 20, MAX_TIER),
                electric: clamp(Number(fox.elementTiers?.electric) || tier, 20, MAX_TIER),
                water: clamp(Number(fox.elementTiers?.water) || tier, 20, MAX_TIER)
              }
            } : {})
          };
        })
    : [];

  const daily = rawState.stats?.daily || {};
  const weekly = rawState.stats?.weekly || {};
  const lifetimeStats = Object.fromEntries(
    Object.entries(base.stats)
      .filter(([key, value]) => key !== 'daily' && key !== 'weekly' && typeof value === 'number')
      .map(([key, fallback]) => [key, clampCurrency(rawState.stats?.[key] ?? fallback)])
  );
  const currentHighestTier = foxes.reduce((max, fox) => Math.max(max, fox.tier), 0);
  const currentHighestBaseTier = foxes.reduce((max, fox) => fox.evolution ? max : Math.max(max, fox.tier), 0);
  const currentHighestElementalTier = foxes.reduce((max, fox) => fox.evolution ? Math.max(max, fox.tier) : max, 0);
  const stats = {
    ...lifetimeStats,
    highestTier: clamp(Math.max(lifetimeStats.highestTier, currentHighestTier), 0, MAX_TIER),
    highestBaseTier: clamp(Math.max(lifetimeStats.highestBaseTier, currentHighestBaseTier), 0, 15),
    highestElementalTier: clamp(Math.max(lifetimeStats.highestElementalTier, currentHighestElementalTier), 0, MAX_TIER),
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

  const defaultBossBattle = createBossBattleState();
  const bossStatus = ['idle', 'battle', 'victory', 'defeat'].includes(rawState.bossBattle?.status)
    ? rawState.bossBattle.status
    : defaultBossBattle.status;
  const rawBossHp = Number(rawState.bossBattle?.bossHp);
  const rawTeamHp = Number(rawState.bossBattle?.teamHp);
  const bossBattle = {
    status: bossStatus,
    defeated: Boolean(rawState.bossBattle?.defeated),
    bossHp: clamp(Number.isFinite(rawBossHp) ? rawBossHp : ELEMENTAL_BOSS_MAX_HP, 0, ELEMENTAL_BOSS_MAX_HP),
    teamHp: clamp(Number.isFinite(rawTeamHp) ? rawTeamHp : ELEMENTAL_TEAM_MAX_HP, 0, ELEMENTAL_TEAM_MAX_HP),
    attacks: clampCurrency(rawState.bossBattle?.attacks || 0),
    lastDamage: clampCurrency(rawState.bossBattle?.lastDamage || 0),
    critical: Boolean(rawState.bossBattle?.critical),
    combo: clampCurrency(rawState.bossBattle?.combo || 0),
    bestCombo: clampCurrency(rawState.bossBattle?.bestCombo || 0),
    lastResult: ['success', 'miss'].includes(rawState.bossBattle?.lastResult) ? rawState.bossBattle.lastResult : null,
    teamFoxIds: Array.isArray(rawState.bossBattle?.teamFoxIds)
      ? rawState.bossBattle.teamFoxIds.slice(0, 3).map((id) => Number(id)).filter(Number.isFinite)
      : [],
    teamSnapshot: Array.isArray(rawState.bossBattle?.teamSnapshot)
      ? rawState.bossBattle.teamSnapshot.slice(0, 3).map((fox) => ({
          evolution: fox?.evolution || null,
          tier: clamp(Number(fox?.tier) || 20, 20, MAX_TIER)
        }))
      : []
  };

  if (bossBattle.defeated && !foxes.some((fox) => fox.kind === 'hydra')) {
    const legacyTeam = ['fire', 'electric', 'water'].map((evolution) => foxes
      .filter((fox) => fox.evolution === evolution && fox.tier >= 20)
      .sort((a, b) => b.tier - a.tier)[0] || null);
    if (legacyTeam.every(Boolean)) {
      const legacyIds = new Set(legacyTeam.map((fox) => fox.id));
      const hydraId = foxes.reduce((max, fox) => Math.max(max, fox.id + 1), 1);
      foxes = [...foxes.filter((fox) => !legacyIds.has(fox.id)), {
        id: hydraId,
        kind: 'hydra',
        tier: Math.max(...legacyTeam.map((fox) => fox.tier)),
        x: legacyTeam.reduce((sum, fox) => sum + fox.x, 0) / 3,
        y: legacyTeam.reduce((sum, fox) => sum + fox.y, 0) / 3,
        evolution: null,
        elementTiers: Object.fromEntries(legacyTeam.map((fox) => [fox.evolution, fox.tier]))
      }];
      bossBattle.teamSnapshot = legacyTeam.map((fox) => ({ evolution: fox.evolution, tier: fox.tier }));
    }
  }

  const defaultMine = createSpiritMineState();
  const rawMine = rawState.realms?.spiritMine;
  const mineBase = {
    ...defaultMine,
    unlocked: Boolean(rawMine?.unlocked || bossBattle.defeated),
    totalCollected: clampCurrency(rawMine?.totalCollected || 0),
    lastAdvancedAt: sanitizeIsoTimestamp(rawMine?.lastAdvancedAt, base.meta.lastPlayedAt),
    elevatorLevel: clamp(Number(rawMine?.elevatorLevel) || 1, 1, 100),
    warehouseLevel: clamp(Number(rawMine?.warehouseLevel) || 1, 1, 100)
  };
  const spiritMine = {
    ...mineBase,
    shafts: SPIRIT_MINE_ELEMENTS.map((element) => {
      const rawShaft = rawMine?.shafts?.find((shaft) => shaft?.element === element);
      const fallback = defaultMine.shafts.find((shaft) => shaft.element === element);
      const shaft = {
        element,
        level: clamp(Number(rawShaft?.level) || fallback.level, 1, 100),
        miners: clamp(Number(rawShaft?.miners) || fallback.miners, 1, 25),
        stored: Math.max(0, Number(rawShaft?.stored) || 0)
      };
      return { ...shaft, stored: Math.min(shaft.stored, getMineShaftCapacity(shaft, mineBase)) };
    })
  };

  return {
    ...base,
    version: rawState.version || base.version,
    dataVersion: SAVE_DATA_VERSION,
    currencies,
    upgrades,
    temporaryBoosts,
    foxes,
    purchaseCount: clampCurrency(rawState.purchaseCount ?? base.purchaseCount),
    settings: {
      sound: Boolean(rawState.settings?.sound ?? base.settings.sound),
      animations: Boolean(rawState.settings?.animations ?? base.settings.animations),
      musicVolume: clamp(Math.round(Number.isFinite(rawMusicVolume) ? rawMusicVolume : base.settings.musicVolume), 0, 100),
      sfxVolume: clamp(Math.round(Number.isFinite(rawSfxVolume) ? rawSfxVolume : base.settings.sfxVolume), 0, 100),
      musicMuted: Boolean(rawState.settings?.musicMuted ?? base.settings.musicMuted),
      sfxMuted: Boolean(rawState.settings?.sfxMuted ?? base.settings.sfxMuted)
    },
    stats,
    quests,
    pokedex: sanitizePokedex(rawState.pokedex, foxes, nowTs),
    bossBattle,
    tutorials: {
      elementalFusionSeen: Boolean(rawState.tutorials?.elementalFusionSeen)
    },
    realms: { spiritMine },
    meta: {
      nextFoxId: Math.max(
        base.meta.nextFoxId,
        clampCurrency(rawState.meta?.nextFoxId ?? base.meta.nextFoxId),
        foxes.reduce((max, fox) => Math.max(max, fox.id + 1), 1)
      ),
      gemDropCounter: clampCurrency(rawState.meta?.gemDropCounter ?? base.meta.gemDropCounter),
      createdAt: sanitizeIsoTimestamp(rawState.meta?.createdAt, base.meta.createdAt),
      lastPlayedAt: sanitizeIsoTimestamp(rawState.meta?.lastPlayedAt, base.meta.lastPlayedAt),
      lastEconomyAt: sanitizeIsoTimestamp(rawState.meta?.lastEconomyAt || rawState.meta?.lastPlayedAt, base.meta.lastPlayedAt)
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
  const highestTier = Math.max(foxMaxTier, Number(state.stats?.highestTier) || 0, Number(state.stats?.daily?.maxTier) || 1);
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

function buildMetaWithRemoteSlots(remoteSaves, deviceMeta) {
  const localMeta = sanitizeMeta(deviceMeta || loadLocalMeta());
  const slots = (remoteSaves || []).map((save, index) => ({
    id: save.slotId,
    name: save.name || `Save ${index + 1}`,
    createdAt: save.createdAt || new Date().toISOString(),
    updatedAt: save.updatedAt || new Date().toISOString(),
    summary: {
      coins: toUiNumber(save.summary?.coins),
      gems: toUiNumber(save.summary?.gems),
      rebirthTokens: 0,
      lifetimeCoins: toUiNumber(save.summary?.coins),
      lifetimeRebirths: 0,
      foxCount: 0,
      maxTier: clamp(Number(save.summary?.topTier) || 1, 1, MAX_TIER),
      highestTier: clamp(Number(save.summary?.topTier) || 1, 1, MAX_TIER)
    }
  }));

  return sanitizeMeta({
    ...localMeta,
    lastPlayedSlotId: slots.some((slot) => slot.id === localMeta.lastPlayedSlotId) ? localMeta.lastPlayedSlotId : slots[0]?.id || null,
    slots
  });
}

function normalizeRemoteSaveResponse(payload) {
  const save = payload?.save || null;
  if (!save) {
    return null;
  }
  return {
    state: sanitizeState(save.state),
    updatedAt: save.updatedAt || null,
    slotId: save.slotId || null
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
  let deviceMeta;
  if (bridge?.listSaves) {
    try {
      deviceMeta = sanitizeMeta(await bridge.listSaves());
    } catch (_error) {
      deviceMeta = loadLocalMeta();
    }
  } else {
    migrateLegacyLocalSaveIfNeeded();
    deviceMeta = loadLocalMeta();
  }

  if (isRemoteApiEnabled()) {
    try {
      await ensureGuestSession();
      const payload = await apiRequest('/api/game/saves');
      return buildMetaWithRemoteSlots(payload?.saves || [], deviceMeta);
    } catch (_error) {
      // fallback to local storage if remote API is unavailable
    }
  }

  return deviceMeta;
}

async function loadLocalSlotState(slotId) {
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

export async function loadSlotState(slotId) {
  if (isRemoteApiEnabled()) {
    try {
      await ensureGuestSession();
      const payload = await apiRequest(`/api/game/saves/${encodeURIComponent(slotId)}`);
      const normalized = normalizeRemoteSaveResponse(payload);
      return normalized?.state || null;
    } catch (_error) {
      // fall through to the Electron/local save when the API is unavailable
    }
  }

  return loadLocalSlotState(slotId);
}

export async function saveSlotState({ slotId, state, name }) {
  if (isRemoteApiEnabled()) {
    try {
      await ensureGuestSession();
      const effectiveSlotId = slotId || makeLocalSlotId();
      const payload = await apiRequest(`/api/game/saves/${encodeURIComponent(effectiveSlotId)}`, {
        method: 'PUT',
        body: {
          name,
          state
        }
      });

      sendTelemetryEvents([
        {
          eventType: 'save_upsert',
          payload: { slotId: effectiveSlotId }
        }
      ]);

      const localMeta = loadLocalMeta();
      writeLocalMeta({
        ...localMeta,
        lastPlayedSlotId: effectiveSlotId
      });

      return {
        slotId: payload?.save?.slotId || effectiveSlotId,
        updatedAt: payload?.save?.updatedAt || null
      };
    } catch (_error) {
      // The desktop game remains playable offline and stores the save locally.
    }
  }

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
  return { slotId: effectiveSlotId, updatedAt: now };
}

export async function loadSlotStateWithMeta(slotId) {
  if (isRemoteApiEnabled()) {
    try {
      await ensureGuestSession();
      const payload = await apiRequest(`/api/game/saves/${encodeURIComponent(slotId)}`);
      return normalizeRemoteSaveResponse(payload);
    } catch (_error) {
      // fall through to the Electron/local save when the API is unavailable
    }
  }

  const state = await loadLocalSlotState(slotId);
  if (!state) {
    return null;
  }
  return {
    state,
    updatedAt: null,
    slotId
  };
}

export async function getRemoteSlotUpdatedAt(slotId) {
  if (!isRemoteApiEnabled()) {
    return null;
  }

  try {
    await ensureGuestSession();
    const payload = await apiRequest('/api/game/saves');
    const found = (payload?.saves || []).find((save) => save.slotId === slotId);
    return found?.updatedAt || null;
  } catch (_error) {
    return null;
  }
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
  if (isRemoteApiEnabled()) {
    try {
      await ensureGuestSession();
      await apiRequest(`/api/game/saves/${encodeURIComponent(slotId)}`, {
        method: 'DELETE'
      });

      const meta = loadLocalMeta();
      writeLocalMeta({
        ...meta,
        lastPlayedSlotId: meta.lastPlayedSlotId === slotId ? null : meta.lastPlayedSlotId
      });
      return true;
    } catch (_error) {
      // fall through to the Electron/local save when the API is unavailable
    }
  }

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

export function isRemoteStorageEnabled() {
  return isRemoteApiEnabled();
}

export function getAuthPrincipal() {
  return getCurrentPrincipal();
}

export async function refreshAuthPrincipalFromApi() {
  if (!isRemoteApiEnabled()) {
    return getCurrentPrincipal();
  }
  try {
    const principal = await fetchMe();
    return principal || getCurrentPrincipal();
  } catch (_error) {
    return getCurrentPrincipal();
  }
}

export async function registerGameAccount({ email, password, displayName }) {
  if (!isRemoteApiEnabled()) {
    throw new Error('REMOTE_API_DISABLED');
  }
  return registerAccount({ email, password, displayName });
}

export async function loginGameAccount({ email, password }) {
  if (!isRemoteApiEnabled()) {
    throw new Error('REMOTE_API_DISABLED');
  }
  return loginAccount({ email, password });
}

export async function logoutGameAccount() {
  if (!isRemoteApiEnabled()) {
    return null;
  }
  return logoutAccount();
}

export async function updateGameNickname(nickname) {
  if (!isRemoteApiEnabled()) {
    throw new Error('REMOTE_API_DISABLED');
  }
  return updateNickname(nickname);
}

export async function fetchGameFriends() {
  if (!isRemoteApiEnabled()) {
    return { friends: [], incoming: [], outgoing: [] };
  }
  return fetchFriends();
}

export async function searchGameFriends(query) {
  if (!isRemoteApiEnabled()) {
    return { users: [] };
  }
  return searchFriends(query);
}

export async function sendGameFriendRequest(targetUuid) {
  return sendFriendRequest(targetUuid);
}

export async function acceptGameFriendRequest(friendshipId) {
  return acceptFriendRequest(friendshipId);
}

export async function removeGameFriendship(friendshipId) {
  return removeFriendship(friendshipId);
}

export function beginOAuthLogin(provider) {
  if (!isRemoteApiEnabled()) {
    throw new Error('REMOTE_API_DISABLED');
  }
  return startOAuthLogin(provider);
}

export function completeOAuthLoginFromCallback(callbackUrl) {
  return completeOAuthLogin(callbackUrl);
}

export function onOAuthLoginCallback(handler) {
  return onOAuthCallback(handler);
}

export async function fetchLeaderboardCategory(category, limit = 10) {
  if (!isRemoteApiEnabled()) {
    return null;
  }

  return fetchLeaderboard(category, limit);
}

export async function fetchGameAdminMessage() {
  if (!isRemoteApiEnabled() || getCurrentPrincipal()?.type !== 'USER') {
    return null;
  }
  return fetchPendingAdminMessage();
}

export async function acknowledgeGameAdminMessage(deliveryId) {
  if (!isRemoteApiEnabled()) {
    return false;
  }
  await acknowledgeAdminMessage(deliveryId);
  return true;
}

export async function hydrateSessionFromOAuthRedirect() {
  return consumeOAuthTokensFromUrl();
}

export async function trackTelemetryEvent(eventType, payload = {}) {
  if (!isRemoteApiEnabled()) {
    return false;
  }
  return sendTelemetryEvents([{ eventType, payload, ts: Date.now() }]);
}

export async function readGameVersion() {
  const bridge = getBridge();
  if (bridge?.getVersion) {
    return bridge.getVersion();
  }
  return getUiVersionFallback();
}

export async function setGameFullscreen(enabled) {
  const bridge = getBridge();
  if (bridge?.setFullscreen) {
    return bridge.setFullscreen(Boolean(enabled));
  }
  try {
    if (enabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else if (!enabled && document.fullscreenElement) {
      await document.exitFullscreen();
    }
    return Boolean(document.fullscreenElement);
  } catch (_error) {
    return false;
  }
}

export async function readUpdateState() {
  const bridge = getBridge();
  if (bridge?.getUpdateState) {
    return bridge.getUpdateState();
  }
  return {
    enabled: false,
    status: 'disabled',
    message: 'Updater niedostępny',
    progress: 0,
    updateVersion: null
  };
}

export async function checkForGameUpdates() {
  const bridge = getBridge();
  if (bridge?.checkForUpdates) {
    return bridge.checkForUpdates();
  }
  return null;
}

export async function installGameUpdateAndRestart() {
  const bridge = getBridge();
  if (bridge?.installUpdateAndRestart) {
    return bridge.installUpdateAndRestart();
  }
  return false;
}

export function onGameUpdateStatus(handler) {
  const bridge = getBridge();
  if (bridge?.onUpdateStatus) {
    return bridge.onUpdateStatus(handler);
  }
  return () => {};
}

export async function quitGameApp() {
  const bridge = getBridge();
  if (bridge?.quitApp) {
    return bridge.quitApp();
  }
  window.close();
  return true;
}
