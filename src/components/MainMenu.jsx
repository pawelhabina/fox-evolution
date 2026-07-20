import { useState } from 'react';
import { formatNumber } from '../game/format';
import AudioVolumeControl from './AudioVolumeControl';
import GuiIcon from './GuiIcon';

function RootMenu({ onContinue, onOpenLoad, onOpenRanking, onOpenSettings, onOpenAccount, onExit, hasSaves, isRemoteEnabled, principal }) {
  return (
    <div className="panel mx-auto w-full max-w-xl p-8">
      <h1 className="text-center text-4xl font-black text-amber-300">Fox Evolution</h1>
      <p className="mt-2 text-center text-sm text-slate-400">Offline desktop merge game</p>

      {isRemoteEnabled && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
          <p>
            Konto: <span className="font-bold text-amber-300">{principal?.type === 'USER' ? principal.displayName || principal.email || 'Zalogowany' : 'Gość'}</span>
          </p>
          <p className="text-xs text-slate-400">Gość ma zapis na urządzeniu. Konto odblokowuje chmurę między urządzeniami i leaderboard.</p>
        </div>
      )}

      <div className="mt-8 grid gap-3">
        <button type="button" className="primary-btn flex items-center justify-center gap-2" onClick={onContinue}>
          <GuiIcon name="play" alt="" size={20} />
          {hasSaves ? 'Kontynuuj' : 'Nowa gra'}
        </button>
        <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenLoad}>
          <GuiIcon name="folder" alt="" size={20} />
          Wczytaj grę
        </button>
        <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenRanking}>
          <GuiIcon name="trophy" alt="" size={20} />
          Ranking
        </button>
        {isRemoteEnabled && (
          <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenAccount}>
            <GuiIcon name="user" alt="" size={20} />
            Konto
          </button>
        )}
        <button type="button" className="shop-tab flex items-center justify-center gap-2" onClick={onOpenSettings}>
          <GuiIcon name="settings" alt="Ustawienia" />
          Ustawienia
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg border border-rose-400/70 bg-rose-600/25 px-4 py-2 text-rose-100"
          onClick={onExit}
        >
          <GuiIcon name="power" alt="" size={20} />
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
          <GuiIcon name="folder" alt="" size={24} />
          Wczytaj grę
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <GuiIcon name="back" alt="" />
          Wstecz
        </button>
      </div>

      <div className="mb-4">
        <button type="button" className="primary-btn flex items-center justify-center gap-2" onClick={onNew}>
          <GuiIcon name="plus" alt="" />
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
                  <GuiIcon name="clock" alt="" size={14} />
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
                  <GuiIcon name="download" alt="" size={14} />
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
                  <GuiIcon name="trash" alt="" size={14} />
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

function RankingBlock({ title, icon, board, accent = 'text-emerald-300' }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-amber-300">
        <GuiIcon name={icon} alt={title} />
        {title}
      </h3>

      {(board?.top || []).length === 0 && <p className="text-sm text-slate-400">Brak danych.</p>}

      <div className="grid gap-1">
        {(board?.top || []).map((entry) => (
          <div key={`${title}-${entry.rank}-${entry.user.id}`} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">
              #{entry.rank} {entry.user.displayName}
            </span>
            <span className={`font-bold ${accent}`}>{formatNumber(Number(entry.value || 0))}</span>
          </div>
        ))}
      </div>

      {board?.myRank && (
        <div className="mt-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-2 text-sm text-amber-100">
          Twoje miejsce: #{board.myRank.rank} ({formatNumber(Number(board.myRank.value || 0))})
        </div>
      )}
    </div>
  );
}

function RankingMenu({ slots, onBack, isRemoteEnabled, leaderboardData, leaderboardLoading, leaderboardError, onRefreshLeaderboard, principal }) {
  const localRanking = [...slots].sort((a, b) => (b.summary?.lifetimeCoins || 0) - (a.summary?.lifetimeCoins || 0));

  return (
    <div className="panel mx-auto w-full max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <GuiIcon name="trophy" alt="" size={24} />
          Ranking
        </h2>
        <div className="flex gap-2">
          {isRemoteEnabled && (
            <button type="button" className="shop-tab flex items-center gap-2" onClick={onRefreshLeaderboard}>
              <GuiIcon name="refresh" alt="" />
              Odśwież
            </button>
          )}
          <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
            <GuiIcon name="back" alt="" />
            Wstecz
          </button>
        </div>
      </div>

      {!isRemoteEnabled && (
        <div className="grid gap-2">
          {localRanking.length === 0 && <p className="text-sm text-slate-400">Brak wyników.</p>}
          {localRanking.map((slot, index) => (
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
      )}

      {isRemoteEnabled && (
        <div className="grid gap-3">
          <p className="text-sm text-slate-400">
            Ranking globalny obejmuje wyłącznie konta zalogowane. Obecny status:{' '}
            <span className="font-semibold text-amber-300">{principal?.type === 'USER' ? 'konto' : 'gość'}</span>
          </p>

          {leaderboardLoading && <p className="text-sm text-slate-300">Ładowanie rankingu...</p>}
          {leaderboardError && <p className="text-sm text-rose-300">{leaderboardError}</p>}

          {!leaderboardLoading && !leaderboardError && (
            <div className="grid gap-3 md:grid-cols-3">
              <RankingBlock title="Monety" icon="coin" board={leaderboardData?.coins} accent="text-emerald-300" />
              <RankingBlock title="Diamenty" icon="diamond" board={leaderboardData?.gems} accent="text-fuchsia-300" />
              <RankingBlock title="Top tier lisa" icon="upgrade" board={leaderboardData?.top_tier} accent="text-cyan-300" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ principal, onBack, onRegister, onLogin, onLogout, onOAuthLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isUser = principal?.type === 'USER';

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        await onRegister({ email, password, displayName });
      } else {
        await onLogin({ email, password });
      }
      setPassword('');
    } catch (submitError) {
      setError('Operacja nie powiodła się. Sprawdź dane logowania.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel mx-auto w-full max-w-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <GuiIcon name="user" alt="" size={24} />
          Konto
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <GuiIcon name="back" alt="" />
          Wstecz
        </button>
      </div>

      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
        Status: <span className="font-bold text-amber-300">{isUser ? principal.displayName || principal.email || 'Zalogowany' : 'Gość'}</span>
      </div>

      {isUser && (
        <button type="button" className="flex items-center gap-2 rounded-lg border border-rose-500/70 bg-rose-600/20 px-4 py-2 text-rose-100" onClick={onLogout}>
          <GuiIcon name="power" alt="" />
          Wyloguj
        </button>
      )}

      {!isUser && (
        <>
          <div className="mb-3 flex gap-2">
            <button type="button" className={`shop-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
              Logowanie
            </button>
            <button type="button" className={`shop-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
              Rejestracja
            </button>
          </div>

          <form className="grid gap-2" onSubmit={handleSubmit}>
            <input
              type="email"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              type="password"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
              placeholder="Hasło"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            {mode === 'register' && (
              <input
                type="text"
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
                placeholder="Nick (opcjonalnie)"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            )}

            {error && <p className="text-sm text-rose-300">{error}</p>}

            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Proszę czekać...' : mode === 'register' ? 'Utwórz konto' : 'Zaloguj'}
            </button>
          </form>

          <div className="mt-4 grid gap-2">
            <p className="text-xs text-slate-400">OAuth:</p>
            <button type="button" className="shop-tab flex items-center justify-center gap-2 text-center" onClick={() => onOAuthLogin('google')} disabled={busy}>
              <GuiIcon name="google" alt="" />
              Zaloguj przez Google
            </button>
            <button type="button" className="shop-tab flex items-center justify-center gap-2 text-center" onClick={() => onOAuthLogin('steam')} disabled={busy}>
              <GuiIcon name="steam" alt="" />
              Zaloguj przez Steam
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsMenu({ settings, onToggle, onSetVolume, onBack }) {
  const defaultMusicVolume = Number.isFinite(settings.defaultMusicVolume) ? settings.defaultMusicVolume : 30;
  const defaultSfxVolume = Number.isFinite(settings.defaultSfxVolume) ? settings.defaultSfxVolume : 70;
  const defaultMusicMuted = Boolean(settings.defaultMusicMuted);
  const defaultSfxMuted = Boolean(settings.defaultSfxMuted);

  return (
    <div className="panel mx-auto w-full max-w-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <GuiIcon name="settings" alt="Ustawienia" />
          Ustawienia
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <GuiIcon name="back" alt="" />
          Wstecz
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-400">Ustawienia są wspólne dla całej gry i zapisywane na tym urządzeniu.</p>
      <div className="grid gap-2">
        <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultSound')}>
          <GuiIcon name="sound" alt="Dźwięki" />
          Sound: {settings.defaultSound ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultAnimations')}>
          <GuiIcon name="animation" alt="Animacje" />
          Animations: {settings.defaultAnimations ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
        <div className="grid gap-3">
          <AudioVolumeControl
            icon="music"
            label="Muzyka"
            volume={defaultMusicVolume}
            muted={defaultMusicMuted}
            onChange={(value) => onSetVolume('defaultMusicVolume', value)}
            onToggleMute={() => onToggle('defaultMusicMuted')}
          />

          <AudioVolumeControl
            icon="sound"
            label="SFX"
            volume={defaultSfxVolume}
            muted={defaultSfxMuted}
            onChange={(value) => onSetVolume('defaultSfxVolume', value)}
            onToggleMute={() => onToggle('defaultSfxMuted')}
          />
        </div>
      </div>
    </div>
  );
}

export default function MainMenu({
  view,
  meta,
  onContinue,
  onOpenLoad,
  onOpenRanking,
  onOpenSettings,
  onOpenAccount,
  onExit,
  onBack,
  onLoad,
  onNew,
  onDelete,
  onToggleSettings,
  onSetSettingsVolume,
  isRemoteEnabled,
  principal,
  leaderboardData,
  leaderboardLoading,
  leaderboardError,
  onRefreshLeaderboard,
  onLoginAccount,
  onRegisterAccount,
  onLogoutAccount,
  onOAuthLogin
}) {
  if (view === 'load') {
    return <LoadMenu slots={meta.slots} onLoad={onLoad} onNew={onNew} onDelete={onDelete} onBack={onBack} />;
  }
  if (view === 'ranking') {
    return (
      <RankingMenu
        slots={meta.slots}
        onBack={onBack}
        isRemoteEnabled={isRemoteEnabled}
        leaderboardData={leaderboardData}
        leaderboardLoading={leaderboardLoading}
        leaderboardError={leaderboardError}
        onRefreshLeaderboard={onRefreshLeaderboard}
        principal={principal}
      />
    );
  }
  if (view === 'settings') {
    return <SettingsMenu settings={meta.settings} onToggle={onToggleSettings} onSetVolume={onSetSettingsVolume} onBack={onBack} />;
  }
  if (view === 'account') {
    return (
      <AccountMenu
        principal={principal}
        onBack={onBack}
        onRegister={onRegisterAccount}
        onLogin={onLoginAccount}
        onLogout={onLogoutAccount}
        onOAuthLogin={onOAuthLogin}
      />
    );
  }

  return (
    <RootMenu
      onContinue={onContinue}
      onOpenLoad={onOpenLoad}
      onOpenRanking={onOpenRanking}
      onOpenSettings={onOpenSettings}
      onOpenAccount={onOpenAccount}
      onExit={onExit}
      hasSaves={meta.slots.length > 0}
      isRemoteEnabled={isRemoteEnabled}
      principal={principal}
    />
  );
}
