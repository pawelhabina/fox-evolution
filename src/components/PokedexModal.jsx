import { useMemo, useState } from 'react';
import { ALL_FOX_TIERS, EVOLUTION_TYPES } from '../game/constants';
import { formatNumber } from '../game/format';
import { getAllFoxDiscoveryKeys, POKEDEX_ENTRY_COUNT } from '../game/progression.mjs';
import { getFoxSpritePresentation } from '../assets/foxSprites';
import GuiIcon from './GuiIcon';

const FILTERS = [
  { id: 'all', label: 'Wszystkie', icon: 'pet' },
  { id: 'base', label: 'Zwykłe', icon: 'foxUpgrade' },
  { id: 'fire', label: 'Ogień', icon: 'fire' },
  { id: 'electric', label: 'Prąd', icon: 'electric' },
  { id: 'water', label: 'Woda', icon: 'water' }
];

const ELEMENT_DESCRIPTIONS = {
  fire: 'Ognista ewolucja: +50% wartości kliknięcia.',
  electric: 'Elektryczna ewolucja: +50% pasywnego income.',
  water: 'Wodna ewolucja: wzmacnia najbliższego lisa o 50%.'
};

function makeEntries(discoveries) {
  return getAllFoxDiscoveryKeys().map((key) => {
    const [kind, rawTier] = key.split(':');
    const tier = Number(rawTier);
    const evolution = kind === 'base' ? null : kind;
    const tierData = ALL_FOX_TIERS[tier - 1];
    const evolutionData = evolution ? EVOLUTION_TYPES[evolution] : null;
    const discoveredAt = discoveries[key] || null;
    return {
      key,
      kind,
      tier,
      evolution,
      discoveredAt,
      name: evolutionData ? `${evolutionData.name} Lv ${tier}` : tierData.name,
      sprite: getFoxSpritePresentation(tier, evolution),
      income: Math.floor(tierData.baseIncomePerTick * (evolutionData?.incomeMultiplier || 1)),
      click: Math.floor(tierData.clickValue * (evolutionData?.clickMultiplier || 1)),
      sell: tierData.sellValue
    };
  });
}

function discoveryDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'data nieznana' : date.toLocaleString('pl-PL');
}

export default function PokedexModal({ pokedex, onClose }) {
  const [filter, setFilter] = useState('all');
  const discoveries = pokedex?.discoveries || {};
  const entries = useMemo(() => makeEntries(discoveries), [discoveries]);
  const visibleEntries = filter === 'all' ? entries : entries.filter((entry) => entry.kind === filter);
  const discoveredCount = entries.filter((entry) => entry.discoveredAt).length;
  const progress = Math.round((discoveredCount / POKEDEX_ENTRY_COUNT) * 100);

  return (
    <div className="pokedex-backdrop" role="dialog" aria-modal="true" aria-labelledby="pokedex-title" onMouseDown={onClose}>
      <section className="pokedex-modal pixel-frame" onMouseDown={(event) => event.stopPropagation()}>
        <header className="pokedex-header">
          <div>
            <p className="pokedex-kicker">Kolekcja lisów</p>
            <h2 id="pokedex-title">Pokédex</h2>
            <p>Odkryto <strong>{discoveredCount}/{POKEDEX_ENTRY_COUNT}</strong> lisów ({progress}%)</p>
          </div>
          <button type="button" className="pokedex-close" onClick={onClose} aria-label="Zamknij Pokédex">
            <GuiIcon name="close" alt="" size={20} />
          </button>
        </header>

        <div className="pokedex-progress" aria-label={`Postęp Pokédexu: ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <nav className="pokedex-filters" aria-label="Kategorie Pokédexu">
          {FILTERS.map((item) => {
            const categoryEntries = item.id === 'all' ? entries : entries.filter((entry) => entry.kind === item.id);
            const categoryFound = categoryEntries.filter((entry) => entry.discoveredAt).length;
            return (
              <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>
                <GuiIcon name={item.icon} alt="" size={17} />
                <span>{item.label}</span>
                <small>{categoryFound}/{categoryEntries.length}</small>
              </button>
            );
          })}
        </nav>

        <div className="pokedex-grid">
          {visibleEntries.map((entry) => {
            const discovered = Boolean(entry.discoveredAt);
            return (
              <article key={entry.key} className={`pokedex-card pokedex-card--${entry.kind} ${discovered ? 'is-discovered' : 'is-locked'}`}>
                <div className="pokedex-card-number">#{String(entries.indexOf(entry) + 1).padStart(3, '0')}</div>
                <div className="pokedex-sprite-wrap">
                  {entry.sprite.src ? (
                    <img src={entry.sprite.src} alt={discovered ? entry.name : ''} draggable={false} />
                  ) : (
                    <span
                      className="pokedex-sprite-atlas"
                      style={entry.sprite.style}
                      role="img"
                      aria-label={discovered ? entry.name : ''}
                    />
                  )}
                  {!discovered && <span className="pokedex-lock" aria-label="Nieodkryty">?</span>}
                  {discovered && entry.evolution && entry.tier > 20 && (
                    <span className={`pokedex-rare-level pokedex-rare-level--${entry.evolution}`}>◆ {entry.tier}</span>
                  )}
                </div>
                <div className="pokedex-card-copy">
                  <small>Tier {entry.tier}</small>
                  <h3>{discovered ? entry.name : 'Nieodkryty lis'}</h3>
                  {discovered ? (
                    <>
                      <dl>
                        <div><dt>Income</dt><dd>{formatNumber(entry.income)}/tick</dd></div>
                        <div><dt>Klik</dt><dd>{formatNumber(entry.click)}</dd></div>
                        <div><dt>Sprzedaż</dt><dd>{formatNumber(entry.sell)}</dd></div>
                      </dl>
                      {entry.evolution && <p>{ELEMENT_DESCRIPTIONS[entry.evolution]}</p>}
                      <time dateTime={entry.discoveredAt}>Odkryto: {discoveryDate(entry.discoveredAt)}</time>
                    </>
                  ) : (
                    <p>Połącz lub ewoluuj lisy, aby odblokować ten wpis.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
