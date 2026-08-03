import {
  getBuyFoxCost,
  getExpectedCoinsPerSecond,
  getFoxClickValue,
  getFoxLimit,
  getGemDropRate,
  getTickDurationSeconds
} from '../game/economy';
import { formatCompact, formatNumber, formatPercent } from '../game/format';
import { POKEDEX_ENTRY_COUNT } from '../game/progression.mjs';
import GuiIcon from './GuiIcon';

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (days > 0) return `${days} d ${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

function formatDate(value) {
  if (!value) return 'Brak danych';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Brak danych' : date.toLocaleString('pl-PL');
}

function numeric(value) {
  return Math.max(0, Number(value) || 0);
}

function StatSection({ title, icon, entries }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-amber-300">
        <GuiIcon name={icon} alt="" size={18} />
        {title}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.label} className="rounded-lg border border-slate-700/80 bg-slate-950/55 px-3 py-2">
            <span className="block text-[11px] uppercase tracking-wide text-slate-500">{entry.label}</span>
            <strong className={`mt-1 block break-words text-sm ${entry.tone || 'text-slate-100'}`}>{entry.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function StatisticsModal({ snapshot, onClose }) {
  if (!snapshot?.state) return null;

  const state = snapshot.state;
  const stats = state.stats || {};
  const foxes = Array.isArray(state.foxes) ? state.foxes : [];
  const upgrades = state.upgrades || {};
  const discoveries = Object.keys(state.pokedex?.discoveries || {}).length;
  const normalFoxes = foxes.filter((fox) => !fox.evolution).length;
  const elementalFoxes = foxes.length - normalFoxes;
  const currentHighestTier = foxes.reduce((max, fox) => Math.max(max, numeric(fox.tier)), 0);
  const averageTier = foxes.length ? foxes.reduce((sum, fox) => sum + numeric(fox.tier), 0) / foxes.length : 0;
  const totalClickPower = foxes.reduce((sum, fox) => sum + getFoxClickValue(fox, state), 0);
  const activeBoosts = Object.values(state.temporaryBoosts || {}).filter((untilTs) => Number(untilTs) > Date.now()).length;
  const totalUpgradeLevels = Object.values(upgrades).reduce((sum, level) => sum + numeric(level), 0);
  const dailyClaimed = (state.quests?.daily || []).filter((quest) => quest.claimed).length;
  const weeklyClaimed = (state.quests?.weekly || []).filter((quest) => quest.claimed).length;

  const sections = [
    {
      title: 'Save i progresja', icon: 'trophy', entries: [
        { label: 'Nazwa save’a', value: snapshot.name || 'Save' },
        { label: 'Czas aktywnej gry', value: formatDuration(stats.playTimeSeconds), tone: 'text-cyan-200' },
        { label: 'Utworzono', value: formatDate(state.meta?.createdAt) },
        { label: 'Ostatnia aktywność', value: formatDate(state.meta?.lastPlayedAt || snapshot.updatedAt) },
        { label: 'Najwyższy tier w historii', value: formatNumber(stats.highestTier || currentHighestTier), tone: 'text-amber-200' },
        { label: 'Najwyższy zwykły tier', value: formatNumber(stats.highestBaseTier || 0) },
        { label: 'Najwyższy żywiołowy tier', value: formatNumber(stats.highestElementalTier || 0) },
        { label: 'Rebirthy', value: formatNumber(stats.lifetimeRebirths) }
      ]
    },
    {
      title: 'Ekonomia monet', icon: 'coin', entries: [
        { label: 'Aktualne monety', value: formatNumber(state.currencies?.coins), tone: 'text-amber-200' },
        { label: 'Monety zarobione łącznie', value: formatNumber(stats.lifetimeCoinsEarned) },
        { label: 'Monety wydane łącznie', value: formatNumber(stats.lifetimeCoinsSpent) },
        { label: 'Bilans historyczny', value: formatNumber(numeric(stats.lifetimeCoinsEarned) - numeric(stats.lifetimeCoinsSpent)) },
        { label: 'Z kliknięć', value: formatNumber(stats.lifetimeCoinsFromClicks) },
        { label: 'Z pasywnego income', value: formatNumber(stats.lifetimeCoinsFromPassive) },
        { label: 'Ze sprzedaży lisów', value: formatNumber(stats.lifetimeCoinsFromSales) },
        { label: 'Z Instant Cash', value: formatNumber(stats.lifetimeCoinsFromInstantCash) },
        { label: 'Aktualny income / s', value: formatCompact(getExpectedCoinsPerSecond(state), 2), tone: 'text-emerald-200' },
        { label: 'Łączna moc kliknięcia planszy', value: formatNumber(totalClickPower) },
        { label: 'Koszt następnego lisa', value: formatNumber(getBuyFoxCost(state)) },
        { label: 'Długość ticka', value: `${formatCompact(getTickDurationSeconds(state), 1)} s` }
      ]
    },
    {
      title: 'Diamenty i Rebirth', icon: 'diamond', entries: [
        { label: 'Aktualne diamenty', value: formatNumber(state.currencies?.gems), tone: 'text-fuchsia-200' },
        { label: 'Diamenty zdobyte', value: formatNumber(stats.lifetimeGemsEarned) },
        { label: 'Diamenty wydane', value: formatNumber(stats.lifetimeGemsSpent) },
        { label: 'Diamenty z dropów', value: formatNumber(stats.lifetimeGemsFromDrops) },
        { label: 'Diamenty z zadań', value: formatNumber(stats.lifetimeGemsFromQuests) },
        { label: 'Diamenty z logowania', value: formatNumber(stats.lifetimeGemsFromLoginRewards) },
        { label: 'Dropy diamentów', value: formatNumber(stats.lifetimeGemDrops) },
        { label: 'Aktualna szansa dropu', value: formatPercent(getGemDropRate(state)) },
        { label: 'Aktualne Rebirth points', value: formatNumber(state.currencies?.rebirthTokens), tone: 'text-indigo-200' },
        { label: 'Rebirth points zdobyte', value: formatNumber(stats.lifetimeRebirthTokensEarned) },
        { label: 'Rebirth points wydane', value: formatNumber(stats.lifetimeRebirthTokensSpent) }
      ]
    },
    {
      title: 'Lisy i kolekcja', icon: 'pet', entries: [
        { label: 'Lisy na planszy', value: `${foxes.length}/${getFoxLimit(state)}`, tone: 'text-orange-200' },
        { label: 'Zwykłe lisy', value: formatNumber(normalFoxes) },
        { label: 'Lisy żywiołowe', value: formatNumber(elementalFoxes) },
        { label: 'Najwyższy tier na planszy', value: formatNumber(currentHighestTier) },
        { label: 'Średni tier na planszy', value: formatCompact(averageTier, 2) },
        { label: 'Odkrycia w Pokédexie', value: `${discoveries}/${POKEDEX_ENTRY_COUNT}`, tone: 'text-cyan-200' },
        { label: 'Kupione lisy', value: formatNumber(stats.lifetimeBuys) },
        { label: 'Sprzedane lisy', value: formatNumber(stats.lifetimeSells) },
        { label: 'Wykonane merge', value: formatNumber(stats.lifetimeMerges) },
        { label: 'Ewolucje żywiołowe', value: formatNumber(stats.lifetimeEvolutions) }
      ]
    },
    {
      title: 'Aktywność i rozwój', icon: 'upgrade', entries: [
        { label: 'Kliknięcia lisów', value: formatNumber(stats.lifetimeClicks) },
        { label: 'Liczba zakupów w bieżącym cyklu', value: formatNumber(state.purchaseCount) },
        { label: 'Kupione ulepszenia', value: formatNumber(stats.lifetimeUpgradesBought) },
        { label: 'Suma poziomów ulepszeń', value: formatNumber(totalUpgradeLevels) },
        { label: 'Kupione boosty czasowe', value: formatNumber(stats.lifetimeTemporaryBoostsBought) },
        { label: 'Aktywne boosty', value: formatNumber(activeBoosts) },
        { label: 'Zakupy Instant Cash', value: formatNumber(stats.lifetimeInstantCashBuys) },
        { label: 'Odebrane zadania dzienne', value: formatNumber(stats.lifetimeDailyQuestsClaimed) },
        { label: 'Odebrane zadania tygodniowe', value: formatNumber(stats.lifetimeWeeklyQuestsClaimed) },
        { label: 'Odebrane nagrody logowania', value: formatNumber(stats.lifetimeLoginRewardsClaimed) },
        { label: 'Dzisiejsze zadania odebrane', value: `${dailyClaimed}/${(state.quests?.daily || []).length}` },
        { label: 'Tygodniowe zadania odebrane', value: `${weeklyClaimed}/${(state.quests?.weekly || []).length}` }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-3" role="dialog" aria-modal="true" aria-labelledby="statistics-title" onClick={onClose}>
      <div className="pixel-frame flex max-h-[94vh] w-full max-w-5xl flex-col rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-700 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Statystyki save’a</p>
            <h2 id="statistics-title" className="mt-1 text-xl font-black text-amber-300">{snapshot.name || 'Save'}</h2>
          </div>
          <button type="button" className="rounded border border-slate-600 p-2 text-slate-300 hover:text-white" onClick={onClose} aria-label="Zamknij statystyki">
            <GuiIcon name="close" alt="" />
          </button>
        </header>
        <div className="grid min-h-0 gap-3 overflow-y-auto p-4 lg:grid-cols-2">
          {sections.map((section) => <StatSection key={section.title} {...section} />)}
        </div>
      </div>
    </div>
  );
}
