import { formatCompact, formatNumber } from '../game/format';

export default function Hud({ coins, gems, rebirthTokens, coinsPerSecond, countdown, foxCount, foxLimit }) {
  return (
    <header className="grid gap-3 md:grid-cols-5">
      <div className="hud-card">
        <p className="text-xs uppercase tracking-wider text-slate-400">Ilość monet</p>
        <p className="text-2xl font-black text-amber-300">{formatNumber(coins)}</p>
      </div>

      <div className="hud-card">
        <p className="text-xs uppercase tracking-wider text-slate-400">Monet na sekunde</p>
        <p className="text-2xl font-black text-emerald-300">{formatCompact(coinsPerSecond, 1)}</p>
      </div>

      <div className="hud-card">
        <p className="text-xs uppercase tracking-wider text-slate-400">Następny tick za</p>
        <p className="text-2xl font-black text-cyan-300">{countdown}s</p>
      </div>

      <div className="hud-card">
        <p className="text-xs uppercase tracking-wider text-slate-400">Lisy na planszy</p>
        <p className="text-2xl font-black text-orange-300">
          {foxCount}/{foxLimit}
        </p>
      </div>

      <div className="hud-card flex justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Diamenty</p>
          <p className="text-xl font-black text-fuchsia-300">{formatNumber(gems)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Rebirth Tokens</p>
          <p className="text-xl font-black text-indigo-300">{formatNumber(rebirthTokens)}</p>
        </div>
      </div>
    </header>
  );
}
