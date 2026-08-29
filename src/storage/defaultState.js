import { GAME_VERSION } from '../game/constants';
import { SAVE_DATA_VERSION } from '../game/progression.mjs';
import { createQuestState } from '../game/quests';
import { createBossBattleState } from '../game/bossBattle';
import { createSpiritMineState } from '../game/spiritMine';

export function createInitialState(nowTs = Date.now()) {
  return {
    version: GAME_VERSION,
    dataVersion: SAVE_DATA_VERSION,
    currencies: {
      coins: 120,
      gems: 0,
      rebirthTokens: 0,
      essence: 0,
      fireCoins: 0,
      electricCoins: 0,
      waterCoins: 0
    },
    foxes: [],
    upgrades: {
      basePurchaseTier: 0,
      passiveIncome: 0,
      buyDiscount: 0,
      clickBonus: 0,
      foxLimit: 0,
      gemIncomeMultiplier: 0,
      gemFoxLimit: 0,
      tickSpeed: 0,
      purchaseTierChance: 0,
      gemDropRate: 0
    },
    temporaryBoosts: {
      turboTick: 0,
      passiveBurst: 0,
      clickFrenzy: 0,
      buyCoupon: 0
    },
    purchaseCount: 0,
    settings: {
      sound: true,
      animations: true,
      musicVolume: 30,
      sfxVolume: 70,
      musicMuted: false,
      sfxMuted: false
    },
    stats: {
      playTimeSeconds: 0,
      lifetimeCoinsEarned: 0,
      lifetimeCoinsSpent: 0,
      lifetimeCoinsFromClicks: 0,
      lifetimeCoinsFromPassive: 0,
      lifetimeCoinsFromSales: 0,
      lifetimeCoinsFromInstantCash: 0,
      lifetimeGemsEarned: 0,
      lifetimeGemsSpent: 0,
      lifetimeGemsFromDrops: 0,
      lifetimeGemsFromQuests: 0,
      lifetimeGemsFromLoginRewards: 0,
      lifetimeRebirthTokensEarned: 0,
      lifetimeRebirthTokensSpent: 0,
      lifetimeMerges: 0,
      lifetimeClicks: 0,
      lifetimeBuys: 0,
      lifetimeSells: 0,
      lifetimeRebirths: 0,
      lifetimeGemDrops: 0,
      lifetimeEvolutions: 0,
      lifetimeBossVictories: 0,
      lifetimeUpgradesBought: 0,
      lifetimeTemporaryBoostsBought: 0,
      lifetimeInstantCashBuys: 0,
      lifetimeDailyQuestsClaimed: 0,
      lifetimeWeeklyQuestsClaimed: 0,
      lifetimeLoginRewardsClaimed: 0,
      highestTier: 0,
      highestBaseTier: 0,
      highestElementalTier: 0,
      daily: {
        merges: 0,
        clicks: 0,
        buys: 0,
        coinsEarned: 0,
        maxTier: 1,
        upgrades: 0,
        sells: 0,
        rebirths: 0,
        evolutions: 0,
        mineCollects: 0
      },
      weekly: {
        merges: 0,
        clicks: 0,
        buys: 0,
        coinsEarned: 0,
        maxTier: 1,
        upgrades: 0,
        sells: 0,
        rebirths: 0,
        evolutions: 0,
        mineCollects: 0
      }
    },
    quests: createQuestState(nowTs),
    pokedex: {
      discoveries: {}
    },
    bossBattle: createBossBattleState(),
    tutorials: {
      elementalFusionSeen: false
    },
    realms: {
      spiritMine: createSpiritMineState()
    },
    meta: {
      nextFoxId: 1,
      gemDropCounter: 0,
      rebirthPricingRefundV128Applied: true,
      rebirthLinearPricingRefundV1214Applied: true,
      createdAt: new Date(nowTs).toISOString(),
      lastPlayedAt: new Date(nowTs).toISOString(),
      lastEconomyAt: new Date(nowTs).toISOString()
    },
    arena: {
      width: 900,
      height: 520
    }
  };
}
