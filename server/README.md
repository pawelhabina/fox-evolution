# Fox Evolution Server (Express + MySQL + Prisma)

Backend API do zapisu gry, auth, leaderboardów, anty-cheat i panelu admina.

## Wymagania
- Node.js 18+
- MySQL 8+

## Setup
```bash
cd server
npm install
cp .env.example .env
```

Uzupełnij `DATABASE_URL` i sekrety JWT w `.env`.

## Inicjalizacja DB
```bash
npm run prisma:generate
npm run prisma:push
npm run seed:admin
```

## Start
```bash
npm run dev
# lub
npm run start
```

Domyślnie API startuje na `http://localhost:4000`.

## Najważniejsze endpointy
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/device`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/link-device`
- `GET /api/auth/oauth/google/start`
- `GET /api/auth/oauth/steam/start`
- `GET /api/game/saves`
- `GET /api/game/saves/:slotId`
- `PUT /api/game/saves/:slotId`
- `DELETE /api/game/saves/:slotId`
- `GET /api/leaderboard/coins|gems|top_tier`
- `POST /api/telemetry/events`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `PATCH /api/admin/users/:userId/flag`
- `GET /api/admin/saves/:saveId`
- `PATCH /api/admin/saves/:saveId`
- `GET /api/admin/audit`
- `GET /api/admin/stats/telemetry`

## Anti-cheat
Przy zapisie API liczy heurystyki (nagłe skoki tierów/walut, niespójność statystyk, nieprawidłowy kształt stanu).

Jeśli score przekroczy próg:
- konto/urządzenie dostaje flagę,
- trafia wpis do `CheatFlag`,
- gracz wypada z leaderboarda (leaderboard pomija `isFlagged=true`).

## Leaderboard
- Kategorie: `coins`, `gems`, `top_tier`.
- Źródło: najlepsze wyniki z save'ów kont zalogowanych (`ownerType=USER`).
- Odświeżanie: co 5 minut + po zmianie save/flag.

## Panel admina
Panel web: `http://localhost:4000/admin`

Możliwości:
- podgląd statystyk globalnych,
- przegląd użytkowników,
- flag/unflag kont,
- podgląd logów audit,
- edycja save bez flagowania konta.

## OAuth
Skonfiguruj zmienne `GOOGLE_*` i `STEAM_*` w `.env`.
Bez konfiguracji endpointy OAuth zwracają `..._NOT_CONFIGURED`.
