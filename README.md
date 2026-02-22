# Fox Evolution (Electron + React + Vite + Tailwind)

Desktopowa, offline'owa gra merge/clicker.

## Stack
- Electron (main + preload + IPC)
- React + Vite + Tailwind CSS
- JavaScript (bez TypeScript)
- Persistencja: JSON przez IPC do pliku `savegame.json` w `app.getPath('userData')`
- Fallback poza Electronem: `localStorage`

## Uruchomienie
Wymagania: Node.js 18+

```bash
npm install
npm run dev
```

## Build
```bash
npm run build:web
npm run build
```

`npm run build` tworzy paczkę Electron (`dmg` na macOS; w konfiguracji jest też `nsis`/`AppImage` dla Windows/Linux).

## Główne mechaniki
- Tick globalny co 5s + licznik `next tick in`.
- Kliknięcie lisa daje coins natychmiast (nigdy gems).
- Merge: przeciągnij lisa na lisa o tym samym tierze -> powstaje tier+1, źródło znika.
- Tiery: 15 (Tier 1 = DNA Fox, Tier 15 = Mega Fox).
- Limit lisów: 40 (toast: `Masz za dużo lisów na planszy`).
- Drag & drop z clampowaniem do granic areny podczas dragu i przy resize okna.

## Waluty
- `Coins`: zakup lisów, coinowe upgrady.
- `Gems`: daily/weekly i tick-drop.
- `Rebirth Tokens`: tylko z rebirth; dają stały bonus income (+2.5% per token).

## Zakup lisa i progres ceny
- `Kup lisa`: koszt rośnie wykładniczo (`base 25`, krzywa `1.17^purchaseCount`) i jest obniżany upgradem `Buy Cost Reduction`.
- Quality roll:
  - 95%: `base purchase tier`
  - 5%: `base+1` (max tier 15)
- `base purchase tier` podnoszony upgradem (max baza = 14).

## Gem drop (upgrade #5)
Mechanika **nie zwiększa szansy 1%**. Zwiększa tylko ilość gemów, jeśli drop już wpadł:
- Każdy drop daje min. 1 gem.
- Bonusowy +1 gem wypada co `N`-ty drop, gdzie `N = max(10 - level, 2)`.
- Dla leveli 10+ dodatkowy +1 gem co 5-ty drop.

Czyli wraz z levelem rośnie średnia liczba gemów z jednego trafionego dropu, ale szansa trafienia pozostaje stała.

## Daily/Weekly (offline, lokalny czas)
- Daily: 5 questów dziennie, każdy daje +1 gem po kliknięciu `Odbierz`.
- Weekly: +20 gems raz na tydzień (`Odbierz weekly bonus`).
- Resety bazują na lokalnym czasie systemowym:
  - Daily: zmiana dnia (`YYYY-MM-DD`)
  - Weekly: nowy tydzień liczony od poniedziałku (lokalnie)

## Rebirth
Warunek: min. 1 Mega Fox na planszy.

Rebirth resetuje:
- planszę i lisy,
- coins,
- coinowe upgrady (`basePurchaseTier`, `passiveIncome`, `buyDiscount`, `clickBonus`),
- licznik zakupów.

Rebirth zachowuje:
- gems,
- rebirth tokens,
- statystyki lifetime,
- `gemDropBonus` (upgrade za gems),
- ustawienia.

Podgląd tokenów jest liczony z liczby Mega Foxów i lifetime coins (`Sklep > Rebirth`).

## Zapis stanu
- Autosave co 10s.
- Save na zamknięcie (`beforeunload`, sync IPC).
- Hard reset:
  - usuwa zapis z dysku (`game:hardReset`),
  - resetuje stan gry.

## Struktura projektu
- `electron/main.js` - okno, IPC, zapis JSON
- `electron/preload.js` - bezpieczne API do renderera
- `src/game/constants.js` - dane tierów, questów, upgradeów
- `src/game/economy.js` - koszty, mnożniki, balans
- `src/game/quests.js` - daily/weekly + resety czasu
- `src/game/reducer.js` - logika gry
- `src/storage/*` - inicjalny stan + load/save/sanitize
- `src/components/*` - HUD, arena, sklep, context menu, modal, toasty
- `assets/*` - placeholdery pod docelowe assety

## Założenia balansu
- Startowe `coins = 120`, żeby pierwsze merge były szybkie.
- Tabele income/click/sell rosną wykładniczo po tierach.
- Dojście do Mega Fox wymaga serii merge + upgrade'ów (realne, ale nie natychmiastowe).
- Rebirth przyspiesza kolejne runy przez bonus tokenów do income.

## Co dalej
1. Dodać prawdziwe assety (sprite sheet, ikony app, audio) i podłączyć pod `settings.sound`.
2. Dodać animacje merge/drop (particle, easing) zależne od `settings.animations`.
3. Rozszerzyć pool questów o losowanie wariantów i większą różnorodność targetów.
4. Dodać testy jednostkowe reducera i ekonomii.
5. Dodać import/export save (backup gracza).
