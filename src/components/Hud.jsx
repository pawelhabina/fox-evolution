import { formatCompact, formatNumber } from '../game/format';
import GuiIcon from './GuiIcon';

export default function Hud({ coins, gems, rebirthTokens, coinsPerSecond, countdown, foxCount, foxLimit, onOpenModesMenu, onOpenSystemMenu }) {
  const stats = [
    {
      id: 'coins',
      icon: 'coin',
      label: 'Monety',
      value: formatNumber(coins),
      tone: 'text-amber-300',
      description: 'Liczba monet. Wydajesz je na lisy i rozwój.'
    },
    {
      id: 'cps',
      icon: 'energy',
      label: 'Monety/s',
      value: formatCompact(coinsPerSecond, 1),
      tone: 'text-emerald-300',
      description: 'Pasywny przyrost monet na sekundę.'
    },
    {
      id: 'tick',
      icon: 'clock1',
      label: 'Tick',
      value: `${formatCompact(countdown, 1)}s`,
      tone: 'text-cyan-300',
      description: 'Czas do następnego ticka ekonomii.'
    },
    {
      id: 'foxes',
      icon: 'pet',
      label: 'Lisy',
      value: `${foxCount}/${foxLimit}`,
      tone: 'text-orange-300',
      description: 'Liczba lisów na planszy i aktualny limit.'
    },
    {
      id: 'gems',
      icon: 'diamond',
      label: 'Diamenty',
      value: formatNumber(gems),
      tone: 'text-fuchsia-300',
      description: 'Waluta premium używana do specjalnych akcji.'
    },
    {
      id: 'rebirth',
      icon: 'rebirth',
      label: 'Rebirth',
      value: formatNumber(rebirthTokens),
      tone: 'text-indigo-300',
      description: 'Tokeny zdobywane po rebirth, używane do stałych bonusów.'
    }
  ];

  return (
    <header className="hud-strip">
      <div className="hud-side hud-side-left">
        <button
          type="button"
          className="hud-side-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpenModesMenu();
          }}
          title="Menu trybów"
        >
          <GuiIcon name="quest" alt="Menu trybów" size={30} />
        </button>
      </div>

      <div className="hud-side-gap hud-side-gap-left" aria-hidden="true" />

      <div className="hud-stat-grid">
        {stats.map((stat) => (
          <div key={stat.id} className="hud-stat" tabIndex={0} aria-label={`${stat.label}: ${stat.value}`}>
            <div className="hud-stat-main">
              <GuiIcon name={stat.icon} alt={stat.label} size={26} className="hud-stat-icon" />
              <span className="min-w-0">
                <span className="hud-stat-label">{stat.label}</span>
                <span className={`hud-stat-value ${stat.tone}`}>{stat.value}</span>
              </span>
            </div>
            <span className="hud-tooltip" role="tooltip">
              {stat.description}
            </span>
          </div>
        ))}
      </div>

      <div className="hud-side-gap hud-side-gap-right" aria-hidden="true" />

      <div className="hud-side hud-side-right">
        <button
          type="button"
          className="hud-side-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSystemMenu();
          }}
          title="Menu gry"
        >
          <GuiIcon name="settings" alt="Menu gry" size={30} />
        </button>
      </div>
    </header>
  );
}
