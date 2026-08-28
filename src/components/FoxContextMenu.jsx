import { MEGA_TIER } from '../game/constants';
import { formatNumber } from '../game/format';
import GuiIcon from './GuiIcon';
import { HYDRA_MAX_LEVEL, getHydraLevel, getHydraPowerMultiplier } from '../game/bossBattle';

export default function FoxContextMenu({ menu, info, onClose, onSell, onEvolve, onToggleLock }) {
  if (!menu || !info) {
    return null;
  }

  const isHydra = info.fox.kind === 'hydra';
  const hydraLevel = isHydra ? getHydraLevel(info.fox) : 0;
  const canEvolve = !isHydra && info.fox.tier === MEGA_TIER && !info.fox.evolution;

  return (
    <div className="context-menu" style={{ left: menu.x, top: menu.y }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-amber-300">{isHydra ? `Hydra Trójżywiołu · Lv ${hydraLevel}` : info.tierData.name}</p>
        <button type="button" className="text-xs text-slate-400" onClick={onClose}>
          Zamknij
        </button>
      </div>

      <div className="space-y-1 text-xs text-slate-300">
        {!isHydra && <p className="flex items-center gap-2">
          <GuiIcon name="upgrade" alt="Tier" />
          Tier: {info.fox.tier}
        </p>}
        {isHydra && <p className="text-cyan-200">Łączy dochód Prądu, klik Ognia i aurę Wody. Mnożnik mocy: ×{getHydraPowerMultiplier(info.fox)}. {hydraLevel < HYDRA_MAX_LEVEL ? `Połącz z Hydrą Lv ${hydraLevel}, aby osiągnąć Lv ${hydraLevel + 1}.` : 'Osiągnięto maksymalny poziom 5.'}</p>}
        <p className="flex items-center gap-2">
          <GuiIcon name="income" alt="Income" />
          Przychód na tick: {formatNumber(info.income)}
        </p>
        <p className="flex items-center gap-2">
          <GuiIcon name="foxUpgrade" alt="Click value" />
          Wartość kliknięcia: {formatNumber(info.clickValue)}
        </p>
        <p className="flex items-center gap-2">
          <GuiIcon name="coin" alt="Sell value" />
          Wartość sprzedaży: {formatNumber(info.sellValue)}
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        <button type="button" className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${info.fox.locked ? 'bg-emerald-600/80' : 'bg-slate-600/80'}`} onClick={onToggleLock}>
          <GuiIcon name="tarcza" alt="" />
          {info.fox.locked ? 'Odblokuj łączenie' : 'Zablokuj przed łączeniem'}
        </button>
        {!isHydra && <button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-rose-500/80 px-3 py-2 text-xs font-bold" onClick={onSell}>
          <GuiIcon name="foxSell" alt="Sell" />
          Usuń / sprzedaj
        </button>}

        {canEvolve && (
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-900"
            onClick={onEvolve}
          >
            <GuiIcon name="foxUpgrade" alt="Evolve" />
            Ewoluuj Mega Fox
          </button>
        )}
      </div>
    </div>
  );
}
