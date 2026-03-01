import { FaTimes } from 'react-icons/fa';
import GuiIcon from './GuiIcon';

export default function SettingsModal({ isOpen, settings, gameVersion, onToggleSetting, onHardReset, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-amber-300">
            <GuiIcon name="settings" alt="Ustawienia" size={18} />
            Ustawienia gry
          </h3>
          <button type="button" className="rounded border border-slate-600 p-2 text-slate-300 hover:text-white" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left"
            onClick={() => onToggleSetting('sound')}
          >
            <GuiIcon name="energy" alt="Dźwięki" />
            Dźwięki: {settings.sound ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left"
            onClick={() => onToggleSetting('animations')}
          >
            <GuiIcon name="clock2" alt="Animacje" />
            Animacje: {settings.animations ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold"
            onClick={async () => {
              const confirmed = window.confirm('Hard reset usunie cały zapis. Kontynuować?');
              if (confirmed) {
                await onHardReset();
                onClose();
              }
            }}
          >
            <GuiIcon name="foxSell" alt="Hard reset" />
            Hard reset
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">Wersja gry: {gameVersion}</p>
      </div>
    </div>
  );
}
