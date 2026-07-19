import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { passport } from './config/passport.js';
import { disconnectDb } from './db.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import healthRoutes from './routes/health.js';
import downloadsRoutes, { redirectLatestWindows } from './routes/downloads.js';
import leaderboardRoutes from './routes/leaderboard.js';
import telemetryRoutes from './routes/telemetry.js';
import { ensureAdminUser } from './services/authService.js';
import { refreshLeaderboards } from './services/leaderboardService.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminPublicDir = path.join(__dirname, 'admin', 'public');

if (env.trustProxy > 0) {
  app.set('trust proxy', env.trustProxy);
}

function setUpdateHeaders(res, filePath) {
  if (filePath.endsWith('.yml')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS blocked'));
    }
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

app.use(passport.initialize());

app.use('/api/health', healthRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/admin', adminRoutes);

app.use('/updates', express.static(env.updatesDir, { setHeaders: setUpdateHeaders }));
app.get('/download/windows', redirectLatestWindows);

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="pl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fox Evolution</title></head>
  <body>
    <main>
      <h1>Fox Evolution</h1>
      <p>Desktopowa gra o łączeniu i ewolucji lisów.</p>
      <p><a href="/download/windows">Pobierz najnowszą wersję dla Windows (.exe)</a></p>
    </main>
  </body>
</html>`);
});

app.use('/admin', express.static(adminPublicDir));
app.get('/admin*', (_req, res) => {
  res.sendFile(path.join(adminPublicDir, 'index.html'));
});

app.use((error, _req, res, _next) => {
  if (error?.message === 'CORS blocked') {
    return res.status(403).json({ error: 'CORS_BLOCKED' });
  }
  console.error(error);
  return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

let leaderboardInterval;

async function start() {
  await fs.promises.mkdir(env.updatesDir, { recursive: true });
  await ensureAdminUser();
  await refreshLeaderboards();

  leaderboardInterval = setInterval(async () => {
    try {
      await refreshLeaderboards();
    } catch (error) {
      console.error('Failed to refresh leaderboards:', error);
    }
  }, 5 * 60 * 1000);

  app.listen(env.port, () => {
    console.log(`Fox Evolution API listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  clearInterval(leaderboardInterval);
  await disconnectDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearInterval(leaderboardInterval);
  await disconnectDb();
  process.exit(0);
});
