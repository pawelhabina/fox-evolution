const test = require('node:test');
const assert = require('node:assert/strict');

test('elemental boss unlock requires all three level 20 elemental foxes', async () => {
  const { canChallengeElementalBoss, getElementalBossTeam } = await import('../src/game/bossBattle.js');
  const state = {
    foxes: [
      { id: 1, tier: 20, evolution: 'fire' },
      { id: 2, tier: 20, evolution: 'electric' },
      { id: 3, tier: 19, evolution: 'water' }
    ],
    bossBattle: { defeated: false }
  };

  assert.equal(canChallengeElementalBoss(state), false);
  state.foxes[2].tier = 20;
  assert.equal(canChallengeElementalBoss(state), true);
  assert.deepEqual(getElementalBossTeam(state.foxes).map((fox) => fox.evolution), ['fire', 'electric', 'water']);

  state.bossBattle.defeated = true;
  assert.equal(canChallengeElementalBoss(state), true, 'kolejne drużyny mogą zdobywać następne Hydry');

  state.bossBattle.cooldownUntil = new Date(Date.now() + 60_000).toISOString();
  assert.equal(canChallengeElementalBoss(state), false);
});

test('higher elemental levels increase team attack power', async () => {
  const { getElementalTeamAttackPower } = await import('../src/game/bossBattle.js');
  const makeState = (tier) => ({
    foxes: ['fire', 'electric', 'water'].map((evolution, index) => ({ id: index + 1, tier, evolution }))
  });

  assert.equal(getElementalTeamAttackPower(makeState(20)), 150);
  assert.equal(getElementalTeamAttackPower(makeState(25)), 210);
});

test('boss battle keeps the selected team and exposes QTE progress fields', async () => {
  const { createBossBattleState, getElementalTeamAttackPower } = await import('../src/game/bossBattle.js');
  const battle = createBossBattleState();
  assert.deepEqual(battle.teamFoxIds, []);
  assert.equal(battle.combo, 0);
  assert.equal(battle.bestCombo, 0);
  assert.equal(battle.cooldownUntil, null);

  const state = {
    foxes: [
      { id: 1, tier: 21, evolution: 'fire' },
      { id: 2, tier: 22, evolution: 'electric' },
      { id: 3, tier: 23, evolution: 'water' }
    ],
    bossBattle: { teamFoxIds: [1, 2, 3] }
  };
  assert.equal(getElementalTeamAttackPower(state), 174);
});

test('boss QTE gets faster in three visible phases and misses hurt enough to lose', async () => {
  const {
    ELEMENTAL_BOSS_MAX_HP,
    calculateBossAttackOutcome,
    getBossPromptTimeMs
  } = await import('../src/game/bossBattle.js');

  assert.equal(getBossPromptTimeMs(ELEMENTAL_BOSS_MAX_HP), 1900);
  assert.equal(getBossPromptTimeMs(ELEMENTAL_BOSS_MAX_HP / 2), 1500);
  assert.equal(getBossPromptTimeMs(1), 1150);

  const hit = calculateBossAttackOutcome({
    baseDamage: 150,
    bossHp: ELEMENTAL_BOSS_MAX_HP,
    combo: 4,
    success: true,
    responseMs: 500,
    allowedMs: 1900,
    roll: 1
  });
  const miss = calculateBossAttackOutcome({
    baseDamage: 150,
    bossHp: ELEMENTAL_BOSS_MAX_HP / 4,
    combo: 4,
    success: false,
    allowedMs: 1150,
    roll: 1
  });

  assert.ok(hit.damage >= 150);
  assert.equal(hit.counterDamage, 3);
  assert.equal(miss.damage, 0);
  assert.equal(miss.combo, 0);
  assert.equal(miss.counterDamage, 26);
});

test('Hydras merge only at matching levels up to level 5 and gain power', async () => {
  const { canMergeHydras, getHydraPowerMultiplier } = await import('../src/game/bossBattle.js');
  const hydra = (id, hydraLevel) => ({ id, kind: 'hydra', hydraLevel, tier: 20 });

  assert.equal(canMergeHydras(hydra(1, 1), hydra(2, 1)), true);
  assert.equal(canMergeHydras(hydra(1, 1), hydra(2, 2)), false);
  assert.equal(canMergeHydras(hydra(1, 5), hydra(2, 5)), false);
  assert.ok(getHydraPowerMultiplier(5) > getHydraPowerMultiplier(4));
  assert.equal(getHydraPowerMultiplier(1), 1);
});
