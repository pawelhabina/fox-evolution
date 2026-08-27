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
  assert.equal(canChallengeElementalBoss(state), false);
});

test('higher elemental levels increase team attack power', async () => {
  const { getElementalTeamAttackPower } = await import('../src/game/bossBattle.js');
  const makeState = (tier) => ({
    foxes: ['fire', 'electric', 'water'].map((evolution, index) => ({ id: index + 1, tier, evolution }))
  });

  assert.equal(getElementalTeamAttackPower(makeState(20)), 160);
  assert.equal(getElementalTeamAttackPower(makeState(25)), 310);
});

test('boss battle keeps the selected team and exposes QTE progress fields', async () => {
  const { createBossBattleState, getElementalTeamAttackPower } = await import('../src/game/bossBattle.js');
  const battle = createBossBattleState();
  assert.deepEqual(battle.teamFoxIds, []);
  assert.equal(battle.combo, 0);
  assert.equal(battle.bestCombo, 0);

  const state = {
    foxes: [
      { id: 1, tier: 21, evolution: 'fire' },
      { id: 2, tier: 22, evolution: 'electric' },
      { id: 3, tier: 23, evolution: 'water' }
    ],
    bossBattle: { teamFoxIds: [1, 2, 3] }
  };
  assert.equal(getElementalTeamAttackPower(state), 220);
});
