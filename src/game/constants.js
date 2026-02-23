export const GAME_VERSION = '1.0.0';
export const TICK_SECONDS = 5;
export const AUTOSAVE_SECONDS = 10;
export const MIN_FOXES_LIMIT = 5;
export const MAX_FOXES_LIMIT = 50;
export const TILE_SIZE = 78;

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

const TIER_ICONS = ['🧬', '🦊', '🟠', '🟤', '⚙️', '🥈', '🥇', '💎', '🟣', '🌌', '✨', '⚛️', '🔱', '🜂', '👑'];

export const FOX_TIERS = TIER_NAMES.map((name, index) => {
  const tier = index + 1;
  const baseIncomePerTick = Math.max(1, Math.round(2 * 1.85 ** index));
  const clickValue = Math.max(1, Math.round(baseIncomePerTick * 0.6));
  const sellValue = Math.max(1, Math.round(baseIncomePerTick * 6.5));
  return {
    tier,
    name,
    baseIncomePerTick,
    clickValue,
    sellValue,
    icon: TIER_ICONS[index] || '🦊'
  };
});

const EXTRA_EVOLUTION_TIERS = [];
let previousIncome = FOX_TIERS[FOX_TIERS.length - 1].baseIncomePerTick;
for (let tier = 16; tier <= 30; tier += 1) {
  const baseIncomePerTick = Math.max(1, Math.round(previousIncome * 1.75));
  EXTRA_EVOLUTION_TIERS.push({
    tier,
    name: `Elemental Fox Lv ${tier}`,
    baseIncomePerTick,
    clickValue: Math.max(1, Math.round(baseIncomePerTick * 0.6)),
    sellValue: Math.max(1, Math.round(baseIncomePerTick * 6.5)),
    icon: '🌟'
  });
  previousIncome = baseIncomePerTick;
}

export const ALL_FOX_TIERS = [...FOX_TIERS, ...EXTRA_EVOLUTION_TIERS];
export const BASE_MAX_TIER = 15;
export const MAX_TIER = 30;
export const MEGA_TIER = 15;

export const EVOLUTION_TYPES = {
  fire: {
    id: 'fire',
    name: 'Fire Fox',
    icon: '🔥',
    incomeMultiplier: 1,
    clickMultiplier: 1.5
  },
  electric: {
    id: 'electric',
    name: 'Electric Fox',
    icon: '⚡',
    incomeMultiplier: 1.5,
    clickMultiplier: 1
  },
  water: {
    id: 'water',
    name: 'Water Fox',
    icon: '💧',
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
    currency: 'coins',
    cap: 13,
    baseCost: 250,
    growth: 1.85
  },
  passiveIncome: {
    id: 'passiveIncome',
    title: 'Pasywny income',
    description: '+5% pasywnego income na poziom.',
    currency: 'coins',
    cap: 60,
    baseCost: 120,
    growth: 1.36
  },
  buyDiscount: {
    id: 'buyDiscount',
    title: 'Koszt kupna lisa',
    description: '-2% kosztu lisa na poziom.',
    currency: 'coins',
    cap: 35,
    baseCost: 180,
    growth: 1.42
  },
  clickBonus: {
    id: 'clickBonus',
    title: 'Wartość klików',
    description: '+5% wartości kliknięcia na poziom.',
    currency: 'coins',
    cap: 40,
    baseCost: 100,
    growth: 1.42
  },
  foxLimit: {
    id: 'foxLimit',
    title: 'Limit lisów',
    description: 'Zwiększa limit lisów na planszy o 1.',
    currency: 'coins',
    cap: 45,
    baseCost: 140,
    growth: 1.28
  }
};

export const DAILY_QUEST_POOL = [
  {
    id: 'merge_count',
    label: 'Wykonaj 10 merge',
    target: 10,
    type: 'merges'
  },
  {
    id: 'click_count',
    label: 'Kliknij lisy 50 razy',
    target: 50,
    type: 'clicks'
  },
  {
    id: 'buy_count',
    label: 'Kup 20 lisów',
    target: 20,
    type: 'buys'
  },
  {
    id: 'reach_tier',
    label: 'Osiągnij tier 6',
    target: 6,
    type: 'maxTier'
  },
  {
    id: 'earn_coins',
    label: 'Zarób dziś 10 000 coins',
    target: 10000,
    type: 'coinsEarned'
  }
];

export const WEEKLY_BONUS_REWARD = 20;
