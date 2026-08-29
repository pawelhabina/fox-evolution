export const GAME_VERSION = '1.2.16';
export const RELEASE_CHANNEL = 'EARLY ACCESS';
export const BASE_TICK_SECONDS = 5;
export const MIN_TICK_SECONDS = 1;
export const MIN_TICK_SECONDS_WITH_BOOST = 0.3;
export const AUTOSAVE_SECONDS = 10;
export const MIN_FOXES_LIMIT = 5;
export const MAX_FOXES_LIMIT = 100;
export const TILE_SIZE = 78;
export const BASE_HIGHER_TIER_CHANCE = 0.05;
export const BASE_GEM_DROP_RATE = 0.01;
export const TEMP_BOOST_DURATION_OPTIONS = [
  { id: '15m', label: '15 min', seconds: 15 * 60, cost: 20 },
  { id: '30m', label: '30 min', seconds: 30 * 60, cost: 35 },
  { id: '1h', label: '1h', seconds: 60 * 60, cost: 60 },
  { id: '2h', label: '2h', seconds: 2 * 60 * 60, cost: 100 }
];

export const TEMP_BOOST_DURATION_BY_ID = TEMP_BOOST_DURATION_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {});

export const TEMP_BOOST_DEFS = {
  turboTick: {
    id: 'turboTick',
    title: 'Turbo Tick',
    description: '-30% czasu ticka',
    icon: 'clock'
  },
  passiveBurst: {
    id: 'passiveBurst',
    title: 'Zloty Deszcz',
    description: 'x2 pasywnego income',
    icon: 'income'
  },
  clickFrenzy: {
    id: 'clickFrenzy',
    title: 'Furia Kliku',
    description: 'x3 wartosci klikniecia',
    icon: 'foxUpgrade'
  },
  buyCoupon: {
    id: 'buyCoupon',
    title: 'Kupiecki Kupon',
    description: '-25% kosztu kupna lisa',
    icon: 'priceDown2'
  }
};

export const TEMP_BOOST_IDS = Object.keys(TEMP_BOOST_DEFS);

export const TEMP_BOOST_EFFECTS = {
  turboTickMultiplier: 0.7,
  passiveBurstMultiplier: 2,
  clickFrenzyMultiplier: 3,
  buyCouponMultiplier: 0.75
};

const TIER_NAMES = [
  'DNA Fox',
  'Proto Fox',
  'Copper Fox',
  'Bronze Fox',
  'Iron Fox',
  'Silver Fox',
  'Gold Fox',
  'Crystal Fox',
  'Plasma Fox',
  'Cosmic Fox',
  'Nova Fox',
  'Quantum Fox',
  'Mythic Fox',
  'Omega Fox',
  'Mega Fox'
];

const CLICK_VALUE_RATIO = 0.1125;

let previousClickValue = 0;
export const FOX_TIERS = TIER_NAMES.map((name, index) => {
  const tier = index + 1;
  const baseIncomePerTick = Math.max(1, Math.round(2 * 1.85 ** index));
  const clickValue = Math.max(previousClickValue + 1, Math.round(baseIncomePerTick * CLICK_VALUE_RATIO));
  const sellValue = Math.max(1, Math.round(baseIncomePerTick * 6.5));
  previousClickValue = clickValue;
  return {
    tier,
    name,
    baseIncomePerTick,
    clickValue,
    sellValue
  };
});

const EXTRA_EVOLUTION_TIERS = [];
let previousIncome = FOX_TIERS[FOX_TIERS.length - 1].baseIncomePerTick;
for (let tier = 16; tier <= 30; tier += 1) {
  const baseIncomePerTick = Math.max(1, Math.round(previousIncome * 1.75));
  const clickValue = Math.max(previousClickValue + 1, Math.round(baseIncomePerTick * CLICK_VALUE_RATIO));
  EXTRA_EVOLUTION_TIERS.push({
    tier,
    name: `Elemental Fox Lv ${tier}`,
    baseIncomePerTick,
    clickValue,
    sellValue: Math.max(1, Math.round(baseIncomePerTick * 6.5))
  });
  previousIncome = baseIncomePerTick;
  previousClickValue = clickValue;
}

export const ALL_FOX_TIERS = [...FOX_TIERS, ...EXTRA_EVOLUTION_TIERS];
export const BASE_MAX_TIER = 15;
export const MAX_TIER = 30;
export const MEGA_TIER = 15;

export const EVOLUTION_TYPES = {
  fire: {
    id: 'fire',
    name: 'Fire Fox',
    icon: 'fire',
    incomeMultiplier: 1,
    clickMultiplier: 1.5
  },
  electric: {
    id: 'electric',
    name: 'Electric Fox',
    icon: 'electric',
    incomeMultiplier: 1.5,
    clickMultiplier: 1
  },
  water: {
    id: 'water',
    name: 'Water Fox',
    icon: 'water',
    incomeMultiplier: 1,
    clickMultiplier: 1,
    auraMultiplier: 1.5
  }
};

export const EVOLUTION_COST_GEMS = 2;

export const UPGRADE_DEFS = {
  basePurchaseTier: {
    id: 'basePurchaseTier',
    title: 'Tier kupowanych lisów',
    description: 'Podnosi bazowy tier kupowanego lisa.',
    shop: 'coins',
    currency: 'coins',
    cap: 13,
    baseCost: 1000,
    growth: 2.15
  },
  passiveIncome: {
    id: 'passiveIncome',
    title: 'Pasywny income',
    description: '+5% pasywnego income na poziom.',
    shop: 'coins',
    currency: 'coins',
    cap: 60,
    baseCost: 120,
    growth: 1.36
  },
  buyDiscount: {
    id: 'buyDiscount',
    title: 'Koszt kupna lisa',
    description: '-2% kosztu lisa na poziom.',
    shop: 'coins',
    currency: 'coins',
    cap: 35,
    baseCost: 180,
    growth: 1.42
  },
  clickBonus: {
    id: 'clickBonus',
    title: 'Wartość klików',
    description: '+2% wartości kliknięcia na poziom.',
    shop: 'coins',
    currency: 'coins',
    cap: 40,
    baseCost: 100,
    growth: 1.42
  },
  foxLimit: {
    id: 'foxLimit',
    title: 'Limit lisów',
    description: 'Zwiększa limit lisów na planszy o 1.',
    shop: 'rebirth',
    currency: 'rebirthTokens',
    cap: 45,
    baseCost: 2,
    costStep: 2
  },
  gemIncomeMultiplier: {
    id: 'gemIncomeMultiplier',
    title: 'Mnożnik zarobków',
    description: 'Start 1.0x, każdy poziom dodaje +0.1x do wszystkich zarobków.',
    shop: 'gems',
    currency: 'gems',
    cap: null,
    baseCost: 50,
    growth: 1
  },
  gemFoxLimit: {
    id: 'gemFoxLimit',
    title: 'Premium slot lisów',
    description: '+1 maksymalny lis na planszy za każdy poziom.',
    shop: 'gems',
    currency: 'gems',
    cap: 50,
    flatCost: 50
  },
  tickSpeed: {
    id: 'tickSpeed',
    title: 'Szybkość ticku',
    description: 'Każdy poziom skraca tick o 0.1s, aż do 1.0s.',
    shop: 'rebirth',
    currency: 'rebirthTokens',
    cap: 40,
    baseCost: 2,
    costStep: 2
  },
  purchaseTierChance: {
    id: 'purchaseTierChance',
    title: 'Szansa na wyższy tier',
    description: '+1% szansy na tier wyżej przy zakupie lisa.',
    shop: 'rebirth',
    currency: 'rebirthTokens',
    cap: 95,
    baseCost: 2,
    costStep: 2
  },
  gemDropRate: {
    id: 'gemDropRate',
    title: 'Drop rate diamentów',
    description: 'Start 1%. Każdy poziom dodaje +0.2% do szansy dropu diamentu na tick, aż do 25%.',
    shop: 'rebirth',
    currency: 'rebirthTokens',
    cap: 120,
    baseCost: 2,
    costStep: 2
  }
};

export const COIN_UPGRADE_IDS = Object.values(UPGRADE_DEFS)
  .filter((upgrade) => upgrade.shop === 'coins')
  .map((upgrade) => upgrade.id);

export const GEM_UPGRADE_IDS = Object.values(UPGRADE_DEFS)
  .filter((upgrade) => upgrade.shop === 'gems')
  .map((upgrade) => upgrade.id);

export const REBIRTH_UPGRADE_IDS = Object.values(UPGRADE_DEFS)
  .filter((upgrade) => upgrade.shop === 'rebirth')
  .map((upgrade) => upgrade.id);

export const DAILY_QUEST_REWARD = 5;
export const WEEKLY_QUEST_REWARD = 20;
export const QUESTS_PER_SECTION = 5;

export const DAILY_QUEST_POOL = [
  { id: 'daily_merge_8', label: 'Wykonaj 12 merge', target: 12, type: 'merges' },
  { id: 'daily_merge_15', label: 'Wykonaj 30 merge', target: 30, type: 'merges' },
  { id: 'daily_click_60', label: 'Kliknij lisy 250 razy', target: 250, type: 'clicks' },
  { id: 'daily_click_120', label: 'Kliknij lisy 800 razy', target: 800, type: 'clicks' },
  { id: 'daily_buy_20', label: 'Kup 20 lisów', target: 20, type: 'buys' },
  { id: 'daily_buy_35', label: 'Kup 50 lisów', target: 50, type: 'buys' },
  { id: 'daily_tier_8', label: 'Osiągnij tier 9', target: 9, type: 'maxTier' },
  { id: 'daily_coins_20k', label: 'Zarób 50 000 monet', target: 50000, type: 'coinsEarned' }
];

export const WEEKLY_QUEST_POOL = [
  { id: 'weekly_merge_80', label: 'Wykonaj 150 merge', target: 150, type: 'merges' },
  { id: 'weekly_merge_150', label: 'Wykonaj 350 merge', target: 350, type: 'merges' },
  { id: 'weekly_click_600', label: 'Kliknij lisy 4 000 razy', target: 4000, type: 'clicks' },
  { id: 'weekly_click_1200', label: 'Kliknij lisy 10 000 razy', target: 10000, type: 'clicks' },
  { id: 'weekly_buy_140', label: 'Kup 250 lisów', target: 250, type: 'buys' },
  { id: 'weekly_buy_260', label: 'Kup 600 lisów', target: 600, type: 'buys' },
  { id: 'weekly_tier_14', label: 'Osiągnij tier 16', target: 16, type: 'maxTier' },
  { id: 'weekly_tier_18', label: 'Osiągnij tier 20', target: 20, type: 'maxTier' },
  { id: 'weekly_coins_2m', label: 'Zarób 25 000 000 monet', target: 25000000, type: 'coinsEarned' }
];

export const LOGIN_REWARD_VALUES = {
  early: 15,
  common: 30,
  epic: 100,
  legendary: 250
};
export const LOGIN_STREAK_DAYS = 7;
export const LOGIN_MONTHLY_STEP = 30;
