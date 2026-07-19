import { useEffect, useRef } from 'react';

const CELL_SIZE = 36;
const TRAIL_LENGTH = 8;
const TRAIL_LIFETIME_MS = 620;
const SPARK_LIFETIME_MS = 920;

function randomSparkDelay() {
  return 700 + Math.random() * 1300;
}

function cellKey(cell) {
  return `${cell.column}:${cell.row}`;
}

export default function PixelGridBackground({ enabled = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) {
      return undefined;
    }

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      return undefined;
    }

    let width = 1;
    let height = 1;
    let columns = 1;
    let rows = 1;
    let animationFrame = 0;
    let lastFrameAt = 0;
    let hoveredCell = null;
    let nextSparkAt = performance.now() + randomSparkDelay();
    const trail = new Map();
    const trailOrder = [];
    const sparks = new Map();

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      columns = Math.max(1, Math.ceil(width / CELL_SIZE));
      rows = Math.max(1, Math.ceil(height / CELL_SIZE));
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = false;
    };

    const rememberTrailCell = (cell, now) => {
      if (!cell) {
        return;
      }
      const key = cellKey(cell);
      trail.set(key, { ...cell, touchedAt: now });
      const previousIndex = trailOrder.indexOf(key);
      if (previousIndex >= 0) {
        trailOrder.splice(previousIndex, 1);
      }
      trailOrder.push(key);
      while (trailOrder.length > TRAIL_LENGTH) {
        const oldestKey = trailOrder.shift();
        trail.delete(oldestKey);
      }
    };

    const findCell = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        return null;
      }
      return {
        column: Math.min(columns - 1, Math.floor(x / CELL_SIZE)),
        row: Math.min(rows - 1, Math.floor(y / CELL_SIZE))
      };
    };

    const onPointerMove = (event) => {
      if (!enabled) {
        return;
      }
      const nextCell = findCell(event.clientX, event.clientY);
      const nextKey = nextCell ? cellKey(nextCell) : null;
      const currentKey = hoveredCell ? cellKey(hoveredCell) : null;
      if (nextKey === currentKey) {
        return;
      }
      if (hoveredCell) {
        rememberTrailCell(hoveredCell, performance.now());
      }
      if (nextKey) {
        trail.delete(nextKey);
        const trailIndex = trailOrder.indexOf(nextKey);
        if (trailIndex >= 0) {
          trailOrder.splice(trailIndex, 1);
        }
      }
      hoveredCell = nextCell;
    };

    const clearHoveredCell = () => {
      if (hoveredCell) {
        rememberTrailCell(hoveredCell, performance.now());
        hoveredCell = null;
      }
    };

    const paintCell = (cell, intensity, color) => {
      const x = cell.column * CELL_SIZE;
      const y = cell.row * CELL_SIZE;
      const steppedIntensity = Math.ceil(Math.max(0, Math.min(1, intensity)) * 5) / 5;
      context.globalAlpha = 0.08 + steppedIntensity * 0.27;
      context.fillStyle = color;
      context.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      context.globalAlpha = 0.25 + steppedIntensity * 0.75;
      context.fillRect(x + 2, y + 2, CELL_SIZE - 4, 2);
      context.fillRect(x + 2, y + 2, 2, CELL_SIZE - 4);
      context.globalAlpha = 1;
    };

    const draw = (now) => {
      animationFrame = window.requestAnimationFrame(draw);
      if (now - lastFrameAt < 32) {
        return;
      }
      lastFrameAt = now;

      context.clearRect(0, 0, width, height);
      context.beginPath();
      for (let column = 0; column <= columns; column += 1) {
        const x = column * CELL_SIZE + 0.5;
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let row = 0; row <= rows; row += 1) {
        const y = row * CELL_SIZE + 0.5;
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.globalAlpha = 1;
      context.strokeStyle = 'rgba(34, 211, 238, 0.11)';
      context.lineWidth = 1;
      context.stroke();

      if (!enabled) {
        return;
      }

      if (now >= nextSparkAt) {
        const cell = {
          column: Math.floor(Math.random() * columns),
          row: Math.floor(Math.random() * rows)
        };
        sparks.set(cellKey(cell), { ...cell, startedAt: now });
        nextSparkAt = now + randomSparkDelay();
      }

      trail.forEach((cell, key) => {
        const intensity = 1 - (now - cell.touchedAt) / TRAIL_LIFETIME_MS;
        if (intensity <= 0) {
          trail.delete(key);
          const orderIndex = trailOrder.indexOf(key);
          if (orderIndex >= 0) {
            trailOrder.splice(orderIndex, 1);
          }
          return;
        }
        paintCell(cell, intensity, '#22d3ee');
      });

      sparks.forEach((cell, key) => {
        const intensity = 1 - (now - cell.startedAt) / SPARK_LIFETIME_MS;
        if (intensity <= 0) {
          sparks.delete(key);
          return;
        }
        paintCell(cell, intensity, '#f59e0b');
      });

      if (hoveredCell) {
        paintCell(hoveredCell, 1, '#fbbf24');
      }
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    resizeCanvas();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', clearHoveredCell);
    window.addEventListener('blur', clearHoveredCell);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('mouseleave', clearHoveredCell);
      window.removeEventListener('blur', clearHoveredCell);
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className="main-menu-pixel-grid" aria-hidden="true" />;
}
