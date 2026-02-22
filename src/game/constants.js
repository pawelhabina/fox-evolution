export const GAME_VERSION = '1.0.0';
export const TICK_SECONDS = 5;
export const AUTOSAVE_SECONDS = 10;
export const MAX_FOXES = 40;
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

export const MAX_TIER = 15;
export const MEGA_TIER = 15;

export const EVOLUTION_TYPES = {
  fire: {
    id: 'fire',
    name: 'Fire Fox',
    icon: '🔥',
    multiplier: 1.25
  },
  water: {
    id: 'water',
    name: 'Water Fox',
    icon: '💧',
    multiplier: 1.35
  },
  electric: {
    id: 'electric',
    name: 'Electric Fox',
    icon: '⚡',
    multiplier: 1.5
  }
};

export const UPGRADE_DEFS = {
  basePurchaseTier: {
    id: 'basePurchaseTier',
    title: 'Base Purchase Tier',
    description: 'Podnosi bazowy tier kupowanego lisa.',
    currency: 'coins',
    cap: 13,
    baseCost: 250,
    growth: 1.85
  },
  passiveIncome: {
    id: 'passiveIncome',
    title: 'Passive Income Boost',
    description: '+12% pasywnego income na poziom.',
    currency: 'coins',
    cap: 60,
    baseCost: 120,
    growth: 1.36
  },
  buyDiscount: {
    id: 'buyDiscount',
    title: 'Buy Cost Reduction',
    description: '-4% kosztu "Kup lisa" na poziom.',
    currency: 'coins',
    cap: 12,
    baseCost: 180,
    growth: 1.55
  },
  clickBonus: {
    id: 'clickBonus',
    title: 'Click Value Boost',
    description: '+15% wartości kliknięcia na poziom.',
    currency: 'coins',
    cap: 40,
    baseCost: 100,
    growth: 1.42
  },
  gemDropBonus: {
    id: 'gemDropBonus',
    title: 'Gem Drop Bonus',
    description: 'Bonus gemów za drop (szansa 1% bez zmian).',
    currency: 'gems',
    cap: 12,
    baseCost: 3,
    growth: 1.45
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
