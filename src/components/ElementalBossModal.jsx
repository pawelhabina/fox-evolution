import hydraSprite from '../../assets/sprites/foxes/fox-elemental-hydra-boss.png';
import {
  ELEMENTAL_BOSS_MAX_HP,
  ELEMENTAL_BOSS_REWARD_GEMS,
  ELEMENTAL_TEAM_MAX_HP,
  getElementalBossTeam,
  getElementalTeamAttackPower
} from '../game/bossBattle';

const ELEMENT_NAMES = ['Ogień', 'Prąd', 'Woda'];

function HealthBar({ label, value, max, tone }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`boss-health boss-health--${tone}`}>
      <div><strong>{label}</strong><span>{value}/{max}</span></div>
      <div className="boss-health-track"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export default function ElementalBossModal({ state, onAttack, onRetry, onClose }) {
  const battle = state.bossBattle;
  if (!battle || battle.status === 'idle') {
    return null;
  }

  const team = getElementalBossTeam(state.foxes);
  const attackPower = getElementalTeamAttackPower(state);
  const isBattle = battle.status === 'battle';
  const isVictory = battle.status === 'victory';

  return (
    <div className="game-modal-backdrop boss-backdrop" role="presentation">
      <section className="game-modal game-modal--boss" role="dialog" aria-modal="true" aria-labelledby="boss-title">
        <p className="game-modal-kicker">PRÓBA TRZECH ŻYWIOŁÓW</p>
        <h3 id="boss-title">{isVictory ? 'Hydra pokonana!' : battle.status === 'defeat' ? 'Drużyna poległa' : 'Hydra Trójżywiołu'}</h3>

        <div className={`boss-stage ${isVictory ? 'is-defeated' : ''}`}>
          <span className="boss-aura" aria-hidden="true" />
          <img src={hydraSprite} alt="Hydra Trójżywiołu — boss o głowach ognia, prądu i wody" draggable={false} />
          {battle.lastDamage > 0 && isBattle && (
            <strong key={battle.attacks} className={battle.critical ? 'boss-damage is-critical' : 'boss-damage'}>
              -{battle.lastDamage}{battle.critical ? ' KRYTYK!' : ''}
            </strong>
          )}
        </div>

        <HealthBar label="HYDRA" value={battle.bossHp} max={ELEMENTAL_BOSS_MAX_HP} tone="boss" />
        <HealthBar label="DRUŻYNA" value={battle.teamHp} max={ELEMENTAL_TEAM_MAX_HP} tone="team" />

        <div className="boss-team" aria-label="Drużyna żywiołów">
          {team.map((fox, index) => (
            <div key={ELEMENT_NAMES[index]} className={`boss-team-member boss-team-member--${fox?.evolution || 'missing'}`}>
              <strong>{ELEMENT_NAMES[index]}</strong><span>{fox ? `Lv ${fox.tier}` : 'Brak'}</span>
            </div>
          ))}
        </div>

        {isBattle && (
          <>
            <p className="boss-hint">Atak drużyny: {attackPower} · 15% szansy na cios krytyczny. Hydra kontratakuje po każdym ciosie.</p>
            <button type="button" className="boss-attack-btn" onClick={onAttack}>ATAK ŻYWIOŁÓW</button>
            <button type="button" className="game-modal-close" onClick={onClose}>Wycofaj się</button>
          </>
        )}

        {isVictory && (
          <>
            <div className="game-modal-reward"><span>NAGRODA</span><strong>+{ELEMENTAL_BOSS_REWARD_GEMS}</strong><small>diamentów</small></div>
            <button type="button" className="boss-attack-btn" onClick={onClose}>Odbierz i wróć</button>
          </>
        )}

        {battle.status === 'defeat' && (
          <>
            <p className="game-modal-warning">Rozwijaj lisy powyżej poziomu 20, aby zwiększyć siłę ataku.</p>
            <div className="game-modal-actions">
              <button type="button" className="game-modal-cancel" onClick={onClose}>Wróć do planszy</button>
              <button type="button" className="game-modal-confirm" onClick={onRetry}>Spróbuj ponownie</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
