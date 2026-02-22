import { EVOLUTION_TYPES } from '../game/constants';

export default function EvolutionModal({ fox, onSelect, onClose }) {
  if (!fox) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="text-lg font-bold text-amber-300">Wybierz ewolucję Mega Foxa</h3>
        <p className="mt-1 text-sm text-slate-400">Ta decyzja jest permanentna dla tego lisa.</p>

        <div className="mt-4 grid gap-2">
          {Object.values(EVOLUTION_TYPES).map((evo) => (
            <button
              key={evo.id}
              type="button"
              className="rounded-xl border border-slate-600 bg-slate-800 p-3 text-left transition hover:border-amber-400"
              onClick={() => {
                const ok = window.confirm(`Nadać ewolucję ${evo.name}? To zmiana na stałe.`);
                if (ok) {
                  onSelect(evo.id);
                }
              }}
            >
              <p className="font-bold text-slate-100">
                {evo.icon} {evo.name}
              </p>
              <p className="text-xs text-slate-400">Income multiplier: x{evo.multiplier}</p>
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
