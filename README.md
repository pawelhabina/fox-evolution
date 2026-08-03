# Fox Evolution (Electron + React + Vite + Tailwind)

Desktopowa, offline'owa gra merge/clicker.

## Stack
- Electron (main + preload + IPC)
- React + Vite + Tailwind CSS
- JavaScript (bez TypeScript)
- API backend (opcjonalnie): Express + MySQL + Prisma (`server/`)
- Persistencja:
  - tryb online: save po API (konto lub urządzenie),
  - fallback lokalny: pliki JSON slotów save w `app.getPath('userData')/saves` lub `localStorage`.

## Uruchomienie
Wymagania: Node.js 18+

```bash
npm install
npm run dev
```

## Tryb online (server authoritative save)
1. Skonfiguruj i uruchom backend:

```bash
cd server
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run seed:admin
npm run dev
```

2. W root ustaw endpoint API dla frontendu:

```bash
VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

3. Opcjonalnie uruchom wszystko jedną komendą:

```bash
npm run dev:all
```

Szczegóły backendu: [server/README.md](/Users/pravel9/Documents/fox-evolution/server/README.md)

## Auto-update desktop app
- Aplikacja Electron ma auto-update przez `electron-updater` (provider `generic`).
- Przy starcie sprawdza update i automatycznie pobiera paczkę z serwera.
- W trakcie gry pojawia się komunikat po pobraniu: `Zrestartuj grę i zainstaluj`.
- Sprawdzanie wersji odbywa się cyklicznie co 5 minut.

Konfiguracja:
1. Ustaw URL feedu aktualizacji:
   - `electron/update-config.json`:
     ```json
     { "updateServerUrl": "https://twoja-domena.pl/updates" }
     ```
   - albo zmienną środowiskową `UPDATE_SERVER_URL` (ma priorytet nad plikiem).
2. Zbuduj release i opublikuj pliki update:
   ```bash
   npm run release:desktop
   ```
   To:
   - buduje aplikację (`electron-builder`),
   - kopiuje artefakty update do `server/updates`.
3. Uruchom backend (`server`) - serwuje update pod `GET /updates/*`.
4. Sprawdź w przeglądarce:
   - `http://localhost:4000/updates/latest-mac.yml` (macOS)
   - `http://localhost:4000/updates/latest.yml` (Windows)

Flow nowej wersji:
1. Podbij `version` w [package.json](/Users/pravel9/Documents/fox-evolution/package.json).
2. Uruchom testy i zacommituj dokładnie ten stan jako commit wydania.
3. Uruchom `npm run release:desktop`.
4. Zrestartuj backend lub wrzuć nowe pliki `server/updates` na serwer.
5. Klient dostanie update przy starcie lub maksymalnie do 5 minut.

Od wersji `1.2.0` wypchnij również tag `vX.Y.Z` wskazujący commit wydania. Workflow
`.github/workflows/release.yml` sprawdzi zgodność taga z `package.json`, zbuduje Windows,
uruchomi testy i opublikuje instalator, blockmapę oraz `latest.yml` jako GitHub Release.

## Build
```bash
npm run build:web
npm run build
npm run updates:publish
```

`npm run build` tworzy paczkę Electron (`dmg` na macOS; w konfiguracji jest też `nsis`/`AppImage` dla Windows/Linux).
`npm run updates:publish` tylko publikuje artefakty update z `dist` do `server/updates`.

## Główne mechaniki
- Menu główne: `Kontynuuj`, `Wczytaj grę`, `Ranking`, `Ustawienia`, `Wyjdź z gry`.
- Tick globalny co 5s + licznik `next tick in`.
- Kliknięcie lisa daje coins natychmiast (nigdy gems).
- Merge: przeciągnij lisa na lisa o tym samym tierze -> powstaje tier+1, źródło znika.
- Tiery: bazowe 1-15 + żywiołowe 16-30 (dla merge wyewoluowanych lisów).
- Limit lisów: dynamiczny 5-50 (upgrade `Fox Capacity`).
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

## Evolucje
- Koszt stworzenia evolucji: `2 gems`.
- `Electric`: bonus tylko do pasywnego income (`x1.5`).
- `Fire`: bonus tylko do click value (`x1.5`).
- `Water`: nie buffuje siebie, wzmacnia najbliższego lisa o `+50%` do statystyk.
- Wyewoluowane lisy można łączyć tylko z tym samym żywiołem, aż do tieru 30.

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
- limit lisów kupiony za rebirth points,
- statystyki lifetime,
- ustawienia.

Podgląd tokenów jest liczony z liczby Mega Foxów i lifetime coins (`Sklep > Rebirth`).

## Zapis stanu
- Tryb online (`VITE_API_BASE_URL` ustawione):
  - save idzie przez `/api/game/saves/:slotId`,
  - gość ma save przypisany do urządzenia,
  - konto ma save w chmurze i multi-device,
  - max 5 slotów na właściciela.
- Tryb lokalny (fallback):
  - pliki JSON slotów (`/saves/<slotId>.json`) + `/saves/meta.json`,
  - poza Electronem: `localStorage`.
- Autosave co 10s do aktualnego slotu.
- `Hard reset` resetuje stan aktualnego slotu.

## Konto, leaderboard, anti-cheat
- Konto: email+hasło, OAuth (Google/Steam - gdy skonfigurowane w backendzie), sesja gościa po `deviceId`.
- Leaderboard globalny: `coins`, `gems`, `top_tier`.
- Leaderboard obejmuje tylko konta zalogowane (goście nie są publikowani).
- Top 10 + pozycja zalogowanego gracza.
- Anti-cheat: heurystyki po stronie serwera przy zapisie; podejrzane konta/urządzenia są flagowane i usuwane z leaderboarda.

## Panel admina
- URL: `http://localhost:4000/admin`
- Dostęp tylko dla roli `ADMIN`.
- Funkcje: statystyki, przegląd użytkowników, flag/unflag, audit log, edycja save po stronie serwera (bez auto-flagowania).

## Struktura projektu
- `electron/main.js` - okno, IPC, zapis JSON
- `electron/preload.js` - bezpieczne API do renderera
- `server/` - backend API (auth/save/leaderboard/admin/telemetry)
- `src/game/constants.js` - dane tierów, questów, upgradeów
- `src/game/economy.js` - koszty, mnożniki, balans
- `src/game/quests.js` - daily/weekly + resety czasu
- `src/game/reducer.js` - logika gry
- `src/storage/*` - inicjalny stan + load/save/sanitize + sesja API
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
