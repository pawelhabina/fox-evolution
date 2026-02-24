const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foxEvolution', {
  listSaves: () => ipcRenderer.invoke('game:listSaves'),
  loadSlot: (slotId) => ipcRenderer.invoke('game:loadSlot', slotId),
  saveSlot: (payload) => ipcRenderer.invoke('game:saveSlot', payload),
  saveSlotSync: (payload) => ipcRenderer.sendSync('game:saveSlotSync', payload),
  updateMetaSettings: (settings) => ipcRenderer.invoke('game:updateMetaSettings', settings),
  deleteSlot: (slotId) => ipcRenderer.invoke('game:deleteSlot', slotId),
  getVersion: () => ipcRenderer.invoke('app:version'),
  quitApp: () => ipcRenderer.invoke('app:quit')
});
