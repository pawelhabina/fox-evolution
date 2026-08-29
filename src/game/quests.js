import {
  DAILY_QUEST_POOL,
  DAILY_QUEST_REWARD,
  LOGIN_MONTHLY_STEP,
  LOGIN_REWARD_VALUES,
  LOGIN_STREAK_DAYS,
  QUESTS_PER_SECTION,
  WEEKLY_QUEST_POOL,
  WEEKLY_QUEST_REWARD
} from './constants';
import { getBuyFoxCost, getExpectedCoinsPerSecond } from './economy';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const QUEST_SCALING_VERSION = 2;

export function getQuestGameStage(state) {
  if (state?.realms?.spiritMine?.unlocked) return 4;
  const rebirths = Math.max(0, Number(state?.stats?.lifetimeRebirths) || 0);
  const highestTier = Math.max(0, Number(state?.stats?.highestTier) || 0);
  if (rebirths >= 5 || highestTier >= 20) return 3;
  if (rebirths >= 1 || highestTier >= 15) return 2;
  if (highestTier >= 8) return 1;
  return 0;
}

function roundQuestTarget(value) {
  const safe = Math.max(1, Number(value) || 1);
  if (safe < 100) return Math.ceil(safe);
  const magnitude = 10 ** Math.max(1, Math.floor(Math.log10(safe)) - 1);
  return Math.ceil(safe / magnitude) * magnitude;
}

function getScaledQuestLabel(type, target) {
  const formatted = Math.floor(target).toLocaleString('pl-PL');
  const labels = {
    merges: `Wykonaj ${formatted} połączeń`,
    clicks: `Kliknij lisy ${formatted} razy`,
    buys: `Kup ${formatted} lisów`,
    maxTier: `Osiągnij tier ${formatted}`,
    coinsEarned: `Zarób ${formatted} monet`,
    upgrades: `Kup ${formatted} ulepszeń`,
    sells: `Sprzedaj ${formatted} lisów`,
    rebirths: `Wykonaj rebirth ${formatted} razy`,
    evolutions: `Wykonaj ${formatted} ewolucji`,
    mineCollects: `Odbierz magazyn ${formatted} razy`
  };
  return labels[type] || `Osiągnij wynik ${formatted}`;
}

export function scaleQuestDefinition(quest, state, period = 'daily') {
  const stage = getQuestGameStage(state);
  const weekly = period === 'weekly';
  let target = Math.max(1, Number(quest.target) || 1);
  const countScale = 1 + stage * (weekly ? 0.45 : 0.35);

  if (['merges', 'buys', 'upgrades', 'sells', 'evolutions', 'mineCollects'].includes(quest.type)) {
    target *= countScale;
  } else if (quest.type === 'clicks') {
    target *= 1 + stage * 0.65;
  } else if (quest.type === 'rebirths') {
    target = weekly ? Math.max(target, 1 + Math.floor(stage / 2)) : 1;
  } else if (quest.type === 'maxTier') {
    const highestTier = Math.max(1, Number(state?.stats?.highestTier) || 1);
    target = Math.min(30, Math.max(target, Math.min(highestTier, 15 + stage * 2)));
  } else if (quest.type === 'coinsEarned') {
    const hasEconomyState = Boolean(state?.upgrades && state?.currencies && Array.isArray(state?.foxes));
    const incomePerSecond = hasEconomyState ? Math.max(0, getExpectedCoinsPerSecond(state)) : 0;
    const foxCost = hasEconomyState ? Math.max(1, getBuyFoxCost(state)) : 10;
    const phaseFloor = target * 10 ** stage;
    const incomeFloor = incomePerSecond * (weekly ? 4 * 60 * 60 : 20 * 60);
    const purchaseFloor = foxCost * (weekly ? 180 : 20);
    target = Math.max(target, phaseFloor, incomeFloor, purchaseFloor);
  }

  const scaledTarget = roundQuestTarget(target);
  return {
    ...quest,
    target: scaledTarget,
    label: getScaledQuestLabel(quest.type, scaledTarget),
    scaled: true,
    stage
  };
}

function pickRandomQuests(pool, count, reward, state, period) {
  const stage = getQuestGameStage(state);
  const available = pool.filter((quest) => (
    stage >= (quest.minStage || 0)
    && (!quest.requiresMine || state?.realms?.spiritMine?.unlocked)
  ));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((definition) => ({
    ...scaleQuestDefinition(definition, state, period),
    progress: 0,
    claimed: false,
    reward
  }));
}

function syncQuestDefinitions(quests, pool, reward) {
  const definitionsById = new Map(pool.map((quest) => [quest.id, quest]));
  return quests.map((quest) => {
    const definition = definitionsById.get(quest.id);
    if (!definition) {
      return quest;
    }
    return {
      ...definition,
      ...quest,
      reward
    };
  });
}

function migrateQuestScaling(quests, pool, reward, state, period) {
  const definitionsById = new Map(pool.map((quest) => [quest.id, quest]));
  return quests.map((quest) => {
    const definition = definitionsById.get(quest.id);
    if (!definition) return quest;
    return {
      ...scaleQuestDefinition(definition, state, period),
      progress: Math.max(0, Number(quest.progress) || 0),
      claimed: Boolean(quest.claimed),
      reward: Math.max(1, Number(quest.reward) || reward)
    };
  });
}

function getCurrentDailyPeriodStart(nowTs = Date.now()) {
  const now = new Date(nowTs);
  const start = new Date(now);
  start.setHours(5, 0, 0, 0);

  if (now < start) {
    start.setDate(start.getDate() - 1);
  }

  return start;
}

function getCurrentWeeklyPeriodStart(nowTs = Date.now()) {
  const now = new Date(nowTs);
  const start = new Date(now);
  start.setHours(5, 0, 0, 0);

  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);

  if (now < start) {
    start.setDate(start.getDate() - 7);
  }

  return start;
}

function makeKeyFromDate(date) {
  return String(date.getTime());
}

export function getCurrentTemporalKeys(nowTs = Date.now()) {
  const dailyStart = getCurrentDailyPeriodStart(nowTs);
  const weeklyStart = getCurrentWeeklyPeriodStart(nowTs);

  return {
    dayKey: makeKeyFromDate(dailyStart),
    weekKey: makeKeyFromDate(weeklyStart),
    dayStartTs: dailyStart.getTime(),
    weekStartTs: weeklyStart.getTime()
  };
}

export function getResetCountdowns(nowTs = Date.now()) {
  const { dayStartTs, weekStartTs } = getCurrentTemporalKeys(nowTs);
  return {
    dailyResetInSeconds: Math.max(0, Math.floor((dayStartTs + DAY_MS - nowTs) / 1000)),
    weeklyResetInSeconds: Math.max(0, Math.floor((weekStartTs + WEEK_MS - nowTs) / 1000))
  };
}

export function createDailyQuests(state = null) {
  return pickRandomQuests(DAILY_QUEST_POOL, QUESTS_PER_SECTION, DAILY_QUEST_REWARD, state, 'daily');
}

export function createWeeklyQuests(state = null) {
  return pickRandomQuests(WEEKLY_QUEST_POOL, QUESTS_PER_SECTION, WEEKLY_QUEST_REWARD, state, 'weekly');
}

export function createQuestState(nowTs = Date.now(), state = null) {
  const { dayKey, weekKey } = getCurrentTemporalKeys(nowTs);
  return {
    dailyKey: dayKey,
    weeklyKey: weekKey,
    scalingVersion: QUEST_SCALING_VERSION,
    daily: createDailyQuests(state),
    weekly: createWeeklyQuests(state),
    loginRewards: {
      lastClaimDailyKey: null,
      streakDay: 0,
      totalClaims: 0
    }
  };
}

export function resetDailyStats(dailyStats, foxes) {
  const currentMaxTier = foxes.reduce((max, fox) => Math.max(max, fox.tier), 1);
  return {
    ...dailyStats,
    merges: 0,
    clicks: 0,
    buys: 0,
    coinsEarned: 0,
    maxTier: currentMaxTier,
    upgrades: 0,
    sells: 0,
    rebirths: 0,
    evolutions: 0,
    mineCollects: 0
  };
}

export function resetWeeklyStats(weeklyStats, foxes) {
  const currentMaxTier = foxes.reduce((max, fox) => Math.max(max, fox.tier), 1);
  return {
    ...weeklyStats,
    merges: 0,
    clicks: 0,
    buys: 0,
    coinsEarned: 0,
    maxTier: currentMaxTier,
    upgrades: 0,
    sells: 0,
    rebirths: 0,
    evolutions: 0,
    mineCollects: 0
  };
}

function mapQuestProgress(quests, stats) {
  return quests.map((quest) => {
    let progress = quest.progress;

    if (quest.type === 'merges') {
      progress = stats.merges;
    }
    if (quest.type === 'clicks') {
      progress = stats.clicks;
    }
    if (quest.type === 'buys') {
      progress = stats.buys;
    }
    if (quest.type === 'maxTier') {
      progress = stats.maxTier;
    }
    if (quest.type === 'coinsEarned') {
      progress = stats.coinsEarned;
    }
    if (quest.type === 'upgrades') progress = stats.upgrades;
    if (quest.type === 'sells') progress = stats.sells;
    if (quest.type === 'rebirths') progress = stats.rebirths;
    if (quest.type === 'evolutions') progress = stats.evolutions;
    if (quest.type === 'mineCollects') progress = stats.mineCollects;

    const numericProgress = Number(progress);
    return {
      ...quest,
      progress: Math.max(0, Math.floor(Number.isFinite(numericProgress) ? numericProgress : 0))
    };
  });
}

export function refreshQuestProgress(state) {
  return {
    ...state,
    quests: {
      ...state.quests,
      daily: mapQuestProgress(state.quests.daily, state.stats.daily),
      weekly: mapQuestProgress(state.quests.weekly, state.stats.weekly)
    }
  };
}

function normalizeLoginRewards(loginRewards) {
  return {
    lastClaimDailyKey: loginRewards?.lastClaimDailyKey || null,
    streakDay: Math.max(0, Math.floor(loginRewards?.streakDay || 0)),
    totalClaims: Math.max(0, Math.floor(loginRewards?.totalClaims || 0))
  };
}

function shouldResetStreakOnDailyChange(oldDayKey, newDayKey, loginRewards) {
  const oldTs = Number(oldDayKey) || 0;
  const newTs = Number(newDayKey) || 0;
  if (!oldTs || !newTs || newTs <= oldTs) {
    return false;
  }

  const periodsPassed = Math.floor((newTs - oldTs) / DAY_MS);
  if (periodsPassed > 1) {
    return true;
  }

  return loginRewards.lastClaimDailyKey !== oldDayKey;
}

export function ensureTemporalResets(state, nowTs = Date.now()) {
  const { dayKey, weekKey } = getCurrentTemporalKeys(nowTs);
  let nextState = { ...state };

  if (!nextState.stats?.daily || !nextState.stats?.weekly) {
    nextState = {
      ...nextState,
      stats: {
        ...nextState.stats,
        daily: nextState.stats?.daily ? nextState.stats.daily : resetDailyStats({}, nextState.foxes),
        weekly: nextState.stats?.weekly ? nextState.stats.weekly : resetWeeklyStats({}, nextState.foxes)
      }
    };
  }

  if (!Array.isArray(nextState.quests?.daily) || !Array.isArray(nextState.quests?.weekly)) {
    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        daily: Array.isArray(nextState.quests?.daily) ? nextState.quests.daily : createDailyQuests(nextState),
        weekly: Array.isArray(nextState.quests?.weekly) ? nextState.quests.weekly : createWeeklyQuests(nextState)
      }
    };
  }

  if (typeof nextState.quests.dailyKey !== 'string' || typeof nextState.quests.weeklyKey !== 'string') {
    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        dailyKey: typeof nextState.quests.dailyKey === 'string' ? nextState.quests.dailyKey : dayKey,
        weeklyKey: typeof nextState.quests.weeklyKey === 'string' ? nextState.quests.weeklyKey : weekKey
      }
    };
  }

  if (!nextState.quests.loginRewards) {
    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        loginRewards: normalizeLoginRewards(nextState.quests.loginRewards)
      }
    };
  }

  if ((Number(nextState.quests.scalingVersion) || 0) < QUEST_SCALING_VERSION) {
    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        scalingVersion: QUEST_SCALING_VERSION,
        daily: migrateQuestScaling(nextState.quests.daily, DAILY_QUEST_POOL, DAILY_QUEST_REWARD, nextState, 'daily'),
        weekly: migrateQuestScaling(nextState.quests.weekly, WEEKLY_QUEST_POOL, WEEKLY_QUEST_REWARD, nextState, 'weekly')
      }
    };
  }

  nextState = {
    ...nextState,
    quests: {
      ...nextState.quests,
      daily: syncQuestDefinitions(nextState.quests.daily, DAILY_QUEST_POOL, DAILY_QUEST_REWARD),
      weekly: syncQuestDefinitions(nextState.quests.weekly, WEEKLY_QUEST_POOL, WEEKLY_QUEST_REWARD)
    }
  };

  if (nextState.quests.dailyKey !== dayKey) {
    const loginRewards = normalizeLoginRewards(nextState.quests.loginRewards);
    const resetStreak = shouldResetStreakOnDailyChange(nextState.quests.dailyKey, dayKey, loginRewards);

    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        dailyKey: dayKey,
        daily: createDailyQuests(nextState),
        loginRewards: {
          ...loginRewards,
          streakDay: resetStreak ? 0 : loginRewards.streakDay
        }
      },
      stats: {
        ...nextState.stats,
        daily: resetDailyStats(nextState.stats.daily, nextState.foxes)
      }
    };
  }

  if (nextState.quests.weeklyKey !== weekKey) {
    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        weeklyKey: weekKey,
        weekly: createWeeklyQuests(nextState)
      },
      stats: {
        ...nextState.stats,
        weekly: resetWeeklyStats(nextState.stats.weekly, nextState.foxes)
      }
    };
  }

  return refreshQuestProgress(nextState);
}

export function claimDailyQuest(state, questId) {
  const targetQuest = state.quests.daily.find((quest) => quest.id === questId);
  if (!targetQuest || targetQuest.claimed || targetQuest.progress < targetQuest.target) {
    return state;
  }

  return {
    ...state,
    currencies: {
      ...state.currencies,
      gems: state.currencies.gems + targetQuest.reward
    },
    stats: {
      ...state.stats,
      lifetimeGemsEarned: (state.stats.lifetimeGemsEarned || 0) + targetQuest.reward,
      lifetimeGemsFromQuests: (state.stats.lifetimeGemsFromQuests || 0) + targetQuest.reward,
      lifetimeDailyQuestsClaimed: (state.stats.lifetimeDailyQuestsClaimed || 0) + 1
    },
    quests: {
      ...state.quests,
      daily: state.quests.daily.map((quest) => {
        if (quest.id !== questId) {
          return quest;
        }
        return {
          ...quest,
          claimed: true
        };
      })
    }
  };
}

export function claimWeeklyQuest(state, questId) {
  const targetQuest = state.quests.weekly.find((quest) => quest.id === questId);
  if (!targetQuest || targetQuest.claimed || targetQuest.progress < targetQuest.target) {
    return state;
  }

  return {
    ...state,
    currencies: {
      ...state.currencies,
      gems: state.currencies.gems + targetQuest.reward
    },
    stats: {
      ...state.stats,
      lifetimeGemsEarned: (state.stats.lifetimeGemsEarned || 0) + targetQuest.reward,
      lifetimeGemsFromQuests: (state.stats.lifetimeGemsFromQuests || 0) + targetQuest.reward,
      lifetimeWeeklyQuestsClaimed: (state.stats.lifetimeWeeklyQuestsClaimed || 0) + 1
    },
    quests: {
      ...state.quests,
      weekly: state.quests.weekly.map((quest) => {
        if (quest.id !== questId) {
          return quest;
        }
        return {
          ...quest,
          claimed: true
        };
      })
    }
  };
}

export function getTodayLoginRewardInfo(state) {
  const login = normalizeLoginRewards(state.quests.loginRewards);
  const currentDailyKey = state.quests.dailyKey;
  const alreadyClaimedToday = login.lastClaimDailyKey === currentDailyKey;

  const nextStreakDay = ((login.streakDay % LOGIN_STREAK_DAYS) || 0) + 1;
  const nextTotalClaims = login.totalClaims + 1;

  let type = 'common';
  let amount = LOGIN_REWARD_VALUES.common;

  if (nextTotalClaims % LOGIN_MONTHLY_STEP === 0) {
    type = 'legendary';
    amount = LOGIN_REWARD_VALUES.legendary;
  } else if (nextStreakDay === LOGIN_STREAK_DAYS) {
    type = 'epic';
    amount = LOGIN_REWARD_VALUES.epic;
  } else if (nextStreakDay <= 3) {
    type = 'early';
    amount = LOGIN_REWARD_VALUES.early;
  }

  return {
    canClaim: !alreadyClaimedToday,
    alreadyClaimedToday,
    nextStreakDay,
    type,
    amount,
    totalClaims: login.totalClaims,
    monthlyProgress: login.totalClaims % LOGIN_MONTHLY_STEP,
    monthlyTarget: LOGIN_MONTHLY_STEP
  };
}

export function getLoginRewardForStreakDay(dayNumber) {
  const safeDay = Math.max(1, Math.min(LOGIN_STREAK_DAYS, Math.floor(Number(dayNumber) || 1)));
  if (safeDay === LOGIN_STREAK_DAYS) {
    return LOGIN_REWARD_VALUES.epic;
  }
  if (safeDay <= 3) {
    return LOGIN_REWARD_VALUES.early;
  }
  return LOGIN_REWARD_VALUES.common;
}

export function claimLoginReward(state) {
  const info = getTodayLoginRewardInfo(state);
  if (!info.canClaim) {
    return state;
  }

  const login = normalizeLoginRewards(state.quests.loginRewards);
  return {
    ...state,
    currencies: {
      ...state.currencies,
      gems: state.currencies.gems + info.amount
    },
    stats: {
      ...state.stats,
      lifetimeGemsEarned: (state.stats.lifetimeGemsEarned || 0) + info.amount,
      lifetimeGemsFromLoginRewards: (state.stats.lifetimeGemsFromLoginRewards || 0) + info.amount,
      lifetimeLoginRewardsClaimed: (state.stats.lifetimeLoginRewardsClaimed || 0) + 1
    },
    quests: {
      ...state.quests,
      loginRewards: {
        ...login,
        lastClaimDailyKey: state.quests.dailyKey,
        streakDay: info.nextStreakDay,
        totalClaims: login.totalClaims + 1
      }
    }
  };
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
