const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function getSavePath() {
  return path.join(app.getPath('userData'), 'savegame.json');
}

async function readSaveFile() {
  const savePath = getSavePath();
  try {
    const raw = await fs.promises.readFile(savePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeSaveFile(data) {
  const savePath = getSavePath();
  await fs.promises.mkdir(path.dirname(savePath), { recursive: true });
  await fs.promises.writeFile(savePath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

function writeSaveFileSync(data) {
  const savePath = getSavePath();
  fs.mkdirSync(path.dirname(savePath), { recursive: true });
  fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

function createWindow() {
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
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('game:load', async () => {
    return readSaveFile();
  });

  ipcMain.handle('game:save', async (_, state) => {
    return writeSaveFile(state);
  });

  ipcMain.on('game:saveSync', (event, state) => {
    try {
      writeSaveFileSync(state);
      event.returnValue = true;
    } catch (error) {
      console.error('Save sync failed:', error);
      event.returnValue = false;
    }
  });

  ipcMain.handle('game:hardReset', async () => {
    const savePath = getSavePath();
    try {
      await fs.promises.unlink(savePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    return true;
  });

  ipcMain.handle('app:version', () => app.getVersion());

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
