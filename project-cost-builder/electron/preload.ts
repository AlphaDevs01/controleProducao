import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadState: () => ipcRenderer.invoke('db-load'),
  saveState: (state: any) => ipcRenderer.invoke('db-save', state),
});