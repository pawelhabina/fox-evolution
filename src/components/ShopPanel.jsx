import { UPGRADE_DEFS } from '../game/constants';
import { getBasePurchaseTier, getUpgradeCost } from '../game/economy';
import { formatNumber } from '../game/format';

const TABS = ['Ulepszenia', 'Rebirth', 'Ustawienia'];

export default function ShopPanel({
  activeTab,
  onChangeTab,
  state,
  rebirthPreview,
  onBuyUpgrade,
  onRebirth,
  onToggleSetting,
  onClaimQuest,
  onClaimWeekly,
  onHardReset,
  gameVersion
}) {
  return (
    <aside className="panel flex h-full w-full min-h-0 max-w-sm min-w-[320px] flex-col">
      <h2 className="mb-3 text-lg font-black text-amber-300">Sklep</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`shop-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onChangeTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {activeTab === 'Ulepszenia' && (
          <div className="space-y-2">
            {Object.values(UPGRADE_DEFS).map((upgrade) => {
              const level = state.upgrades[upgrade.id] || 0;
              const cost = getUpgradeCost(upgrade.id, level);
              const canBuy = level < upgrade.cap && state.currencies[upgrade.currency] >= cost;
              const baseTier = getBasePurchaseTier(state);
              return (
                <div key={upgrade.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{upgrade.title}</p>
                      <p className="text-xs text-slate-400">{upgrade.description}</p>
                      {upgrade.id === 'basePurchaseTier' && (
                        <p className="mt-1 text-xs text-amber-200">Aktualny base tier zakupu: {baseTier}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Lv {level}/{upgrade.cap}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      Koszt: {formatNumber(cost)} {upgrade.currency === 'coins' ? 'coins' : 'gems'}
                    </p>
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-600"
                      onClick={() => onBuyUpgrade(upgrade.id)}
                      disabled={!canBuy}
                    >
                      Kup
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'Rebirth' && (
          <div className="space-y-3 text-sm">
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-3">
              <p className="font-semibold text-indigo-200">Rebirth resetuje planszę i coinowe upgrady.</p>
              <p className="mt-1 text-xs text-slate-300">Zachowujesz Gems, Rebirth Tokens, statystyki lifetime i Gem Drop Bonus.</p>
            </div>

            <p className="text-slate-300">Wymaganie: min. 1 Mega Fox na planszy.</p>
            <p className="font-bold text-amber-200">Dostaniesz: {rebirthPreview} tokens</p>

            <button
              type="button"
              className="w-full rounded-xl bg-indigo-500 px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-600"
              disabled={rebirthPreview <= 0}
              onClick={() => {
                const confirmed = window.confirm('Wykonać Rebirth? Plansza zostanie zresetowana.');
                if (confirmed) {
                  onRebirth();
                }
              }}
            >
              Wykonaj Rebirth
            </button>
          </div>
        )}

        {activeTab === 'Ustawienia' && (
          <div className="space-y-4 pb-2 text-sm">
            <div className="grid gap-2">
              <button type="button" className="rounded-lg bg-slate-700 px-3 py-2 text-left" onClick={() => onToggleSetting('sound')}>
                Sound: {state.settings.sound ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-700 px-3 py-2 text-left"
                onClick={() => onToggleSetting('animations')}
              >
                Animations: {state.settings.animations ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="font-bold text-amber-200">Questy dzienne</p>
              <div className="mt-2 grid gap-2">
                {state.quests.daily.map((quest) => {
                  const done = quest.progress >= quest.target;
                  return (
                    <div key={quest.id} className="rounded-lg border border-slate-700 bg-slate-900/80 p-2">
                      <p className="text-xs text-slate-200">{quest.label}</p>
                      <p className="text-xs text-slate-400">
                        {formatNumber(quest.progress)}/{formatNumber(quest.target)}
                      </p>
                      <button
                        type="button"
                        className="mt-1 rounded bg-fuchsia-500 px-2 py-1 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                        disabled={!done || quest.claimed}
                        onClick={() => onClaimQuest(quest.id)}
                      >
                        {quest.claimed ? 'Odebrane' : 'Odbierz (+1 gem)'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-2">
                <p className="text-xs text-slate-300">Weekly bonus: +{state.quests.weekly.reward} gems</p>
                <button
                  type="button"
                  className="mt-1 rounded bg-cyan-500 px-2 py-1 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  disabled={state.quests.weekly.claimed}
                  onClick={onClaimWeekly}
                >
                  {state.quests.weekly.claimed ? 'Odebrane w tym tygodniu' : 'Odbierz weekly bonus'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
              <button
                type="button"
                className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold"
                onClick={() => {
                  const confirmed = window.confirm('Hard reset usunie cały zapis. Kontynuować?');
                  if (confirmed) {
                    onHardReset();
                  }
                }}
              >
                Hard reset
              </button>
            </div>

            <p className="text-xs text-slate-500">Wersja gry: {gameVersion}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
