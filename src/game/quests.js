import { DAILY_QUEST_POOL, WEEKLY_BONUS_REWARD } from './constants';

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toWeekKey(date) {
  const local = new Date(date.getTime());
  const day = local.getDay();
  const diffToMonday = (day + 6) % 7;
  local.setDate(local.getDate() - diffToMonday);
  return toDayKey(local);
}

export function getCurrentTemporalKeys(nowTs = Date.now()) {
  const now = new Date(nowTs);
  return {
    dayKey: toDayKey(now),
    weekKey: toWeekKey(now)
  };
}

export function createDailyQuests() {
  return DAILY_QUEST_POOL.map((quest) => ({
    ...quest,
    progress: 0,
    claimed: false,
    reward: 1
  }));
}

export function createQuestState(nowTs = Date.now()) {
  const { dayKey, weekKey } = getCurrentTemporalKeys(nowTs);
  return {
    dailyKey: dayKey,
    weeklyKey: weekKey,
    daily: createDailyQuests(),
    weekly: {
      claimed: false,
      reward: WEEKLY_BONUS_REWARD
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

export function refreshQuestProgress(state) {
  const dailyStats = state.stats.daily;
  const quests = state.quests.daily.map((quest) => {
    let progress = quest.progress;

    if (quest.type === 'merges') {
      progress = dailyStats.merges;
    }
    if (quest.type === 'clicks') {
      progress = dailyStats.clicks;
    }
    if (quest.type === 'buys') {
      progress = dailyStats.buys;
    }
    if (quest.type === 'maxTier') {
      progress = dailyStats.maxTier;
    }
    if (quest.type === 'coinsEarned') {
      progress = dailyStats.coinsEarned;
    }

    return {
      ...quest,
      progress: Math.max(0, Math.floor(progress))
    };
  });

  return {
    ...state,
    quests: {
      ...state.quests,
      daily: quests
    }
  };
}

export function ensureTemporalResets(state, nowTs = Date.now()) {
  const { dayKey, weekKey } = getCurrentTemporalKeys(nowTs);
  let nextState = { ...state };

  if (nextState.quests.dailyKey !== dayKey) {
    nextState = {
      ...nextState,
      quests: {
        ...nextState.quests,
        dailyKey: dayKey,
        daily: createDailyQuests()
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
        weekly: {
          ...nextState.quests.weekly,
          claimed: false,
          reward: WEEKLY_BONUS_REWARD
        }
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

export function claimWeeklyBonus(state) {
  if (state.quests.weekly.claimed) {
    return state;
  }

  return {
    ...state,
    currencies: {
      ...state.currencies,
      gems: state.currencies.gems + state.quests.weekly.reward
    },
    quests: {
      ...state.quests,
      weekly: {
        ...state.quests.weekly,
        claimed: true
      }
    }
  };
}
