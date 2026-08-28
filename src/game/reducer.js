import { createInitialState } from '../storage/defaultState';
import { recordFoxDiscovery } from './progression.mjs';
import {
  buildWaterBuffMap,
  clamp,
  clampCurrency,
  clampFoxPosition,
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
import {
  ELEMENTAL_BOSS_DEFEAT_COOLDOWN_MS,
  ELEMENTAL_BOSS_MAX_HP,
  ELEMENTAL_BOSS_REWARD_ESSENCE,
  ELEMENTAL_BOSS_REWARD_GEMS,
  ELEMENTAL_TEAM_MAX_HP,
  calculateBossAttackOutcome,
  canMergeHydras,
  canChallengeElementalBoss,
  getElementalBossTeam,
  getElementalTeamAttackPower,
  getHydraLevel
} from './bossBattle';
import {
  SPIRIT_MINE_CURRENCY_KEYS,
  advanceSpiritMine,
  createMineShaft,
  getMineFacilityCost,
  getMineCollectableByElement,
  getMineMinerCost,
  getMineNextRoom,
  getMineShaftUpgradeCost,
  getMineStoredByElement
} from './spiritMine';

export const ACTIONS = {
  INIT_FROM_SAVE: 'INIT_FROM_SAVE',
  CHECK_RESETS: 'CHECK_RESETS',
  SET_ARENA_SIZE: 'SET_ARENA_SIZE',
  BUY_FOX: 'BUY_FOX',
  MOVE_FOX: 'MOVE_FOX',
  TOGGLE_FOX_LOCK: 'TOGGLE_FOX_LOCK',
  MERGE_FOXES: 'MERGE_FOXES',
  CLICK_FOX: 'CLICK_FOX',
  SELL_FOX: 'SELL_FOX',
  EVOLVE_FOX: 'EVOLVE_FOX',
  START_BOSS_BATTLE: 'START_BOSS_BATTLE',
  ATTACK_BOSS: 'ATTACK_BOSS',
  LEAVE_BOSS_BATTLE: 'LEAVE_BOSS_BATTLE',
  ACK_ELEMENTAL_FUSION_TUTORIAL: 'ACK_ELEMENTAL_FUSION_TUTORIAL',
  MINE_COLLECT: 'MINE_COLLECT',
  MINE_UPGRADE_SHAFT: 'MINE_UPGRADE_SHAFT',
  MINE_HIRE_MINER: 'MINE_HIRE_MINER',
  MINE_UNLOCK_ROOM: 'MINE_UNLOCK_ROOM',
  MINE_UPGRADE_ELEVATOR: 'MINE_UPGRADE_ELEVATOR',
  MINE_UPGRADE_WAREHOUSE: 'MINE_UPGRADE_WAREHOUSE',
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
  HARD_RESET_STATE: 'HARD_RESET_STATE',
  RECORD_PLAY_TIME: 'RECORD_PLAY_TIME'
};

const TOGGLEABLE_SETTING_KEYS = new Set(['sound', 'animations', 'musicMuted', 'sfxMuted']);
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
    musicVolume: normalizeVolume(settings.musicVolume, 30),
    sfxVolume: normalizeVolume(settings.sfxVolume, 70),
    musicMuted: Boolean(settings.musicMuted ?? false),
    sfxMuted: Boolean(settings.sfxMuted ?? false)
  };
}

function withNormalizedSettings(state) {
  const normalized = normalizeSettings(state.settings);
  if (
    state.settings?.sound === normalized.sound &&
    state.settings?.animations === normalized.animations &&
    state.settings?.musicVolume === normalized.musicVolume &&
    state.settings?.sfxVolume === normalized.sfxVolume &&
    state.settings?.musicMuted === normalized.musicMuted &&
    state.settings?.sfxMuted === normalized.sfxMuted
  ) {
    return state;
  }

  return {
    ...state,
    settings: normalized
  };
}

const COIN_SOURCE_STAT_KEYS = {
  click: 'lifetimeCoinsFromClicks',
  passive: 'lifetimeCoinsFromPassive',
  sale: 'lifetimeCoinsFromSales',
  instantCash: 'lifetimeCoinsFromInstantCash'
};

function withCoinsGain(state, coins, source = null) {
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
      ...(COIN_SOURCE_STAT_KEYS[source]
        ? { [COIN_SOURCE_STAT_KEYS[source]]: clampCurrency((state.stats[COIN_SOURCE_STAT_KEYS[source]] || 0) + safeCoins) }
        : {}),
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

function withFoxProgress(state, fox, nowTs) {
  if (!fox) {
    return state;
  }
  const isElemental = Boolean(fox.evolution);
  return {
    ...state,
    pokedex: recordFoxDiscovery(state.pokedex, fox, nowTs),
    stats: {
      ...state.stats,
      highestTier: Math.max(state.stats.highestTier || 0, fox.tier),
      highestBaseTier: isElemental ? state.stats.highestBaseTier || 0 : Math.max(state.stats.highestBaseTier || 0, fox.tier),
      highestElementalTier: isElemental ? Math.max(state.stats.highestElementalTier || 0, fox.tier) : state.stats.highestElementalTier || 0
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
      rebirthTokens: clampCurrency(state.currencies.rebirthTokens),
      essence: clampCurrency(state.currencies.essence || 0),
      fireCoins: clampCurrency(state.currencies.fireCoins || 0),
      electricCoins: clampCurrency(state.currencies.electricCoins || 0),
      waterCoins: clampCurrency(state.currencies.waterCoins || 0)
    }
  };
}

function sampleBinomial(trials, probability) {
  const safeTrials = Math.max(0, Math.floor(trials));
  if (safeTrials <= 2000) {
    let hits = 0;
    for (let index = 0; index < safeTrials; index += 1) {
      if (Math.random() < probability) hits += 1;
    }
    return hits;
  }
  const mean = safeTrials * probability;
  const spread = Math.sqrt(safeTrials * probability * (1 - probability));
  const normalish = Array.from({ length: 6 }, () => Math.random()).reduce((sum, value) => sum + value, 0) - 3;
  return clamp(Math.round(mean + normalish * spread), 0, safeTrials);
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

    case ACTIONS.RECORD_PLAY_TIME: {
      const seconds = clampCurrency(action.seconds || 0);
      if (seconds <= 0) {
        return next;
      }
      return {
        ...next,
        stats: {
          ...next.stats,
          playTimeSeconds: clampCurrency((next.stats.playTimeSeconds || 0) + seconds)
        },
        meta: {
          ...next.meta,
          lastPlayedAt: new Date(nowTs).toISOString()
        }
      };
    }

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
        locked: false,
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
          lifetimeCoinsSpent: clampCurrency((next.stats.lifetimeCoinsSpent || 0) + cost),
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

      return refreshQuestProgress(withFoxProgress(updated, newFox, nowTs));
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

    case ACTIONS.TOGGLE_FOX_LOCK:
      return {
        ...next,
        foxes: next.foxes.map((fox) => fox.id === action.id ? { ...fox, locked: !fox.locked } : fox)
      };

    case ACTIONS.MERGE_FOXES: {
      const source = next.foxes.find((fox) => fox.id === action.sourceId);
      const target = next.foxes.find((fox) => fox.id === action.targetId);
      if (!source || !target || source.id === target.id) {
        return next;
      }
      if (source.locked || target.locked) return next;
      const mergingHydras = canMergeHydras(source, target);
      if ((source.kind === 'hydra' || target.kind === 'hydra') && !mergingHydras) return next;
      if (source.tier !== target.tier) {
        if (!mergingHydras) return next;
      }

      const sourceEvo = source.evolution || null;
      const targetEvo = target.evolution || null;
      const bothNonEvolved = !sourceEvo && !targetEvo;
      const bothSameElement = sourceEvo && targetEvo && sourceEvo === targetEvo;

      if (!mergingHydras && !bothNonEvolved && !bothSameElement) {
        return next;
      }

      if (!mergingHydras && bothNonEvolved && target.tier >= BASE_MAX_TIER) {
        return next;
      }

      if (!mergingHydras && bothSameElement && target.tier >= MAX_TIER) {
        return next;
      }

      const newTier = mergingHydras ? Math.max(source.tier, target.tier) : target.tier + 1;
      const newHydraLevel = mergingHydras ? getHydraLevel(target) + 1 : null;
      const mergedFoxes = next.foxes
        .filter((fox) => fox.id !== source.id)
        .map((fox) => {
          if (fox.id !== target.id) {
            return fox;
          }
          return {
            ...fox,
            tier: newTier,
            evolution: mergingHydras ? null : bothSameElement ? targetEvo : null,
            ...(mergingHydras ? {
              hydraLevel: newHydraLevel,
              elementTiers: {
                fire: Math.max(source.elementTiers?.fire || source.tier, target.elementTiers?.fire || target.tier),
                electric: Math.max(source.elementTiers?.electric || source.tier, target.elementTiers?.electric || target.tier),
                water: Math.max(source.elementTiers?.water || source.tier, target.elementTiers?.water || target.tier)
              }
            } : {})
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

      const mergedFox = mergedFoxes.find((fox) => fox.id === target.id);
      return mergingHydras
        ? refreshQuestProgress(updated)
        : refreshQuestProgress(withFoxProgress(updated, mergedFox, nowTs));
    }

    case ACTIONS.CLICK_FOX: {
      const fox = next.foxes.find((item) => item.id === action.id);
      if (!fox) {
        return next;
      }
      const gain = getFoxClickValue(fox, next, nowTs);
      const clicked = withCoinsGain(next, gain, 'click');
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
      if (fox.kind === 'hydra') {
        return next;
      }
      const gain = getFoxSellValue(fox, next, nowTs);
      const withoutFox = {
        ...next,
        foxes: next.foxes.filter((item) => item.id !== action.id),
        stats: {
          ...next.stats,
          lifetimeSells: clampCurrency((next.stats.lifetimeSells || 0) + 1)
        }
      };
      return withCoinsGain(withoutFox, gain, 'sale');
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

      const evolved = {
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
        }),
        stats: {
          ...next.stats,
          lifetimeGemsSpent: clampCurrency((next.stats.lifetimeGemsSpent || 0) + EVOLUTION_COST_GEMS),
          lifetimeEvolutions: clampCurrency((next.stats.lifetimeEvolutions || 0) + 1)
        }
      };
      return withFoxProgress(evolved, evolved.foxes.find((fox) => fox.id === action.id), nowTs);
    }

    case ACTIONS.START_BOSS_BATTLE: {
      if (!canChallengeElementalBoss(next, nowTs)) {
        return next;
      }
      const team = getElementalBossTeam(next.foxes);
      return {
        ...next,
        bossBattle: {
          ...next.bossBattle,
          status: 'battle',
          bossHp: ELEMENTAL_BOSS_MAX_HP,
          teamHp: ELEMENTAL_TEAM_MAX_HP,
          attacks: 0,
          lastDamage: 0,
          critical: false,
          combo: 0,
          bestCombo: 0,
          lastResult: null,
          teamFoxIds: team.map((fox) => fox.id),
          teamSnapshot: team.map((fox) => ({ evolution: fox.evolution, tier: fox.tier })),
          cooldownUntil: null
        }
      };
    }

    case ACTIONS.ATTACK_BOSS: {
      if (next.bossBattle?.status !== 'battle') {
        return next;
      }
      const baseDamage = getElementalTeamAttackPower(next);
      if (baseDamage <= 0) {
        return next;
      }

      const success = Boolean(action.success);
      const outcome = calculateBossAttackOutcome({
        baseDamage,
        bossHp: next.bossBattle.bossHp,
        combo: next.bossBattle.combo,
        success,
        responseMs: action.responseMs,
        allowedMs: action.allowedMs,
        roll: action.roll ?? Math.random()
      });
      const { combo, critical, damage, counterDamage } = outcome;
      const bossHp = Math.max(0, next.bossBattle.bossHp - damage);
      const attacks = (next.bossBattle.attacks || 0) + 1;

      if (bossHp <= 0) {
        const selectedTeam = next.bossBattle.teamFoxIds
          .map((id) => next.foxes.find((fox) => fox.id === id))
          .filter(Boolean);
        if (selectedTeam.length !== 3) {
          return next;
        }
        const teamIdSet = new Set(selectedTeam.map((fox) => fox.id));
        const hydraX = selectedTeam.reduce((sum, fox) => sum + fox.x, 0) / selectedTeam.length;
        const hydraY = selectedTeam.reduce((sum, fox) => sum + fox.y, 0) / selectedTeam.length;
        const hydra = {
          id: next.meta.nextFoxId,
          kind: 'hydra',
          tier: Math.max(...selectedTeam.map((fox) => fox.tier)),
          hydraLevel: 1,
          locked: false,
          x: hydraX,
          y: hydraY,
          evolution: null,
          elementTiers: Object.fromEntries(selectedTeam.map((fox) => [fox.evolution, fox.tier]))
        };
        return {
          ...next,
          currencies: {
            ...next.currencies,
            gems: clampCurrency(next.currencies.gems + ELEMENTAL_BOSS_REWARD_GEMS),
            essence: clampCurrency((next.currencies.essence || 0) + ELEMENTAL_BOSS_REWARD_ESSENCE)
          },
          foxes: [...next.foxes.filter((fox) => !teamIdSet.has(fox.id)), hydra],
          bossBattle: {
            ...next.bossBattle,
            status: 'victory',
            defeated: true,
            bossHp: 0,
            attacks,
            lastDamage: damage,
            critical,
            combo,
            bestCombo: Math.max(next.bossBattle.bestCombo || 0, combo),
            lastResult: 'success',
            cooldownUntil: null
          },
          realms: {
            ...next.realms,
            spiritMine: {
              ...next.realms.spiritMine,
              unlocked: true,
              lastAdvancedAt: new Date(nowTs).toISOString()
            }
          },
          meta: {
            ...next.meta,
            nextFoxId: next.meta.nextFoxId + 1
          },
          stats: {
            ...next.stats,
            lifetimeBossVictories: clampCurrency((next.stats.lifetimeBossVictories || 0) + 1),
            lifetimeGemsEarned: clampCurrency((next.stats.lifetimeGemsEarned || 0) + ELEMENTAL_BOSS_REWARD_GEMS)
          }
        };
      }

      const teamHp = Math.max(0, next.bossBattle.teamHp - counterDamage);
      const defeated = teamHp <= 0;
      const defeatTimestamp = defeated ? new Date(nowTs).toISOString() : next.bossBattle.lastDefeatAt || null;
      return {
        ...next,
        bossBattle: {
          ...next.bossBattle,
          status: defeated ? 'defeat' : 'battle',
          bossHp,
          teamHp,
          attacks,
          lastDamage: damage,
          critical,
          combo,
          bestCombo: Math.max(next.bossBattle.bestCombo || 0, combo),
          lastResult: success ? 'success' : 'miss',
          cooldownUntil: defeated ? new Date(nowTs + ELEMENTAL_BOSS_DEFEAT_COOLDOWN_MS).toISOString() : null,
          lastDefeatAt: defeatTimestamp
        }
      };
    }

    case ACTIONS.LEAVE_BOSS_BATTLE: {
      const forfeited = next.bossBattle?.status === 'battle';
      return {
        ...next,
        bossBattle: {
          ...next.bossBattle,
          status: 'idle',
          bossHp: ELEMENTAL_BOSS_MAX_HP,
          teamHp: ELEMENTAL_TEAM_MAX_HP,
          attacks: 0,
          lastDamage: 0,
          critical: false,
          combo: 0,
          bestCombo: 0,
          lastResult: null,
          teamFoxIds: [],
          teamSnapshot: [],
          cooldownUntil: forfeited
            ? new Date(nowTs + ELEMENTAL_BOSS_DEFEAT_COOLDOWN_MS).toISOString()
            : next.bossBattle.cooldownUntil || null,
          lastDefeatAt: forfeited ? new Date(nowTs).toISOString() : next.bossBattle.lastDefeatAt || null
        }
      };
    }

    case ACTIONS.ACK_ELEMENTAL_FUSION_TUTORIAL:
      return {
        ...next,
        tutorials: {
          ...next.tutorials,
          elementalFusionSeen: true
        }
      };

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
        },
        stats: {
          ...next.stats,
          lifetimeCoinsSpent: clampCurrency((next.stats.lifetimeCoinsSpent || 0) + (config.currency === 'coins' ? cost : 0)),
          lifetimeGemsSpent: clampCurrency((next.stats.lifetimeGemsSpent || 0) + (config.currency === 'gems' ? cost : 0)),
          lifetimeRebirthTokensSpent: clampCurrency((next.stats.lifetimeRebirthTokensSpent || 0) + (config.currency === 'rebirthTokens' ? cost : 0)),
          lifetimeUpgradesBought: clampCurrency((next.stats.lifetimeUpgradesBought || 0) + 1)
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
        },
        stats: {
          ...next.stats,
          lifetimeGemsSpent: clampCurrency((next.stats.lifetimeGemsSpent || 0) + duration.cost),
          lifetimeTemporaryBoostsBought: clampCurrency((next.stats.lifetimeTemporaryBoostsBought || 0) + 1)
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
        },
        stats: {
          ...next.stats,
          lifetimeGemsSpent: clampCurrency((next.stats.lifetimeGemsSpent || 0) + duration.cost),
          lifetimeInstantCashBuys: clampCurrency((next.stats.lifetimeInstantCashBuys || 0) + 1)
        }
      };

      return refreshQuestProgress(withCoinsGain(withSpentGems, instantCoins, 'instantCash'));
    }

    case ACTIONS.MINE_COLLECT: {
      const mine = next.realms?.spiritMine;
      if (!mine?.unlocked) return next;
      const storedByElement = getMineStoredByElement(mine);
      const collectedByElement = getMineCollectableByElement(mine);
      const collected = Object.values(collectedByElement).reduce((sum, amount) => sum + amount, 0);
      if (collected <= 0) return next;
      const remainderElements = new Set();
      const currencies = { ...next.currencies };
      Object.entries(collectedByElement).forEach(([element, amount]) => {
        const currencyKey = SPIRIT_MINE_CURRENCY_KEYS[element];
        currencies[currencyKey] = clampCurrency((currencies[currencyKey] || 0) + amount);
      });
      return {
        ...next,
        currencies,
        realms: {
          ...next.realms,
          spiritMine: {
            ...mine,
            totalCollected: clampCurrency((mine.totalCollected || 0) + collected),
            shafts: mine.shafts.map((shaft) => {
              if (remainderElements.has(shaft.element)) return { ...shaft, stored: 0 };
              remainderElements.add(shaft.element);
              return { ...shaft, stored: storedByElement[shaft.element] - collectedByElement[shaft.element] };
            })
          }
        }
      };
    }

    case ACTIONS.MINE_UPGRADE_SHAFT:
    case ACTIONS.MINE_HIRE_MINER: {
      const mine = next.realms?.spiritMine;
      const shaft = mine?.shafts?.find((item) => item.id === action.roomId);
      if (!mine?.unlocked || !shaft) return next;
      const cost = action.type === ACTIONS.MINE_UPGRADE_SHAFT
        ? getMineShaftUpgradeCost(shaft)
        : getMineMinerCost(shaft);
      const currencyKey = SPIRIT_MINE_CURRENCY_KEYS[shaft.element];
      if ((next.currencies[currencyKey] || 0) < cost) return next;
      return {
        ...next,
        currencies: { ...next.currencies, [currencyKey]: clampCurrency(next.currencies[currencyKey] - cost) },
        realms: {
          ...next.realms,
          spiritMine: {
            ...mine,
            shafts: mine.shafts.map((item) => item.id !== action.roomId ? item : {
              ...item,
              ...(action.type === ACTIONS.MINE_UPGRADE_SHAFT
                ? { level: item.level + 1 }
                : { miners: item.miners + 1 })
            })
          }
        }
      };
    }

    case ACTIONS.MINE_UNLOCK_ROOM: {
      const mine = next.realms?.spiritMine;
      const room = getMineNextRoom(mine);
      if (!mine?.unlocked || !room) return next;
      if ((next.currencies[room.currencyKey] || 0) < room.cost) return next;
      return {
        ...next,
        currencies: {
          ...next.currencies,
          [room.currencyKey]: clampCurrency(next.currencies[room.currencyKey] - room.cost)
        },
        realms: {
          ...next.realms,
          spiritMine: {
            ...mine,
            shafts: [...mine.shafts, createMineShaft(room.room)]
          }
        }
      };
    }

    case ACTIONS.MINE_UPGRADE_ELEVATOR:
    case ACTIONS.MINE_UPGRADE_WAREHOUSE: {
      const mine = next.realms?.spiritMine;
      if (!mine?.unlocked) return next;
      const key = action.type === ACTIONS.MINE_UPGRADE_ELEVATOR ? 'elevatorLevel' : 'warehouseLevel';
      const cost = getMineFacilityCost(mine[key]);
      if ((next.currencies.essence || 0) < cost) return next;
      return {
        ...next,
        currencies: { ...next.currencies, essence: clampCurrency(next.currencies.essence - cost) },
        realms: {
          ...next.realms,
          spiritMine: { ...mine, [key]: mine[key] + 1 }
        }
      };
    }

    case ACTIONS.APPLY_TICK: {
      const requestedTickCount = action.tickCount === undefined ? 1 : Number(action.tickCount);
      const tickCount = clamp(Math.floor(Number.isFinite(requestedTickCount) ? requestedTickCount : 1), 0, 12 * 60 * 60 / 0.3);
      const elapsedSeconds = Math.min(12 * 60 * 60, Math.max(0, Number(action.elapsedSeconds) || 0));
      let coinsGained = 0;
      let gemsGained = 0;
      let gemDropCounter = next.meta.gemDropCounter || 0;
      let gemDropHits = 0;
      const waterBuffMap = buildWaterBuffMap(next);
      const dropRate = getGemDropRate(next);

      next.foxes.forEach((fox) => {
        const hits = sampleBinomial(tickCount, dropRate);
        gemDropHits += hits;
        gemsGained += hits;
        gemDropCounter += hits;
        coinsGained += getFoxIncomePerTickCached(fox, next, waterBuffMap, nowTs) * Math.max(0, tickCount - hits);
      });

      let updated = withCoinsGain(next, coinsGained, 'passive');
      updated = {
        ...updated,
        currencies: {
          ...updated.currencies,
          gems: clampCurrency(updated.currencies.gems + gemsGained)
        },
        meta: {
          ...updated.meta,
          gemDropCounter,
          lastEconomyAt: new Date(nowTs).toISOString()
        },
        realms: {
          ...updated.realms,
          spiritMine: advanceSpiritMine(updated.realms?.spiritMine, elapsedSeconds, nowTs)
        },
        stats: {
          ...updated.stats,
          lifetimeGemDrops: clampCurrency(updated.stats.lifetimeGemDrops + gemDropHits),
          lifetimeGemsEarned: clampCurrency((updated.stats.lifetimeGemsEarned || 0) + gemsGained),
          lifetimeGemsFromDrops: clampCurrency((updated.stats.lifetimeGemsFromDrops || 0) + gemsGained)
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
          rebirthTokens: next.currencies.rebirthTokens + earned,
          essence: next.currencies.essence || 0,
          fireCoins: next.currencies.fireCoins || 0,
          electricCoins: next.currencies.electricCoins || 0,
          waterCoins: next.currencies.waterCoins || 0
        },
        foxes: next.foxes.filter((fox) => fox.kind === 'hydra'),
        upgrades: {
          ...fresh.upgrades,
          ...preservedUpgrades
        },
        settings: next.settings,
        temporaryBoosts: normalizeTemporaryBoosts(next.temporaryBoosts),
        stats: {
          ...next.stats,
          lifetimeRebirths: clampCurrency(next.stats.lifetimeRebirths + 1),
          lifetimeRebirthTokensEarned: clampCurrency((next.stats.lifetimeRebirthTokensEarned || 0) + earned)
        },
        quests: next.quests,
        pokedex: next.pokedex,
        tutorials: next.tutorials,
        realms: next.realms,
        bossBattle: {
          ...next.bossBattle,
          status: 'idle',
          bossHp: ELEMENTAL_BOSS_MAX_HP,
          teamHp: ELEMENTAL_TEAM_MAX_HP,
          attacks: 0,
          lastDamage: 0,
          critical: false,
          combo: 0,
          bestCombo: next.bossBattle.bestCombo || 0,
          lastResult: null
        },
        meta: {
          ...fresh.meta,
          nextFoxId: next.meta.nextFoxId,
          createdAt: next.meta.createdAt,
          lastPlayedAt: new Date(nowTs).toISOString(),
          lastEconomyAt: new Date(nowTs).toISOString()
        },
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
