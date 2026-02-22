import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Arena from './components/Arena';
import EvolutionModal from './components/EvolutionModal';
import FoxContextMenu from './components/FoxContextMenu';
import Hud from './components/Hud';
import ShopPanel from './components/ShopPanel';
import ToastStack from './components/ToastStack';
import { AUTOSAVE_SECONDS, MAX_FOXES, TICK_SECONDS } from './game/constants';
import { getBuyFoxCost, getExpectedCoinsPerSecond, getRebirthTokensEarned } from './game/economy';
import { gameReducer, ACTIONS, getFoxInfoForMenu } from './game/reducer';
import { createInitialState } from './storage/defaultState';
import {
  hardResetPersistedState,
  loadPersistedState,
  readGameVersion,
  savePersistedState,
  savePersistedStateSync
} from './storage/gameStorage';

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
  const [shopTab, setShopTab] = useState('Ulepszenia');
  const [tickCountdown, setTickCountdown] = useState(TICK_SECONDS);
  const [contextMenu, setContextMenu] = useState(null);
  const [evolutionTargetId, setEvolutionTargetId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gameVersion, setGameVersion] = useState('dev');
  const stateRef = useRef(state);
  const { toasts, pushToast } = useToasts();

  stateRef.current = state;

  const coinsPerSecond = useMemo(() => getExpectedCoinsPerSecond(state), [state]);
  const buyCost = useMemo(() => getBuyFoxCost(state), [state]);
  const rebirthPreview = useMemo(() => getRebirthTokensEarned(state), [state]);
  const contextInfo = useMemo(
    () => (contextMenu ? getFoxInfoForMenu(state, contextMenu.foxId) : null),
    [contextMenu, state]
  );

  const evolutionFox = useMemo(
    () => state.foxes.find((fox) => fox.id === evolutionTargetId) || null,
    [evolutionTargetId, state.foxes]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [loadedState, version] = await Promise.all([loadPersistedState(), readGameVersion()]);
      if (!mounted) {
        return;
      }
      dispatch({ type: ACTIONS.INIT_FROM_SAVE, payload: loadedState, nowTs: Date.now() });
      setGameVersion(version);
      setIsLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTickCountdown((prev) => {
        if (prev <= 1) {
          dispatch({ type: ACTIONS.APPLY_TICK, nowTs: Date.now() });
          return TICK_SECONDS;
        }
        return prev - 1;
      });

      dispatch({ type: ACTIONS.CHECK_RESETS, nowTs: Date.now() });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    const autosave = setInterval(() => {
      savePersistedState(stateRef.current);
    }, AUTOSAVE_SECONDS * 1000);

    return () => clearInterval(autosave);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return undefined;
    }

    function onBeforeUnload() {
      savePersistedStateSync(stateRef.current);
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isLoaded]);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  if (!isLoaded) {
    return <div className="app-shell flex items-center justify-center">Ładowanie...</div>;
  }

  const buyFox = () => {
    if (state.foxes.length >= MAX_FOXES) {
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
    if (source.tier !== target.tier || source.tier >= 15) {
      return;
    }
    dispatch({ type: ACTIONS.MERGE_FOXES, sourceId, targetId, nowTs: Date.now() });
  };

  const handleHardReset = async () => {
    await hardResetPersistedState();
    dispatch({ type: ACTIONS.HARD_RESET_STATE, nowTs: Date.now() });
    setTickCountdown(TICK_SECONDS);
    pushToast('Zapis został wyczyszczony');
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
        foxLimit={MAX_FOXES}
      />

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
          rebirthPreview={rebirthPreview}
          onBuyUpgrade={(upgradeId) => {
            dispatch({ type: ACTIONS.BUY_UPGRADE, upgradeId, nowTs: Date.now() });
          }}
          onRebirth={() => {
            if (rebirthPreview <= 0) {
              pushToast('Potrzebujesz co najmniej 1 Mega Foxa');
              return;
            }
            dispatch({ type: ACTIONS.REBIRTH, nowTs: Date.now() });
            setTickCountdown(TICK_SECONDS);
            pushToast(`Rebirth udany. +${rebirthPreview} tokens`);
          }}
          onToggleSetting={(key) => {
            dispatch({ type: ACTIONS.TOGGLE_SETTING, key, nowTs: Date.now() });
          }}
          onClaimQuest={(questId) => {
            dispatch({ type: ACTIONS.CLAIM_DAILY, questId, nowTs: Date.now() });
          }}
          onClaimWeekly={() => {
            dispatch({ type: ACTIONS.CLAIM_WEEKLY, nowTs: Date.now() });
          }}
          onHardReset={handleHardReset}
          gameVersion={gameVersion}
        />
      </div>

      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
        <button
          type="button"
          className="primary-btn pointer-events-auto text-xl"
          onClick={buyFox}
          title={`Koszt: ${buyCost} coins`}
        >
          Kup lisa ({buyCost} coins)
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
          setEvolutionTargetId(contextMenu.foxId);
          setContextMenu(null);
        }}
      />

      <EvolutionModal
        fox={evolutionFox}
        onSelect={(evolutionId) => {
          dispatch({ type: ACTIONS.EVOLVE_FOX, id: evolutionTargetId, evolutionId, nowTs: Date.now() });
          setEvolutionTargetId(null);
          pushToast('Mega Fox ewoluowany');
        }}
        onClose={() => setEvolutionTargetId(null)}
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
