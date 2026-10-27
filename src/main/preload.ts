import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from '../shared/model';
const api:Api={preview:r=>ipcRenderer.invoke('preview',r),enqueue:r=>ipcRenderer.invoke('enqueue',r),reprint:id=>ipcRenderer.invoke('reprint',id),history:()=>ipcRenderer.invoke('history'),printers:()=>ipcRenderer.invoke('printers')};
contextBridge.exposeInMainWorld('scan',api);
