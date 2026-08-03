import { useEffect, useState } from 'react';
import gameIconUrl from '../../assets/app/fox-evolution-icon.png';
import { formatNumber } from '../game/format';
import AudioVolumeControl from './AudioVolumeControl';
import GuiIcon from './GuiIcon';

function RootMenu({ onContinue, onNew, onOpenLoad, onOpenRanking, onOpenSettings, onOpenHelp, onOpenProfile, onOpenFriends, onExit, hasSaves, isRemoteEnabled, principal, gameVersion }) {
  const isUser = principal?.type === 'USER';

  return (
    <div className="panel main-menu-panel mx-auto w-full max-w-5xl p-7">
      <section className="main-menu-hero">
        <div className="main-menu-brand-mark" aria-hidden="true">
          <img className="main-menu-brand-icon" src={gameIconUrl} alt="" />
        </div>
        <p className="main-menu-kicker">MERGE TYCOON</p>
        <p className="main-menu-release-badge"><span aria-hidden="true">●</span> EARLY ACCESS <small>v{gameVersion}</small></p>
        <h1 className="main-menu-title">Fox Evolution</h1>
        <p className="main-menu-tagline">Kupuj, łącz, zarabiaj i ulepszaj lisy.</p>
        <p className="main-menu-release-note">Wczesna wersja gry — zawartość i balans mogą się zmieniać.</p>

        {isRemoteEnabled && (
          <button type="button" className="main-menu-profile-card" onClick={onOpenProfile}>
            <GuiIcon name="user" alt="Profil" size={28} />
            <span className="min-w-0">
              <strong>{isUser ? principal.displayName : 'Grasz jako gość'}</strong>
              <small>{isUser ? 'Zapisy przypisane do konta' : 'Zaloguj się, aby synchronizować zapisy'}</small>
            </span>
            <span className={`main-menu-online-dot ${isUser ? 'is-online' : ''}`} aria-hidden="true" />
          </button>
        )}
      </section>

      <section className="main-menu-actions mt-4" aria-label="Menu główne">
        {hasSaves && (
          <button type="button" className="primary-btn main-menu-action main-menu-action--primary" onClick={onContinue}>
            <GuiIcon name="play" alt="" size={22} />
            <span><strong>Kontynuuj</strong><small>Wróć do ostatniego zapisu</small></span>
          </button>
        )}
        <button type="button" className={`${hasSaves ? 'shop-tab' : 'primary-btn'} main-menu-action`} onClick={onNew}>
          <GuiIcon name="plus" alt="" size={21} />
          <span><strong>Nowa gra</strong><small>Utwórz osobny zapis</small></span>
        </button>
        <button type="button" className="shop-tab main-menu-action" onClick={onOpenLoad}>
          <GuiIcon name="folder" alt="" size={20} />
          <span><strong>Wczytaj grę</strong><small>{hasSaves ? 'Wybierz lub usuń zapis' : 'Brak zapisów'}</small></span>
        </button>

        <div className="main-menu-secondary-grid">
          <button type="button" className="shop-tab main-menu-square-action" onClick={onOpenRanking}>
            <GuiIcon name="trophy" alt="" size={20} />
            Ranking
          </button>
          {isRemoteEnabled && (
            <button type="button" className="shop-tab main-menu-square-action" onClick={onOpenProfile}>
              <GuiIcon name="user" alt="" size={20} />
              Profil
            </button>
          )}
          {isRemoteEnabled && (
            <button type="button" className="shop-tab main-menu-square-action" onClick={onOpenFriends}>
              <GuiIcon name="friends" alt="" size={20} />
              Znajomi
            </button>
          )}
          <button type="button" className="shop-tab main-menu-square-action" onClick={onOpenSettings}>
            <GuiIcon name="settings" alt="Ustawienia" size={20} />
            Ustawienia
          </button>
          <button type="button" className="shop-tab main-menu-square-action" onClick={onOpenHelp}>
            <GuiIcon name="quest" alt="" size={20} />
            Pomocne informacje
          </button>
        </div>

        <button type="button" className="main-menu-exit" onClick={onExit}>
          <GuiIcon name="power" alt="" size={17} />
          Wyjdź z gry
        </button>
      </section>
    </div>
  );
}

function LoadMenu({ slots, onLoad, onNew, onDelete, onStats, onBack }) {
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
                  className="flex items-center gap-1 rounded-lg bg-cyan-700/80 px-3 py-1 text-xs font-bold"
                  onClick={() => onStats(slot)}
                >
                  <GuiIcon name="trophy" alt="" size={14} />
                  Statystyki
                </button>
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

function FriendRow({ item, actionLabel, onAction, danger = false }) {
  return (
    <div className="friend-row">
      <GuiIcon name="user" alt="" size={20} />
      <span className="min-w-0 flex-1">
        <strong>{item.user.displayName}</strong>
        <small>{item.user.uuid}</small>
      </span>
      {actionLabel && (
        <button type="button" className={danger ? 'friend-action friend-action--danger' : 'friend-action'} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function AccountMenu({
  section = 'profile',
  principal,
  onBack,
  onRegister,
  onLogin,
  onLogout,
  onOAuthLogin,
  onUpdateNickname,
  onLoadFriends,
  onSearchFriends,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRemoveFriendship
}) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [friendsData, setFriendsData] = useState({ friends: [], incoming: [], outgoing: [] });
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');
  const [friendResults, setFriendResults] = useState([]);
  const [friendError, setFriendError] = useState('');

  const isUser = principal?.type === 'USER';
  const nicknameAvailableAt = principal?.nicknameChangeAvailableAt ? new Date(principal.nicknameChangeAvailableAt).getTime() : 0;
  const nicknameAvailable = Boolean(principal?.profileSetupRequired) || !nicknameAvailableAt || nicknameAvailableAt <= nowTs;

  useEffect(() => {
    setNicknameDraft(principal?.displayName || '');
  }, [principal?.displayName]);

  useEffect(() => {
    if (!isUser) {
      return undefined;
    }
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isUser]);

  async function refreshFriends() {
    if (!isUser) {
      return;
    }
    setFriendsLoading(true);
    setFriendError('');
    try {
      setFriendsData(await onLoadFriends());
    } catch (_error) {
      setFriendError('Nie udało się pobrać listy znajomych.');
    } finally {
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    if (isUser && section === 'friends') {
      void refreshFriends();
    }
    // Funkcja korzysta z aktualnych propsów, a przeładowanie ma następować tylko po zmianie zakładki lub konta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isUser, principal?.id]);

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

  async function handleNicknameSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onUpdateNickname(nicknameDraft);
    } catch (_error) {
      setError('Nie udało się zmienić nicku. Użyj 2–24 liter, cyfr, spacji, _ lub -.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFriendSearch(event) {
    event.preventDefault();
    if (friendQuery.trim().length < 2) {
      return;
    }
    setFriendsLoading(true);
    setFriendError('');
    try {
      const payload = await onSearchFriends(friendQuery);
      setFriendResults(payload.users || []);
    } catch (_error) {
      setFriendError('Nie udało się wyszukać graczy.');
    } finally {
      setFriendsLoading(false);
    }
  }

  async function runFriendAction(action) {
    setFriendsLoading(true);
    setFriendError('');
    try {
      await action();
      await refreshFriends();
      if (friendQuery.trim().length >= 2) {
        const payload = await onSearchFriends(friendQuery);
        setFriendResults(payload.users || []);
      }
    } catch (_error) {
      setFriendError('Nie udało się wykonać operacji na liście znajomych.');
    } finally {
      setFriendsLoading(false);
    }
  }

  return (
    <div className="panel account-panel mx-auto w-full max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-amber-300">
          <GuiIcon name={section === 'friends' ? 'friends' : 'user'} alt="" size={24} />
          {section === 'friends' ? 'Znajomi' : 'Profil gracza'}
        </h2>
        <button type="button" className="shop-tab flex items-center gap-2" onClick={onBack}>
          <GuiIcon name="back" alt="" />
          Wstecz
        </button>
      </div>

      <div className="account-status-card">
        <GuiIcon name="user" alt="" size={28} />
        <span className="min-w-0 flex-1">
          <strong>{isUser ? principal.displayName || principal.email || 'Zalogowany' : 'Grasz jako gość'}</strong>
          <small>{isUser ? 'Chmura zapisów i funkcje społecznościowe są aktywne' : 'Zaloguj się, aby przypisać zapisy do konta'}</small>
        </span>
      </div>

      {isUser && section === 'profile' && (
        <div className="grid gap-3">
          {principal.profileSetupRequired && (
            <div className="account-onboarding">
              <strong>Ustaw swój nick</strong>
              <span>To nazwa widoczna w rankingu i na liście znajomych.</span>
            </div>
          )}

          <div className="account-identity-grid">
            <div><small>Nick</small><strong>{principal.displayName}</strong></div>
            <div><small>UUID konta</small><strong className="account-uuid">{principal.uuid || 'nadawanie…'}</strong></div>
            <div><small>Email</small><strong>{principal.email || 'konto zewnętrzne'}</strong></div>
            <div><small>Zapisy</small><strong>Przechowywane na koncie</strong></div>
          </div>

          <form className="account-nickname-form" onSubmit={handleNicknameSubmit}>
            <label htmlFor="account-nickname">Nick gracza</label>
            <div>
              <input
                id="account-nickname"
                type="text"
                minLength={2}
                maxLength={24}
                value={nicknameDraft}
                onChange={(event) => setNicknameDraft(event.target.value)}
                required
              />
              <button type="submit" className="primary-btn" disabled={busy || !nicknameAvailable}>Zapisz nick</button>
            </div>
            <small>
              {nicknameAvailable
                ? 'Nick można zmienić raz na 15 minut.'
                : `Następna zmiana: ${new Date(nicknameAvailableAt).toLocaleTimeString()}`}
            </small>
          </form>

          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="button" className="account-logout" onClick={onLogout}>
            <GuiIcon name="power" alt="" />
            Wyloguj
          </button>
        </div>
      )}

      {isUser && section === 'friends' && (
        <div className="friends-panel">
          <div className="friends-intro">
            <strong>Lista znajomych</strong>
            <span>Fundament pod odwiedzanie plansz i przyszłe boostowanie lisów.</span>
          </div>
          <form className="friend-search" onSubmit={handleFriendSearch}>
            <input value={friendQuery} onChange={(event) => setFriendQuery(event.target.value)} placeholder="Wpisz nick lub UUID gracza" minLength={2} />
            <button type="submit" className="primary-btn" disabled={friendsLoading}>Szukaj</button>
          </form>

          {friendError && <p className="text-sm text-rose-300">{friendError}</p>}
          {friendResults.length > 0 && (
            <section className="friend-section">
              <h3>Wyniki wyszukiwania</h3>
              {friendResults.map((user) => (
                <div className="friend-row" key={user.uuid}>
                  <GuiIcon name="user" alt="" size={20} />
                  <span className="min-w-0 flex-1"><strong>{user.displayName}</strong><small>{user.uuid}</small></span>
                  <button
                    type="button"
                    className="friend-action"
                    disabled={Boolean(user.friendshipStatus)}
                    onClick={() => runFriendAction(() => onSendFriendRequest(user.uuid))}
                  >
                    {user.friendshipStatus === 'ACCEPTED' ? 'Znajomy' : user.friendshipStatus === 'PENDING' ? 'Wysłano' : 'Dodaj'}
                  </button>
                </div>
              ))}
            </section>
          )}

          {friendsData.incoming.length > 0 && (
            <section className="friend-section">
              <h3>Zaproszenia</h3>
              {friendsData.incoming.map((item) => (
                <FriendRow key={item.id} item={item} actionLabel="Akceptuj" onAction={() => runFriendAction(() => onAcceptFriendRequest(item.id))} />
              ))}
            </section>
          )}

          {friendsData.outgoing.length > 0 && (
            <section className="friend-section">
              <h3>Oczekujące</h3>
              {friendsData.outgoing.map((item) => (
                <FriendRow key={item.id} item={item} actionLabel="Anuluj" danger onAction={() => runFriendAction(() => onRemoveFriendship(item.id))} />
              ))}
            </section>
          )}

          <section className="friend-section">
            <h3>Twoi znajomi ({friendsData.friends.length})</h3>
            {!friendsLoading && friendsData.friends.length === 0 && <p className="text-sm text-slate-400">Nie masz jeszcze znajomych.</p>}
            {friendsData.friends.map((item) => (
              <FriendRow key={item.id} item={item} actionLabel="Usuń" danger onAction={() => runFriendAction(() => onRemoveFriendship(item.id))} />
            ))}
          </section>
          {friendsLoading && <p className="text-sm text-slate-300">Ładowanie…</p>}
        </div>
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
                placeholder="Nick gracza"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                minLength={2}
                maxLength={24}
                required
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
      <p className="settings-section-title">OBRAZ I INTERFEJS</p>
      <div className="grid gap-2">
        <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultAnimations')}>
          <GuiIcon name="animation" alt="Animacje" />
          Animacje: {settings.defaultAnimations ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultFullscreen')}>
          <GuiIcon name="modes" alt="Pełny ekran" />
          Pełny ekran: {settings.defaultFullscreen ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3">
        <p className="settings-section-title">DŹWIĘK</p>
        <div className="grid gap-3">
          <button type="button" className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggle('defaultSound')}>
            <GuiIcon name="sound" alt="Dźwięki" />
            Dźwięki: {settings.defaultSound ? 'ON' : 'OFF'}
          </button>
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
  onOpenHelp,
  onOpenProfile,
  onOpenFriends,
  onExit,
  onBack,
  onLoad,
  onNew,
  onDelete,
  onOpenStats,
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
  onOAuthLogin,
  onUpdateNickname,
  onLoadFriends,
  onSearchFriends,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRemoveFriendship,
  gameVersion
}) {
  if (view === 'load') {
    return <LoadMenu slots={meta.slots} onLoad={onLoad} onNew={onNew} onDelete={onDelete} onStats={onOpenStats} onBack={onBack} />;
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
  if (view === 'profile' || view === 'friends') {
    return (
      <AccountMenu
        section={view}
        principal={principal}
        onBack={onBack}
        onRegister={onRegisterAccount}
        onLogin={onLoginAccount}
        onLogout={onLogoutAccount}
        onOAuthLogin={onOAuthLogin}
        onUpdateNickname={onUpdateNickname}
        onLoadFriends={onLoadFriends}
        onSearchFriends={onSearchFriends}
        onSendFriendRequest={onSendFriendRequest}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onRemoveFriendship={onRemoveFriendship}
      />
    );
  }

  return (
    <RootMenu
      onContinue={onContinue}
      onNew={onNew}
      onOpenLoad={onOpenLoad}
      onOpenRanking={onOpenRanking}
      onOpenSettings={onOpenSettings}
      onOpenHelp={onOpenHelp}
      onOpenProfile={onOpenProfile}
      onOpenFriends={onOpenFriends}
      onExit={onExit}
      hasSaves={meta.slots.length > 0}
      isRemoteEnabled={isRemoteEnabled}
      principal={principal}
      gameVersion={gameVersion}
    />
  );
}
