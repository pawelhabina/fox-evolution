const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foxEvolution', {
  loadGame: () => ipcRenderer.invoke('game:load'),
  saveGame: (state) => ipcRenderer.invoke('game:save', state),
  saveGameSync: (state) => ipcRenderer.sendSync('game:saveSync', state),
  hardReset: () => ipcRenderer.invoke('game:hardReset'),
  getVersion: () => ipcRenderer.invoke('app:version')
});
