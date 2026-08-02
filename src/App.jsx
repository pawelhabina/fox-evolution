import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import GuiIcon from './components/GuiIcon';
import Arena from './components/Arena';
import EvolutionModal from './components/EvolutionModal';
import FoxContextMenu from './components/FoxContextMenu';
import Hud from './components/Hud';
import MainMenu, { AccountMenu } from './components/MainMenu';
import PixelGridBackground from './components/PixelGridBackground';
import SettingsModal from './components/SettingsModal';
import ShopPanel from './components/ShopPanel';
import ToastStack from './components/ToastStack';
import { configureAudio, playSfx, shutdownAudio, startBackgroundMusic } from './audio/gameAudio';
import {
  AUTOSAVE_SECONDS,
  BASE_MAX_TIER,
  BASE_TICK_SECONDS,
  EVOLUTION_COST_GEMS,
  MAX_TIER,
  TEMP_BOOST_DEFS,
  TEMP_BOOST_DURATION_BY_ID
} from './game/constants';
import { formatNumber } from './game/format';
import {
  getBuyFoxCost,
  getExpectedCoinsPerSecond,
  getFoxClickValue,
  getFoxIncomePerTick,
  getFoxLimit,
  getRebirthTokensEarned,
  getTickDurationSeconds
} from './game/economy';
import { gameReducer, ACTIONS, getFoxInfoForMenu } from './game/reducer';
import { getResetCountdowns } from './game/quests';
import { createInitialState } from './storage/defaultState';
import {
  deleteSlot,
  acceptGameFriendRequest,
  fetchLeaderboardCategory,
  fetchGameFriends,
  getAuthPrincipal,
  beginOAuthLogin,
  completeOAuthLoginFromCallback,
  getRemoteSlotUpdatedAt,
  hydrateSessionFromOAuthRedirect,
  installGameUpdateAndRestart,
  isRemoteStorageEnabled,
  listSaveMeta,
  loginGameAccount,
  loadSlotStateWithMeta,
  onGameUpdateStatus,
  logoutGameAccount,
  onOAuthLoginCallback,
  quitGameApp,
  readGameVersion,
  readUpdateState,
  checkForGameUpdates,
  refreshAuthPrincipalFromApi,
  registerGameAccount,
  removeGameFriendship,
  saveSlotState,
  saveSlotStateSync,
  setGameFullscreen,
  trackTelemetryEvent,
  searchGameFriends,
  sendGameFriendRequest,
  updateGameNickname,
  updateMenuSettings
} from './storage/gameStorage';

const DEFAULT_MENU_META = {
  lastPlayedSlotId: null,
  settings: {
    defaultSound: true,
    defaultAnimations: true,
    defaultMusicVolume: 30,
    defaultSfxVolume: 70,
    defaultMusicMuted: false,
    defaultSfxMuted: false,
    defaultFullscreen: false,
    audioDefaultsVersion: 3
  },
  slots: []
};

const EVENT_MODE_ENABLED = false;

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function isRemoteTimestampNewer(currentTs, nextTs) {
  if (!nextTs) {
    return false;
  }
  const nextMs = new Date(nextTs).getTime();
  if (!Number.isFinite(nextMs)) {
    return false;
  }
  const currentMs = currentTs ? new Date(currentTs).getTime() : 0;
  if (!Number.isFinite(currentMs)) {
    return true;
  }
  return nextMs > currentMs;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  return { toasts, pushToast };
}

function UpdateOverlay({ updateState, onInstall, onCheck }) {
  const status = updateState?.status || 'idle';

  const shouldShow =
    status === 'checking' ||
    status === 'downloading' ||
    status === 'downloaded' ||
    status === 'installing' ||
    status === 'error';

  if (!shouldShow) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, Number(updateState?.progress) || 0));

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[120] w-[min(560px,calc(100%-2rem))] -translate-x-1/2">
      <div className="pointer-events-auto rounded-xl border border-amber-400/50 bg-slate-950/95 p-3 shadow-2xl">
        <p className="text-sm font-bold text-amber-300">Aktualizacja gry</p>
        <p className="mt-1 text-sm text-slate-200">
          {updateState?.message || (status === 'downloaded' ? 'Aktualizacja gotowa do instalacji.' : 'Sprawdzanie aktualizacji...')}
        </p>

        {status === 'downloading' && (
          <div className="mt-2">
            <div className="h-2 overflow-hidden rounded bg-slate-700">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-300">{progress.toFixed(1)}%</p>
          </div>
        )}

        {status === 'downloaded' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="primary-btn !px-3 !py-2 !text-sm" onClick={onInstall}>
              Zrestartuj grę i zainstaluj
            </button>
          </div>
        )}

        {status === 'installing' && <p className="mt-2 text-xs text-amber-200">Nie uruchamiaj instalatora ręcznie — gra zamknie się sama.</p>}

        {status === 'error' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100" onClick={onCheck}>
              Spróbuj ponownie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const remoteEnabled = isRemoteStorageEnabled();
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const [appScreen, setAppScreen] = useState('menu');
  const [menuView, setMenuView] = useState('root');
  const [saveMeta, setSaveMeta] = useState(DEFAULT_MENU_META);
  const [authPrincipal, setAuthPrincipal] = useState(() => getAuthPrincipal());
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [updateState, setUpdateState] = useState({
    enabled: false,
    status: 'idle',
    message: '',
    progress: 0,
    updateVersion: null
  });
  const [currentSlotId, setCurrentSlotId] = useState(null);
  const [shopTab, setShopTab] = useState('Ulepszenia');
  const [tickCountdown, setTickCountdown] = useState(BASE_TICK_SECONDS);
  const [incomePulse, setIncomePulse] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [shopCollapsed, setShopCollapsed] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [evolutionTargetId, setEvolutionTargetId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gameVersion, setGameVersion] = useState('dev');
  const stateRef = useRef(state);
  const incomePulseIdRef = useRef(0);
  const remoteSlotUpdatedAtRef = useRef(null);
  const updateDownloadedToastShownRef = useRef(false);
  const { toasts, pushToast } = useToasts();
  stateRef.current = state;

  const coinsPerSecond = useMemo(() => getExpectedCoinsPerSecond(state), [state]);
  const buyCost = useMemo(() => getBuyFoxCost(state), [state]);
  const foxLimit = useMemo(() => getFoxLimit(state), [state]);
  const rebirthPreview = useMemo(() => getRebirthTokensEarned(state), [state]);
  const tickDuration = useMemo(() => getTickDurationSeconds(state), [state]);
  const resetCountdowns = useMemo(
    () => getResetCountdowns(Date.now()),
    [tickCountdown, state.quests.dailyKey, state.quests.weeklyKey]
  );
  const contextInfo = useMemo(
    () => (contextMenu ? getFoxInfoForMenu(state, contextMenu.foxId) : null),
    [contextMenu, state]
  );

  const evolutionFox = useMemo(
    () => state.foxes.find((fox) => fox.id === evolutionTargetId) || null,
    [evolutionTargetId, state.foxes]
  );

  const withGlobalSettings = useCallback((nextState) => ({
    ...nextState,
    settings: {
      ...nextState.settings,
      sound: Boolean(saveMeta.settings.defaultSound),
      animations: Boolean(saveMeta.settings.defaultAnimations),
      musicVolume: Number.isFinite(saveMeta.settings.defaultMusicVolume) ? saveMeta.settings.defaultMusicVolume : 30,
      sfxVolume: Number.isFinite(saveMeta.settings.defaultSfxVolume) ? saveMeta.settings.defaultSfxVolume : 70,
      musicMuted: Boolean(saveMeta.settings.defaultMusicMuted),
      sfxMuted: Boolean(saveMeta.settings.defaultSfxMuted)
    }
  }), [
    saveMeta.settings.defaultAnimations,
    saveMeta.settings.defaultMusicMuted,
    saveMeta.settings.defaultMusicVolume,
    saveMeta.settings.defaultSfxMuted,
    saveMeta.settings.defaultSfxVolume,
    saveMeta.settings.defaultSound
  ]);

  const persistGlobalSettings = useCallback(async (patch) => {
    try {
      const updated = await updateMenuSettings({
        ...patch,
        audioDefaultsVersion: 3
      });
      setSaveMeta((previous) => ({
        ...previous,
        settings: {
          ...previous.settings,
          ...updated
        }
      }));
    } catch (_error) {
      // Keep the in-game setting responsive if persistence is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const audioSettings = appScreen === 'game'
      ? {
          enabled: state.settings.sound,
          musicVolume: state.settings.musicVolume,
          sfxVolume: state.settings.sfxVolume,
          musicMuted: state.settings.musicMuted,
          sfxMuted: state.settings.sfxMuted
        }
      : {
          enabled: saveMeta.settings.defaultSound,
          musicVolume: saveMeta.settings.defaultMusicVolume,
          sfxVolume: saveMeta.settings.defaultSfxVolume,
          musicMuted: saveMeta.settings.defaultMusicMuted,
          sfxMuted: saveMeta.settings.defaultSfxMuted
        };
    configureAudio(audioSettings);
    startBackgroundMusic();
  }, [
    appScreen,
    saveMeta.settings.defaultMusicMuted,
    saveMeta.settings.defaultMusicVolume,
    saveMeta.settings.defaultSfxMuted,
    saveMeta.settings.defaultSfxVolume,
    saveMeta.settings.defaultSound,
    state.settings.musicMuted,
    state.settings.musicVolume,
    state.settings.sfxMuted,
    state.settings.sfxVolume,
    state.settings.sound
  ]);

  useEffect(() => () => {
    shutdownAudio();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      void setGameFullscreen(Boolean(saveMeta.settings.defaultFullscreen));
    }
  }, [isLoaded, saveMeta.settings.defaultFullscreen]);

  const refreshMenuMeta = useCallback(async () => {
    const meta = await listSaveMeta();
    setSaveMeta(meta);
    return meta;
  }, []);

  const refreshAuthPrincipal = useCallback(async () => {
    const principal = await refreshAuthPrincipalFromApi();
    setAuthPrincipal(principal);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    if (!remoteEnabled) {
      setLeaderboardData(null);
      setLeaderboardError('');
      return;
    }

    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      const [coins, gems, topTier] = await Promise.all([
        fetchLeaderboardCategory('coins', 10),
        fetchLeaderboardCategory('gems', 10),
        fetchLeaderboardCategory('top_tier', 10)
      ]);

      setLeaderboardData({
        coins,
        gems,
        top_tier: topTier
      });
    } catch (_error) {
      setLeaderboardError('Nie udało się pobrać leaderboarda z serwera');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [remoteEnabled]);

  const checkForUpdatesNow = useCallback(async () => {
    try {
      const next = await checkForGameUpdates();
      if (next) {
        setUpdateState((prev) => ({ ...prev, ...next }));
      }
    } catch (_error) {
      // ignore
    }
  }, []);

  const installUpdateNow = useCallback(async () => {
    if (appScreen === 'game' && currentSlotId) {
      saveSlotStateSync({ slotId: currentSlotId, state: stateRef.current });
      try {
        await saveSlotState({ slotId: currentSlotId, state: stateRef.current });
      } catch (_error) {
        // Lokalny zapis synchroniczny został już wykonany; aktualizacja może ruszyć offline.
      }
    }

    const ok = await installGameUpdateAndRestart();
    if (!ok) {
      pushToast('Aktualizacja nie jest jeszcze gotowa do instalacji');
    }
  }, [appScreen, currentSlotId, pushToast]);

  const enterGameWithState = useCallback((nextState, slotId, remoteUpdatedAt = null) => {
    const syncedState = withGlobalSettings(nextState);
    dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: syncedState, nowTs: Date.now() });
    setCurrentSlotId(slotId);
    remoteSlotUpdatedAtRef.current = remoteUpdatedAt || null;
    setShopTab('Ulepszenia');
    setTickCountdown(getTickDurationSeconds(syncedState));
    setIncomePulse(null);
    setContextMenu(null);
    setEvolutionTargetId(null);
    setAppScreen('game');
  }, [withGlobalSettings]);

  const loadSlotAndStart = useCallback(
    async (slotId) => {
      const loaded = await loadSlotStateWithMeta(slotId);
      if (!loaded?.state) {
        pushToast('Nie udało się wczytać zapisu');
        await refreshMenuMeta();
        return;
      }
      enterGameWithState(loaded.state, slotId, loaded.updatedAt);
    },
    [enterGameWithState, pushToast, refreshMenuMeta]
  );

  const createNewGameAndStart = useCallback(async () => {
    const fresh = createInitialState(Date.now());
    fresh.settings.sound = Boolean(saveMeta.settings.defaultSound);
    fresh.settings.animations = Boolean(saveMeta.settings.defaultAnimations);
    fresh.settings.musicVolume = Number.isFinite(saveMeta.settings.defaultMusicVolume) ? saveMeta.settings.defaultMusicVolume : fresh.settings.musicVolume;
    fresh.settings.sfxVolume = Number.isFinite(saveMeta.settings.defaultSfxVolume) ? saveMeta.settings.defaultSfxVolume : fresh.settings.sfxVolume;
    fresh.settings.musicMuted = Boolean(saveMeta.settings.defaultMusicMuted);
    fresh.settings.sfxMuted = Boolean(saveMeta.settings.defaultSfxMuted);

    try {
      const result = await saveSlotState({ state: fresh });
      const slotId = result?.slotId || null;
      enterGameWithState(fresh, slotId, result?.updatedAt || null);
      await refreshMenuMeta();
    } catch (_error) {
      pushToast('Nie udało się utworzyć zapisu gry');
    }
  }, [
    enterGameWithState,
    pushToast,
    refreshMenuMeta,
    saveMeta.settings.defaultAnimations,
    saveMeta.settings.defaultMusicMuted,
    saveMeta.settings.defaultMusicVolume,
    saveMeta.settings.defaultSfxMuted,
    saveMeta.settings.defaultSfxVolume,
    saveMeta.settings.defaultSound
  ]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (remoteEnabled) {
        try {
          await hydrateSessionFromOAuthRedirect();
        } catch (_error) {
          pushToast('Logowanie OAuth wygasło lub zostało anulowane');
        }
      }

      const [meta, version, principal] = await Promise.all([listSaveMeta(), readGameVersion(), refreshAuthPrincipalFromApi()]);
      if (!mounted) {
        return;
      }
      setSaveMeta(meta);
      setGameVersion(version);
      setAuthPrincipal(principal || getAuthPrincipal());
      setIsLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, [pushToast, remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled) {
      return () => {};
    }

    return onOAuthLoginCallback(async (callbackUrl) => {
      try {
        await completeOAuthLoginFromCallback(callbackUrl);
        await refreshAuthPrincipal();
        await refreshMenuMeta();
        setAppScreen('menu');
        setMenuView('profile');
        setFriendsModalOpen(false);
        trackTelemetryEvent('auth_login', { method: 'oauth' });
        pushToast('Zalogowano');
      } catch (_error) {
        pushToast('Logowanie OAuth nie powiodło się');
      }
    });
  }, [pushToast, refreshAuthPrincipal, refreshMenuMeta, remoteEnabled]);

  useEffect(() => {
    let mounted = true;

    readUpdateState()
      .then((statePayload) => {
        if (mounted && statePayload) {
          setUpdateState((prev) => ({ ...prev, ...statePayload }));
        }
      })
      .catch(() => {
        // ignore
      });

    const unsubscribe = onGameUpdateStatus((payload) => {
      if (!mounted || !payload) {
        return;
      }
      setUpdateState((prev) => ({ ...prev, ...payload }));
    });

    checkForUpdatesNow();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [checkForUpdatesNow]);

  useEffect(() => {
    if (!isLoaded || appScreen !== 'game') {
      return undefined;
    }

    const interval = setInterval(() => {
      setTickCountdown((prev) => {
        const nextCountdown = roundToTenth(prev - 0.1);
        if (nextCountdown <= 0) {
          const nowTs = Date.now();
          const currentState = stateRef.current;
          if (currentState.settings.animations && currentState.foxes.length > 0) {
            incomePulseIdRef.current += 1;
            setIncomePulse({
              id: incomePulseIdRef.current,
              entries: currentState.foxes.map((fox) => ({
                foxId: fox.id,
                amount: getFoxIncomePerTick(fox, currentState, nowTs)
              }))
            });
          }
          dispatch({ type: ACTIONS.APPLY_TICK, nowTs });
          return tickDuration;
        }
        return nextCountdown;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [appScreen, isLoaded, tickDuration]);

  useEffect(() => {
    if (!isLoaded || appScreen !== 'game') {
      return undefined;
    }

    const interval = setInterval(() => {
      dispatch({ type: ACTIONS.CHECK_RESETS, nowTs: Date.now() });
    }, 1000);

    return () => clearInterval(interval);
  }, [appScreen, isLoaded]);

  useEffect(() => {
    if (appScreen !== 'game') {
      return;
    }
    setTickCountdown((prev) => {
      if (!Number.isFinite(prev) || prev <= 0 || prev > tickDuration) {
        return tickDuration;
      }
      return roundToTenth(prev);
    });
  }, [appScreen, tickDuration]);

  useEffect(() => {
    if (!isLoaded || appScreen !== 'game' || !currentSlotId) {
      return undefined;
    }

    const autosave = setInterval(() => {
      (async () => {
        if (remoteEnabled) {
          const remoteUpdatedAt = await getRemoteSlotUpdatedAt(currentSlotId);
          if (isRemoteTimestampNewer(remoteSlotUpdatedAtRef.current, remoteUpdatedAt)) {
            const latest = await loadSlotStateWithMeta(currentSlotId);
            if (latest?.state) {
              const syncedState = withGlobalSettings(latest.state);
              remoteSlotUpdatedAtRef.current = latest.updatedAt || remoteUpdatedAt;
              dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: syncedState, nowTs: Date.now() });
              setTickCountdown(getTickDurationSeconds(syncedState));
              pushToast('Save został zaktualizowany na serwerze. Wczytano nowe dane.');
            }
            return;
          }
        }

        const result = await saveSlotState({ slotId: currentSlotId, state: stateRef.current });
        if (result?.updatedAt) {
          remoteSlotUpdatedAtRef.current = result.updatedAt;
        }
      })().catch(() => {
        // ignore transient autosave errors
      });
    }, AUTOSAVE_SECONDS * 1000);

    return () => clearInterval(autosave);
  }, [appScreen, currentSlotId, isLoaded, pushToast, remoteEnabled, withGlobalSettings]);

  useEffect(() => {
    if (!isLoaded || appScreen !== 'game' || !currentSlotId) {
      return undefined;
    }

    function onBeforeUnload() {
      saveSlotStateSync({ slotId: currentSlotId, state: stateRef.current });
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [appScreen, currentSlotId, isLoaded]);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
      setModeMenuOpen(false);
      setSystemMenuOpen(false);
    }

    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (!isLoaded || appScreen !== 'menu' || menuView !== 'ranking') {
      return;
    }
    refreshLeaderboard();
  }, [appScreen, isLoaded, menuView, refreshLeaderboard]);

  useEffect(() => {
    if (!remoteEnabled || !isLoaded || appScreen !== 'game' || !currentSlotId) {
      return undefined;
    }

    const remoteRefresh = setInterval(() => {
      getRemoteSlotUpdatedAt(currentSlotId)
        .then(async (remoteUpdatedAt) => {
          if (!isRemoteTimestampNewer(remoteSlotUpdatedAtRef.current, remoteUpdatedAt)) {
            return;
          }

          const latest = await loadSlotStateWithMeta(currentSlotId);
          if (!latest?.state) {
            return;
          }

          const syncedState = withGlobalSettings(latest.state);
          remoteSlotUpdatedAtRef.current = latest.updatedAt || remoteUpdatedAt;
          dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: syncedState, nowTs: Date.now() });
          setTickCountdown(getTickDurationSeconds(syncedState));
          pushToast('Wykryto zmiany save na serwerze. Odświeżono stan gry.');
        })
        .catch(() => {
          // ignore polling errors
        });
    }, 6000);

    return () => clearInterval(remoteRefresh);
  }, [appScreen, currentSlotId, isLoaded, pushToast, remoteEnabled, withGlobalSettings]);

  useEffect(() => {
    if (updateState.status === 'downloaded') {
      if (!updateDownloadedToastShownRef.current) {
        updateDownloadedToastShownRef.current = true;
        pushToast('Nowa wersja gry jest gotowa. Zrestartuj grę, aby zainstalować aktualizację.');
      }
      return;
    }
    updateDownloadedToastShownRef.current = false;
  }, [pushToast, updateState.status]);

  if (!isLoaded) {
    return <div className="app-shell flex items-center justify-center">Ładowanie...</div>;
  }

  if (appScreen === 'menu') {
    return (
      <main className="app-shell main-menu-screen flex min-h-screen flex-col items-center justify-center p-4">
        <PixelGridBackground enabled={saveMeta.settings.defaultAnimations !== false} />
        <UpdateOverlay updateState={updateState} onInstall={installUpdateNow} onCheck={checkForUpdatesNow} />
        <div className="main-menu-content flex w-full flex-col items-center">
          <MainMenu
            view={menuView}
            meta={saveMeta}
            onContinue={async () => {
              playSfx('ui');
              if (saveMeta.lastPlayedSlotId) {
                await loadSlotAndStart(saveMeta.lastPlayedSlotId);
                return;
              }
              if (saveMeta.slots.length > 0) {
                await loadSlotAndStart(saveMeta.slots[0].id);
                return;
              }
              await createNewGameAndStart();
            }}
            onOpenLoad={() => {
              playSfx('ui');
              setMenuView('load');
            }}
            onOpenRanking={() => {
              playSfx('ui');
              setMenuView('ranking');
            }}
            onOpenSettings={() => {
              playSfx('ui');
              setMenuView('settings');
            }}
            onOpenProfile={() => {
              playSfx('ui');
              setMenuView('profile');
            }}
            onOpenFriends={() => {
              playSfx('ui');
              setMenuView('friends');
            }}
            onExit={async () => {
              await quitGameApp();
            }}
            onBack={() => {
              playSfx('ui');
              setMenuView('root');
            }}
            onLoad={loadSlotAndStart}
            onNew={createNewGameAndStart}
            onDelete={async (slotId) => {
              await deleteSlot(slotId);
              await refreshMenuMeta();
            }}
            onToggleSettings={async (key) => {
              const nextValue = !saveMeta.settings[key];
              const updated = await updateMenuSettings({ [key]: nextValue });
              setSaveMeta((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  ...updated
                }
              }));
            }}
            onSetSettingsVolume={async (key, value) => {
              const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
              const updated = await updateMenuSettings({ [key]: safeValue });
              setSaveMeta((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  ...updated
                }
              }));
            }}
            isRemoteEnabled={remoteEnabled}
            principal={authPrincipal}
            leaderboardData={leaderboardData}
            leaderboardLoading={leaderboardLoading}
            leaderboardError={leaderboardError}
            onRefreshLeaderboard={refreshLeaderboard}
            onLoginAccount={async ({ email, password }) => {
              await loginGameAccount({ email, password });
              await refreshAuthPrincipal();
              await refreshMenuMeta();
              trackTelemetryEvent('auth_login', { method: 'password' });
              pushToast('Zalogowano');
            }}
            onRegisterAccount={async ({ email, password, displayName }) => {
              await registerGameAccount({ email, password, displayName });
              await refreshAuthPrincipal();
              await refreshMenuMeta();
              trackTelemetryEvent('auth_register', { method: 'password' });
              pushToast('Konto utworzone');
            }}
            onLogoutAccount={async () => {
              await logoutGameAccount();
              await refreshAuthPrincipal();
              await refreshMenuMeta();
              trackTelemetryEvent('auth_logout');
              pushToast('Wylogowano');
            }}
            onOAuthLogin={async (provider) => {
              try {
                await beginOAuthLogin(provider);
                pushToast('Dokończ logowanie w przeglądarce');
              } catch (_error) {
                pushToast('Nie udało się uruchomić logowania');
              }
            }}
            onUpdateNickname={async (nickname) => {
              const principal = await updateGameNickname(nickname);
              setAuthPrincipal(principal);
              pushToast('Nick został zapisany');
            }}
            onLoadFriends={fetchGameFriends}
            onSearchFriends={searchGameFriends}
            onSendFriendRequest={async (targetUuid) => {
              const result = await sendGameFriendRequest(targetUuid);
              pushToast(result?.friendship?.status === 'ACCEPTED' ? 'Dodano znajomego' : 'Wysłano zaproszenie');
              return result;
            }}
            onAcceptFriendRequest={async (friendshipId) => {
              const result = await acceptGameFriendRequest(friendshipId);
              pushToast('Zaakceptowano zaproszenie');
              return result;
            }}
            onRemoveFriendship={async (friendshipId) => {
              const result = await removeGameFriendship(friendshipId);
              pushToast('Lista znajomych została zaktualizowana');
              return result;
            }}
          />
          <p className="mt-4 text-xs text-slate-500">Wersja gry: {gameVersion}</p>
        </div>
      </main>
    );
  }

  const buyFox = () => {
    if (state.foxes.length >= foxLimit) {
      playSfx('error');
      pushToast('Nie ma miejsca na planszy');
      return;
    }
    if (state.currencies.coins < buyCost) {
      playSfx('error');
      pushToast('Brakuje coins na zakup lisa');
      return;
    }
    dispatch({ type: ACTIONS.BUY_FOX, nowTs: Date.now() });
    playSfx('buy');
  };

  const handleFoxClick = (id) => {
    const fox = state.foxes.find((item) => item.id === id);
    if (!fox) {
      return 0;
    }

    const nowTs = Date.now();
    const gain = getFoxClickValue(fox, state, nowTs);
    dispatch({ type: ACTIONS.CLICK_FOX, id, nowTs });
    playSfx('click');
    return gain;
  };

  const handleMerge = (sourceId, targetId) => {
    const source = state.foxes.find((fox) => fox.id === sourceId);
    const target = state.foxes.find((fox) => fox.id === targetId);
    if (!source || !target) {
      return;
    }
    if (source.tier !== target.tier) {
      playSfx('error');
      return false;
    }

    const sourceEvolution = source.evolution || null;
    const targetEvolution = target.evolution || null;
    const bothNonEvolved = !sourceEvolution && !targetEvolution;
    const bothSameElement = sourceEvolution && sourceEvolution === targetEvolution;

    if ((!bothNonEvolved && !bothSameElement) || (bothNonEvolved && target.tier >= BASE_MAX_TIER) || (bothSameElement && target.tier >= MAX_TIER)) {
      playSfx('error');
      return false;
    }

    dispatch({ type: ACTIONS.MERGE_FOXES, sourceId, targetId, nowTs: Date.now() });
    playSfx('merge');
    return {
      tier: target.tier + 1,
      evolution: bothSameElement ? targetEvolution : null
    };
  };

  const handleHardReset = async () => {
    const fresh = createInitialState(Date.now());
    fresh.settings = {
      ...state.settings
    };
    dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: fresh, nowTs: Date.now() });
    setTickCountdown(getTickDurationSeconds(fresh));

    if (currentSlotId) {
      const saved = await saveSlotState({ slotId: currentSlotId, state: fresh });
      if (saved?.updatedAt) {
        remoteSlotUpdatedAtRef.current = saved.updatedAt;
      }
      await refreshMenuMeta();
    }

    pushToast('Zapis został wyczyszczony');
  };

  const goToMainMenu = async () => {
    if (currentSlotId) {
      await saveSlotState({ slotId: currentSlotId, state: stateRef.current });
      await refreshMenuMeta();
    }
    remoteSlotUpdatedAtRef.current = null;
    setModeMenuOpen(false);
    setSystemMenuOpen(false);
    setFriendsModalOpen(false);
    setMenuView('root');
    setAppScreen('menu');
  };

  const exitGameFromInGame = async () => {
    if (currentSlotId) {
      await saveSlotState({ slotId: currentSlotId, state: stateRef.current });
    }
    remoteSlotUpdatedAtRef.current = null;
    setModeMenuOpen(false);
    setSystemMenuOpen(false);
    await quitGameApp();
  };

  return (
    <main className="app-shell game-screen flex h-screen flex-col overflow-hidden">
      <UpdateOverlay updateState={updateState} onInstall={installUpdateNow} onCheck={checkForUpdatesNow} />
      <Hud
        coins={state.currencies.coins}
        gems={state.currencies.gems}
        rebirthTokens={state.currencies.rebirthTokens}
        coinsPerSecond={coinsPerSecond}
        countdown={tickCountdown}
        foxCount={state.foxes.length}
        foxLimit={foxLimit}
        onOpenModesMenu={() => {
          playSfx('ui');
          setSystemMenuOpen(false);
          setModeMenuOpen((prev) => !prev);
        }}
        onOpenSystemMenu={() => {
          playSfx('ui');
          setModeMenuOpen(false);
          setSystemMenuOpen((prev) => !prev);
        }}
      />

      {modeMenuOpen && (
        <div
          className="pixel-frame fixed left-5 top-24 z-40 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <GuiIcon name="modes" alt="Menu trybów" />
            Tryby gry
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              className="rounded-lg border border-emerald-400/80 bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-200"
              onClick={() => {
                setModeMenuOpen(false);
                pushToast('Tryb Merge jest już aktywny');
              }}
            >
              Merge (aktywny)
            </button>
            <button
              type="button"
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                EVENT_MODE_ENABLED ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/70 bg-rose-500/10 text-rose-200'
              }`}
              onClick={() => {
                if (EVENT_MODE_ENABLED) {
                  pushToast('Tryb Event jest włączony');
                } else {
                  pushToast('Tryb Event jest wyłączony');
                }
              }}
            >
              <span>Event</span>
              <span className="font-semibold">{EVENT_MODE_ENABLED ? 'włączony' : 'wyłączony'}</span>
            </button>
            <button type="button" className="rounded-lg bg-slate-800/70 px-3 py-2 text-left text-sm text-slate-400" disabled>
              Arena bosów (wkrótce)
            </button>
            <button type="button" className="rounded-lg bg-slate-800/70 px-3 py-2 text-left text-sm text-slate-400" disabled>
              Minigames (wkrótce)
            </button>
          </div>
        </div>
      )}

      {systemMenuOpen && (
        <div
          className="pixel-frame fixed right-5 top-24 z-40 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <GuiIcon name="settings" alt="Menu gry" />
            Menu gry
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-left text-sm"
              onClick={() => {
                setSettingsModalOpen(true);
                setSystemMenuOpen(false);
              }}
            >
              <GuiIcon name="settings" alt="" />
              Ustawienia
            </button>
            {remoteEnabled && (
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-cyan-700/80 px-3 py-2 text-left text-sm text-cyan-50"
                onClick={() => {
                  setFriendsModalOpen(true);
                  setSystemMenuOpen(false);
                }}
              >
                <GuiIcon name="friends" alt="" />
                Znajomi
              </button>
            )}
            <button type="button" className="flex items-center gap-2 rounded-lg bg-indigo-600/80 px-3 py-2 text-left text-sm" onClick={goToMainMenu}>
              <GuiIcon name="home" alt="" />
              Wyjście do menu głównego
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-rose-700/80 px-3 py-2 text-left text-sm text-rose-100"
              onClick={exitGameFromInGame}
            >
              <GuiIcon name="power" alt="" />
              Wyjście z gry
            </button>
          </div>
        </div>
      )}

      {friendsModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setFriendsModalOpen(false)}>
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <AccountMenu
              section="friends"
              principal={authPrincipal}
              onBack={() => setFriendsModalOpen(false)}
              onRegister={async ({ email, password, displayName }) => {
                await registerGameAccount({ email, password, displayName });
                await refreshAuthPrincipal();
                await refreshMenuMeta();
                trackTelemetryEvent('auth_register', { method: 'password' });
                pushToast('Konto utworzone');
              }}
              onLogin={async ({ email, password }) => {
                await loginGameAccount({ email, password });
                await refreshAuthPrincipal();
                await refreshMenuMeta();
                trackTelemetryEvent('auth_login', { method: 'password' });
                pushToast('Zalogowano');
              }}
              onLogout={async () => {
                await logoutGameAccount();
                await refreshAuthPrincipal();
                await refreshMenuMeta();
                trackTelemetryEvent('auth_logout');
                pushToast('Wylogowano');
              }}
              onOAuthLogin={async (provider) => {
                try {
                  await beginOAuthLogin(provider);
                  pushToast('Dokończ logowanie w przeglądarce');
                } catch (_error) {
                  pushToast('Nie udało się uruchomić logowania');
                }
              }}
              onUpdateNickname={async (nickname) => {
                const principal = await updateGameNickname(nickname);
                setAuthPrincipal(principal);
                pushToast('Nick został zapisany');
              }}
              onLoadFriends={fetchGameFriends}
              onSearchFriends={searchGameFriends}
              onSendFriendRequest={async (targetUuid) => {
                const result = await sendGameFriendRequest(targetUuid);
                pushToast(result?.friendship?.status === 'ACCEPTED' ? 'Dodano znajomego' : 'Wysłano zaproszenie');
                return result;
              }}
              onAcceptFriendRequest={async (friendshipId) => {
                const result = await acceptGameFriendRequest(friendshipId);
                pushToast('Zaakceptowano zaproszenie');
                return result;
              }}
              onRemoveFriendship={async (friendshipId) => {
                const result = await removeGameFriendship(friendshipId);
                pushToast('Lista znajomych została zaktualizowana');
                return result;
              }}
            />
          </div>
        </div>
      )}

      <div className={`game-workspace min-h-0 flex-1 ${shopCollapsed ? 'shop-is-collapsed' : ''}`}>
        <Arena
          foxes={state.foxes}
          arenaWidth={state.arena.width}
          arenaHeight={state.arena.height}
          animationsEnabled={state.settings.animations}
          incomePulse={incomePulse}
          onArenaResize={(width, height) => {
            dispatch({ type: ACTIONS.SET_ARENA_SIZE, width, height, nowTs: Date.now() });
          }}
          onFoxMove={(id, x, y) => {
            dispatch({ type: ACTIONS.MOVE_FOX, id, x, y, nowTs: Date.now() });
          }}
          onFoxMerge={handleMerge}
          onFoxClick={handleFoxClick}
          onFoxContextMenu={(event, foxId) => {
            event.preventDefault();
            const menuWidth = 240;
            const menuHeight = 260;
            setContextMenu({
              foxId,
              x: Math.min(event.clientX, window.innerWidth - menuWidth),
              y: Math.min(event.clientY, window.innerHeight - menuHeight)
            });
          }}
          buyCost={buyCost}
          canBuyFox={state.currencies.coins >= buyCost && state.foxes.length < foxLimit}
          buyBlockedReason={
            state.foxes.length >= foxLimit
              ? 'Nie ma miejsca na planszy'
              : state.currencies.coins < buyCost
                ? 'Za mało monet'
                : ''
          }
          onBuyFox={buyFox}
        />

        <div className="shop-region">
          {shopCollapsed ? (
            <button
              type="button"
              className="shop-open-rail"
              onClick={() => setShopCollapsed(false)}
              title="Otwórz centrum rozwoju"
              aria-label="Otwórz centrum rozwoju"
            >
              <GuiIcon name="upgrade" alt="" size={24} />
              <span>Sklep</span>
            </button>
          ) : (
            <ShopPanel
              activeTab={shopTab}
              onChangeTab={setShopTab}
              state={state}
              dailyResetInSeconds={resetCountdowns.dailyResetInSeconds}
              weeklyResetInSeconds={resetCountdowns.weeklyResetInSeconds}
              rebirthPreview={rebirthPreview}
              onCollapse={() => setShopCollapsed(true)}
              onBuyUpgrade={(upgradeId) => {
                dispatch({ type: ACTIONS.BUY_UPGRADE, upgradeId, nowTs: Date.now() });
                playSfx('upgrade');
              }}
              onBuyTemporaryBoost={(boostId, durationId) => {
                const boost = TEMP_BOOST_DEFS[boostId];
                const duration = TEMP_BOOST_DURATION_BY_ID[durationId];
                if (!boost || !duration) {
                  return;
                }
                if (state.currencies.gems < duration.cost) {
                  playSfx('error');
                  pushToast('Brakuje diamentow');
                  return;
                }
                dispatch({ type: ACTIONS.BUY_TEMP_BOOST, boostId, durationId, nowTs: Date.now() });
                playSfx('upgrade');
                pushToast(`${boost.title}: +${duration.label}`);
              }}
              onBuyInstantCash={(durationId) => {
                const duration = TEMP_BOOST_DURATION_BY_ID[durationId];
                if (!duration) {
                  return;
                }
                if (state.currencies.gems < duration.cost) {
                  playSfx('error');
                  pushToast('Brakuje diamentow');
                  return;
                }
                const instantCoins = Math.floor(getExpectedCoinsPerSecond(state) * duration.seconds);
                if (instantCoins <= 0) {
                  playSfx('error');
                  pushToast('Brak pasywnego income do Instant Cash');
                  return;
                }
                dispatch({ type: ACTIONS.BUY_INSTANT_CASH, durationId, nowTs: Date.now() });
                playSfx('buy');
                pushToast(`Instant Cash: +${formatNumber(instantCoins)} coins`);
              }}
              onRebirth={() => {
                if (rebirthPreview <= 0) {
                  playSfx('error');
                  pushToast('Potrzebujesz co najmniej 1 Mega Foxa');
                  return;
                }
                dispatch({ type: ACTIONS.REBIRTH, nowTs: Date.now() });
                playSfx('rebirth');
                setTickCountdown(tickDuration);
                pushToast(`Rebirth udany. +${rebirthPreview} tokens`);
              }}
              onClaimQuest={(questId) => {
                dispatch({ type: ACTIONS.CLAIM_DAILY, questId, nowTs: Date.now() });
                playSfx('upgrade');
              }}
              onClaimWeekly={(questId) => {
                dispatch({ type: ACTIONS.CLAIM_WEEKLY, questId, nowTs: Date.now() });
                playSfx('upgrade');
              }}
              onClaimLoginReward={() => {
                dispatch({ type: ACTIONS.CLAIM_LOGIN_REWARD, nowTs: Date.now() });
                playSfx('buy');
              }}
            />
          )}
        </div>
      </div>

      <FoxContextMenu
        menu={contextMenu}
        info={contextInfo}
        onClose={() => setContextMenu(null)}
        onSell={() => {
          if (!contextMenu) {
            return;
          }
          dispatch({ type: ACTIONS.SELL_FOX, id: contextMenu.foxId, nowTs: Date.now() });
          playSfx('sell');
          setContextMenu(null);
        }}
        onEvolve={() => {
          if (!contextMenu) {
            return;
          }
          if (state.currencies.gems < EVOLUTION_COST_GEMS) {
            playSfx('error');
            pushToast(`Potrzebujesz ${EVOLUTION_COST_GEMS} gems na ewolucję`);
            setContextMenu(null);
            return;
          }
          setEvolutionTargetId(contextMenu.foxId);
          setContextMenu(null);
        }}
      />

      <EvolutionModal
        fox={evolutionFox}
        currentGems={state.currencies.gems}
        onSelect={(evolutionId) => {
          dispatch({ type: ACTIONS.EVOLVE_FOX, id: evolutionTargetId, evolutionId, nowTs: Date.now() });
          playSfx('evolve');
          setEvolutionTargetId(null);
          pushToast('Mega Fox ewoluowany');
        }}
        onClose={() => setEvolutionTargetId(null)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        settings={state.settings}
        fullscreen={Boolean(saveMeta.settings.defaultFullscreen)}
        gameVersion={gameVersion}
        onToggleSetting={(key) => {
          const nextValue = !state.settings[key];
          dispatch({ type: ACTIONS.TOGGLE_SETTING, key, nowTs: Date.now() });
          const metaKeyBySetting = {
            sound: 'defaultSound',
            animations: 'defaultAnimations',
            musicMuted: 'defaultMusicMuted',
            sfxMuted: 'defaultSfxMuted'
          };
          const metaKey = metaKeyBySetting[key];
          if (metaKey) {
            void persistGlobalSettings({ [metaKey]: nextValue });
          }
        }}
        onSetVolume={(key, value) => {
          const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
          dispatch({ type: ACTIONS.SET_VOLUME, key, value: safeValue, nowTs: Date.now() });
          const metaKey = key === 'musicVolume' ? 'defaultMusicVolume' : 'defaultSfxVolume';
          void persistGlobalSettings({ [metaKey]: safeValue });
        }}
        onToggleFullscreen={() => {
          const nextValue = !saveMeta.settings.defaultFullscreen;
          void persistGlobalSettings({ defaultFullscreen: nextValue });
        }}
        onHardReset={handleHardReset}
        onClose={() => setSettingsModalOpen(false)}
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
