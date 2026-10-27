import { BrowserWindow } from 'electron';
import type { Label } from '../shared/model';
import type { Raster } from './raster';
import { beforeSubmission, submitSpooler } from './spooler';
export function printHtml(label:Label,r:Raster):string {
  const {width,height}=label.settings;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>@page{size:${width}mm ${height}mm;margin:0}html,body{margin:0;padding:0;overflow:hidden;width:${width}mm;height:${height}mm}img{display:block;width:${width}mm;height:${height}mm;image-rendering:pixelated}</style></head><body><img src="data:image/png;base64,${r.png.toString('base64')}"></body></html>`;
}
export async function systemPrint(label:Label,r:Raster):Promise<void> {
  if(!label.settings.printer)throw new Error('请明确选择打印机');
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  try {
    await beforeSubmission(win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(printHtml(label,r))}`));
    await beforeSubmission(win.webContents.executeJavaScript('Promise.all(Array.from(document.images, image => image.decode()))'));
    const printers=await beforeSubmission(win.webContents.getPrintersAsync());
    if(!printers.some(p=>p.name===label.settings.printer))throw new Error('选定打印机已不可用');
    await submitSpooler(callback=>win.webContents.print({silent:true,deviceName:label.settings.printer,printBackground:true,
      copies:label.settings.copies,pageRanges:[{from:0,to:0}],margins:{marginType:'none'},pageSize:{width:Math.round(label.settings.width*1000),height:Math.round(label.settings.height*1000)},
      dpi:{horizontal:label.settings.dpi,vertical:label.settings.dpi}},callback));
  } finally {win.destroy();}
}
