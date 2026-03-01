import { formatNumber } from '../game/format';
import {
  FaArrowLeft,
  FaClock,
  FaDownload,
  FaFolderOpen,
  FaPlay,
  FaPlus,
  FaSignOutAlt,
  FaTrash,
  FaTrophy
} from 'react-icons/fa';
import GuiIcon from './GuiIcon';

function RootMenu({ onContinue, onOpenLoad, onOpenRanking, onOpenSettings, onExit, hasSaves }) {
  return (
    <div className="panel mx-auto w-full max-w-xl p-8">
      <h1 className="text-center text-4xl font-black text-amber-300">Fox Evolution</h1>
      <p className="mt-2 text-center text-sm text-slate-400">Offline desktop merge game</p>

      <div className="mt-8 grid gap-3">
        <button type="button" className="primary-btn flex items-center justify-center gap-2" onClick={onContinue}>
          <FaPlay />
          {hasSaves ? 'Kontynuuj' : 'Nowa gra'}
        </button>
        <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenLoad}>
          <FaFolderOpen />
          Wczytaj grę
        </button>
        <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenRanking}>
          <FaTrophy />
          Ranking
        </button>
        <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenSettings}>
          <GuiIcon name="settings" alt="Ustawienia" />
          Ustawienia
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg border border-rose-400/70 bg-rose-600/25 px-4 py-2 text-rose-100"
          onClick={onExit}
        >
          <FaSignOutAlt />
          Wyjdź z gry
        </button>
      </div>
    </div>
  );
}

function LoadMenu({ slots, onLoad, onNew, onDelete, onBack }) {
  return (
    <div className="panel mx-auto w-full max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <FaFolderOpen />
          Wczytaj grę
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <FaArrowLeft />
          Wstecz
        </button>
      </div>

      <div className="mb-4">
        <button type="button" className="primary-btn flex items-center justify-center gap-2" onClick={onNew}>
          <FaPlus />
          Nowa gra
        </button>
      </div>

      <div className="grid gap-2">
        {slots.length === 0 && <p className="text-sm text-slate-400">Brak zapisów.</p>}
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-100">{slot.name}</p>
                <p className="flex items-center gap-2 text-xs text-slate-400">
                  <FaClock />
                  Ostatni zapis: {new Date(slot.updatedAt).toLocaleString()}
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-400">
                  <GuiIcon name="diamond" alt="Diamenty" />
                  Diamenty: {formatNumber(slot.summary?.gems || 0)} | <GuiIcon name="rebirth" alt="Rebirthy" className="mx-1" /> Rebirthy:{' '}
                  {slot.summary?.lifetimeRebirths || 0} | <GuiIcon name="upgrade" alt="Najwyższy tier" className="mx-1" /> Najwyższy tier:{' '}
                  {slot.summary?.highestTier ?? slot.summary?.maxTier ?? 1}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold"
                  onClick={() => onLoad(slot.id)}
                >
                  <FaDownload />
                  Wczytaj
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg bg-rose-700/70 px-3 py-1 text-xs font-bold"
                  onClick={() => {
                    const ok = window.confirm('Usunąć ten zapis?');
                    if (ok) {
                      onDelete(slot.id);
                    }
                  }}
                >
                  <FaTrash />
                  Usuń
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingMenu({ slots, onBack }) {
  const ranking = [...slots].sort((a, b) => (b.summary?.lifetimeCoins || 0) - (a.summary?.lifetimeCoins || 0));

  return (
    <div className="panel mx-auto w-full max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <FaTrophy />
          Ranking
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <FaArrowLeft />
          Wstecz
        </button>
      </div>

      <div className="grid gap-2">
        {ranking.length === 0 && <p className="text-sm text-slate-400">Brak wyników.</p>}
        {ranking.map((slot, index) => (
          <div key={slot.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <div>
              <p className="font-bold text-slate-100">
                #{index + 1} {slot.name}
              </p>
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <GuiIcon name="rebirth" alt="Rebirthy" />
                Rebirths: {slot.summary?.lifetimeRebirths || 0}
              </p>
            </div>
            <p className="flex items-center gap-2 text-lg font-black text-emerald-300">
              <GuiIcon name="coin" alt="Coins" />
              {formatNumber(slot.summary?.lifetimeCoins || 0)} coins
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsMenu({ settings, onToggle, onBack }) {
  return (
    <div className="panel mx-auto w-full max-w-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <GuiIcon name="settings" alt="Ustawienia" />
          Ustawienia
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <FaArrowLeft />
          Wstecz
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-400">Domyślne ustawienia dla nowych zapisów:</p>
      <div className="grid gap-2">
        <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultSound')}>
          <GuiIcon name="energy" alt="Sound" />
          Sound: {settings.defaultSound ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultAnimations')}>
          <GuiIcon name="clock2" alt="Animations" />
          Animations: {settings.defaultAnimations ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}

export default function MainMenu({ view, meta, onContinue, onOpenLoad, onOpenRanking, onOpenSettings, onExit, onBack, onLoad, onNew, onDelete, onToggleSettings }) {
  if (view === 'load') {
    return <LoadMenu slots={meta.slots} onLoad={onLoad} onNew={onNew} onDelete={onDelete} onBack={onBack} />;
  }
  if (view === 'ranking') {
    return <RankingMenu slots={meta.slots} onBack={onBack} />;
  }
  if (view === 'settings') {
    return <SettingsMenu settings={meta.settings} onToggle={onToggleSettings} onBack={onBack} />;
  }

  return (
    <RootMenu
      onContinue={onContinue}
      onOpenLoad={onOpenLoad}
      onOpenRanking={onOpenRanking}
      onOpenSettings={onOpenSettings}
      onExit={onExit}
      hasSaves={meta.slots.length > 0}
    />
  );
}
