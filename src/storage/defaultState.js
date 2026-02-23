import { GAME_VERSION } from '../game/constants';
import { createQuestState } from '../game/quests';

export function createInitialState(nowTs = Date.now()) {
  return {
    version: GAME_VERSION,
    currencies: {
      coins: 120,
      gems: 0,
      rebirthTokens: 0
    },
    foxes: [],
    upgrades: {
      basePurchaseTier: 0,
      passiveIncome: 0,
      buyDiscount: 0,
      clickBonus: 0,
      foxLimit: 0
    },
    purchaseCount: 0,
    settings: {
      sound: true,
      animations: true
    },
    stats: {
      lifetimeCoinsEarned: 0,
      lifetimeMerges: 0,
      lifetimeClicks: 0,
      lifetimeBuys: 0,
      lifetimeRebirths: 0,
      lifetimeGemDrops: 0,
      daily: {
        merges: 0,
        clicks: 0,
        buys: 0,
        coinsEarned: 0,
        maxTier: 1
      }
    },
    quests: createQuestState(nowTs),
    meta: {
      nextFoxId: 1,
      gemDropCounter: 0
    },
    arena: {
      width: 900,
      height: 520
    }
  };
}
