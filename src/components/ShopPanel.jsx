import {
  LOGIN_MONTHLY_STEP,
  LOGIN_REWARD_VALUES,
  LOGIN_STREAK_DAYS,
  UPGRADE_DEFS
} from '../game/constants';
import { getBasePurchaseTier, getFoxLimit, getUpgradeCost } from '../game/economy';
import { formatNumber } from '../game/format';
import { formatCountdown, getTodayLoginRewardInfo } from '../game/quests';
import {
  FaCalendarAlt,
  FaCoins,
  FaGift,
  FaHandPointer,
  FaLayerGroup,
  FaPaw,
  FaPercent,
  FaRedo,
  FaStore,
  FaTasks
} from 'react-icons/fa';

const TABS = ['Ulepszenia', 'Rebirth', 'Zadania'];
const TAB_ICONS = {
  Ulepszenia: FaLayerGroup,
  Rebirth: FaRedo,
  Zadania: FaTasks
};
const UPGRADE_ICONS = {
  basePurchaseTier: FaLayerGroup,
  passiveIncome: FaPercent,
  buyDiscount: FaPercent,
  clickBonus: FaHandPointer,
  foxLimit: FaPaw
};

function getLoginTypeLabel(type) {
  if (type === 'legendary') {
    return 'Legendary';
  }
  if (type === 'epic') {
    return 'Epic';
  }
  return 'Common';
}

export default function ShopPanel({
  activeTab,
  onChangeTab,
  state,
  dailyResetInSeconds,
  weeklyResetInSeconds,
  rebirthPreview,
  onBuyUpgrade,
  onRebirth,
  onClaimQuest,
  onClaimWeekly,
  onClaimLoginReward
}) {
  const loginInfo = getTodayLoginRewardInfo(state);

  return (
    <aside className="panel flex h-full w-full min-h-0 max-w-sm min-w-[320px] flex-col">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-300">
        <FaStore />
        Sklep
      </h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`shop-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onChangeTab(tab)}
          >
            {(() => {
              const Icon = TAB_ICONS[tab];
              return <Icon className="mr-2 inline-block" />;
            })()}
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
              const UpgradeIcon = UPGRADE_ICONS[upgrade.id] || FaLayerGroup;
              const currentValues = {
                basePurchaseTier: `Aktualny bazowy tier zakupu: ${baseTier}`,
                passiveIncome: `Aktualny income: ${100 + (state.upgrades.passiveIncome || 0) * 5}%`,
                buyDiscount: `Aktualna zniżka: ${(state.upgrades.buyDiscount || 0) * 2}%`,
                clickBonus: `Aktualna wartość kliknięć: ${100 + (state.upgrades.clickBonus || 0) * 5}%`,
                foxLimit: `Aktualny limit lisów: ${getFoxLimit(state)}`
              };
              return (
                <div key={upgrade.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
                        <UpgradeIcon />
                        {upgrade.title}
                      </p>
                      <p className="text-xs text-slate-400">{upgrade.description}</p>
                      <p className="mt-1 text-xs text-amber-200">{currentValues[upgrade.id]}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      Lv {level}/{upgrade.cap}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs text-slate-300">
                      <FaCoins />
                      Koszt: {formatNumber(cost)} monet
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
              <p className="flex items-center gap-2 font-semibold text-indigo-200">
                <FaRedo />
                Rebirth resetuje planszę i monetowe ulepszenia.
              </p>
              <p className="mt-1 text-xs text-slate-300">Zachowujesz Diamenty, Rebirth Tokens i statystyki lifetime.</p>
            </div>

            <p className="text-slate-300">Wymaganie: min. 1 Mega Fox na planszy.</p>
            <p className="font-bold text-amber-200">Liczba tokenów które otrzymasz: {rebirthPreview}</p>

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
              Zrób Rebirth
            </button>
          </div>
        )}

        {activeTab === 'Zadania' && (
          <div className="space-y-4 pb-2 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="flex items-center gap-2 font-bold text-amber-200">
                <FaGift />
                Nagrody za dzienne logowanie
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {Array.from({ length: LOGIN_STREAK_DAYS }, (_, idx) => {
                  const dayNumber = idx + 1;
                  const isEpicDay = dayNumber === LOGIN_STREAK_DAYS;
                  const isClaimed = dayNumber <= state.quests.loginRewards.streakDay;
                  return (
                    <div
                      key={dayNumber}
                      className={`rounded border px-1 py-2 text-center text-[10px] font-bold ${
                        isEpicDay
                          ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                          : 'border-slate-600 bg-slate-900/70 text-slate-300'
                      } ${isClaimed ? 'ring-1 ring-amber-300' : ''}`}
                    >
                      D{dayNumber}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-300">
                Dzisiaj: +{loginInfo.amount} diamentów
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Miesięczny bonus Legendary co {LOGIN_MONTHLY_STEP} odebrań: {loginInfo.monthlyProgress}/{loginInfo.monthlyTarget}
              </p>
              <button
                type="button"
                className="mt-2 rounded bg-amber-500 px-2 py-1 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                disabled={!loginInfo.canClaim}
                onClick={onClaimLoginReward}
              >
                {loginInfo.canClaim ? `Odbierz +${loginInfo.amount}` : 'Odebrano'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="flex items-center gap-2 font-bold text-amber-200">
                <FaTasks />
                Zadania dzienne
                <span className="ml-auto text-xs font-medium text-slate-300">Reset: {formatCountdown(dailyResetInSeconds)}</span>
              </p>
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
                        {quest.claimed ? 'Odebrane' : `Odbierz (+${quest.reward} diamentów)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="flex items-center gap-2 font-bold text-cyan-200">
                <FaCalendarAlt />
                Zadania tygodniowe
                <span className="ml-auto text-xs font-medium text-slate-300">Reset: {formatCountdown(weeklyResetInSeconds)}</span>
              </p>
              <div className="mt-2 grid gap-2">
                {state.quests.weekly.map((quest) => {
                  const done = quest.progress >= quest.target;
                  return (
                    <div key={quest.id} className="rounded-lg border border-slate-700 bg-slate-900/80 p-2">
                      <p className="text-xs text-slate-200">{quest.label}</p>
                      <p className="text-xs text-slate-400">
                        {formatNumber(quest.progress)}/{formatNumber(quest.target)}
                      </p>
                      <button
                        type="button"
                        className="mt-1 rounded bg-cyan-500 px-2 py-1 text-xs font-bold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                        disabled={!done || quest.claimed}
                        onClick={() => onClaimWeekly(quest.id)}
                      >
                        {quest.claimed ? 'Odebrane' : `Odbierz (+${quest.reward} diamentów)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
