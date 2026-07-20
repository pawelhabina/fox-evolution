import GuiIcon from './GuiIcon';

export default function AudioVolumeControl({ icon, label, volume, muted, onChange, onToggleMute }) {
  return (
    <div className={`grid gap-1 ${muted ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
        <span className="flex items-center gap-2">
          <GuiIcon name={icon} alt={label} />
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-bold text-amber-300">{volume}%</span>
          <button
            type="button"
            className={`flex items-center gap-1 border px-2 py-1 text-[11px] font-bold ${
              muted ? 'border-rose-400 bg-rose-500/20 text-rose-200' : 'border-slate-500 bg-slate-700 text-slate-200'
            }`}
            aria-pressed={muted}
            aria-label={muted ? `Włącz ${label.toLowerCase()}` : `Wycisz ${label.toLowerCase()}`}
            title={muted ? `Włącz ${label.toLowerCase()}` : `Wycisz ${label.toLowerCase()}`}
            onClick={onToggleMute}
          >
            <GuiIcon name="mute" alt="" size={13} />
            {muted ? 'Włącz' : 'Wycisz'}
          </button>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-400"
        aria-label={`Głośność: ${label}`}
      />
    </div>
  );
}
