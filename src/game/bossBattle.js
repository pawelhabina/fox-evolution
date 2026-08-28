export const ELEMENTAL_BOSS_REQUIRED_TIER = 20;
export const ELEMENTAL_BOSS_MAX_HP = 3400;
export const ELEMENTAL_TEAM_MAX_HP = 140;
export const ELEMENTAL_BOSS_DAMAGE = 3;
export const ELEMENTAL_BOSS_DEFEAT_COOLDOWN_MS = 60 * 60 * 1000;
export const ELEMENTAL_BOSS_REWARD_GEMS = 50;
export const ELEMENTAL_BOSS_REWARD_ESSENCE = 25;
export const HYDRA_MAX_LEVEL = 5;

const HYDRA_POWER_MULTIPLIERS = [1, 2.15, 4.75, 10.5, 24];

const REQUIRED_ELEMENTS = ['fire', 'electric', 'water'];

export function getElementalBossTeam(foxes = []) {
  return REQUIRED_ELEMENTS.map((evolution) => (
    foxes
      .filter((fox) => fox.evolution === evolution && fox.tier >= ELEMENTAL_BOSS_REQUIRED_TIER)
      .sort((a, b) => b.tier - a.tier)[0] || null
  ));
}

export function getBossCooldownRemainingMs(state, nowTs = Date.now()) {
  const cooldownUntil = Date.parse(state?.bossBattle?.cooldownUntil || '');
  return Number.isFinite(cooldownUntil) ? Math.max(0, cooldownUntil - nowTs) : 0;
}

export function canChallengeElementalBoss(state, nowTs = Date.now()) {
  if (state?.bossBattle?.status === 'battle' || getBossCooldownRemainingMs(state, nowTs) > 0) {
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
  return 150 + bonusLevels * 4;
}

export function getElementalBossPhase(bossHp) {
  const ratio = Math.max(0, Math.min(1, Number(bossHp) / ELEMENTAL_BOSS_MAX_HP));
  if (ratio > 0.66) return 1;
  if (ratio > 0.33) return 2;
  return 3;
}

export function getBossPromptTimeMs(bossHp) {
  return [1900, 1900, 1500, 1150][getElementalBossPhase(bossHp)];
}

export function calculateBossAttackOutcome({
  baseDamage,
  bossHp,
  combo = 0,
  success,
  responseMs = 0,
  allowedMs = 1900,
  roll = Math.random()
}) {
  const safeAllowedMs = Math.max(500, Number(allowedMs) || 1900);
  const accuracy = success
    ? Math.max(0, Math.min(1, 1 - Math.max(0, Number(responseMs) || 0) / safeAllowedMs))
    : 0;
  const nextCombo = success ? Math.max(0, Number(combo) || 0) + 1 : 0;
  const criticalChance = 0.04 + accuracy * 0.12;
  const critical = Boolean(success) && Number(roll) < criticalChance;
  const timingMultiplier = 0.82 + accuracy * 0.38 + Math.min(nextCombo, 12) * 0.018;
  const damage = success
    ? Math.max(1, Math.floor(Math.max(0, Number(baseDamage) || 0) * timingMultiplier * (critical ? 1.65 : 1)))
    : 0;
  const phase = getElementalBossPhase(bossHp);
  const counterDamage = success
    ? ELEMENTAL_BOSS_DAMAGE + phase - 1
    : 17 + phase * 3;

  return { accuracy, combo: nextCombo, critical, damage, counterDamage, phase };
}

export function getHydraLevel(fox) {
  return Math.max(1, Math.min(HYDRA_MAX_LEVEL, Math.floor(Number(fox?.hydraLevel) || 1)));
}

export function getHydraPowerMultiplier(foxOrLevel) {
  const level = typeof foxOrLevel === 'number' ? getHydraLevel({ hydraLevel: foxOrLevel }) : getHydraLevel(foxOrLevel);
  return HYDRA_POWER_MULTIPLIERS[level - 1];
}

export function canMergeHydras(source, target) {
  return source?.kind === 'hydra'
    && target?.kind === 'hydra'
    && source.id !== target.id
    && getHydraLevel(source) === getHydraLevel(target)
    && getHydraLevel(target) < HYDRA_MAX_LEVEL;
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
    teamSnapshot: [],
    cooldownUntil: null,
    lastDefeatAt: null
  };
}
