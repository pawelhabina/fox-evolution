import GuiIcon from './GuiIcon';
import AudioVolumeControl from './AudioVolumeControl';

export default function SettingsModal({ isOpen, settings, fullscreen, gameVersion, onToggleSetting, onSetVolume, onToggleFullscreen, onHardReset, onClose }) {
  if (!isOpen) {
    return null;
  }

  const musicVolume = Number.isFinite(settings.musicVolume) ? settings.musicVolume : 30;
  const sfxVolume = Number.isFinite(settings.sfxVolume) ? settings.sfxVolume : 70;
  const musicMuted = Boolean(settings.musicMuted);
  const sfxMuted = Boolean(settings.sfxMuted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="pixel-frame w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-amber-300">
            <GuiIcon name="settings" alt="Ustawienia" size={18} />
            Ustawienia gry
          </h3>
          <button type="button" className="rounded border border-slate-600 p-2 text-slate-300 hover:text-white" onClick={onClose}>
            <GuiIcon name="close" alt="Zamknij" />
          </button>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left"
            onClick={() => onToggleSetting('sound')}
          >
            <GuiIcon name="sound" alt="Dźwięki" />
            Dźwięki: {settings.sound ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left"
            onClick={() => onToggleSetting('animations')}
          >
            <GuiIcon name="animation" alt="Animacje" />
            Animacje: {settings.animations ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left"
            onClick={onToggleFullscreen}
          >
            <GuiIcon name="modes" alt="Pełny ekran" />
            Pełny ekran: {fullscreen ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="grid gap-3">
            <AudioVolumeControl
              icon="music"
              label="Muzyka"
              volume={musicVolume}
              muted={musicMuted}
              onChange={(value) => onSetVolume('musicVolume', value)}
              onToggleMute={() => onToggleSetting('musicMuted')}
            />

            <AudioVolumeControl
              icon="sound"
              label="SFX"
              volume={sfxVolume}
              muted={sfxMuted}
              onChange={(value) => onSetVolume('sfxVolume', value)}
              onToggleMute={() => onToggleSetting('sfxMuted')}
            />
          </div>
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
            <GuiIcon name="trash" alt="Hard reset" />
            Hard reset
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">Early Access · wersja gry: {gameVersion}</p>
      </div>
    </div>
  );
}
