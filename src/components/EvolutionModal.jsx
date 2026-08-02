import { useEffect, useState } from 'react';
import { EVOLUTION_COST_GEMS, EVOLUTION_TYPES } from '../game/constants';
import GuiIcon from './GuiIcon';

const EFFECT_DESCRIPTIONS = {
  fire: 'x1.5 do wartości każdego kliknięcia.',
  electric: 'x1.5 do pasywnego dochodu na tick.',
  water: '+50% do statystyk najbliższego lisa. Efekt się kumuluje.'
};

const EVOLUTION_LABELS = {
  fire: 'OGIEŃ',
  electric: 'ELEKTRYCZNOŚĆ',
  water: 'WODA'
};

export default function EvolutionModal({ fox, currentGems, onSelect, onClose }) {
  const [pendingEvolutionId, setPendingEvolutionId] = useState(null);

  useEffect(() => {
    setPendingEvolutionId(null);
  }, [fox?.id]);

  if (!fox) {
    return null;
  }

  const canAfford = currentGems >= EVOLUTION_COST_GEMS;
  const pendingEvolution = pendingEvolutionId ? EVOLUTION_TYPES[pendingEvolutionId] : null;

  return (
    <div className="game-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="game-modal game-modal--evolution" role="dialog" aria-modal="true" aria-labelledby="evolution-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        {pendingEvolution ? (
          <>
            <div className={`game-modal-icon evolution-accent--${pendingEvolution.id}`} aria-hidden="true">
              <GuiIcon name={pendingEvolution.icon} alt="" size={42} />
            </div>
            <p className="game-modal-kicker">EWOLUCJA PERMANENTNA</p>
            <h3 id="evolution-modal-title">Potwierdź: {pendingEvolution.name}</h3>
            <p className="game-modal-lead">Mega Fox otrzyma ścieżkę „{EVOLUTION_LABELS[pendingEvolution.id]}”. Tej decyzji nie można cofnąć.</p>
            <div className={`evolution-confirm-card evolution-card--${pendingEvolution.id}`}>
              <GuiIcon name={pendingEvolution.icon} alt="" size={34} />
              <div><strong>{EFFECT_DESCRIPTIONS[pendingEvolution.id]}</strong><span>Koszt: {EVOLUTION_COST_GEMS} diamenty · po zakupie zostanie {currentGems - EVOLUTION_COST_GEMS}</span></div>
            </div>
            <div className="game-modal-actions">
              <button type="button" className="game-modal-cancel" onClick={() => setPendingEvolutionId(null)}>Wróć</button>
              <button type="button" className={`game-modal-confirm evolution-confirm--${pendingEvolution.id}`} onClick={() => onSelect(pendingEvolution.id)}>Potwierdź ewolucję</button>
            </div>
          </>
        ) : (
          <>
            <div className="game-modal-icon game-modal-icon--evolution" aria-hidden="true"><GuiIcon name="upgrade" alt="" size={38} /></div>
            <p className="game-modal-kicker">MEGA FOX // TIER 15</p>
            <h3 id="evolution-modal-title">Wybierz ewolucję</h3>
            <p className="game-modal-lead">Każda ścieżka daje inny stały bonus. Wybierz tę, która pasuje do Twojego stylu gry.</p>
            <div className="evolution-balance"><span>Koszt <strong>{EVOLUTION_COST_GEMS}</strong></span><span>Masz <strong>{currentGems}</strong> diamentów</span></div>

            <div className="evolution-choice-grid">
              {Object.values(EVOLUTION_TYPES).map((evo) => (
                <button key={evo.id} type="button" className={`evolution-choice evolution-card--${evo.id}`} disabled={!canAfford} onClick={() => setPendingEvolutionId(evo.id)}>
                  <span className="evolution-choice-icon"><GuiIcon name={evo.icon} alt="" size={30} /></span>
                  <span><strong>{evo.name}</strong><small>{EFFECT_DESCRIPTIONS[evo.id]}</small></span>
                  <em>WYBIERZ →</em>
                </button>
              ))}
            </div>

            {!canAfford && <p className="game-modal-warning">Potrzebujesz jeszcze {EVOLUTION_COST_GEMS - currentGems} diamentów.</p>}
            <button type="button" className="game-modal-close" onClick={onClose}>Anuluj</button>
          </>
        )}
      </section>
    </div>
  );
}
