export const ELEMENTAL_BOSS_REQUIRED_TIER = 20;
export const ELEMENTAL_BOSS_MAX_HP = 5000;
export const ELEMENTAL_TEAM_MAX_HP = 120;
export const ELEMENTAL_BOSS_DAMAGE = 4;
export const ELEMENTAL_BOSS_REWARD_GEMS = 50;
export const ELEMENTAL_BOSS_REWARD_ESSENCE = 25;

const REQUIRED_ELEMENTS = ['fire', 'electric', 'water'];

export function getElementalBossTeam(foxes = []) {
  return REQUIRED_ELEMENTS.map((evolution) => (
    foxes
      .filter((fox) => fox.evolution === evolution && fox.tier >= ELEMENTAL_BOSS_REQUIRED_TIER)
      .sort((a, b) => b.tier - a.tier)[0] || null
  ));
}

export function canChallengeElementalBoss(state) {
  if (state?.bossBattle?.defeated) {
    return false;
  }
  return getElementalBossTeam(state?.foxes).every(Boolean);
}

export function getElementalTeamAttackPower(state) {
  const selectedIds = state?.bossBattle?.teamFoxIds;
  const team = Array.isArray(selectedIds) && selectedIds.length === 3
    ? selectedIds.map((id) => state?.foxes?.find((fox) => fox.id === id) || null)
    : getElementalBossTeam(state?.foxes);
  if (!team.every(Boolean)) {
    return 0;
  }
  const bonusLevels = team.reduce((sum, fox) => sum + Math.max(0, fox.tier - ELEMENTAL_BOSS_REQUIRED_TIER), 0);
  return 160 + bonusLevels * 10;
}

export function createBossBattleState() {
  return {
    status: 'idle',
    defeated: false,
    bossHp: ELEMENTAL_BOSS_MAX_HP,
    teamHp: ELEMENTAL_TEAM_MAX_HP,
    attacks: 0,
    lastDamage: 0,
    critical: false,
    combo: 0,
    bestCombo: 0,
    lastResult: null,
    teamFoxIds: [],
    teamSnapshot: []
  };
}
