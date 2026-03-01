import { useEffect, useState, useRef } from 'react';
import { MEGA_TIER } from '../game/constants';
import { getTierData, getEvolutionData } from '../game/economy';
import GuiIcon from './GuiIcon';

function foxLabel(fox) {
  const tier = getTierData(fox.tier);
  const evolution = getEvolutionData(fox.evolution);
  if (evolution) {
    return `${evolution.icon} ${evolution.name}`;
  }
  return `${tier.icon} ${tier.name}`;
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
  animationsEnabled
}) {
  const arenaRef = useRef(null);
  const [dragging, setDragging] = useState(null);

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
        onFoxClick(sourceId);
        setDragging(null);
        return;
      }

      const targetElement = document.elementFromPoint(event.clientX, event.clientY);
      const targetTile = targetElement?.closest('[data-fox-id]');
      if (targetTile) {
        const targetId = Number(targetTile.dataset.foxId);
        if (Number.isFinite(targetId) && targetId !== sourceId) {
          onFoxMerge(sourceId, targetId);
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
  }, [dragging, onFoxClick, onFoxMerge, onFoxMove]);

  return (
    <section className="panel relative flex h-full flex-1 min-h-0 flex-col overflow-hidden">
      <div
        ref={arenaRef}
        className="relative h-full w-full rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900 to-slate-950"
        style={{ minHeight: 360 }}
      >
        {foxes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-500">
            <GuiIcon name="pet" alt="Foxes" />
            Kup lisa i zacznij je łączyć.
          </div>
        )}

        {foxes.map((fox) => {
          const tier = getTierData(fox.tier);
          const evolution = getEvolutionData(fox.evolution);
          return (
            <button
              key={fox.id}
              type="button"
              data-fox-id={fox.id}
              className={`fox-tile ${dragging?.id === fox.id ? 'dragging' : ''}`}
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
              <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-1 p-1">
                <div className="text-2xl">{evolution?.icon || tier.icon}</div>
                <div className="text-[10px] font-bold text-amber-200">T{fox.tier}</div>
                <div className="text-[10px] text-slate-300">{foxLabel(fox)}</div>
                {fox.tier >= MEGA_TIER && !fox.evolution && (
                  <div className="flex items-center gap-1 rounded bg-amber-500/25 px-1 text-[9px] text-amber-100">
                    <GuiIcon name="foxUpgrade" alt="Ewolucja" size={10} />
                    Ewoluuj
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
