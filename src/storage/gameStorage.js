import { clamp, clampCurrency, clampFoxPosition } from '../game/economy';
import { MAX_FOXES_LIMIT, MAX_TIER } from '../game/constants';
import { createInitialState } from './defaultState';

const STORAGE_KEY = 'fox-evolution-save-v1';

function getBridge() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.foxEvolution || null;
}

function sanitizeState(rawState, nowTs = Date.now()) {
  const base = createInitialState(nowTs);
  if (!rawState || typeof rawState !== 'object') {
    return base;
  }

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
    foxLimit: clamp(Number(rawState.upgrades?.foxLimit ?? rawState.upgrades?.gemDropBonus) || 0, 0, 45)
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
    }
  };

  const safeDailyQuests = Array.isArray(rawState.quests?.daily)
    ? base.quests.daily.map((template) => {
        const savedQuest = rawState.quests.daily.find((quest) => quest?.id === template.id);
        if (!savedQuest) {
          return template;
        }
        return {
          ...template,
          progress: clampCurrency(savedQuest.progress ?? template.progress),
          claimed: Boolean(savedQuest.claimed)
        };
      })
    : base.quests.daily;

  const quests = {
    dailyKey: typeof rawState.quests?.dailyKey === 'string' ? rawState.quests.dailyKey : base.quests.dailyKey,
    weeklyKey: typeof rawState.quests?.weeklyKey === 'string' ? rawState.quests.weeklyKey : base.quests.weeklyKey,
    daily: safeDailyQuests,
    weekly: {
      claimed: Boolean(rawState.quests?.weekly?.claimed ?? base.quests.weekly.claimed),
      reward: clampCurrency(rawState.quests?.weekly?.reward ?? base.quests.weekly.reward)
    }
  };

  return {
    ...base,
    version: rawState.version || base.version,
    currencies,
    upgrades,
    foxes,
    purchaseCount: clampCurrency(rawState.purchaseCount ?? base.purchaseCount),
    settings: {
      sound: Boolean(rawState.settings?.sound ?? base.settings.sound),
      animations: Boolean(rawState.settings?.animations ?? base.settings.animations)
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

export async function loadPersistedState() {
  const bridge = getBridge();
  if (bridge?.loadGame) {
    const loaded = await bridge.loadGame();
    return sanitizeState(loaded);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    return sanitizeState(JSON.parse(raw));
  } catch (_error) {
    return createInitialState();
  }
}

export async function savePersistedState(state) {
  const bridge = getBridge();
  if (bridge?.saveGame) {
    return bridge.saveGame(state);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return true;
}

export function savePersistedStateSync(state) {
  const bridge = getBridge();
  if (bridge?.saveGameSync) {
    return bridge.saveGameSync(state);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return true;
}

export async function hardResetPersistedState() {
  const bridge = getBridge();
  if (bridge?.hardReset) {
    return bridge.hardReset();
  }
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

export async function readGameVersion() {
  const bridge = getBridge();
  if (bridge?.getVersion) {
    return bridge.getVersion();
  }
  return 'dev';
}
