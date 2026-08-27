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

export default function SpiritMineRealm({ state, onCollect, onUpgradeShaft, onHireMiner, onUnlockRoom, onUpgradeElevator, onUpgradeWarehouse }) {
  const mine = state.realms.spiritMine;
  const essence = state.currencies.essence || 0;
  const collected = getMineCollectableByElement(mine);
  const storedTotal = getMineStoredTotal(mine);
  const nextRoom = getMineNextRoom(mine);
  const elevatorDuration = Math.max(2.2, 7.5 - (mine.elevatorLevel - 1) * 0.32);

  return (
    <section className="spirit-mine" aria-label="Kopalnia Duchów">
      <header className="spirit-mine-header">
        <div><small>KRÓLESTWO POD ZIEMIĄ</small><h2>Kopalnia Duchów</h2><p>Zacznij od Ognia i odblokuj do {SPIRIT_MINE_MAX_ROOMS} kopalni. Lisy pracują także po zminimalizowaniu gry.</p></div>
        <div className="spirit-mine-wallets">
          <div className="spirit-mine-wallet spirit-mine-wallet--essence"><span>Esencja Hydry</span><strong>◈ {formatNumber(essence)}</strong></div>
          {Object.entries(META).map(([element, meta]) => <div key={element} className={`spirit-mine-wallet spirit-mine-wallet--${element}`}><span>{meta.coinName}</span><strong>{meta.icon} {formatNumber(state.currencies[SPIRIT_MINE_CURRENCY_KEYS[element]] || 0)}</strong></div>)}
        </div>
      </header>

      <div className="spirit-mine-facilities">
        <div><span>Winda Lv {mine.elevatorLevel}</span><small>Jeździ szybciej i daje +18% produkcji / poziom</small><button type="button" disabled={essence < getMineFacilityCost(mine.elevatorLevel)} onClick={onUpgradeElevator}>Ulepsz · {formatNumber(getMineFacilityCost(mine.elevatorLevel))} ◈</button></div>
        <button type="button" className="mine-collect-all" disabled={storedTotal <= 0} onClick={onCollect}><span>Odbierz urobek</span><strong>+{formatNumber(storedTotal)} monet</strong><small>🔥 {formatNumber(collected.fire)} · ⚡ {formatNumber(collected.electric)} · 💧 {formatNumber(collected.water)}</small></button>
        <div><span>Magazyn Lv {mine.warehouseLevel}</span><small>+50% pojemności / poziom</small><button type="button" disabled={essence < getMineFacilityCost(mine.warehouseLevel)} onClick={onUpgradeWarehouse}>Ulepsz · {formatNumber(getMineFacilityCost(mine.warehouseLevel))} ◈</button></div>
      </div>

      <div className="spirit-mine-operation">
        <aside className={`mine-elevator ${state.settings.animations ? '' : 'is-paused'}`} style={{ '--elevator-duration': `${elevatorDuration}s` }} aria-label={`Winda poziom ${mine.elevatorLevel}, obsługuje ${mine.shafts.length} ${mine.shafts.length === 1 ? 'kopalnię' : 'kopalnie'}`}>
          <div className="mine-elevator-title"><strong>WINDA</strong><span>Lv {mine.elevatorLevel}</span></div>
          <div className="mine-elevator-rail">
            {mine.shafts.map((shaft) => <i key={shaft.id} style={{ '--floor-position': `${mine.shafts.length === 1 ? 50 : ((shaft.room - 1) / (mine.shafts.length - 1)) * 100}%` }}>{shaft.room}</i>)}
            <div className="mine-elevator-cable" />
            <div className="mine-elevator-cab"><span>🦊</span><small>UROBEK</small></div>
          </div>
        </aside>

        <div className="spirit-mine-shafts">
          {mine.shafts.map((shaft, index) => {
            const meta = META[shaft.element];
            const currencyKey = SPIRIT_MINE_CURRENCY_KEYS[shaft.element];
            const balance = state.currencies[currencyKey] || 0;
            const capacity = getMineShaftCapacity(shaft, mine);
            const fill = Math.min(100, (shaft.stored / capacity) * 100);
            const upgradeCost = getMineShaftUpgradeCost(shaft);
            const minerCost = getMineMinerCost(shaft);
            return (
              <article key={shaft.id} className={`mine-shaft mine-shaft--${shaft.element}`} style={{ '--shaft-depth': index }}>
                <div className="mine-room-number"><small>POKÓJ</small><strong>{String(shaft.room).padStart(2, '0')}</strong></div>
                <div className="mine-shaft-scene" aria-hidden="true"><span className="mine-element-orb">{meta.icon}</span>{Array.from({ length: Math.min(shaft.miners, 5) }, (_, miner) => <i key={miner} style={{ '--miner-delay': `${miner * -0.45}s` }}>🦊</i>)}</div>
                <div className="mine-shaft-info">
                  <span><strong>{meta.name}</strong><small>Poziom {shaft.level} · {shaft.miners} {shaft.miners === 1 ? 'górnik' : 'górników'} · bonus głębokości +{index * 12}%</small></span>
                  <b>{formatCompact(getMineShaftRate(shaft, mine), 2)} {meta.icon}/s</b>
                </div>
                <div className="mine-storage"><span style={{ width: `${fill}%` }} /><small>{formatCompact(shaft.stored, 1)} / {formatNumber(capacity)} {meta.icon}</small></div>
                <div className="mine-shaft-actions">
                  <button type="button" disabled={balance < upgradeCost} onClick={() => onUpgradeShaft(shaft.id)}>Pogłęb · {formatNumber(upgradeCost)} {meta.icon}</button>
                  <button type="button" disabled={balance < minerCost} onClick={() => onHireMiner(shaft.id)}>Zatrudnij lisa · {formatNumber(minerCost)} {meta.icon}</button>
                </div>
              </article>
            );
          })}

          {nextRoom ? (
            <article className={`mine-next-room mine-shaft--${nextRoom.element}`}>
              <div><small>NASTĘPNY POKÓJ · {String(nextRoom.room).padStart(2, '0')}</small><strong>{META[nextRoom.element].icon} {META[nextRoom.element].name}</strong><p>Rozbuduj podziemia. Nowa kopalnia zacznie wytwarzać własne {META[nextRoom.element].coinName.toLowerCase()}.</p></div>
              <button type="button" disabled={(state.currencies[nextRoom.currencyKey] || 0) < nextRoom.cost} onClick={onUnlockRoom}>Kup pokój · {formatNumber(nextRoom.cost)} {META[nextRoom.currencyElement].icon}</button>
            </article>
          ) : (
            <div className="mine-max-rooms"><strong>MAKSYMALNA GŁĘBOKOŚĆ</strong><span>Wszystkie {SPIRIT_MINE_MAX_ROOMS} kopalni zostały odblokowane.</span></div>
          )}
        </div>
      </div>
    </section>
  );
}
