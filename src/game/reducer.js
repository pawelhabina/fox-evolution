import { createInitialState } from '../storage/defaultState';
import {
  buildWaterBuffMap,
  clamp,
  clampCurrency,
  clampFoxPosition,
  gemsFromDrop,
  getBasePurchaseTier,
  getBuyFoxCost,
  getExpectedCoinsPerSecond,
  getFoxLimit,
  getFoxClickValue,
  getFoxClickValueCached,
  getGemDropRate,
  getFoxIncomePerTickCached,
  getHigherTierChance,
  getFoxSellValue,
  getFoxSellValueCached,
  getRebirthTokensEarned,
  getSafeSpawnPosition,
  getTierData,
  getUpgradeCost
} from './economy';
import {
  BASE_MAX_TIER,
  COIN_UPGRADE_IDS,
  EVOLUTION_COST_GEMS,
  EVOLUTION_TYPES,
  MAX_FOXES_LIMIT,
  MAX_TIER,
  MEGA_TIER,
  TEMP_BOOST_DEFS,
  TEMP_BOOST_DURATION_BY_ID,
  TEMP_BOOST_IDS,
  UPGRADE_DEFS
} from './constants';
import { claimDailyQuest, claimLoginReward, claimWeeklyQuest, ensureTemporalResets, refreshQuestProgress } from './quests';

export const ACTIONS = {
  INIT_FROM_SAVE: 'INIT_FROM_SAVE',
  CHECK_RESETS: 'CHECK_RESETS',
  SET_ARENA_SIZE: 'SET_ARENA_SIZE',
  BUY_FOX: 'BUY_FOX',
  MOVE_FOX: 'MOVE_FOX',
  MERGE_FOXES: 'MERGE_FOXES',
  CLICK_FOX: 'CLICK_FOX',
  SELL_FOX: 'SELL_FOX',
  EVOLVE_FOX: 'EVOLVE_FOX',
  BUY_UPGRADE: 'BUY_UPGRADE',
  BUY_TEMP_BOOST: 'BUY_TEMP_BOOST',
  BUY_INSTANT_CASH: 'BUY_INSTANT_CASH',
  APPLY_TICK: 'APPLY_TICK',
  CLAIM_LOGIN_REWARD: 'CLAIM_LOGIN_REWARD',
  CLAIM_DAILY: 'CLAIM_DAILY',
  CLAIM_WEEKLY: 'CLAIM_WEEKLY',
  TOGGLE_SETTING: 'TOGGLE_SETTING',
  SET_VOLUME: 'SET_VOLUME',
  REBIRTH: 'REBIRTH',
  HARD_RESET_STATE: 'HARD_RESET_STATE'
};

const TOGGLEABLE_SETTING_KEYS = new Set(['sound', 'animations']);
const VOLUME_SETTING_KEYS = new Set(['musicVolume', 'sfxVolume']);

function normalizeVolume(value, fallback) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return clamp(Math.round(raw), 0, 100);
}

function normalizeSettings(settings = {}) {
  return {
    sound: Boolean(settings.sound ?? true),
    animations: Boolean(settings.animations ?? true),
    musicVolume: normalizeVolume(settings.musicVolume, 70),
    sfxVolume: normalizeVolume(settings.sfxVolume, 80)
  };
}

function withNormalizedSettings(state) {
  const normalized = normalizeSettings(state.settings);
  if (
    state.settings?.sound === normalized.sound &&
    state.settings?.animations === normalized.animations &&
    state.settings?.musicVolume === normalized.musicVolume &&
    state.settings?.sfxVolume === normalized.sfxVolume
  ) {
    return state;
  }

  return {
    ...state,
    settings: normalized
  };
}

function withCoinsGain(state, coins) {
  const safeCoins = clampCurrency(coins);
  if (safeCoins <= 0) {
    return state;
  }

  return {
    ...state,
    currencies: {
      ...state.currencies,
      coins: clampCurrency(state.currencies.coins + safeCoins)
    },
    stats: {
      ...state.stats,
      lifetimeCoinsEarned: clampCurrency(state.stats.lifetimeCoinsEarned + safeCoins),
      daily: {
        ...state.stats.daily,
        coinsEarned: clampCurrency(state.stats.daily.coinsEarned + safeCoins)
      },
      weekly: {
        ...state.stats.weekly,
        coinsEarned: clampCurrency(state.stats.weekly.coinsEarned + safeCoins)
      }
    }
  };
}

function clampAllFoxes(foxes, arena) {
  return foxes.map((fox) => {
    const pos = clampFoxPosition(fox.x, fox.y, arena.width, arena.height);
    return {
      ...fox,
      x: pos.x,
      y: pos.y
    };
  });
}

function clampStateCurrencies(state) {
  return {
    ...state,
    currencies: {
      coins: clampCurrency(state.currencies.coins),
      gems: clampCurrency(state.currencies.gems),
      rebirthTokens: clampCurrency(state.currencies.rebirthTokens)
    }
  };
}

function normalizeTemporaryBoosts(temporaryBoosts) {
  return TEMP_BOOST_IDS.reduce((acc, boostId) => {
    acc[boostId] = Math.max(0, Math.floor(Number(temporaryBoosts?.[boostId]) || 0));
    return acc;
  }, {});
}

function pruneExpiredTemporaryBoosts(state, nowTs) {
  const normalized = normalizeTemporaryBoosts(state.temporaryBoosts);
  let changed = false;

  const nextBoosts = TEMP_BOOST_IDS.reduce((acc, boostId) => {
    const untilTs = normalized[boostId];
    if (untilTs > 0 && untilTs <= nowTs) {
      acc[boostId] = 0;
      changed = true;
      return acc;
    }
    acc[boostId] = untilTs;
    if ((state.temporaryBoosts?.[boostId] || 0) !== untilTs) {
      changed = true;
    }
    return acc;
  }, {});

  if (!state.temporaryBoosts) {
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    temporaryBoosts: nextBoosts
  };
}

export function gameReducer(state, action) {
  const nowTs = action.nowTs || Date.now();
  let next = withNormalizedSettings(pruneExpiredTemporaryBoosts(ensureTemporalResets(state, nowTs), nowTs));

  switch (action.type) {
    case ACTIONS.INIT_FROM_SAVE:
      return withNormalizedSettings(pruneExpiredTemporaryBoosts(ensureTemporalResets(action.payload, nowTs), nowTs));

    case ACTIONS.CHECK_RESETS:
      return next;

    case ACTIONS.SET_ARENA_SIZE: {
      const width = Math.max(320, Math.floor(action.width || next.arena.width));
      const height = Math.max(240, Math.floor(action.height || next.arena.height));
      const arena = { width, height };
      return {
        ...next,
        arena,
        foxes: clampAllFoxes(next.foxes, arena)
      };
    }

    case ACTIONS.BUY_FOX: {
      if (next.foxes.length >= getFoxLimit(next)) {
        return next;
      }
      const cost = getBuyFoxCost(next, nowTs);
      if (next.currencies.coins < cost) {
        return next;
      }

      const baseTier = getBasePurchaseTier(next);
      const roll = action.roll ?? Math.random();
      const finalTier = baseTier < BASE_MAX_TIER && roll < getHigherTierChance(next) ? baseTier + 1 : baseTier;
      const pos = getSafeSpawnPosition(next.arena, action.offsetSeed ?? Math.random());

      const newFox = {
        id: next.meta.nextFoxId,
        tier: finalTier,
        x: pos.x,
        y: pos.y,
        evolution: null
      };

      const updated = {
        ...next,
        currencies: {
          ...next.currencies,
          coins: clampCurrency(next.currencies.coins - cost)
        },
        foxes: [...next.foxes, newFox],
        purchaseCount: clampCurrency(next.purchaseCount + 1),
        meta: {
          ...next.meta,
          nextFoxId: next.meta.nextFoxId + 1
        },
        stats: {
          ...next.stats,
          lifetimeBuys: clampCurrency(next.stats.lifetimeBuys + 1),
          daily: {
            ...next.stats.daily,
            buys: clampCurrency(next.stats.daily.buys + 1),
            maxTier: Math.max(next.stats.daily.maxTier, finalTier)
          },
          weekly: {
            ...next.stats.weekly,
            buys: clampCurrency(next.stats.weekly.buys + 1),
            maxTier: Math.max(next.stats.weekly.maxTier, finalTier)
          }
        }
      };

      return refreshQuestProgress(updated);
    }

    case ACTIONS.MOVE_FOX: {
      const arena = next.arena;
      const pos = clampFoxPosition(action.x, action.y, arena.width, arena.height);
      return {
        ...next,
        foxes: next.foxes.map((fox) => {
          if (fox.id !== action.id) {
            return fox;
          }
          return {
            ...fox,
            x: pos.x,
            y: pos.y
          };
        })
      };
    }

    case ACTIONS.MERGE_FOXES: {
      const source = next.foxes.find((fox) => fox.id === action.sourceId);
      const target = next.foxes.find((fox) => fox.id === action.targetId);
      if (!source || !target || source.id === target.id) {
        return next;
      }
      if (source.tier !== target.tier) {
        return next;
      }

      const sourceEvo = source.evolution || null;
      const targetEvo = target.evolution || null;
      const bothNonEvolved = !sourceEvo && !targetEvo;
      const bothSameElement = sourceEvo && targetEvo && sourceEvo === targetEvo;

      if (!bothNonEvolved && !bothSameElement) {
        return next;
      }

      if (bothNonEvolved && target.tier >= BASE_MAX_TIER) {
        return next;
      }

      if (bothSameElement && target.tier >= MAX_TIER) {
        return next;
      }

      const newTier = target.tier + 1;
      const mergedFoxes = next.foxes
        .filter((fox) => fox.id !== source.id)
        .map((fox) => {
          if (fox.id !== target.id) {
            return fox;
          }
          return {
            ...fox,
            tier: newTier,
            evolution: bothSameElement ? targetEvo : null
          };
        });

      const updated = {
        ...next,
        foxes: mergedFoxes,
        stats: {
          ...next.stats,
          lifetimeMerges: clampCurrency(next.stats.lifetimeMerges + 1),
          daily: {
            ...next.stats.daily,
            merges: clampCurrency(next.stats.daily.merges + 1),
            maxTier: Math.max(next.stats.daily.maxTier, newTier)
          },
          weekly: {
            ...next.stats.weekly,
            merges: clampCurrency(next.stats.weekly.merges + 1),
            maxTier: Math.max(next.stats.weekly.maxTier, newTier)
          }
        }
      };

      return refreshQuestProgress(updated);
    }

    case ACTIONS.CLICK_FOX: {
      const fox = next.foxes.find((item) => item.id === action.id);
      if (!fox) {
        return next;
      }
      const gain = getFoxClickValue(fox, next, nowTs);
      const clicked = withCoinsGain(next, gain);
      const updated = {
        ...clicked,
        stats: {
          ...clicked.stats,
          lifetimeClicks: clampCurrency(clicked.stats.lifetimeClicks + 1),
          daily: {
            ...clicked.stats.daily,
            clicks: clampCurrency(clicked.stats.daily.clicks + 1)
          },
          weekly: {
            ...clicked.stats.weekly,
            clicks: clampCurrency(clicked.stats.weekly.clicks + 1)
          }
        }
      };
      return refreshQuestProgress(updated);
    }

    case ACTIONS.SELL_FOX: {
      const fox = next.foxes.find((item) => item.id === action.id);
      if (!fox) {
        return next;
      }
      const gain = getFoxSellValue(fox, next, nowTs);
      const withoutFox = {
        ...next,
        foxes: next.foxes.filter((item) => item.id !== action.id)
      };
      return withCoinsGain(withoutFox, gain);
    }

    case ACTIONS.EVOLVE_FOX: {
      const evo = EVOLUTION_TYPES[action.evolutionId];
      if (!evo) {
        return next;
      }
      if (next.currencies.gems < EVOLUTION_COST_GEMS) {
        return next;
      }

      const canEvolve = next.foxes.some((fox) => fox.id === action.id && fox.tier === MEGA_TIER && !fox.evolution);
      if (!canEvolve) {
        return next;
      }

      return {
        ...next,
        currencies: {
          ...next.currencies,
          gems: clampCurrency(next.currencies.gems - EVOLUTION_COST_GEMS)
        },
        foxes: next.foxes.map((fox) => {
          if (fox.id !== action.id) {
            return fox;
          }
          if (fox.tier !== MEGA_TIER || fox.evolution) {
            return fox;
          }
          return {
            ...fox,
            evolution: evo.id
          };
        })
      };
    }

    case ACTIONS.BUY_UPGRADE: {
      const config = UPGRADE_DEFS[action.upgradeId];
      if (!config) {
        return next;
      }
      const currentLevel = next.upgrades[action.upgradeId] || 0;
      if (Number.isFinite(config.cap) && currentLevel >= config.cap) {
        return next;
      }
      const cost = getUpgradeCost(action.upgradeId, currentLevel);
      const wallet = next.currencies[config.currency] || 0;
      if (wallet < cost) {
        return next;
      }

      return {
        ...next,
        currencies: {
          ...next.currencies,
          [config.currency]: clampCurrency(wallet - cost)
        },
        upgrades: {
          ...next.upgrades,
          [action.upgradeId]: currentLevel + 1
        }
      };
    }

    case ACTIONS.BUY_TEMP_BOOST: {
      const boost = TEMP_BOOST_DEFS[action.boostId];
      const duration = TEMP_BOOST_DURATION_BY_ID[action.durationId];
      if (!boost || !duration) {
        return next;
      }
      if (next.currencies.gems < duration.cost) {
        return next;
      }

      const currentUntil = Number(next.temporaryBoosts?.[boost.id]) || 0;
      const stackedFrom = currentUntil > nowTs ? currentUntil : nowTs;
      const nextUntil = stackedFrom + duration.seconds * 1000;

      return {
        ...next,
        currencies: {
          ...next.currencies,
          gems: clampCurrency(next.currencies.gems - duration.cost)
        },
        temporaryBoosts: {
          ...normalizeTemporaryBoosts(next.temporaryBoosts),
          [boost.id]: nextUntil
        }
      };
    }

    case ACTIONS.BUY_INSTANT_CASH: {
      const duration = TEMP_BOOST_DURATION_BY_ID[action.durationId];
      if (!duration) {
        return next;
      }
      if (next.currencies.gems < duration.cost) {
        return next;
      }

      const expectedPerSecond = getExpectedCoinsPerSecond(next, nowTs);
      const instantCoins = clampCurrency(expectedPerSecond * duration.seconds);
      if (instantCoins <= 0) {
        return next;
      }

      const withSpentGems = {
        ...next,
        currencies: {
          ...next.currencies,
          gems: clampCurrency(next.currencies.gems - duration.cost)
        }
      };

      return refreshQuestProgress(withCoinsGain(withSpentGems, instantCoins));
    }

    case ACTIONS.APPLY_TICK: {
      let coinsGained = 0;
      let gemsGained = 0;
      let gemDropCounter = next.meta.gemDropCounter || 0;
      let gemDropHits = 0;
      const waterBuffMap = buildWaterBuffMap(next);

      next.foxes.forEach((fox) => {
        const roll = Math.random();
        if (roll < getGemDropRate(next)) {
          const drop = gemsFromDrop(gemDropCounter, next.upgrades.gemDropRate || 0);
          gemDropCounter = drop.nextCounter;
          gemsGained += drop.gems;
          gemDropHits += 1;
          return;
        }
        coinsGained += getFoxIncomePerTickCached(fox, next, waterBuffMap, nowTs);
      });

      let updated = withCoinsGain(next, coinsGained);
      updated = {
        ...updated,
        currencies: {
          ...updated.currencies,
          gems: clampCurrency(updated.currencies.gems + gemsGained)
        },
        meta: {
          ...updated.meta,
          gemDropCounter
        },
        stats: {
          ...updated.stats,
          lifetimeGemDrops: clampCurrency(updated.stats.lifetimeGemDrops + gemDropHits)
        }
      };

      return refreshQuestProgress(updated);
    }

    case ACTIONS.CLAIM_DAILY:
      return claimDailyQuest(next, action.questId);

    case ACTIONS.CLAIM_LOGIN_REWARD:
      return claimLoginReward(next);

    case ACTIONS.CLAIM_WEEKLY:
      return claimWeeklyQuest(next, action.questId);

    case ACTIONS.TOGGLE_SETTING: {
      if (!TOGGLEABLE_SETTING_KEYS.has(action.key)) {
        return next;
      }
      return {
        ...next,
        settings: {
          ...next.settings,
          [action.key]: !next.settings[action.key]
        }
      };
    }

    case ACTIONS.SET_VOLUME: {
      if (!VOLUME_SETTING_KEYS.has(action.key)) {
        return next;
      }
      const fallback = action.key === 'musicVolume' ? next.settings.musicVolume : next.settings.sfxVolume;
      const nextVolume = normalizeVolume(action.value, fallback);
      if (next.settings[action.key] === nextVolume) {
        return next;
      }
      return {
        ...next,
        settings: {
          ...next.settings,
          [action.key]: nextVolume
        }
      };
    }

    case ACTIONS.REBIRTH: {
      const earned = getRebirthTokensEarned(next);
      if (earned <= 0) {
        return next;
      }

      const fresh = createInitialState(nowTs);
      const preservedUpgrades = Object.keys(next.upgrades).reduce((acc, key) => {
        acc[key] = COIN_UPGRADE_IDS.includes(key) ? 0 : next.upgrades[key];
        return acc;
      }, {});
      const rebirthed = {
        ...fresh,
        currencies: {
          ...fresh.currencies,
          gems: next.currencies.gems,
          rebirthTokens: next.currencies.rebirthTokens + earned
        },
        upgrades: {
          ...fresh.upgrades,
          ...preservedUpgrades
        },
        settings: next.settings,
        temporaryBoosts: normalizeTemporaryBoosts(next.temporaryBoosts),
        stats: {
          ...next.stats,
          lifetimeRebirths: clampCurrency(next.stats.lifetimeRebirths + 1)
        },
        quests: next.quests,
        arena: next.arena
      };

      return refreshQuestProgress(rebirthed);
    }

    case ACTIONS.HARD_RESET_STATE:
      return createInitialState(nowTs);

    default:
      return next;
  }
}

export function canAffordBuyFox(state) {
  return state.currencies.coins >= getBuyFoxCost(state, Date.now());
}

export function canRebirth(state) {
  return getRebirthTokensEarned(state) > 0;
}

export function sanitizeReducerOutput(state) {
  const clampedFoxes = state.foxes.slice(0, MAX_FOXES_LIMIT).map((fox) => ({
    ...fox,
    tier: clamp(fox.tier, 1, MAX_TIER)
  }));

  return clampStateCurrencies({
    ...state,
    foxes: clampedFoxes
  });
}

export function getFoxInfoForMenu(state, foxId) {
  const fox = state.foxes.find((item) => item.id === foxId);
  if (!fox) {
    return null;
  }

  const tierData = getTierData(fox.tier);
  const waterBuffMap = buildWaterBuffMap(state);
  const nowTs = Date.now();
  return {
    fox,
    tierData,
    income: getFoxIncomePerTickCached(fox, state, waterBuffMap, nowTs),
    clickValue: getFoxClickValueCached(fox, state, waterBuffMap, nowTs),
    sellValue: getFoxSellValueCached(fox, state, waterBuffMap, nowTs)
  };
}
