const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electronBridge', {
  request: (input) => ipcRenderer.invoke('api-request', input),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  saveCredential: (value) => ipcRenderer.invoke('save-credential', value),
  clearCredential: () => ipcRenderer.invoke('clear-credential'),
})
