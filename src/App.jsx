import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FaHome, FaPowerOff } from 'react-icons/fa';
import GuiIcon from './components/GuiIcon';
import Arena from './components/Arena';
import EvolutionModal from './components/EvolutionModal';
import FoxContextMenu from './components/FoxContextMenu';
import Hud from './components/Hud';
import MainMenu from './components/MainMenu';
import SettingsModal from './components/SettingsModal';
import ShopPanel from './components/ShopPanel';
import ToastStack from './components/ToastStack';
import { AUTOSAVE_SECONDS, BASE_TICK_SECONDS, EVOLUTION_COST_GEMS, TEMP_BOOST_DEFS, TEMP_BOOST_DURATION_BY_ID } from './game/constants';
import { formatNumber } from './game/format';
import { getBuyFoxCost, getExpectedCoinsPerSecond, getFoxLimit, getRebirthTokensEarned, getTickDurationSeconds } from './game/economy';
import { gameReducer, ACTIONS, getFoxInfoForMenu } from './game/reducer';
import { getResetCountdowns } from './game/quests';
import { createInitialState } from './storage/defaultState';
import {
  deleteSlot,
  listSaveMeta,
  loadSlotState,
  quitGameApp,
  readGameVersion,
  saveSlotState,
  saveSlotStateSync,
  updateMenuSettings
} from './storage/gameStorage';

const DEFAULT_MENU_META = {
  lastPlayedSlotId: null,
  settings: {
    defaultSound: true,
    defaultAnimations: true,
    defaultMusicVolume: 70,
    defaultSfxVolume: 80
  },
  slots: []
};

const EVENT_MODE_ENABLED = false;

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
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

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const [appScreen, setAppScreen] = useState('menu');
  const [menuView, setMenuView] = useState('root');
  const [saveMeta, setSaveMeta] = useState(DEFAULT_MENU_META);
  const [currentSlotId, setCurrentSlotId] = useState(null);
  const [shopTab, setShopTab] = useState('Ulepszenia');
  const [tickCountdown, setTickCountdown] = useState(BASE_TICK_SECONDS);
  const [contextMenu, setContextMenu] = useState(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [evolutionTargetId, setEvolutionTargetId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gameVersion, setGameVersion] = useState('dev');
  const stateRef = useRef(state);
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

  const refreshMenuMeta = useCallback(async () => {
    const meta = await listSaveMeta();
    setSaveMeta(meta);
    return meta;
  }, []);

  const enterGameWithState = useCallback((nextState, slotId) => {
    dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: nextState, nowTs: Date.now() });
    setCurrentSlotId(slotId);
    setShopTab('Ulepszenia');
    setTickCountdown(getTickDurationSeconds(nextState));
    setContextMenu(null);
    setEvolutionTargetId(null);
    setAppScreen('game');
  }, []);

  const loadSlotAndStart = useCallback(
    async (slotId) => {
      const loaded = await loadSlotState(slotId);
      if (!loaded) {
        pushToast('Nie udało się wczytać zapisu');
        await refreshMenuMeta();
        return;
      }
      enterGameWithState(loaded, slotId);
    },
    [enterGameWithState, pushToast, refreshMenuMeta]
  );

  const createNewGameAndStart = useCallback(async () => {
    const fresh = createInitialState(Date.now());
    fresh.settings.sound = Boolean(saveMeta.settings.defaultSound);
    fresh.settings.animations = Boolean(saveMeta.settings.defaultAnimations);
    fresh.settings.musicVolume = Number.isFinite(saveMeta.settings.defaultMusicVolume) ? saveMeta.settings.defaultMusicVolume : fresh.settings.musicVolume;
    fresh.settings.sfxVolume = Number.isFinite(saveMeta.settings.defaultSfxVolume) ? saveMeta.settings.defaultSfxVolume : fresh.settings.sfxVolume;

    const result = await saveSlotState({ state: fresh });
    const slotId = result?.slotId || null;
    enterGameWithState(fresh, slotId);
    await refreshMenuMeta();
  }, [
    enterGameWithState,
    refreshMenuMeta,
    saveMeta.settings.defaultAnimations,
    saveMeta.settings.defaultMusicVolume,
    saveMeta.settings.defaultSfxVolume,
    saveMeta.settings.defaultSound
  ]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [meta, version] = await Promise.all([listSaveMeta(), readGameVersion()]);
      if (!mounted) {
        return;
      }
      setSaveMeta(meta);
      setGameVersion(version);
      setIsLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || appScreen !== 'game') {
      return undefined;
    }

    const interval = setInterval(() => {
      setTickCountdown((prev) => {
        const nextCountdown = roundToTenth(prev - 0.1);
        if (nextCountdown <= 0) {
          dispatch({ type: ACTIONS.APPLY_TICK, nowTs: Date.now() });
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
      saveSlotState({ slotId: currentSlotId, state: stateRef.current });
    }, AUTOSAVE_SECONDS * 1000);

    return () => clearInterval(autosave);
  }, [appScreen, currentSlotId, isLoaded]);

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

  if (!isLoaded) {
    return <div className="app-shell flex items-center justify-center">Ładowanie...</div>;
  }

  if (appScreen === 'menu') {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center p-4">
        <MainMenu
          view={menuView}
          meta={saveMeta}
          onContinue={async () => {
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
          onOpenLoad={() => setMenuView('load')}
          onOpenRanking={() => setMenuView('ranking')}
          onOpenSettings={() => setMenuView('settings')}
          onExit={async () => {
            await quitGameApp();
          }}
          onBack={() => setMenuView('root')}
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
        />
        <p className="mt-4 text-xs text-slate-500">Wersja gry: {gameVersion}</p>
      </main>
    );
  }

  const buyFox = () => {
    if (state.foxes.length >= foxLimit) {
      pushToast('Masz za dużo lisów na planszy');
      return;
    }
    if (state.currencies.coins < buyCost) {
      pushToast('Brakuje coins na zakup lisa');
      return;
    }
    dispatch({ type: ACTIONS.BUY_FOX, nowTs: Date.now() });
  };

  const handleMerge = (sourceId, targetId) => {
    const source = state.foxes.find((fox) => fox.id === sourceId);
    const target = state.foxes.find((fox) => fox.id === targetId);
    if (!source || !target) {
      return;
    }
    if (source.tier !== target.tier) {
      return;
    }
    dispatch({ type: ACTIONS.MERGE_FOXES, sourceId, targetId, nowTs: Date.now() });
  };

  const handleHardReset = async () => {
    const fresh = createInitialState(Date.now());
    fresh.settings = {
      ...state.settings
    };
    dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: fresh, nowTs: Date.now() });
    setTickCountdown(getTickDurationSeconds(fresh));

    if (currentSlotId) {
      await saveSlotState({ slotId: currentSlotId, state: fresh });
      await refreshMenuMeta();
    }

    pushToast('Zapis został wyczyszczony');
  };

  const goToMainMenu = async () => {
    if (currentSlotId) {
      await saveSlotState({ slotId: currentSlotId, state: stateRef.current });
      await refreshMenuMeta();
    }
    setModeMenuOpen(false);
    setSystemMenuOpen(false);
    setMenuView('root');
    setAppScreen('menu');
  };

  const exitGameFromInGame = async () => {
    if (currentSlotId) {
      await saveSlotState({ slotId: currentSlotId, state: stateRef.current });
    }
    setModeMenuOpen(false);
    setSystemMenuOpen(false);
    await quitGameApp();
  };

  return (
    <main className="app-shell flex h-screen flex-col overflow-hidden p-4 pb-24">
      <Hud
        coins={state.currencies.coins}
        gems={state.currencies.gems}
        rebirthTokens={state.currencies.rebirthTokens}
        coinsPerSecond={coinsPerSecond}
        countdown={tickCountdown}
        foxCount={state.foxes.length}
        foxLimit={foxLimit}
        onOpenModesMenu={() => {
          setSystemMenuOpen(false);
          setModeMenuOpen((prev) => !prev);
        }}
        onOpenSystemMenu={() => {
          setModeMenuOpen(false);
          setSystemMenuOpen((prev) => !prev);
        }}
      />

      {modeMenuOpen && (
        <div
          className="fixed left-5 top-24 z-40 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <GuiIcon name="quest" alt="Menu trybów" />
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
          className="fixed right-5 top-24 z-40 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
            <GuiIcon name="settings" alt="Menu gry" />
            Menu gry
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              className="rounded-lg bg-slate-700 px-3 py-2 text-left text-sm"
              onClick={() => {
                setSettingsModalOpen(true);
                setSystemMenuOpen(false);
              }}
            >
              Ustawienia
            </button>
            <button type="button" className="flex items-center gap-2 rounded-lg bg-indigo-600/80 px-3 py-2 text-left text-sm" onClick={goToMainMenu}>
              <FaHome />
              Wyjście do menu głównego
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-rose-700/80 px-3 py-2 text-left text-sm text-rose-100"
              onClick={exitGameFromInGame}
            >
              <FaPowerOff />
              Wyjście z gry
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex min-h-0 flex-1 gap-4">
        <Arena
          foxes={state.foxes}
          arenaWidth={state.arena.width}
          arenaHeight={state.arena.height}
          animationsEnabled={state.settings.animations}
          onArenaResize={(width, height) => {
            dispatch({ type: ACTIONS.SET_ARENA_SIZE, width, height, nowTs: Date.now() });
          }}
          onFoxMove={(id, x, y) => {
            dispatch({ type: ACTIONS.MOVE_FOX, id, x, y, nowTs: Date.now() });
          }}
          onFoxMerge={handleMerge}
          onFoxClick={(id) => {
            dispatch({ type: ACTIONS.CLICK_FOX, id, nowTs: Date.now() });
          }}
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
        />

        <ShopPanel
          activeTab={shopTab}
          onChangeTab={setShopTab}
          state={state}
          dailyResetInSeconds={resetCountdowns.dailyResetInSeconds}
          weeklyResetInSeconds={resetCountdowns.weeklyResetInSeconds}
          rebirthPreview={rebirthPreview}
          onBuyUpgrade={(upgradeId) => {
            dispatch({ type: ACTIONS.BUY_UPGRADE, upgradeId, nowTs: Date.now() });
          }}
          onBuyTemporaryBoost={(boostId, durationId) => {
            const boost = TEMP_BOOST_DEFS[boostId];
            const duration = TEMP_BOOST_DURATION_BY_ID[durationId];
            if (!boost || !duration) {
              return;
            }
            if (state.currencies.gems < duration.cost) {
              pushToast('Brakuje diamentow');
              return;
            }
            dispatch({ type: ACTIONS.BUY_TEMP_BOOST, boostId, durationId, nowTs: Date.now() });
            pushToast(`${boost.title}: +${duration.label}`);
          }}
          onBuyInstantCash={(durationId) => {
            const duration = TEMP_BOOST_DURATION_BY_ID[durationId];
            if (!duration) {
              return;
            }
            if (state.currencies.gems < duration.cost) {
              pushToast('Brakuje diamentow');
              return;
            }
            const instantCoins = Math.floor(getExpectedCoinsPerSecond(state) * duration.seconds);
            if (instantCoins <= 0) {
              pushToast('Brak pasywnego income do Instant Cash');
              return;
            }
            dispatch({ type: ACTIONS.BUY_INSTANT_CASH, durationId, nowTs: Date.now() });
            pushToast(`Instant Cash: +${formatNumber(instantCoins)} coins`);
          }}
          onRebirth={() => {
            if (rebirthPreview <= 0) {
              pushToast('Potrzebujesz co najmniej 1 Mega Foxa');
              return;
            }
            dispatch({ type: ACTIONS.REBIRTH, nowTs: Date.now() });
            setTickCountdown(tickDuration);
            pushToast(`Rebirth udany. +${rebirthPreview} tokens`);
          }}
          onClaimQuest={(questId) => {
            dispatch({ type: ACTIONS.CLAIM_DAILY, questId, nowTs: Date.now() });
          }}
          onClaimWeekly={(questId) => {
            dispatch({ type: ACTIONS.CLAIM_WEEKLY, questId, nowTs: Date.now() });
          }}
          onClaimLoginReward={() => {
            dispatch({ type: ACTIONS.CLAIM_LOGIN_REWARD, nowTs: Date.now() });
          }}
        />
      </div>

      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
        <button
          type="button"
          className="primary-btn pointer-events-auto flex items-center gap-2 text-xl"
          onClick={buyFox}
          title={`Koszt: ${formatNumber(buyCost)} coins`}
        >
          <GuiIcon name="pet" alt="Kup lisa" size={18} />
          Kup lisa ({formatNumber(buyCost)} coins)
        </button>
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
          setContextMenu(null);
        }}
        onEvolve={() => {
          if (!contextMenu) {
            return;
          }
          if (state.currencies.gems < EVOLUTION_COST_GEMS) {
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
          setEvolutionTargetId(null);
          pushToast('Mega Fox ewoluowany');
        }}
        onClose={() => setEvolutionTargetId(null)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        settings={state.settings}
        gameVersion={gameVersion}
        onToggleSetting={(key) => {
          dispatch({ type: ACTIONS.TOGGLE_SETTING, key, nowTs: Date.now() });
        }}
        onSetVolume={(key, value) => {
          dispatch({ type: ACTIONS.SET_VOLUME, key, value, nowTs: Date.now() });
        }}
        onHardReset={handleHardReset}
        onClose={() => setSettingsModalOpen(false)}
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
