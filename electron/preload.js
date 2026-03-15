const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foxEvolution', {
  listSaves: () => ipcRenderer.invoke('game:listSaves'),
  loadSlot: (slotId) => ipcRenderer.invoke('game:loadSlot', slotId),
  saveSlot: (payload) => ipcRenderer.invoke('game:saveSlot', payload),
  saveSlotSync: (payload) => ipcRenderer.sendSync('game:saveSlotSync', payload),
  updateMetaSettings: (settings) => ipcRenderer.invoke('game:updateMetaSettings', settings),
  deleteSlot: (slotId) => ipcRenderer.invoke('game:deleteSlot', slotId),
  getVersion: () => ipcRenderer.invoke('app:version'),
  getUpdateState: () => ipcRenderer.invoke('app:update:state'),
  checkForUpdates: () => ipcRenderer.invoke('app:update:check'),
  installUpdateAndRestart: () => ipcRenderer.invoke('app:update:install'),
  onUpdateStatus: (handler) => {
    if (typeof handler !== 'function') {
      return () => {};
    }
    const listener = (_event, payload) => {
      handler(payload);
    };
    ipcRenderer.on('app:update-status', listener);
    return () => {
      ipcRenderer.removeListener('app:update-status', listener);
    };
  },
  quitApp: () => ipcRenderer.invoke('app:quit')
});
