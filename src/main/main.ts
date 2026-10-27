import { app, BrowserWindow, ipcMain, session } from 'electron';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Job } from '../shared/model';
import { validate } from '../shared/validate';
import { rasterize, preview, zpl, tspl } from './raster';
import { sendNetwork } from './network';
import { systemPrint } from './system';
import { PrintQueue } from './queue';
import { trustedFrame } from './security';
import { loadHistory, saveHistory } from './storage';
const smoke=process.env.SCAN_REPRINT_SMOKE==='1'&&!app.isPackaged;
if(smoke){const path=join(app.getPath('temp'),`scan-reprint-smoke-${process.pid}`);mkdirSync(path,{recursive:true});app.setPath('userData',path);}
if(!app.requestSingleInstanceLock())app.quit();
else void app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['file:','data:'].some(p=>details.url.startsWith(p))}));
  const historyPath=join(app.getPath('userData'),'history.json');
  let initial:Job[]=[];let damaged=false;
  try {initial=loadHistory(historyPath);} catch {damaged=true;}
  const queue=new PrintQueue(jobs=>{if(damaged)throw new Error('历史文件损坏；请备份并移走用户数据目录中的 history.json 后重启');saveHistory(historyPath,jobs);},async label=>{
    const raster=await rasterize(label);
    if(label.settings.transport==='system') {
      if(smoke)return; // explicit development-only spooler seam, inaccessible in packaged app
      await systemPrint(label,raster);
    } else await sendNetwork(label.settings.host,label.settings.port,label.settings.transport==='zpl'?zpl(label,raster):tspl(label,raster));
  },initial);
  const index=join(__dirname,'index.html'),url=pathToFileURL(index).href;
  const win=new BrowserWindow({width:1440,height:1000,minWidth:850,minHeight:720,backgroundColor:'#f4f6f8',webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  const handle=(name:string,fn:(value:unknown)=>unknown)=>ipcMain.handle(name,(event,value:unknown)=>{
    if(event.sender!==win.webContents||!trustedFrame(event.senderFrame?.url||'',url,event.senderFrame===win.webContents.mainFrame))throw new Error('拒绝不可信 IPC 来源');return fn(value);
  });
  handle('preview',async value=>{const label=validate(value);return preview(label,await rasterize(label));});
  handle('enqueue',value=>queue.add(validate(value)));
  handle('reprint',value=>{if(typeof value!=='string'||value.length>64)throw new Error('记录 ID 无效');return queue.reprint(value);});
  handle('history',()=>{if(damaged)throw new Error('历史文件损坏；已停止打印以保护记录，请查看 README 恢复步骤');return queue.list();});
  handle('printers',async()=>smoke?[{name:'CI spooler',displayName:'CI spooler'}]:(await win.webContents.getPrintersAsync()).map(p=>({name:p.name,displayName:p.displayName})));
  void win.loadFile(index);
  app.on('second-instance',()=>{if(win.isMinimized())win.restore();win.focus();});
});
app.on('window-all-closed',()=>app.quit());
