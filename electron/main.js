const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { launchWindowsUpdateHandoff } = require('./updateHandoff');

// The v2 installer uses a clean program directory, but game data must stay in
// the original profile so saves and settings survive the migration.
app.setPath('userData', path.join(app.getPath('appData'), 'fox-evolution'));

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (error) {
  console.warn('electron-updater is not available in this build:', error?.message || error);
}

let mainWindow;
let updateCheckInterval = null;
let updaterInitialized = false;
let pendingOAuthCallback = null;
const oauthProtocol = 'fox-evolution';
const updaterState = {
  enabled: false,
  status: 'idle',
  message: '',
  progress: 0,
  version: app.getVersion(),
  updateVersion: null,
  checkedAt: null
};

function isOAuthCallbackUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === `${oauthProtocol}:` && url.hostname === 'oauth' && url.pathname === '/callback';
  } catch (_error) {
    return false;
  }
}

function deliverOAuthCallback(value) {
  if (!isOAuthCallbackUrl(value)) {
    return;
  }
  pendingOAuthCallback = value;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('app:oauth-callback', value);
    pendingOAuthCallback = null;
  }
}

if (process.defaultApp && process.argv[1]) {
  app.setAsDefaultProtocolClient(oauthProtocol, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(oauthProtocol);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const callbackUrl = commandLine.find(isOAuthCallbackUrl);
    if (callbackUrl) {
      deliverOAuthCallback(callbackUrl);
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  deliverOAuthCallback(url);
});

function getSavesDir() {
  return path.join(app.getPath('userData'), 'saves');
}

function getMetaPath() {
  return path.join(getSavesDir(), 'meta.json');
}

function getSlotPath(slotId) {
  return path.join(getSavesDir(), `${slotId}.json`);
}

function getUpdateInstallLogPath() {
  return path.join(app.getPath('userData'), 'update-install.log');
}

function appendUpdateInstallLog(message) {
  try {
    fs.appendFileSync(getUpdateInstallLogPath(), `${new Date().toISOString()} ${message}\n`, 'utf-8');
  } catch (_error) {
    // Update installation must not depend on diagnostic logging.
  }
}

function createDefaultMeta() {
  return {
    lastPlayedSlotId: null,
    settings: {
      defaultSound: true,
      defaultAnimations: true,
      defaultMusicVolume: 30,
      defaultSfxVolume: 70,
      defaultMusicMuted: false,
      defaultSfxMuted: false,
      defaultFullscreen: false,
      audioDefaultsVersion: 3
    },
    slots: []
  };
}

function normalizeMetaSettings(rawSettings = {}) {
  const defaults = createDefaultMeta().settings;
  const merged = {
    ...defaults,
    ...rawSettings
  };
  if (Number(rawSettings.audioDefaultsVersion) < 2) {
    if (Number(rawSettings.defaultMusicVolume) === 70) {
      merged.defaultMusicVolume = 30;
    }
    if (Number(rawSettings.defaultSfxVolume) === 80) {
      merged.defaultSfxVolume = 70;
    }
  }
  merged.defaultMusicMuted = Boolean(merged.defaultMusicMuted);
  merged.defaultSfxMuted = Boolean(merged.defaultSfxMuted);
  merged.defaultFullscreen = Boolean(merged.defaultFullscreen);
  merged.audioDefaultsVersion = 3;
  return merged;
}

async function ensureSavesDir() {
  await fs.promises.mkdir(getSavesDir(), { recursive: true });
}

async function readMetaFile() {
  await ensureSavesDir();
  const metaPath = getMetaPath();
  try {
    const raw = await fs.promises.readFile(metaPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultMeta(),
      ...parsed,
      settings: normalizeMetaSettings(parsed.settings),
      slots: Array.isArray(parsed.slots) ? parsed.slots : []
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createDefaultMeta();
    }
    throw error;
  }
}

async function writeMetaFile(meta) {
  await ensureSavesDir();
  await fs.promises.writeFile(getMetaPath(), JSON.stringify(meta, null, 2), 'utf-8');
}

function writeMetaFileSync(meta) {
  fs.mkdirSync(getSavesDir(), { recursive: true });
  fs.writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2), 'utf-8');
}

function buildSummary(state) {
  const foxMaxTier = Array.isArray(state?.foxes) ? state.foxes.reduce((max, fox) => Math.max(max, fox?.tier || 1), 1) : 1;
  const highestTier = Math.max(foxMaxTier, state?.stats?.daily?.maxTier || 1);
  return {
    coins: state?.currencies?.coins || 0,
    gems: state?.currencies?.gems || 0,
    rebirthTokens: state?.currencies?.rebirthTokens || 0,
    lifetimeCoins: state?.stats?.lifetimeCoinsEarned || 0,
    lifetimeRebirths: state?.stats?.lifetimeRebirths || 0,
    foxCount: Array.isArray(state?.foxes) ? state.foxes.length : 0,
    maxTier: highestTier,
    highestTier
  };
}

function makeSlotId() {
  return `slot-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function getUpdateServerUrl() {
  const envUrl = String(process.env.UPDATE_SERVER_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  try {
    const configPath = path.join(__dirname, 'update-config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fileUrl = String(parsed?.updateServerUrl || '').trim();
    if (fileUrl) {
      return fileUrl.replace(/\/$/, '');
    }
  } catch (_error) {
    // ignore missing/invalid config file
  }

  return '';
}

function broadcastUpdaterState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('app:update-status', { ...updaterState });
}

function setUpdaterState(partial) {
  Object.assign(updaterState, partial, {
    checkedAt: new Date().toISOString()
  });
  broadcastUpdaterState();
}

async function checkForUpdates() {
  if (!updaterInitialized || !updaterState.enabled || !autoUpdater) {
    return { ...updaterState };
  }

  try {
    setUpdaterState({
      status: 'checking',
      message: 'Sprawdzanie aktualizacji...'
    });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdaterState({
      status: 'error',
      message: error?.message || 'Nie udało się sprawdzić aktualizacji'
    });
  }
  return { ...updaterState };
}

function initAutoUpdater() {
  if (updaterInitialized) {
    return;
  }
  updaterInitialized = true;

  if (!autoUpdater) {
    setUpdaterState({
      enabled: false,
      status: 'disabled',
      message: 'Brak electron-updater w buildzie - aktualizacje wyłączone'
    });
    return;
  }

  if (!app.isPackaged) {
    setUpdaterState({
      enabled: false,
      status: 'disabled',
      message: 'Auto-update działa tylko w wersji spakowanej aplikacji'
    });
    return;
  }

  const updateServerUrl = getUpdateServerUrl();
  if (!updateServerUrl) {
    setUpdaterState({
      enabled: false,
      status: 'disabled',
      message: 'Brak UPDATE_SERVER_URL - aktualizacje wyłączone'
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updateServerUrl
  });

  setUpdaterState({
    enabled: true,
    status: 'idle',
    message: 'Updater gotowy'
  });

  autoUpdater.on('checking-for-update', () => {
    setUpdaterState({
      status: 'checking',
      message: 'Sprawdzanie aktualizacji...'
    });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdaterState({
      status: 'downloading',
      message: 'Pobieranie aktualizacji...',
      updateVersion: info?.version || null,
      progress: 0
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    setUpdaterState({
      status: 'downloading',
      message: 'Pobieranie aktualizacji...',
      progress: Math.max(0, Math.min(100, Number(progressObj?.percent) || 0))
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdaterState({
      status: 'downloaded',
      message: 'Aktualizacja gotowa. Zrestartuj grę, aby ją zainstalować.',
      progress: 100,
      updateVersion: info?.version || updaterState.updateVersion
    });
  });

  autoUpdater.on('update-not-available', () => {
    setUpdaterState({
      status: 'idle',
      message: 'Aplikacja jest aktualna',
      progress: 0,
      updateVersion: null
    });
  });

  autoUpdater.on('error', (error) => {
    setUpdaterState({
      status: 'error',
      message: error?.message || 'Błąd aktualizacji'
    });
  });

  checkForUpdates();
  updateCheckInterval = setInterval(() => {
    checkForUpdates();
  }, 5 * 60 * 1000);
}

async function loadSlot(slotId) {
  const slotPath = getSlotPath(slotId);
  try {
    const raw = await fs.promises.readFile(slotPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function saveSlot({ slotId, state, name }) {
  const meta = await readMetaFile();
  const effectiveSlotId = slotId || makeSlotId();
  const slotPath = getSlotPath(effectiveSlotId);

  await ensureSavesDir();
  await fs.promises.writeFile(slotPath, JSON.stringify(state, null, 2), 'utf-8');

  const now = new Date().toISOString();
  const existing = meta.slots.find((slot) => slot.id === effectiveSlotId);
  const nextSlot = {
    id: effectiveSlotId,
    name: name || existing?.name || `Save ${meta.slots.length + 1}`,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    summary: buildSummary(state)
  };

  const withoutCurrent = meta.slots.filter((slot) => slot.id !== effectiveSlotId);
  meta.slots = [nextSlot, ...withoutCurrent].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  meta.lastPlayedSlotId = effectiveSlotId;

  await writeMetaFile(meta);
  return { slotId: effectiveSlotId };
}

function saveSlotSync({ slotId, state, name }) {
  const metaPath = getMetaPath();
  let meta = createDefaultMeta();
  try {
    const rawMeta = fs.readFileSync(metaPath, 'utf-8');
    const parsed = JSON.parse(rawMeta);
    meta = {
      ...meta,
      ...parsed,
      settings: normalizeMetaSettings(parsed.settings),
      slots: Array.isArray(parsed.slots) ? parsed.slots : []
    };
  } catch (_error) {
    meta = createDefaultMeta();
  }

  const effectiveSlotId = slotId || makeSlotId();
  fs.mkdirSync(getSavesDir(), { recursive: true });
  fs.writeFileSync(getSlotPath(effectiveSlotId), JSON.stringify(state, null, 2), 'utf-8');

  const now = new Date().toISOString();
  const existing = meta.slots.find((slot) => slot.id === effectiveSlotId);
  const nextSlot = {
    id: effectiveSlotId,
    name: name || existing?.name || `Save ${meta.slots.length + 1}`,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    summary: buildSummary(state)
  };
  const withoutCurrent = meta.slots.filter((slot) => slot.id !== effectiveSlotId);
  meta.slots = [nextSlot, ...withoutCurrent].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  meta.lastPlayedSlotId = effectiveSlotId;

  writeMetaFileSync(meta);
  return { slotId: effectiveSlotId };
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#030712',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#030712',
      symbolColor: '#f8fafc',
      height: 32
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.removeMenu();

  const isDev = !app.isPackaged;
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    broadcastUpdaterState();
    if (pendingOAuthCallback) {
      deliverOAuthCallback(pendingOAuthCallback);
    }
  });
}

app.whenReady().then(() => {
  ipcMain.handle('game:listSaves', async () => {
    return readMetaFile();
  });

  ipcMain.handle('app:set-fullscreen', (_event, enabled) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }
    mainWindow.setFullScreen(Boolean(enabled));
    return mainWindow.isFullScreen();
  });

  ipcMain.handle('game:loadSlot', async (_, slotId) => {
    return loadSlot(slotId);
  });

  ipcMain.handle('game:saveSlot', async (_, payload) => {
    return saveSlot(payload || {});
  });

  ipcMain.on('game:saveSlotSync', (event, payload) => {
    try {
      const result = saveSlotSync(payload || {});
      event.returnValue = result;
    } catch (error) {
      console.error('Save slot sync failed:', error);
      event.returnValue = null;
    }
  });

  ipcMain.handle('game:updateMetaSettings', async (_, settings) => {
    const meta = await readMetaFile();
    meta.settings = {
      ...meta.settings,
      ...(settings || {})
    };
    await writeMetaFile(meta);
    return meta.settings;
  });

  ipcMain.handle('game:deleteSlot', async (_, slotId) => {
    const meta = await readMetaFile();
    const slotPath = getSlotPath(slotId);
    try {
      await fs.promises.unlink(slotPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    meta.slots = meta.slots.filter((slot) => slot.id !== slotId);
    if (meta.lastPlayedSlotId === slotId) {
      meta.lastPlayedSlotId = meta.slots[0]?.id || null;
    }
    await writeMetaFile(meta);
    return true;
  });

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:update:state', () => ({ ...updaterState }));
  ipcMain.handle('app:update:check', async () => checkForUpdates());
  ipcMain.handle('app:update:install', async () => {
    if (!autoUpdater || updaterState.status !== 'downloaded') {
      return false;
    }

    setUpdaterState({
      status: 'installing',
      message: 'Zapisywanie gry i bezpieczne zamykanie aplikacji...',
      progress: 100
    });

    if (process.platform === 'win32' && autoUpdater.installerPath && fs.existsSync(autoUpdater.installerPath)) {
      try {
        appendUpdateInstallLog(`Preparing installer: ${path.basename(autoUpdater.installerPath)}`);
        launchWindowsUpdateHandoff({
          appPid: process.pid,
          appExecutablePath: process.execPath,
          installerPath: autoUpdater.installerPath,
          logPath: getUpdateInstallLogPath()
        });
        setTimeout(() => {
          app.quit();
        }, 250);
        return true;
      } catch (error) {
        appendUpdateInstallLog(`Handoff failed, using electron-updater fallback: ${error?.message || error}`);
      }
    }

    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return true;
  });
  ipcMain.handle('app:oauth:open', async (_event, value) => {
    try {
      const url = new URL(String(value || ''));
      const isAllowedHost = url.hostname === 'foxevo.mionix.pl' || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isAllowedPath = /^\/api\/auth\/oauth\/(google|steam)\/start$/.test(url.pathname);
      if (!['https:', 'http:'].includes(url.protocol) || !isAllowedHost || !isAllowedPath) {
        return false;
      }
      await shell.openExternal(url.toString());
      return true;
    } catch (_error) {
      return false;
    }
  });
  ipcMain.handle('app:quit', () => {
    app.quit();
    return true;
  });

  createWindow().then(() => {
    initAutoUpdater();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
});
