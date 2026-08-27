import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import hydraSprite from '../../assets/sprites/foxes/fox-elemental-hydra-boss.png';
import { playSfx } from '../audio/gameAudio';
import {
  ELEMENTAL_BOSS_MAX_HP,
  ELEMENTAL_BOSS_REWARD_ESSENCE,
  ELEMENTAL_BOSS_REWARD_GEMS,
  ELEMENTAL_TEAM_MAX_HP,
  getElementalBossTeam,
  getElementalTeamAttackPower
} from '../game/bossBattle';

const ELEMENT_NAMES = { fire: 'Ogień', electric: 'Prąd', water: 'Woda' };
const QTE_KEYS = ['A', 'S', 'D', 'F', 'J', 'K', 'L'];

function HealthBar({ label, value, max, tone }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return <div className={`boss-health boss-health--${tone}`}><div><strong>{label}</strong><span>{value}/{max}</span></div><div className="boss-health-track"><span style={{ width: `${percent}%` }} /></div></div>;
}

export default function ElementalBossModal({ state, onAttack, onRetry, onClose, onEnterMine }) {
  const battle = state.bossBattle;
  const [prompt, setPrompt] = useState(null);
  const [remaining, setRemaining] = useState(1);
  const lockedRef = useRef(false);
  const isBattle = battle?.status === 'battle';
  const team = useMemo(() => battle?.teamSnapshot?.length === 3
    ? battle.teamSnapshot
    : getElementalBossTeam(state.foxes).filter(Boolean), [battle?.teamSnapshot, state.foxes]);

  useEffect(() => {
    if (!isBattle) { setPrompt(null); return undefined; }
    const timer = window.setTimeout(() => {
      const allowedMs = Math.max(850, 1800 - battle.attacks * 35);
      const key = QTE_KEYS[Math.floor(Math.random() * QTE_KEYS.length)];
      lockedRef.current = false;
      setPrompt({ key, startedAt: performance.now(), allowedMs });
      setRemaining(1);
      playSfx('qtePrompt');
    }, battle.attacks > 0 ? 420 : 180);
    return () => window.clearTimeout(timer);
  }, [battle?.attacks, isBattle]);

  const resolveAttempt = useCallback((success) => {
    if (!prompt || lockedRef.current || !isBattle) return;
    lockedRef.current = true;
    const responseMs = Math.min(prompt.allowedMs, performance.now() - prompt.startedAt);
    setPrompt(null);
    playSfx(success ? 'qteHit' : 'qteMiss');
    onAttack({ success, responseMs, allowedMs: prompt.allowedMs });
  }, [isBattle, onAttack, prompt]);

  useEffect(() => {
    if (!prompt || !isBattle) return undefined;
    const interval = window.setInterval(() => {
      const next = Math.max(0, 1 - (performance.now() - prompt.startedAt) / prompt.allowedMs);
      setRemaining(next);
      if (next <= 0) resolveAttempt(false);
    }, 25);
    return () => window.clearInterval(interval);
  }, [isBattle, prompt, resolveAttempt]);

  useEffect(() => {
    if (!prompt || !isBattle) return undefined;
    const onKeyDown = (event) => {
      if (event.repeat) return;
      const pressed = event.key.toUpperCase();
      if (!QTE_KEYS.includes(pressed)) return;
      event.preventDefault();
      resolveAttempt(pressed === prompt.key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBattle, prompt, resolveAttempt]);

  if (!battle || battle.status === 'idle') return null;
  const attackPower = getElementalTeamAttackPower(state);
  const isVictory = battle.status === 'victory';

  return (
    <div className={`game-modal-backdrop boss-backdrop boss-backdrop--${battle.lastResult || 'ready'}`} role="presentation">
      <section className="game-modal game-modal--boss" role="dialog" aria-modal="true" aria-labelledby="boss-title">
        <p className="game-modal-kicker">PRÓBA TRZECH ŻYWIOŁÓW</p>
        <h3 id="boss-title">{isVictory ? 'Hydra pokonana i oswojona!' : battle.status === 'defeat' ? 'Drużyna poległa' : 'Hydra Trójżywiołu'}</h3>
        <div className={`boss-stage ${isVictory ? 'is-defeated' : ''} ${battle.lastResult ? `is-${battle.lastResult}` : ''}`}>
          <span className="boss-aura" aria-hidden="true" /><span className="boss-lightning" aria-hidden="true" />
          <img src={hydraSprite} alt="Hydra Trójżywiołu — boss o głowach ognia, prądu i wody" draggable={false} />
          {battle.lastDamage > 0 && isBattle && <strong key={battle.attacks} className={battle.critical ? 'boss-damage is-critical' : 'boss-damage'}>-{battle.lastDamage}{battle.critical ? ' KRYTYK!' : ''}</strong>}
          {isBattle && battle.lastResult === 'miss' && <strong key={`miss-${battle.attacks}`} className="boss-miss">PUDŁO!</strong>}
        </div>
        <HealthBar label="HYDRA" value={battle.bossHp} max={ELEMENTAL_BOSS_MAX_HP} tone="boss" />
        <HealthBar label="DRUŻYNA" value={battle.teamHp} max={ELEMENTAL_TEAM_MAX_HP} tone="team" />
        <div className="boss-team" aria-label="Drużyna żywiołów">{team.map((fox) => <div key={fox.evolution} className={`boss-team-member boss-team-member--${fox.evolution}`}><strong>{ELEMENT_NAMES[fox.evolution]}</strong><span>Lv {fox.tier}</span></div>)}</div>

        {isBattle && <div className="boss-qte-zone">
          <div className="boss-combo"><span>COMBO</span><strong>x{battle.combo || 0}</strong><small>rekord x{battle.bestCombo || 0}</small></div>
          {prompt ? <button type="button" className="boss-qte-key" onClick={() => resolveAttempt(true)} aria-label={`Naciśnij ${prompt.key}`}><strong>{prompt.key}</strong><span className="boss-qte-timer"><i style={{ width: `${remaining * 100}%` }} /></span><small>NACIŚNIJ TERAZ</small></button> : <div className="boss-qte-wait">PRZYGOTUJ SIĘ…</div>}
          <p className="boss-hint">Moc bazowa: {attackPower}. Szybka reakcja zwiększa obrażenia i szansę na krytyk. Zły klawisz lub spóźnienie zadaje drużynie poczwórne obrażenia.</p>
          <button type="button" className="game-modal-close" onClick={onClose}>Wycofaj się</button>
        </div>}

        {isVictory && <>
          <div className="boss-victory-rewards"><div className="game-modal-reward"><span>NAGRODA</span><strong>+{ELEMENTAL_BOSS_REWARD_GEMS}</strong><small>diamentów</small></div><div className="game-modal-reward is-essence"><span>NOWA WALUTA</span><strong>+{ELEMENTAL_BOSS_REWARD_ESSENCE} ◈</strong><small>Esencji Hydry</small></div></div>
          <p className="boss-hint">Trzy lisy stały się jedną Hydrą na planszy. Odblokowano też automatyczną Kopalnię Duchów.</p>
          <div className="game-modal-actions"><button type="button" className="game-modal-cancel" onClick={onClose}>Wróć do planszy</button><button type="button" className="game-modal-confirm" onClick={onEnterMine}>Wejdź do kopalni</button></div>
        </>}

        {battle.status === 'defeat' && <><p className="game-modal-warning">Utrzymuj combo i reaguj szybciej. Poziomy powyżej 20 zwiększają bazową siłę drużyny.</p><div className="game-modal-actions"><button type="button" className="game-modal-cancel" onClick={onClose}>Wróć do planszy</button><button type="button" className="game-modal-confirm" onClick={onRetry}>Spróbuj ponownie</button></div></>}
      </section>
    </div>
  );
}
