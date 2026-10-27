import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from '../shared/model';
const api:Api={
  language:()=>ipcRenderer.invoke('language'),saveLanguage:value=>ipcRenderer.invoke('save-language',value),
  config:()=>ipcRenderer.invoke('config'),saveConfig:c=>ipcRenderer.invoke('save-config',c),resetConfig:()=>ipcRenderer.invoke('reset-config'),
  startWork:()=>ipcRenderer.invoke('start-work'),pauseWork:()=>ipcRenderer.invoke('pause-work'),workStatus:()=>ipcRenderer.invoke('work-status'),scanFrame:f=>ipcRenderer.invoke('scan-frame',f),
  preview:r=>ipcRenderer.invoke('preview',r),enqueue:r=>ipcRenderer.invoke('enqueue',r),reprint:id=>ipcRenderer.invoke('reprint',id),history:()=>ipcRenderer.invoke('history'),printers:()=>ipcRenderer.invoke('printers')
};
contextBridge.exposeInMainWorld('scan',api);
