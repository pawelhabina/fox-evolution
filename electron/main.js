const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getSavesDir() {
  return path.join(app.getPath('userData'), 'saves');
}

function getMetaPath() {
  return path.join(getSavesDir(), 'meta.json');
}

function getSlotPath(slotId) {
  return path.join(getSavesDir(), `${slotId}.json`);
}

function createDefaultMeta() {
  return {
    lastPlayedSlotId: null,
    settings: {
      defaultSound: true,
      defaultAnimations: true
    },
    slots: []
  };
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
      settings: {
        ...createDefaultMeta().settings,
        ...(parsed.settings || {})
      },
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
      settings: {
        ...meta.settings,
        ...(parsed.settings || {})
      },
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('game:listSaves', async () => {
    return readMetaFile();
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
  ipcMain.handle('app:quit', () => {
    app.quit();
    return true;
  });

  createWindow();

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
