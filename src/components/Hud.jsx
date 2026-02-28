import { formatCompact, formatNumber } from '../game/format';
import { FaBolt, FaClock, FaCog, FaCoins, FaGem, FaPaw, FaRecycle } from 'react-icons/fa';

export default function Hud({ coins, gems, rebirthTokens, coinsPerSecond, countdown, foxCount, foxLimit, onOpenSystemMenu }) {
  return (
    <header className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto]">
      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <FaCoins />
          Ilość monet
        </p>
        <p className="text-2xl font-black text-amber-300">{formatNumber(coins)}</p>
      </div>

      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <FaBolt />
          Monet na sekunde
        </p>
        <p className="text-2xl font-black text-emerald-300">{formatCompact(coinsPerSecond, 1)}</p>
      </div>

      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <FaClock />
          Następny tick za
        </p>
        <p className="text-2xl font-black text-cyan-300">{formatCompact(countdown, 1)}s</p>
      </div>

      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <FaPaw />
          Lisy na planszy
        </p>
        <p className="text-2xl font-black text-orange-300">
          {foxCount}/{foxLimit}
        </p>
      </div>

      <div className="hud-card flex justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
            <FaGem />
            Diamenty
          </p>
          <p className="text-xl font-black text-fuchsia-300">{formatNumber(gems)}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
            <FaRecycle />
            Rebirth Tokens
          </p>
          <p className="text-xl font-black text-indigo-300">{formatNumber(rebirthTokens)}</p>
        </div>
      </div>

      <div className="hud-card flex items-center justify-center px-2">
        <button
          type="button"
          className="rounded-md border border-slate-600 bg-slate-800 p-3 text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSystemMenu();
          }}
          title="Menu gry"
        >
          <FaCog />
        </button>
      </div>
    </header>
  );
}
