import { useEffect, useMemo, useState } from 'react';
import { formatCompact, formatNumber } from '../game/format';
import {
  SPIRIT_MINE_CURRENCY_KEYS,
  SPIRIT_MINE_ELEMENTS,
  canUnlockElementMine,
  getMineElevatorCycleSeconds,
  getMineElevatorLoad,
  getMineElevatorThroughput,
  getMineFacilityCost,
  getMineFloorChestCapacity,
  getMineFloorRate,
  getMineFloorUpgradeCost,
  getMineNextFloor,
  getMinePendingTotal,
  getMineUnlock,
  getMineWarehouseCapacity,
  getMineWorkerCount
} from '../game/spiritMine';

const META = {
  fire: { name: 'Kopalnia Ognia', shortName: 'Ogień', coinName: 'Ogniste monety', icon: '🔥' },
  electric: { name: 'Kopalnia Energii', shortName: 'Energia', coinName: 'Monety Energii', icon: '⚡' },
  water: { name: 'Kopalnia Wody', shortName: 'Woda', coinName: 'Wodne monety', icon: '💧' }
};

function MineWallets({ state }) {
  return <div className="spirit-mine-wallets is-compact">
    {SPIRIT_MINE_ELEMENTS.map((element) => {
      const meta = META[element];
      return <div key={element} className={`spirit-mine-wallet spirit-mine-wallet--${element}`}><span>{meta.coinName}</span><strong>{meta.icon} {formatNumber(state.currencies[SPIRIT_MINE_CURRENCY_KEYS[element]] || 0)}</strong></div>;
    })}
  </div>;
}

function MinePurchaseButton({ balance, cost, icon, label, max = false, onClick, className = '' }) {
  const canAfford = !max && balance >= cost;
  const affordabilityClass = max ? 'is-max' : canAfford ? 'is-affordable' : 'is-unaffordable';
  return <button
    type="button"
    className={`mine-purchase-button ${affordabilityClass} ${className}`.trim()}
    disabled={!canAfford}
    onClick={onClick}
  >
    <span>{max ? label : `${label} · ${formatNumber(cost)} ${icon}`}</span>
    <small>{max ? 'MAKSYMALNY POZIOM' : canAfford ? '✓ STAĆ CIĘ' : `BRAKUJE ${formatNumber(Math.max(0, cost - balance))} ${icon}`}</small>
  </button>;
}

function MineMap({ state, spiritMine, onEnterMine, onUnlockMine }) {
  return <>
    <header className="spirit-mine-header mine-map-header">
      <div><small>MAPA KOPALŃ ŻYWIOŁÓW</small><h2>Trzy kopalnie</h2><p>Zacznij od ognia. Dochód z jednej kopalni odblokowuje następny żywioł.</p></div>
      <MineWallets state={state} />
    </header>
    <div className="element-mine-map">
      {spiritMine.mines.map((mine, index) => {
        const meta = META[mine.element];
        const unlock = getMineUnlock(mine.element);
        const previousMeta = unlock ? META[unlock.currencyElement] : null;
        const canUnlock = canUnlockElementMine(spiritMine, mine.element);
        const unlockBalance = unlock ? state.currencies[unlock.currencyKey] || 0 : 0;
        const warehouseCapacity = getMineWarehouseCapacity(mine.warehouseLevel);
        const warehouseFill = Math.min(100, warehouseCapacity > 0 ? mine.warehouseStored / warehouseCapacity * 100 : 0);
        return <article key={mine.element} className={`element-mine-card element-mine-card--${mine.element} ${mine.unlocked ? 'is-unlocked' : 'is-locked'}`}>
          <div className="element-mine-card-order">KOPALNIA 0{index + 1}</div>
          <div className="element-mine-card-icon" aria-hidden="true">{mine.unlocked ? meta.icon : '🔒'}</div>
          <h3>{meta.name}</h3>
          {mine.unlocked ? <>
            <p>{mine.floors.length} {mine.floors.length === 1 ? 'piętro' : 'pięter'} · Winda Lv {mine.elevatorLevel} · Magazyn Lv {mine.warehouseLevel}</p>
            <div className="mine-storage"><span style={{ width: `${warehouseFill}%` }} /><small>Magazyn: {formatCompact(mine.warehouseStored, 1)} / {formatNumber(warehouseCapacity)} {meta.icon}</small></div>
            <button type="button" onClick={() => onEnterMine(mine.element)}>Wejdź do kopalni →</button>
          </> : canUnlock ? <>
            <p>Odblokuj nową kopalnię monetami zarobionymi w Kopalni {previousMeta.shortName}.</p>
            <MinePurchaseButton balance={unlockBalance} cost={unlock.cost} icon={previousMeta.icon} label="Odblokuj kopalnię" onClick={() => onUnlockMine(mine.element)} />
          </> : <p>Najpierw odblokuj poprzednią kopalnię.</p>}
        </article>;
      })}
    </div>
  </>;
}

function ElevatorVisual({ mine, animations }) {
  const [routeIndex, setRouteIndex] = useState(0);
  const route = useMemo(() => [0, ...mine.floors.map((floor) => floor.id), 0], [mine.floors]);
  const cycleSeconds = getMineElevatorCycleSeconds(mine.elevatorLevel);

  useEffect(() => {
    setRouteIndex(0);
  }, [mine.element, mine.floors.length]);

  useEffect(() => {
    if (!animations || route.length <= 1) return undefined;
    const timer = window.setInterval(() => setRouteIndex((current) => (current + 1) % route.length), Math.max(900, cycleSeconds * 1000));
    return () => window.clearInterval(timer);
  }, [animations, cycleSeconds, route.length]);

  const stop = route[routeIndex] || 0;
  const top = stop === 0 ? 3 : 12 + (stop - 1) * (80 / Math.max(1, mine.floors.length));
  return <aside className={`element-elevator ${animations ? '' : 'is-paused'}`} aria-label={`Winda kopalni ${META[mine.element].shortName}`}>
    <div className="element-elevator-head"><strong>WINDA</strong><span>Lv {mine.elevatorLevel}</span></div>
    <div className="element-elevator-rail">
      <i className="element-elevator-stop is-warehouse" style={{ top: '3%' }}>MAG.</i>
      {mine.floors.map((floor, index) => <i key={floor.id} className="element-elevator-stop" style={{ top: `${12 + index * (80 / Math.max(1, mine.floors.length))}%` }}>P{floor.floor}</i>)}
      <span className="element-elevator-cable" />
      <div className="element-elevator-cab" style={{ top: `${top}%`, '--cab-travel-time': `${Math.max(0.45, cycleSeconds * 0.55)}s` }}><b>{META[mine.element].icon}</b><small>{stop === 0 ? 'ROZŁADUNEK' : `PIĘTRO ${stop}`}</small></div>
    </div>
  </aside>;
}

function MineFloor({ mine, floor, balance, animations, onUpgradeFloor }) {
  const meta = META[mine.element];
  const workers = getMineWorkerCount(floor.level);
  const rate = getMineFloorRate(floor, mine);
  const capacity = getMineFloorChestCapacity(floor);
  const fill = Math.min(100, capacity > 0 ? floor.chestStored / capacity * 100 : 0);
  const cost = getMineFloorUpgradeCost(floor);
  return <article className={`element-mine-floor element-mine-floor--${mine.element}`}>
    <div className="element-mine-floor-number"><small>PIĘTRO</small><strong>{String(floor.floor).padStart(2, '0')}</strong></div>
    <div className={`element-mine-worksite ${animations ? '' : 'is-paused'}`} aria-label={`${workers} pracowników na piętrze ${floor.floor}`}>
      <div className="element-mine-chest"><span>📦</span><small>SKRZYNKA</small><b>{formatCompact(floor.chestStored, 1)}</b></div>
      <div className="element-mine-track" />
      {Array.from({ length: workers }, (_, worker) => <span key={worker} className="element-mine-worker" style={{ '--worker-delay': `${worker * -1.35}s`, '--worker-row': worker }}>🦊</span>)}
      <div className="element-mine-face"><span>{meta.icon}</span><small>KOPANIE</small></div>
    </div>
    <div className="element-mine-floor-info"><span><strong>Szyb Lv {floor.level}/100</strong><small>{workers} {workers === 1 ? 'pracownik' : 'pracowników'} · {formatCompact(rate, 2)} {meta.icon}/s</small></span><b>Skrzynka {formatCompact(floor.chestStored, 1)} / {formatNumber(capacity)}</b></div>
    <div className="mine-storage"><span style={{ width: `${fill}%` }} /><small>{fill >= 99.9 ? 'SKRZYNKA PEŁNA — pracownicy czekają' : 'Urobek czeka na windę'}</small></div>
    <MinePurchaseButton balance={balance} cost={cost} icon={meta.icon} label={floor.level >= 100 ? 'Szyb Lv 100/100' : 'Ulepsz szyb'} max={floor.level >= 100} onClick={() => onUpgradeFloor(mine.element, floor.id)} />
  </article>;
}

function MineInterior({ state, mine, onBack, onCollect, onUpgradeFloor, onUnlockFloor, onUpgradeElevator, onUpgradeWarehouse }) {
  const meta = META[mine.element];
  const currencyKey = SPIRIT_MINE_CURRENCY_KEYS[mine.element];
  const balance = state.currencies[currencyKey] || 0;
  const warehouseCapacity = getMineWarehouseCapacity(mine.warehouseLevel);
  const warehouseFill = Math.min(100, warehouseCapacity > 0 ? mine.warehouseStored / warehouseCapacity * 100 : 0);
  const collectable = Math.floor(Math.max(0, mine.warehouseStored || 0));
  const elevatorCost = getMineFacilityCost(mine.elevatorLevel, 'elevator');
  const warehouseCost = getMineFacilityCost(mine.warehouseLevel, 'warehouse');
  const nextFloor = getMineNextFloor(mine);
  const pending = getMinePendingTotal(mine);
  const warehouseFull = warehouseFill >= 99.999;
  return <>
    <header className={`mine-interior-header mine-interior-header--${mine.element}`}>
      <button type="button" className="mine-back-button" onClick={onBack}>← Mapa kopalń</button>
      <div><small>KOPALNIA ŻYWIOŁOWA</small><h2>{meta.icon} {meta.name}</h2><p>Pracownicy kopią i zanoszą urobek do skrzynek. Winda zbiera go z pięter i wozi do magazynu.</p></div>
      <MineWallets state={state} />
    </header>

    <div className={`element-mine-management element-mine-management--${mine.element}`}>
      <section className={`element-warehouse ${warehouseFull ? 'is-full' : ''}`}><div><small>MAGAZYN NA POWIERZCHNI · LV {mine.warehouseLevel}</small><strong>{formatCompact(mine.warehouseStored, 1)} / {formatNumber(warehouseCapacity)} {meta.icon}</strong><span>{warehouseFull ? 'PEŁNY — winda czeka na odbiór' : `Wolne miejsce: ${formatCompact(warehouseCapacity - mine.warehouseStored, 1)}`}</span></div><div className="mine-storage"><span style={{ width: `${warehouseFill}%` }} /></div><div className="element-facility-actions"><button type="button" disabled={collectable <= 0} onClick={() => onCollect(mine.element)}>Odbierz +{formatNumber(collectable)} {meta.icon}</button><MinePurchaseButton balance={balance} cost={warehouseCost} icon={meta.icon} label={mine.warehouseLevel >= 100 ? 'Magazyn Lv 100/100' : 'Ulepsz magazyn'} max={mine.warehouseLevel >= 100} onClick={() => onUpgradeWarehouse(mine.element)} /></div></section>
      <section className="element-elevator-stats"><small>TRANSPORT WINDY · LV {mine.elevatorLevel}</small><div><span>Ładunek na kurs<strong>{formatNumber(getMineElevatorLoad(mine.elevatorLevel))} {meta.icon}</strong></span><span>Czas przejazdu<strong>{getMineElevatorCycleSeconds(mine.elevatorLevel).toFixed(1)} s</strong></span><span>Przepustowość<strong>{formatCompact(getMineElevatorThroughput(mine.elevatorLevel), 2)} {meta.icon}/s</strong></span><span>Czeka w skrzynkach<strong>{formatCompact(pending, 1)} {meta.icon}</strong></span></div><MinePurchaseButton balance={balance} cost={elevatorCost} icon={meta.icon} label={mine.elevatorLevel >= 100 ? 'Winda Lv 100/100' : 'Ulepsz windę'} max={mine.elevatorLevel >= 100} onClick={() => onUpgradeElevator(mine.element)} /></section>
    </div>

    <div className={`element-mine-interior element-mine-interior--${mine.element}`}>
      <ElevatorVisual mine={mine} animations={state.settings.animations} />
      <div className="element-mine-floors">
        {mine.floors.map((floor) => <MineFloor key={floor.id} mine={mine} floor={floor} balance={balance} animations={state.settings.animations} onUpgradeFloor={onUpgradeFloor} />)}
        {nextFloor && <MinePurchaseButton balance={balance} cost={nextFloor.cost} icon={meta.icon} label={`Otwórz piętro ${nextFloor.floor}`} className="element-mine-new-floor" onClick={() => onUnlockFloor(mine.element)} />}
      </div>
    </div>
  </>;
}

export default function SpiritMineRealm({ state, onCollect, onUpgradeFloor, onUnlockMine, onUnlockFloor, onUpgradeElevator, onUpgradeWarehouse }) {
  const spiritMine = state.realms.spiritMine;
  const [selectedElement, setSelectedElement] = useState(null);
  const selectedMine = spiritMine.mines.find((mine) => mine.element === selectedElement && mine.unlocked) || null;

  useEffect(() => {
    if (selectedElement && !selectedMine) setSelectedElement(null);
  }, [selectedElement, selectedMine]);

  return <section className="spirit-mine" aria-label="Kopalnie żywiołów">
    {selectedMine
      ? <MineInterior state={state} mine={selectedMine} onBack={() => setSelectedElement(null)} onCollect={onCollect} onUpgradeFloor={onUpgradeFloor} onUnlockFloor={onUnlockFloor} onUpgradeElevator={onUpgradeElevator} onUpgradeWarehouse={onUpgradeWarehouse} />
      : <MineMap state={state} spiritMine={spiritMine} onEnterMine={setSelectedElement} onUnlockMine={onUnlockMine} />}
  </section>;
}
