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

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function pickRandomQuests(pool, count, reward) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((quest) => ({
    ...quest,
    progress: 0,
    claimed: false,
    reward
  }));
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

export function createDailyQuests() {
  return pickRandomQuests(DAILY_QUEST_POOL, QUESTS_PER_SECTION, DAILY_QUEST_REWARD);
}

export function createWeeklyQuests() {
  return pickRandomQuests(WEEKLY_QUEST_POOL, QUESTS_PER_SECTION, WEEKLY_QUEST_REWARD);
}

export function createQuestState(nowTs = Date.now()) {
  const { dayKey, weekKey } = getCurrentTemporalKeys(nowTs);
  return {
    dailyKey: dayKey,
    weeklyKey: weekKey,
    daily: createDailyQuests(),
    weekly: createWeeklyQuests(),
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
    maxTier: currentMaxTier
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
    maxTier: currentMaxTier
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

    return {
      ...quest,
      progress: Math.max(0, Math.floor(progress))
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
        daily: Array.isArray(nextState.quests?.daily) ? nextState.quests.daily : createDailyQuests(),
        weekly: Array.isArray(nextState.quests?.weekly) ? nextState.quests.weekly : createWeeklyQuests()
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

  if (nextState.quests.dailyKey !== dayKey) {
    const loginRewards = normalizeLoginRewards(nextState.quests.loginRewards);
    const resetStreak = shouldResetStreakOnDailyChange(nextState.quests.dailyKey, dayKey, loginRewards);

    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        dailyKey: dayKey,
        daily: createDailyQuests(),
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
        weekly: createWeeklyQuests()
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
