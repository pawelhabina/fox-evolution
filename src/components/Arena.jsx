import { useEffect, useState, useRef } from 'react';
import { getTierData, getEvolutionData } from '../game/economy';
import { BASE_MAX_TIER, MAX_TIER, MEGA_TIER } from '../game/constants';
import { formatNumber } from '../game/format';
import { getFoxSpritePresentation } from '../assets/foxSprites';
import GuiIcon from './GuiIcon';
import hydraSprite from '../../assets/sprites/foxes/fox-elemental-hydra-boss.png';
import { canMergeHydras, getHydraLevel } from '../game/bossBattle';

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
  if (fox.kind === 'hydra') {
    return `Hydra Trójżywiołu · poziom ${getHydraLevel(fox)}`;
  }
  const tier = getTierData(fox.tier);
  const evolution = getEvolutionData(fox.evolution);
  if (evolution) {
    return evolution.name;
  }
  return tier.name;
}

function formatCooldown(seconds) {
  const safe = Math.max(0, Math.ceil(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function isSameMergeFamily(source, candidate) {
  if (!source || !candidate || source.id === candidate.id) return false;
  if (source.kind === 'hydra' || candidate.kind === 'hydra') return source.kind === 'hydra' && candidate.kind === 'hydra';
  return (source.evolution || null) === (candidate.evolution || null);
}

function isExactMergeCandidate(source, candidate) {
  if (!isSameMergeFamily(source, candidate) || source.locked || candidate.locked) return false;
  if (source.kind === 'hydra') return canMergeHydras(source, candidate);
  if (source.tier !== candidate.tier) return false;
  return source.evolution ? source.tier < MAX_TIER : source.tier < BASE_MAX_TIER;
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
  onBuyFox,
  canCombineElements,
  hasElementalBossTeam,
  bossCooldownSeconds,
  bossDefeated,
  onCombineElements
}) {
  const arenaRef = useRef(null);
  const mergeEffectIdRef = useRef(0);
  const clickEffectIdRef = useRef(0);
  const mergeEffectTimersRef = useRef(new Set());
  const incomeEffectTimersRef = useRef(new Set());
  const [dragging, setDragging] = useState(null);
  const [mergeHoverId, setMergeHoverId] = useState(null);
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
      const targetTile = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-fox-id]');
      const targetId = Number(targetTile?.dataset.foxId);
      setMergeHoverId(Number.isFinite(targetId) && targetId !== dragging.id ? targetId : null);
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
        setMergeHoverId(null);
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
      setMergeHoverId(null);
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
          const dragSource = dragging ? foxes.find((candidate) => candidate.id === dragging.id) : null;
          const sameMergeFamily = Boolean(dragSource && isSameMergeFamily(dragSource, fox));
          const exactMergeCandidate = Boolean(dragSource && isExactMergeCandidate(dragSource, fox));
          const isMergeHover = mergeHoverId === fox.id;
          const hydraLevel = fox.kind === 'hydra' ? getHydraLevel(fox) : 0;
          const sprite = fox.kind === 'hydra'
            ? { src: hydraSprite, style: null }
            : getFoxSpritePresentation(fox.tier, fox.evolution);
          const evolutionReady = fox.kind !== 'hydra' && fox.tier === MEGA_TIER && !fox.evolution;
          return (
            <button
              key={fox.id}
              type="button"
              data-fox-id={fox.id}
              className={`fox-tile ${fox.kind === 'hydra' ? `fox-tile--hydra fox-tile--hydra-level-${hydraLevel}` : ''} ${evolutionReady ? 'evolution-ready' : ''} ${fox.locked ? 'fox-tile--merge-locked' : ''} ${sameMergeFamily ? 'fox-tile--same-family' : ''} ${exactMergeCandidate ? 'fox-tile--merge-compatible' : ''} ${isMergeHover ? exactMergeCandidate ? 'fox-tile--merge-hover-ok' : 'fox-tile--merge-hover-blocked' : ''} ${dragging?.id === fox.id ? 'dragging' : ''}`}
              title={`${evolutionReady ? `${foxLabel(fox)} — gotowy do ewolucji (kliknij prawym przyciskiem)` : foxLabel(fox)}${fox.locked ? ' · zablokowany przed łączeniem' : ''}`}
              style={{
                left: `${fox.x}px`,
                top: `${fox.y}px`,
                transition: animationsEnabled && dragging?.id !== fox.id ? 'left 120ms ease, top 120ms ease' : 'none',
                zIndex: dragging?.id === fox.id ? 20 : isMergeHover ? 12 : exactMergeCandidate ? 8 : sameMergeFamily ? 6 : 2,
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
                {sprite.src ? (
                  <img className={`fox-sprite ${fox.kind === 'hydra' ? 'fox-sprite--hydra' : ''}`} src={sprite.src} alt={foxLabel(fox)} draggable={false} />
                ) : (
                  <span className="fox-sprite fox-sprite--atlas" style={sprite.style} role="img" aria-label={foxLabel(fox)} />
                )}
                {evolutionReady && (
                  <span className="fox-evolution-ready-marker" aria-hidden="true">
                    <span>◆</span>
                    EVO!
                  </span>
                )}
                {fox.evolution && fox.tier > 20 && (
                  <span className={`fox-rare-level-marker fox-rare-level-marker--${fox.evolution}`}>
                    ◆ LV {fox.tier}
                  </span>
                )}
                {fox.kind === 'hydra' && <span className="hydra-board-marker">HYDRA LV {hydraLevel} / 5</span>}
                {fox.locked && <span className="fox-merge-lock-marker" aria-label="Zablokowany przed łączeniem">🔒</span>}
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

        {(canCombineElements || hasElementalBossTeam || bossDefeated) && (
          <div className="elemental-fusion-dock">
            {canCombineElements ? (
              <button type="button" className="elemental-fusion-btn" onClick={onCombineElements}>
                <span className="elemental-fusion-orbs" aria-hidden="true"><i /><i /><i /></span>
                <span><strong>Połącz żywioły</strong><small>Hydra czeka na wyzwanie</small></span>
              </button>
            ) : hasElementalBossTeam && bossCooldownSeconds > 0 ? (
              <div className="elemental-fusion-complete elemental-fusion-cooldown"><strong>ODRODZENIE HYDRY</strong><small>Kolejna próba za {formatCooldown(bossCooldownSeconds)}</small></div>
            ) : (
              <div className="elemental-fusion-complete"><strong>HYDRA OSWOJONA</strong><small>Trzy efekty działają na planszy</small></div>
            )}
          </div>
        )}

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
              <small>{formatNumber(buyCost)} monet{buyBlockedReason ? ` · ${buyBlockedReason}` : ''}</small>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
