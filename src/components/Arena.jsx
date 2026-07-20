import { useEffect, useState, useRef } from 'react';
import { getTierData, getEvolutionData } from '../game/economy';
import { MEGA_TIER } from '../game/constants';
import { formatNumber } from '../game/format';
import { getFoxSprite } from '../assets/foxSprites';
import GuiIcon from './GuiIcon';

const DEFAULT_MERGE_COLORS = ['#fbbf24', '#fb7185', '#22d3ee', '#a78bfa', '#f97316', '#f8fafc'];
const ELEMENT_MERGE_COLORS = {
  fire: ['#fbbf24', '#f97316', '#ef4444', '#fff7ed'],
  electric: ['#fde047', '#22d3ee', '#3b82f6', '#f8fafc'],
  water: ['#67e8f9', '#22d3ee', '#3b82f6', '#e0f2fe']
};

function makeMergeParticles(tier, evolution) {
  const colors = ELEMENT_MERGE_COLORS[evolution] || DEFAULT_MERGE_COLORS;
  return Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2 + (tier % 4) * 0.11;
    const distance = 34 + (index % 4) * 9;
    return {
      id: index,
      color: colors[(index + tier) % colors.length],
      delay: (index % 4) * 18,
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance - 8),
      rotation: (index * 45 + tier * 15) % 180,
      size: index % 3 === 0 ? 6 : 4
    };
  });
}

function foxLabel(fox) {
  const tier = getTierData(fox.tier);
  const evolution = getEvolutionData(fox.evolution);
  if (evolution) {
    return evolution.name;
  }
  return tier.name;
}

export default function Arena({
  foxes,
  arenaWidth,
  arenaHeight,
  onArenaResize,
  onFoxMove,
  onFoxMerge,
  onFoxClick,
  onFoxContextMenu,
  animationsEnabled,
  incomePulse,
  buyCost,
  canBuyFox,
  buyBlockedReason,
  onBuyFox
}) {
  const arenaRef = useRef(null);
  const mergeEffectIdRef = useRef(0);
  const clickEffectIdRef = useRef(0);
  const mergeEffectTimersRef = useRef(new Set());
  const incomeEffectTimersRef = useRef(new Set());
  const [dragging, setDragging] = useState(null);
  const [mergeEffects, setMergeEffects] = useState([]);
  const [incomeEffects, setIncomeEffects] = useState([]);

  useEffect(() => () => {
    mergeEffectTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    mergeEffectTimersRef.current.clear();
    incomeEffectTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    incomeEffectTimersRef.current.clear();
  }, []);

  useEffect(() => {
    if (!animationsEnabled || !incomePulse?.entries?.length) {
      return;
    }

    const foxById = new Map(foxes.map((fox) => [fox.id, fox]));
    const effects = incomePulse.entries.flatMap((entry) => {
      const fox = foxById.get(entry.foxId);
      if (!fox) {
        return [];
      }
      return [{
        id: `${incomePulse.id}-${entry.foxId}`,
        batchId: incomePulse.id,
        x: fox.x + 39,
        y: fox.y + 8,
        amount: entry.amount
      }];
    });

    if (effects.length === 0) {
      return;
    }

    setIncomeEffects((current) => [...current, ...effects]);
    const timer = window.setTimeout(() => {
      setIncomeEffects((current) => current.filter((effect) => effect.batchId !== incomePulse.id));
      incomeEffectTimersRef.current.delete(timer);
    }, 820);
    incomeEffectTimersRef.current.add(timer);
  }, [animationsEnabled, incomePulse]);

  useEffect(() => {
    const element = arenaRef.current;
    if (!element) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      onArenaResize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [onArenaResize]);

  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    function onMove(event) {
      const arena = arenaRef.current;
      if (!arena) {
        return;
      }

      const deltaX = event.clientX - dragging.startClientX;
      const deltaY = event.clientY - dragging.startClientY;
      const distance = Math.hypot(deltaX, deltaY);

      if (!dragging.moved && distance < 4) {
        return;
      }

      const rect = arena.getBoundingClientRect();
      const x = event.clientX - rect.left - dragging.offsetX;
      const y = event.clientY - rect.top - dragging.offsetY;

      onFoxMove(dragging.id, x, y);
      setDragging((prev) => (prev ? { ...prev, moved: true } : prev));
    }

    function onUp(event) {
      const sourceId = dragging.id;

      if (!dragging.moved) {
        const gain = onFoxClick(sourceId);
        const fox = foxes.find((item) => item.id === sourceId);
        if (animationsEnabled && gain > 0 && fox) {
          clickEffectIdRef.current += 1;
          const effectId = `click-${clickEffectIdRef.current}`;
          setIncomeEffects((current) => [...current, {
            id: effectId,
            batchId: effectId,
            kind: 'click',
            x: fox.x + 39,
            y: fox.y + 8,
            amount: gain
          }]);
          const timer = window.setTimeout(() => {
            setIncomeEffects((current) => current.filter((effect) => effect.id !== effectId));
            incomeEffectTimersRef.current.delete(timer);
          }, 820);
          incomeEffectTimersRef.current.add(timer);
        }
        setDragging(null);
        return;
      }

      const targetElement = document.elementFromPoint(event.clientX, event.clientY);
      const targetTile = targetElement?.closest('[data-fox-id]');
      if (targetTile) {
        const targetId = Number(targetTile.dataset.foxId);
        if (Number.isFinite(targetId) && targetId !== sourceId) {
          const targetRect = targetTile.getBoundingClientRect();
          const arenaRect = arenaRef.current?.getBoundingClientRect();
          const mergeResult = onFoxMerge(sourceId, targetId);
          if (mergeResult && animationsEnabled && arenaRect) {
            mergeEffectIdRef.current += 1;
            const effectId = mergeEffectIdRef.current;
            const effect = {
              id: effectId,
              x: targetRect.left - arenaRect.left + targetRect.width / 2,
              y: targetRect.top - arenaRect.top + targetRect.height / 2,
              accent: (ELEMENT_MERGE_COLORS[mergeResult.evolution] || DEFAULT_MERGE_COLORS)[0],
              particles: makeMergeParticles(mergeResult.tier, mergeResult.evolution)
            };
            setMergeEffects((current) => [...current, effect]);
            const timer = window.setTimeout(() => {
              setMergeEffects((current) => current.filter((item) => item.id !== effectId));
              mergeEffectTimersRef.current.delete(timer);
            }, 900);
            mergeEffectTimersRef.current.add(timer);
          }
        }
      }

      setDragging(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [animationsEnabled, dragging, foxes, onFoxClick, onFoxMerge, onFoxMove]);

  return (
    <section className="arena-shell relative flex h-full flex-1 min-h-0 flex-col overflow-hidden">
      <div
        ref={arenaRef}
        className="arena-viewport relative h-full w-full overflow-hidden"
      >
        {foxes.length === 0 && (
          <div className="arena-empty absolute inset-0 flex items-center justify-center">
            <div className="arena-empty-card">
              <GuiIcon name="merge" alt="Łączenie lisów" size={30} />
              <span>
                <strong>Plansza ewolucji jest pusta</strong>
                <small>Kup dwa lisy tego samego tieru i przeciągnij jednego na drugiego.</small>
              </span>
            </div>
          </div>
        )}

        {foxes.map((fox) => {
          const sprite = getFoxSprite(fox.tier, fox.evolution);
          const evolutionReady = fox.tier === MEGA_TIER && !fox.evolution;
          return (
            <button
              key={fox.id}
              type="button"
              data-fox-id={fox.id}
              className={`fox-tile ${evolutionReady ? 'evolution-ready' : ''} ${dragging?.id === fox.id ? 'dragging' : ''}`}
              title={evolutionReady ? `${foxLabel(fox)} — gotowy do ewolucji (kliknij prawym przyciskiem)` : foxLabel(fox)}
              style={{
                left: `${fox.x}px`,
                top: `${fox.y}px`,
                transition: animationsEnabled && dragging?.id !== fox.id ? 'left 120ms ease, top 120ms ease' : 'none',
                zIndex: dragging?.id === fox.id ? 20 : 2,
                pointerEvents: dragging?.id === fox.id ? 'none' : 'auto'
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                const rect = event.currentTarget.getBoundingClientRect();
                setDragging({
                  id: fox.id,
                  offsetX: event.clientX - rect.left,
                  offsetY: event.clientY - rect.top,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  moved: false
                });
              }}
              onContextMenu={(event) => onFoxContextMenu(event, fox.id)}
            >
              <div className="pointer-events-none relative flex h-full items-center justify-center">
                <img className="fox-sprite" src={sprite} alt={foxLabel(fox)} draggable={false} />
                {evolutionReady && (
                  <span className="fox-evolution-ready-marker" aria-hidden="true">
                    <span>◆</span>
                    EVO!
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {mergeEffects.map((effect) => (
          <div
            key={effect.id}
            className="merge-effect"
            style={{ left: effect.x, top: effect.y, '--merge-accent': effect.accent }}
            aria-hidden="true"
          >
            <span className="merge-effect-flash" />
            <span className="merge-effect-ring" />
            <span className="merge-effect-cross merge-effect-cross--horizontal" />
            <span className="merge-effect-cross merge-effect-cross--vertical" />
            <span className="merge-effect-label">MERGE!</span>
            {effect.particles.map((particle) => (
              <span
                key={particle.id}
                className="merge-confetti"
                style={{
                  '--confetti-color': particle.color,
                  '--confetti-delay': `${particle.delay}ms`,
                  '--confetti-x': `${particle.dx}px`,
                  '--confetti-y': `${particle.dy}px`,
                  '--confetti-rotation': `${particle.rotation}deg`,
                  '--confetti-size': `${particle.size}px`
                }}
              />
            ))}
          </div>
        ))}

        {incomeEffects.map((effect) => (
          <span
            key={effect.id}
            className={`fox-income-float ${effect.kind === 'click' ? 'fox-income-float--click' : ''}`}
            style={{ left: effect.x, top: effect.y }}
            aria-hidden="true"
          >
            +{formatNumber(effect.amount)}
          </span>
        ))}

        <div className="arena-buy-dock">
          <button
            type="button"
            className={`buy-fox-btn ${!canBuyFox ? 'buy-fox-btn--unavailable' : ''}`}
            onClick={onBuyFox}
            title={buyBlockedReason || `Koszt: ${formatNumber(buyCost)} monet`}
          >
            <GuiIcon name="pet" alt="Kup lisa" size={24} />
            <span>
              <strong>Kup lisa</strong>
              <small>{buyBlockedReason || `${formatNumber(buyCost)} monet`}</small>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
