import { formatCompact, formatNumber } from '../game/format';
import {
  getMineFacilityCost,
  getMineMinerCost,
  getMineShaftCapacity,
  getMineShaftRate,
  getMineShaftUpgradeCost,
  getMineStoredTotal
} from '../game/spiritMine';

const META = {
  fire: { name: 'Szyb Magmy', icon: '🔥' },
  electric: { name: 'Szyb Burzy', icon: '⚡' },
  water: { name: 'Szyb Głębin', icon: '💧' }
};

export default function SpiritMineRealm({ state, onCollect, onUpgradeShaft, onHireMiner, onUpgradeElevator, onUpgradeWarehouse }) {
  const mine = state.realms.spiritMine;
  const essence = state.currencies.essence || 0;
  const storedTotal = getMineStoredTotal(mine);

  return (
    <section className="spirit-mine" aria-label="Kopalnia Duchów">
      <header className="spirit-mine-header">
        <div><small>NOWA KRAINA LISÓW</small><h2>Kopalnia Duchów</h2><p>Lisy pracują automatycznie — również gdy okno jest zminimalizowane.</p></div>
        <div className="spirit-mine-wallet"><span>Esencja Hydry</span><strong>◈ {formatNumber(essence)}</strong></div>
      </header>

      <div className="spirit-mine-facilities">
        <div><span>Winda Lv {mine.elevatorLevel}</span><small>+18% produkcji / poziom</small><button type="button" disabled={essence < getMineFacilityCost(mine.elevatorLevel)} onClick={onUpgradeElevator}>Ulepsz · {formatNumber(getMineFacilityCost(mine.elevatorLevel))} ◈</button></div>
        <button type="button" className="mine-collect-all" disabled={storedTotal <= 0} onClick={onCollect}><span>Odbierz z magazynu</span><strong>+{formatNumber(storedTotal)} ◈</strong></button>
        <div><span>Magazyn Lv {mine.warehouseLevel}</span><small>+50% pojemności / poziom</small><button type="button" disabled={essence < getMineFacilityCost(mine.warehouseLevel)} onClick={onUpgradeWarehouse}>Ulepsz · {formatNumber(getMineFacilityCost(mine.warehouseLevel))} ◈</button></div>
      </div>

      <div className="spirit-mine-shafts">
        {mine.shafts.map((shaft, index) => {
          const meta = META[shaft.element];
          const capacity = getMineShaftCapacity(shaft, mine);
          const fill = Math.min(100, (shaft.stored / capacity) * 100);
          const upgradeCost = getMineShaftUpgradeCost(shaft);
          const minerCost = getMineMinerCost(shaft);
          return (
            <article key={shaft.element} className={`mine-shaft mine-shaft--${shaft.element}`} style={{ '--shaft-depth': index }}>
              <div className="mine-shaft-scene" aria-hidden="true"><span className="mine-element-orb">{meta.icon}</span>{Array.from({ length: Math.min(shaft.miners, 5) }, (_, miner) => <i key={miner} style={{ '--miner-delay': `${miner * -0.45}s` }}>🦊</i>)}</div>
              <div className="mine-shaft-info">
                <span><strong>{meta.name}</strong><small>Poziom {shaft.level} · {shaft.miners} górników</small></span>
                <b>{formatCompact(getMineShaftRate(shaft, mine), 2)} ◈/s</b>
              </div>
              <div className="mine-storage"><span style={{ width: `${fill}%` }} /><small>{formatCompact(shaft.stored, 1)} / {formatNumber(capacity)}</small></div>
              <div className="mine-shaft-actions">
                <button type="button" disabled={essence < upgradeCost} onClick={() => onUpgradeShaft(shaft.element)}>Pogłęb szyb · {formatNumber(upgradeCost)} ◈</button>
                <button type="button" disabled={essence < minerCost} onClick={() => onHireMiner(shaft.element)}>Zatrudnij lisa · {formatNumber(minerCost)} ◈</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
