import { useEffect, useMemo, useState } from 'react';
import { formatCompact, formatNumber } from '../game/format';
import {
  SPIRIT_MINE_CURRENCY_KEYS,
  SPIRIT_MINE_MAX_ROOMS,
  getMineFacilityCost,
  getMineCollectableByElement,
  getMineMinerCost,
  getMineNextRoom,
  getMineShaftCapacity,
  getMineShaftRate,
  getMineShaftUpgradeCost,
  getMineStoredTotal
} from '../game/spiritMine';

const META = {
  fire: { name: 'Kopalnia Ognia', coinName: 'Ogniste monety', icon: '🔥' },
  electric: { name: 'Kopalnia Prądu', coinName: 'Monety Prądu', icon: '⚡' },
  water: { name: 'Kopalnia Wody', coinName: 'Wodne monety', icon: '💧' }
};

function MineWallets({ state, compact = false }) {
  return <div className={`spirit-mine-wallets ${compact ? 'is-compact' : ''}`}>
    <div className="spirit-mine-wallet spirit-mine-wallet--essence"><span>Esencja Hydry</span><strong>◈ {formatNumber(state.currencies.essence || 0)}</strong></div>
    {Object.entries(META).map(([element, meta]) => <div key={element} className={`spirit-mine-wallet spirit-mine-wallet--${element}`}><span>{meta.coinName}</span><strong>{meta.icon} {formatNumber(state.currencies[SPIRIT_MINE_CURRENCY_KEYS[element]] || 0)}</strong></div>)}
  </div>;
}

function MineHub({ state, mine, onEnterMine, onCollect, onUnlockRoom }) {
  const collected = getMineCollectableByElement(mine);
  const storedTotal = getMineStoredTotal(mine);
  const nextMine = getMineNextRoom(mine);
  const slots = useMemo(() => Array.from({ length: SPIRIT_MINE_MAX_ROOMS }, (_, index) => {
    const room = index + 1;
    return mine.shafts.find((shaft) => shaft.room === room) || null;
  }), [mine.shafts]);

  return <>
    <header className="spirit-mine-header">
      <div><small>MAPA KOPALŃ ŻYWIOŁÓW</small><h2>Podziemne imperium</h2><p>Wybierz kopalnię i wejdź do środka. Każda ma własny szyb, windę, magazyn i załogę.</p></div>
      <MineWallets state={state} />
    </header>

    <div className="mine-hub-toolbar">
      <div><strong>{mine.shafts.length}/{SPIRIT_MINE_MAX_ROOMS} kopalni</strong><small>Odblokowujesz je kolejno: Ogień → Prąd → Woda.</small></div>
      <button type="button" className="mine-collect-all" disabled={storedTotal <= 0} onClick={() => onCollect()}><span>Odbierz ze wszystkich</span><strong>+{formatNumber(storedTotal)}</strong><small>🔥 {formatNumber(collected.fire)} · ⚡ {formatNumber(collected.electric)} · 💧 {formatNumber(collected.water)}</small></button>
    </div>

    <div className="mine-hub-grid">
      {slots.map((shaft, index) => {
        const room = index + 1;
        if (shaft) {
          const meta = META[shaft.element];
          const capacity = getMineShaftCapacity(shaft);
          const fill = Math.min(100, capacity > 0 ? shaft.stored / capacity * 100 : 0);
          return <article key={room} className={`mine-hub-card mine-hub-card--${shaft.element}`}>
            <div className="mine-hub-card-number">KOPALNIA {String(room).padStart(2, '0')}</div>
            <div className="mine-hub-card-icon" aria-hidden="true">{meta.icon}</div>
            <h3>{meta.name}</h3>
            <p>Szyb Lv {shaft.level} · Winda Lv {shaft.elevatorLevel} · Magazyn Lv {shaft.warehouseLevel}</p>
            <div className="mine-storage"><span style={{ width: `${fill}%` }} /><small>{formatCompact(shaft.stored, 1)} / {formatNumber(capacity)} {meta.icon}</small></div>
            <button type="button" onClick={() => onEnterMine(shaft.id)}>Wejdź do kopalni →</button>
          </article>;
        }
        if (nextMine?.room === room) {
          const meta = META[nextMine.element];
          const currencyMeta = META[nextMine.currencyElement];
          const canBuy = (state.currencies[nextMine.currencyKey] || 0) >= nextMine.cost;
          return <article key={room} className={`mine-hub-card mine-hub-card--next mine-hub-card--${nextMine.element}`}>
            <div className="mine-hub-card-number">NOWA KOPALNIA {String(room).padStart(2, '0')}</div>
            <div className="mine-hub-card-icon" aria-hidden="true">{meta.icon}</div>
            <h3>{meta.name}</h3><p>Otwórz nowy zakład z osobną windą, magazynem i walutą żywiołu.</p>
            <button type="button" disabled={!canBuy} onClick={onUnlockRoom}>Kup · {formatNumber(nextMine.cost)} {currencyMeta.icon}</button>
          </article>;
        }
        return <article key={room} className="mine-hub-card mine-hub-card--locked"><div className="mine-hub-card-number">KOPALNIA {String(room).padStart(2, '0')}</div><div className="mine-hub-card-icon" aria-hidden="true">🔒</div><h3>Zablokowana</h3><p>Najpierw otwórz poprzednią kopalnię.</p></article>;
      })}
    </div>
  </>;
}

function MineInterior({ state, shaft, onBack, onCollect, onUpgradeShaft, onHireMiner, onUpgradeElevator, onUpgradeWarehouse }) {
  const meta = META[shaft.element];
  const currencyKey = SPIRIT_MINE_CURRENCY_KEYS[shaft.element];
  const balance = state.currencies[currencyKey] || 0;
  const essence = state.currencies.essence || 0;
  const capacity = getMineShaftCapacity(shaft);
  const fill = Math.min(100, capacity > 0 ? shaft.stored / capacity * 100 : 0);
  const upgradeCost = getMineShaftUpgradeCost(shaft);
  const minerCost = getMineMinerCost(shaft);
  const elevatorCost = getMineFacilityCost(shaft.elevatorLevel);
  const warehouseCost = getMineFacilityCost(shaft.warehouseLevel);
  const elevatorDuration = Math.max(2.2, 7.5 - (shaft.elevatorLevel - 1) * 0.32);
  const collectable = Math.floor(Math.max(0, shaft.stored || 0));

  return <>
    <header className={`mine-interior-header mine-interior-header--${shaft.element}`}>
      <button type="button" className="mine-back-button" onClick={onBack}>← Mapa kopalń</button>
      <div><small>KOPALNIA {String(shaft.room).padStart(2, '0')}</small><h2>{meta.icon} {meta.name}</h2><p>Osobny zakład: szyb wydobywa, winda przewozi, a magazyn przechowuje urobek.</p></div>
      <MineWallets state={state} compact />
    </header>

    <div className="mine-interior-facilities">
      <div className="mine-facility-card"><span>WINDA · LV {shaft.elevatorLevel}</span><small>Przewozi urobek i daje +18% produkcji na poziom.</small><button type="button" disabled={essence < elevatorCost} onClick={() => onUpgradeElevator(shaft.id)}>Ulepsz windę · {formatNumber(elevatorCost)} ◈</button></div>
      <button type="button" className="mine-collect-all" disabled={collectable <= 0} onClick={() => onCollect(shaft.id)}><span>Odbierz z tej kopalni</span><strong>+{formatNumber(collectable)} {meta.icon}</strong><small>{meta.coinName}</small></button>
      <div className="mine-facility-card"><span>MAGAZYN · LV {shaft.warehouseLevel}</span><small>Zwiększa pojemność kopalni o 50% na poziom.</small><button type="button" disabled={essence < warehouseCost} onClick={() => onUpgradeWarehouse(shaft.id)}>Ulepsz magazyn · {formatNumber(warehouseCost)} ◈</button></div>
    </div>

    <div className={`mine-interior mine-interior--${shaft.element}`}>
      <aside className={`mine-elevator mine-elevator--interior ${state.settings.animations ? '' : 'is-paused'}`} style={{ '--elevator-duration': `${elevatorDuration}s` }} aria-label={`Winda kopalni ${shaft.room}, poziom ${shaft.elevatorLevel}`}>
        <div className="mine-elevator-title"><strong>WINDA</strong><span>Lv {shaft.elevatorLevel}</span></div>
        <div className="mine-elevator-rail">
          <i style={{ '--floor-position': '7%' }}>MAG.</i><i style={{ '--floor-position': '88%' }}>SZYB</i>
          <div className="mine-elevator-cable" />
          <div className="mine-elevator-cab"><span>{meta.icon}</span><small>UROBEK</small></div>
        </div>
      </aside>

      <article className={`mine-shaft mine-shaft--interior mine-shaft--${shaft.element}`}>
        <div className="mine-room-number"><small>SZYB</small><strong>{String(shaft.room).padStart(2, '0')}</strong></div>
        <div className="mine-shaft-scene" aria-hidden="true"><span className="mine-element-orb">{meta.icon}</span>{Array.from({ length: Math.min(shaft.miners, 5) }, (_, miner) => <i key={miner} style={{ '--miner-delay': `${miner * -0.45}s` }}>🦊</i>)}</div>
        <div className="mine-shaft-info"><span><strong>{meta.name}</strong><small>Szyb Lv {shaft.level} · {shaft.miners} {shaft.miners === 1 ? 'górnik' : 'górników'} · bonus głębokości +{(shaft.room - 1) * 12}%</small></span><b>{formatCompact(getMineShaftRate(shaft), 2)} {meta.icon}/s</b></div>
        <div className="mine-storage"><span style={{ width: `${fill}%` }} /><small>{formatCompact(shaft.stored, 1)} / {formatNumber(capacity)} {meta.icon}</small></div>
        <div className="mine-shaft-actions"><button type="button" disabled={balance < upgradeCost} onClick={() => onUpgradeShaft(shaft.id)}>Pogłęb szyb · {formatNumber(upgradeCost)} {meta.icon}</button><button type="button" disabled={balance < minerCost} onClick={() => onHireMiner(shaft.id)}>Zatrudnij lisa · {formatNumber(minerCost)} {meta.icon}</button></div>
      </article>
    </div>
  </>;
}

export default function SpiritMineRealm({ state, onCollect, onUpgradeShaft, onHireMiner, onUnlockRoom, onUpgradeElevator, onUpgradeWarehouse }) {
  const mine = state.realms.spiritMine;
  const [selectedMineId, setSelectedMineId] = useState(null);
  const selectedMine = mine.shafts.find((shaft) => shaft.id === selectedMineId) || null;

  useEffect(() => {
    if (selectedMineId && !mine.shafts.some((shaft) => shaft.id === selectedMineId)) setSelectedMineId(null);
  }, [mine.shafts, selectedMineId]);

  return <section className="spirit-mine" aria-label="Kopalnie żywiołów">
    {selectedMine ? <MineInterior state={state} shaft={selectedMine} onBack={() => setSelectedMineId(null)} onCollect={onCollect} onUpgradeShaft={onUpgradeShaft} onHireMiner={onHireMiner} onUpgradeElevator={onUpgradeElevator} onUpgradeWarehouse={onUpgradeWarehouse} /> : <MineHub state={state} mine={mine} onEnterMine={setSelectedMineId} onCollect={onCollect} onUnlockRoom={onUnlockRoom} />}
  </section>;
}
