import {
  LOGIN_MONTHLY_STEP,
  LOGIN_STREAK_DAYS,
  UPGRADE_DEFS
} from '../game/constants';
import {
  getBasePurchaseTier,
  getFoxLimit,
  getGemDropRate,
  getGemIncomeMultiplier,
  getHigherTierChance,
  getTickDurationSeconds,
  getUpgradeCost
} from '../game/economy';
import { formatCompact, formatNumber, formatPercent } from '../game/format';
import { formatCountdown, getTodayLoginRewardInfo } from '../game/quests';
import { FaCalendarAlt } from 'react-icons/fa';
import GuiIcon from './GuiIcon';

const TABS = ['Ulepszenia', 'Rebirth', 'Zadania'];
const TAB_ICONS = {
  Ulepszenia: 'upgrade',
  Rebirth: 'rebirth',
  Zadania: 'quest'
};
const UPGRADE_ICONS = {
  basePurchaseTier: 'chestT1',
  passiveIncome: 'energy',
  buyDiscount: 'priceDown1',
  clickBonus: 'foxUpgrade',
  foxLimit: 'pet',
  gemIncomeMultiplier: 'diamondUpgrade',
  gemFoxLimit: 'pet',
  tickSpeed: 'time',
  purchaseTierChance: 'random',
  gemDropRate: 'diamond'
};

function getUpgradeGroups() {
  const upgrades = Object.values(UPGRADE_DEFS);
  return {
    coins: upgrades.filter((upgrade) => upgrade.shop === 'coins'),
    gems: upgrades.filter((upgrade) => upgrade.shop === 'gems'),
    rebirth: upgrades.filter((upgrade) => upgrade.shop === 'rebirth')
  };
}

function getCurrentUpgradeValue(state, upgradeId) {
  switch (upgradeId) {
    case 'basePurchaseTier':
      return `Aktualny bazowy tier zakupu: ${getBasePurchaseTier(state)}`;
    case 'passiveIncome':
      return `Aktualny mnożnik pasywnego income: ${formatCompact(getGemIncomeMultiplier(state) * (1 + (state.upgrades.passiveIncome || 0) * 0.05) * (1 + (state.currencies.rebirthTokens || 0) * 0.025), 2)}x`;
    case 'buyDiscount':
      return `Aktualna zniżka: ${(state.upgrades.buyDiscount || 0) * 2}%`;
    case 'clickBonus':
      return `Aktualny mnożnik kliknięć: ${formatCompact((1 + (state.upgrades.clickBonus || 0) * 0.05) * getGemIncomeMultiplier(state), 2)}x`;
    case 'foxLimit':
      return `Sloty z coinów: ${state.upgrades.foxLimit || 0} | Limit łącznie: ${getFoxLimit(state)}`;
    case 'gemIncomeMultiplier':
      return `Aktualny mnożnik zarobków: ${formatCompact(getGemIncomeMultiplier(state), 1)}x`;
    case 'gemFoxLimit':
      return `Sloty z diamentów: ${state.upgrades.gemFoxLimit || 0}/50 | Limit łącznie: ${getFoxLimit(state)}`;
    case 'tickSpeed':
      return `Aktualny tick: ${formatCompact(getTickDurationSeconds(state), 1)}s`;
    case 'purchaseTierChance':
      return `Aktualna szansa: ${formatPercent(getHigherTierChance(state))}`;
    case 'gemDropRate':
      return `Aktualny drop rate: ${formatPercent(getGemDropRate(state))}`;
    default:
      return '';
  }
}

function UpgradeCard({ state, upgrade, onBuyUpgrade }) {
  const level = state.upgrades[upgrade.id] || 0;
  const cost = getUpgradeCost(upgrade.id, level);
  const cap = upgrade.cap;
  const capped = Number.isFinite(cap);
  const isMaxed = capped && level >= cap;
  const canBuy = (!capped || level < cap) && state.currencies[upgrade.currency] >= cost;
  const iconName = UPGRADE_ICONS[upgrade.id] || 'upgrade';
  const currencyLabel = upgrade.currency === 'coins' ? 'monet' : upgrade.currency === 'gems' ? 'diamentów' : 'rebirth points';
  const currencyIcon = upgrade.currency === 'coins' ? 'coin' : upgrade.currency === 'gems' ? 'diamond' : 'rebirth';

  return (
    <div key={upgrade.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <GuiIcon name={iconName} alt={upgrade.title} />
            {upgrade.title}
          </p>
          <p className="text-xs text-slate-400">{upgrade.description}</p>
          <p className="mt-1 text-xs text-amber-200">{getCurrentUpgradeValue(state, upgrade.id)}</p>
        </div>
        <p className="shrink-0 whitespace-nowrap text-xs text-slate-400">{capped ? `Lv ${level}/${cap}` : `Lv ${level}`}</p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs text-slate-300">
          <GuiIcon name={currencyIcon} alt={currencyLabel} />
          {isMaxed ? 'Osiągnięto maksymalny poziom' : `Koszt: ${formatNumber(cost)} ${currencyLabel}`}
        </p>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-bold disabled:cursor-not-allowed ${
            isMaxed ? 'bg-amber-500 text-slate-950 disabled:bg-amber-500' : 'bg-emerald-600 disabled:bg-slate-600'
          }`}
          onClick={() => onBuyUpgrade(upgrade.id)}
          disabled={!canBuy}
        >
          {isMaxed ? 'MAX' : 'Kup'}
        </button>
      </div>
    </div>
  );
}

function UpgradeSection({ title, iconName, accentClass, upgrades, state, onBuyUpgrade }) {
  return (
    <section className="space-y-2">
      <p className={`flex items-center gap-2 text-sm font-bold ${accentClass}`}>
        <GuiIcon name={iconName} alt={title} />
        {title}
      </p>
      {upgrades.map((upgrade) => (
        <UpgradeCard key={upgrade.id} state={state} upgrade={upgrade} onBuyUpgrade={onBuyUpgrade} />
      ))}
    </section>
  );
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
  const { coins, gems, rebirth } = getUpgradeGroups();

  return (
    <aside className="panel flex h-full w-full min-h-0 max-w-sm min-w-[320px] flex-col">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-300">
        <GuiIcon name="upgrade" alt="Sklep" size={18} />
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
            <GuiIcon name={TAB_ICONS[tab]} alt={tab} className="mr-2" />
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {activeTab === 'Ulepszenia' && (
          <div className="space-y-4 pb-2">
            <UpgradeSection title="Ulepszenia za monety" iconName="coin" accentClass="text-amber-200" upgrades={coins} state={state} onBuyUpgrade={onBuyUpgrade} />
            <UpgradeSection title="Sklep za diamenty" iconName="diamondUpgrade" accentClass="text-fuchsia-200" upgrades={gems} state={state} onBuyUpgrade={onBuyUpgrade} />
          </div>
        )}

        {activeTab === 'Rebirth' && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-3">
              <p className="flex items-center gap-2 font-semibold text-indigo-200">
                <GuiIcon name="rebirth" alt="Rebirth" />
                Rebirth resetuje planszę i monetowe ulepszenia.
              </p>
              <p className="mt-1 text-xs text-slate-300">Zachowujesz diamenty, rebirth tokens, sklepy premium i statystyki lifetime.</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="text-slate-300">Wymaganie: min. 1 Mega Fox na planszy.</p>
              <p className="mt-1 font-bold text-amber-200">Liczba tokenów które otrzymasz: {rebirthPreview}</p>

              <button
                type="button"
                className="mt-3 w-full rounded-xl bg-indigo-500 px-3 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-600"
                disabled={rebirthPreview <= 0}
                onClick={() => {
                  const confirmed = window.confirm('Wykonać Rebirth? Plansza i coinowe ulepszenia zostaną zresetowane.');
                  if (confirmed) {
                    onRebirth();
                  }
                }}
              >
                Zrób Rebirth
              </button>
            </div>

            <UpgradeSection title="Sklep za rebirth points" iconName="rebirth" accentClass="text-indigo-200" upgrades={rebirth} state={state} onBuyUpgrade={onBuyUpgrade} />
          </div>
        )}

        {activeTab === 'Zadania' && (
          <div className="space-y-4 pb-2 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
              <p className="flex items-center gap-2 font-bold text-amber-200">
                <GuiIcon name="diamond" alt="Nagrody logowania" />
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
              <p className="mt-2 text-xs text-slate-300">Dzisiaj: +{loginInfo.amount} diamentów</p>
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
                <GuiIcon name="quest" alt="Zadania dzienne" />
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
