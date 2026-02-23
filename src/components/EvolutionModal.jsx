import { EVOLUTION_COST_GEMS, EVOLUTION_TYPES } from '../game/constants';

export default function EvolutionModal({ fox, currentGems, onSelect, onClose }) {
  if (!fox) {
    return null;
  }

  const canAfford = currentGems >= EVOLUTION_COST_GEMS;

  const effectDescriptions = {
    fire: 'Bonus tylko do click value (x1.5).',
    electric: 'Bonus tylko do pasywnego income/tick (x1.5).',
    water: 'Brak bonusu własnego, ale buffuje najbliższego lisa o +50% do statystyk. (Efekt się kumuluje)'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="text-lg font-bold text-amber-300">Wybierz ewolucję Mega Foxa</h3>
        <p className="mt-1 text-sm text-slate-400">Ta decyzja jest permanentna dla tego lisa.</p>
        <p className="mt-1 text-xs text-slate-300">
          Koszt ewolucji: {EVOLUTION_COST_GEMS} diamenty (masz: {currentGems})
        </p>

        <div className="mt-4 grid gap-2">
          {Object.values(EVOLUTION_TYPES).map((evo) => (
            <button
              key={evo.id}
              type="button"
              className="rounded-xl border border-slate-600 bg-slate-800 p-3 text-left transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canAfford}
              onClick={() => {
                const ok = window.confirm(
                  `Nadać ewolucję ${evo.name} za ${EVOLUTION_COST_GEMS} diamenty? To zmiana na stałe.`
                );
                if (ok) {
                  onSelect(evo.id);
                }
              }}
            >
              <p className="font-bold text-slate-100">
                {evo.icon} {evo.name}
              </p>
              <p className="text-xs text-slate-400">{effectDescriptions[evo.id]}</p>
            </button>
          ))}
        </div>

        <button type="button" className="mt-4 w-full rounded-lg bg-slate-700 py-2 text-sm" onClick={onClose}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
