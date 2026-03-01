import { formatCompact, formatNumber } from '../game/format';
import GuiIcon from './GuiIcon';

export default function Hud({ coins, gems, rebirthTokens, coinsPerSecond, countdown, foxCount, foxLimit, onOpenSystemMenu }) {
  return (
    <header className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto]">
      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <GuiIcon name="coin" alt="Coins" />
          Ilość monet
        </p>
        <p className="text-2xl font-black text-amber-300">{formatNumber(coins)}</p>
      </div>

      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <GuiIcon name="energy" alt="Coins per second" />
          Monet na sekunde
        </p>
        <p className="text-2xl font-black text-emerald-300">{formatCompact(coinsPerSecond, 1)}</p>
      </div>

      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <GuiIcon name="clock1" alt="Tick timer" />
          Następny tick za
        </p>
        <p className="text-2xl font-black text-cyan-300">{formatCompact(countdown, 1)}s</p>
      </div>

      <div className="hud-card">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
          <GuiIcon name="pet" alt="Fox count" />
          Lisy na planszy
        </p>
        <p className="text-2xl font-black text-orange-300">
          {foxCount}/{foxLimit}
        </p>
      </div>

      <div className="hud-card flex justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
            <GuiIcon name="diamond" alt="Gems" />
            Diamenty
          </p>
          <p className="text-xl font-black text-fuchsia-300">{formatNumber(gems)}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
            <GuiIcon name="rebirth" alt="Rebirth Tokens" />
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
          <GuiIcon name="settings" alt="Menu gry" size={18} />
        </button>
      </div>
    </header>
  );
}
