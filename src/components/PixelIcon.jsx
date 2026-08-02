const COLORS = {
  ink: '#020617',
  slate: '#64748b',
  light: '#f8fafc',
  amber: '#fbbf24',
  orange: '#f97316',
  red: '#ef4444',
  green: '#22c55e',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  violet: '#a855f7'
};

function PixelRect({ x, y, width, height, fill }) {
  return <rect x={x} y={y} width={width} height={height} fill={fill} />;
}

const ICONS = {
  settings: (
    <>
      <path fill={COLORS.ink} d="M8 1h8v3h4v4h3v8h-3v4h-4v3H8v-3H4v-4H1V8h3V4h4V1Zm2 7v2H8v4h2v2h4v-2h2v-4h-2V8h-4Z" />
      <path fill={COLORS.amber} d="M9 3h6v3h3v3h3v6h-3v3h-3v3H9v-3H6v-3H3V9h3V6h3V3Zm1 4v2H8v6h2v2h4v-2h2V9h-2V7h-4Z" />
      <PixelRect x="10" y="10" width="4" height="4" fill={COLORS.cyan} />
    </>
  ),
  play: (
    <>
      <path fill={COLORS.ink} d="M4 2h5v3h4v2h3v2h3v6h-3v2h-3v2H9v3H4V2Z" />
      <path fill={COLORS.green} d="M7 6h3v2h3v2h3v4h-3v2h-3v2H7V6Z" />
      <PixelRect x="7" y="6" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  folder: (
    <>
      <path fill={COLORS.ink} d="M2 4h8l2 3h10v14H2V4Z" />
      <path fill={COLORS.amber} d="M4 6h5l2 3h9v3H4V6Z" />
      <path fill={COLORS.orange} d="M4 11h16v8H4v-8Z" />
      <PixelRect x="6" y="13" width="12" height="2" fill={COLORS.amber} />
    </>
  ),
  trophy: (
    <>
      <path fill={COLORS.ink} d="M5 2h14v3h4v7h-3v3h-4v3h-2v2h5v3H5v-3h5v-2H8v-3H4v-3H1V5h4V2Z" />
      <path fill={COLORS.amber} d="M7 4h10v7h-2v4H9v-4H7V4Zm-4 3h2v4h2v2H5v-2H3V7Zm16 0h2v4h-2v2h-2v-2h2V7Z" />
      <PixelRect x="9" y="5" width="6" height="2" fill={COLORS.light} />
      <PixelRect x="10" y="18" width="4" height="2" fill={COLORS.orange} />
    </>
  ),
  user: (
    <>
      <path fill={COLORS.ink} d="M8 2h8v2h2v8h-2v2h3v2h2v6H3v-6h2v-2h3v-2H6V4h2V2Z" />
      <path fill={COLORS.orange} d="M9 4h6v2h2v4h-2v2H9v-2H7V6h2V4Z" />
      <path fill={COLORS.cyan} d="M7 16h3v2h4v-2h3v2h2v2H5v-2h2v-2Z" />
      <PixelRect x="9" y="5" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  friends: (
    <>
      <path fill={COLORS.ink} d="M4 2h7v2h2v7h-2v2h2v2h2v-3h-1V6h2V4h6v2h2v6h-2v2h1v2h1v7H1v-8h2v-2h2v-2H3V4h1V2Z" />
      <path fill={COLORS.orange} d="M5 4h5v2h1v4h-2v2H6v-2H5V4Zm11 2h4v2h1v3h-2v2h-3v-2h-1V8h1V6Z" />
      <path fill={COLORS.cyan} d="M4 15h3v2h2v-2h3v2h2v4H3v-4h1v-2Zm12 0h4v1h2v5h-6v-6Z" />
      <PixelRect x="6" y="5" width="2" height="2" fill={COLORS.light} />
      <PixelRect x="17" y="7" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  power: (
    <>
      <path fill={COLORS.ink} d="M9 1h6v10H9V1ZM5 5h3v4H6v8h2v2h8v-2h2V9h-2V5h3v2h2v12h-3v3H6v-3H3V7h2V5Z" />
      <PixelRect x="11" y="3" width="2" height="8" fill={COLORS.red} />
      <path fill={COLORS.red} d="M5 8h2v9h2v2h6v-2h2V8h2v10h-3v2H8v-2H5V8Z" />
    </>
  ),
  back: (
    <>
      <path fill={COLORS.ink} d="M9 3h6v4h7v10h-7v4H9v-3H6v-3H3v-6h3V6h3V3Z" />
      <path fill={COLORS.cyan} d="M10 6h3v3h7v6h-7v3h-3v-3H7v-2H5v-2h2V9h3V6Z" />
      <PixelRect x="7" y="10" width="3" height="2" fill={COLORS.light} />
    </>
  ),
  plus: (
    <>
      <path fill={COLORS.ink} d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6V2Z" />
      <path fill={COLORS.green} d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" />
      <PixelRect x="10" y="4" width="2" height="6" fill={COLORS.light} />
    </>
  ),
  clock: (
    <>
      <path fill={COLORS.ink} d="M8 1h8v2h3v3h2v3h2v7h-2v3h-3v2h-3v2H9v-2H6v-2H3v-3H1V9h2V6h2V4h3V1Z" />
      <path fill={COLORS.cyan} d="M9 3h6v2h3v3h2v8h-2v2h-3v2H9v-2H6v-3H4V9h2V6h3V3Z" />
      <path fill={COLORS.ink} d="M10 6h4v6h4v4h-8V6Z" />
      <PixelRect x="11" y="7" width="2" height="6" fill={COLORS.light} />
      <PixelRect x="13" y="13" width="4" height="2" fill={COLORS.amber} />
    </>
  ),
  download: (
    <>
      <path fill={COLORS.ink} d="M8 2h8v9h5v6h-3v3H6v-3H3v-6h5V2Zm-6 17h5v2h10v-2h5v4H2v-4Z" />
      <path fill={COLORS.green} d="M10 4h4v9h4v2h-2v2h-8v-2H6v-2h4V4Z" />
      <PixelRect x="10" y="4" width="2" height="8" fill={COLORS.light} />
    </>
  ),
  trash: (
    <>
      <path fill={COLORS.ink} d="M7 1h10v3h5v5h-2v14H4V9H2V4h5V1Z" />
      <path fill={COLORS.red} d="M9 3h6v2h5v2H4V5h5V3ZM6 9h12v12H6V9Z" />
      <PixelRect x="8" y="11" width="2" height="8" fill={COLORS.light} />
      <PixelRect x="14" y="11" width="2" height="8" fill={COLORS.light} />
    </>
  ),
  home: (
    <>
      <path fill={COLORS.ink} d="M9 2h6v2h3v3h3v3h2v6h-3v7H4v-7H1v-6h2V8h3V5h3V2Z" />
      <path fill={COLORS.amber} d="M10 4h4v2h3v3h3v5h-2v7H6v-7H4v-3h2V9h2V7h2V4Z" />
      <PixelRect x="10" y="14" width="4" height="7" fill={COLORS.orange} />
      <PixelRect x="7" y="11" width="3" height="3" fill={COLORS.cyan} />
    </>
  ),
  close: (
    <>
      <path fill={COLORS.ink} d="M3 1h5l4 5 4-5h5v6l-4 5 4 5v6h-5l-4-5-4 5H3v-6l4-5-4-5V1Z" />
      <path fill={COLORS.red} d="M5 4h2l5 5 5-5h2v2l-5 6 5 6v2h-2l-5-5-5 5H5v-2l5-6-5-6V4Z" />
      <PixelRect x="5" y="4" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  calendar: (
    <>
      <path fill={COLORS.ink} d="M5 1h4v3h6V1h4v3h3v19H2V4h3V1Z" />
      <path fill={COLORS.cyan} d="M5 6h14v4H5V6Z" />
      <path fill={COLORS.light} d="M5 12h14v8H5v-8Z" />
      <path fill={COLORS.blue} d="M7 13h3v2H7v-2Zm7 0h3v2h-3v-2Zm-7 4h3v2H7v-2Zm7 0h3v2h-3v-2Z" />
      <path fill={COLORS.amber} d="M6 1h2v6H6V1Zm10 0h2v6h-2V1Z" />
    </>
  ),
  sound: (
    <>
      <path fill={COLORS.ink} d="M8 6h3l5-5h4v6h2v10h-2v6h-4l-5-5H3V6h5Z" />
      <path fill={COLORS.amber} d="M5 9h7l4-4h2v14h-2l-4-4H5V9Z" />
      <path fill={COLORS.cyan} d="M19 9h2v6h-2V9Z" />
      <PixelRect x="7" y="9" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  mute: (
    <>
      <path fill={COLORS.ink} d="M2 7h7l5-5h4v8h4v4h-4v8h-4l-5-5H2V7Z" />
      <path fill={COLORS.amber} d="M4 9h6l4-4h2v14h-2l-4-4H4V9Z" />
      <path fill={COLORS.ink} d="M17 5h4v3h3v4h-3v3h3v4h-3v3h-4v-3h-3v-4h3v-3h-3V8h3V5Z" />
      <path fill={COLORS.red} d="M18 7h2v3h2v1h-2v2h-2v-2h-2v-1h2V7Zm0 8h2v2h2v2h-2v-2h-2v2h-2v-2h2v-2Z" />
      <PixelRect x="5" y="9" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  animation: (
    <>
      <path fill={COLORS.ink} d="M9 1h6v5h5v3h3v6h-5v-4h-3v3h-3v3h-3v5H3v-6h5v-3h3v-3H9V7H5v3H1V5h3V2h5V1Z" />
      <path fill={COLORS.violet} d="M10 3h4v5h5v2h2v4h-3v-2h-3v3h-3v3h-2v2H5v-3h4v-3h3v-3h-2V8H6v2H3V6h2V4h5V3Z" />
      <PixelRect x="11" y="3" width="2" height="4" fill={COLORS.light} />
      <PixelRect x="5" y="17" width="2" height="2" fill={COLORS.cyan} />
    </>
  ),
  music: (
    <>
      <path fill={COLORS.ink} d="M9 3h13v14h-3v4h-7v-7h6V8h-5v11h-3v4H3v-7h6V3Z" />
      <path fill={COLORS.violet} d="M11 5h9v3h-9V5Zm0 5h7v5h-4v2h-3v-7Zm-6 8h4v2H5v-2Z" />
      <PixelRect x="12" y="5" width="7" height="2" fill={COLORS.cyan} />
      <PixelRect x="5" y="17" width="4" height="2" fill={COLORS.amber} />
      <PixelRect x="14" y="15" width="4" height="2" fill={COLORS.amber} />
    </>
  ),
  modes: (
    <>
      <path fill={COLORS.ink} d="M2 2h8v8H2V2Zm12 0h8v8h-8V2ZM2 14h8v8H2v-8Zm12 0h8v8h-8v-8Z" />
      <path fill={COLORS.green} d="M4 4h4v4H4V4Z" />
      <path fill={COLORS.amber} d="M16 4h4v4h-4V4Z" />
      <path fill={COLORS.cyan} d="M4 16h4v4H4v-4Z" />
      <path fill={COLORS.violet} d="M16 16h4v4h-4v-4Z" />
      <PixelRect x="4" y="4" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  income: (
    <>
      <path fill={COLORS.ink} d="M8 1h8v3h3v3h3v10h-3v3h-3v3H8v-3H5v-3H2V7h3V4h3V1Z" />
      <path fill={COLORS.green} d="M9 3h6v2h3v3h2v8h-3v2h-3v3H9v-2H6v-3H4V8h2V6h3V3Z" />
      <path fill={COLORS.ink} d="M10 5h4v2h3v3h-4v-1h-2v2h4v2h2v4h-3v2h-4v-2H7v-3h4v1h2v-2H9v-2H7V7h3V5Z" />
      <PixelRect x="11" y="6" width="2" height="2" fill={COLORS.light} />
    </>
  ),
  refresh: (
    <>
      <path fill={COLORS.ink} d="M6 3h10V1h6v9h-9V5H8v2H5v3H1V7h2V5h3V3Zm5 11h9v3h-2v2h-3v2H5v2H1v-9h9v5h5v-2h3v-3h4v3h-2v2h-3v3H7v-2h4v-5Z" />
      <path fill={COLORS.cyan} d="M7 5h10V3h3v5h-5V6H8v2H5v3H3V8h2V6h2V5Zm2 11h-5v5H2v-5h2v2h3v1h8v-2h3v-3h3v2h-2v2h-3v2H8v-2h1v-2Z" />
    </>
  ),
  collapse: (
    <>
      <path fill={COLORS.ink} d="M7 2h6v4h4v4h4v4h-4v4h-4v4H7v-5h4v-3h4v-4h-4V7H7V2Z" />
      <path fill={COLORS.amber} d="M9 5h3v3h3v3h3v2h-3v3h-3v3H9v-3h3v-3h3v-2h-3V8H9V5Z" />
    </>
  ),
  fire: (
    <>
      <path fill={COLORS.ink} d="M11 1h5v5h3v3h3v8h-3v3h-3v3H8v-2H5v-3H3v-7h3V7h3V4h2V1Z" />
      <path fill={COLORS.red} d="M12 3h2v5h3v3h2v6h-2v2h-3v2H9v-2H7v-3H5v-4h3V9h3V6h1V3Z" />
      <path fill={COLORS.amber} d="M11 11h3v3h2v4h-2v2h-4v-2H8v-3h3v-4Z" />
      <PixelRect x="11" y="14" width="2" height="4" fill={COLORS.light} />
    </>
  ),
  electric: (
    <>
      <path fill={COLORS.ink} d="M10 1h10l-5 8h6l-12 14H4l4-10H3L10 1Z" />
      <path fill={COLORS.amber} d="M11 3h5l-5 8h6L9 20H7l4-9H7l4-8Z" />
      <PixelRect x="11" y="4" width="2" height="5" fill={COLORS.light} />
    </>
  ),
  water: (
    <>
      <path fill={COLORS.ink} d="M10 1h4v3h2v3h2v3h2v3h2v5h-3v3h-3v2H8v-2H5v-3H2v-5h2v-3h2V7h2V4h2V1Z" />
      <path fill={COLORS.blue} d="M11 4h2v3h2v3h2v3h2v5h-3v2H8v-2H5v-4h2v-3h2V8h2V4Z" />
      <path fill={COLORS.cyan} d="M7 14h3v3h2v2H8v-2H7v-3Z" />
      <PixelRect x="11" y="7" width="2" height="5" fill={COLORS.light} />
    </>
  ),
  google: (
    <>
      <path fill={COLORS.ink} d="M7 2h10v3h3v4h-5V7H9v2H7v6h2v2h6v-2h-4v-5h11v8h-3v3H7v-2H4v-3H2V8h2V5h3V2Z" />
      <path fill={COLORS.blue} d="M8 4h8v2H9v2H6v8h3v2h7v-4h-4v-2h8v5h-3v2H8v-2H5V7h3V4Z" />
      <PixelRect x="8" y="4" width="5" height="2" fill={COLORS.red} />
      <PixelRect x="5" y="8" width="2" height="5" fill={COLORS.amber} />
      <PixelRect x="8" y="17" width="5" height="2" fill={COLORS.green} />
    </>
  ),
  steam: (
    <>
      <path fill={COLORS.ink} d="M13 2h7v2h2v7h-2v2h-6l-3 4v3H9v2H4v-2H2v-5h2v-2h5l3-4V5h1V2Z" />
      <path fill={COLORS.light} d="M14 4h5v2h1v4h-2v1h-4v-2h-2V6h2V4Zm1 2v3h3V6h-3ZM4 15h4l3 2v3H9v1H5v-2H3v-3h1v-1Zm1 2v2h4v-1l-2-1H5Z" />
      <PixelRect x="10" y="12" width="5" height="2" fill={COLORS.cyan} />
    </>
  )
};

export function hasPixelIcon(name) {
  return Boolean(ICONS[name]);
}

export default function PixelIcon({ name, alt = '', className = '', size = 16 }) {
  const content = ICONS[name];
  if (!content) {
    return null;
  }

  const responsiveSize = `clamp(${(size * 0.84).toFixed(2)}px, ${(size / 16).toFixed(3)}vw, ${(size * 1.12).toFixed(2)}px)`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`gui-icon pixel-icon inline-block shrink-0 ${className}`.trim()}
      style={{ width: responsiveSize, height: responsiveSize, shapeRendering: 'crispEdges' }}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      focusable="false"
    >
      {content}
    </svg>
  );
}
