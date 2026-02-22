import { MEGA_TIER } from '../game/constants';
import { formatNumber } from '../game/format';

export default function FoxContextMenu({ menu, info, onClose, onSell, onEvolve }) {
  if (!menu || !info) {
    return null;
  }

  const canEvolve = info.fox.tier === MEGA_TIER && !info.fox.evolution;

  return (
    <div className="context-menu" style={{ left: menu.x, top: menu.y }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-amber-300">{info.tierData.name}</p>
        <button type="button" className="text-xs text-slate-400" onClick={onClose}>
          Zamknij
        </button>
      </div>

      <div className="space-y-1 text-xs text-slate-300">
        <p>Tier: {info.fox.tier}</p>
        <p>Income/tick: {formatNumber(info.income)}</p>
        <p>Click value: {formatNumber(info.clickValue)}</p>
        <p>Sell value: {formatNumber(info.sellValue)}</p>
      </div>

      <div className="mt-3 grid gap-2">
        <button type="button" className="rounded-lg bg-rose-500/80 px-3 py-2 text-xs font-bold" onClick={onSell}>
          Sell
        </button>

        {canEvolve && (
          <button type="button" className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-900" onClick={onEvolve}>
            Evolve Mega Fox
          </button>
        )}
      </div>
    </div>
  );
}
