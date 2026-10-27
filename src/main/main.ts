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
import { ConfigStore } from './config';
import { WorkSession } from './work-session';
const smoke=process.env.SCAN_REPRINT_SMOKE==='1'&&!app.isPackaged;
if(smoke){const profile=process.env.SCAN_REPRINT_SMOKE_PROFILE||String(process.pid);if(!/^[a-zA-Z0-9-]{1,64}$/.test(profile))throw new Error('Invalid smoke profile');const path=join(app.getPath('temp'),`scan-reprint-smoke-${profile}`);mkdirSync(path,{recursive:true});app.setPath('userData',path);}
if(!app.requestSingleInstanceLock())app.quit();
else void app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['file:','data:'].some(p=>details.url.startsWith(p))}));
  const historyPath=join(app.getPath('userData'),'history.json'),config=new ConfigStore(join(app.getPath('userData'),'settings.json'));
  let initial:Job[]=[];let damaged=false;let work:WorkSession|undefined;let epoch=0;
  try {initial=loadHistory(historyPath);} catch {damaged=true;}
  const pause=(detail?:string)=>{epoch++;return work!.pause(detail);};
  const queue=new PrintQueue(jobs=>{if(damaged)throw new Error('历史文件损坏；请备份并移走用户数据目录中的 history.json 后重启');saveHistory(historyPath,jobs);},async label=>{
    const raster=await rasterize(label);
    if(label.settings.transport==='system') {
      if(smoke)return; // Development-only spooler seam; never active in packaged apps.
      await systemPrint(label,raster);
    } else await sendNetwork(label.settings.host,label.settings.port,label.settings.transport==='zpl'?zpl(label,raster):tspl(label,raster));
  },initial,job=>{if(job.status==='failed'||job.status==='uncertain')pause('打印失败或结果不确定，已暂停接收；请核对设备。已入队任务继续处理，不自动重打。');});
  const index=join(__dirname,'index.html'),url=pathToFileURL(index).href;
  const win=new BrowserWindow({width:1440,height:1000,minWidth:850,minHeight:720,backgroundColor:'#f4f6f8',icon:join(__dirname,'icons',process.platform==='win32'?'icon.ico':'icon.png'),webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  work=new WorkSession(queue,()=>win.isFocused());
  win.on('blur',()=>pause('已离开应用；返回后请明确恢复扫码。'));
  win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  const handle=(name:string,fn:(value:unknown)=>unknown)=>ipcMain.handle(name,(event,value:unknown)=>{
    if(event.sender!==win.webContents||!trustedFrame(event.senderFrame?.url||'',url,event.senderFrame===win.webContents.mainFrame))throw new Error('拒绝不可信 IPC 来源');return fn(value);
  });
  const printers=async()=>smoke?[{name:'CI spooler',displayName:'CI spooler'}]:(await win.webContents.getPrintersAsync()).map(p=>({name:p.name,displayName:p.displayName}));
  handle('config',()=>config.get());
  handle('save-config',value=>{pause();return config.save(value);});
  handle('reset-config',()=>{pause();return config.reset();});
  handle('start-work',async()=>{
    const revision=++epoch,snapshot=config.get();
    if(snapshot.requiresReset)throw new Error(snapshot.message);
    if(damaged)throw new Error('历史文件损坏，不能开始扫码');
    if(snapshot.config.settings.transport==='system'&&!(await printers()).some(p=>p.name===snapshot.config.settings.printer))throw new Error('请选择当前可用的打印机并保存配置');
    if(revision!==epoch)throw new Error('工作状态已改变，请重新开始扫码');
    return work!.start(snapshot.config);
  });
  handle('pause-work',()=>pause());
  handle('work-status',()=>{if(work!.status().active&&!win.isFocused())pause('已离开应用；返回后请明确恢复扫码。');return work!.status();});
  handle('scan-frame',value=>work!.frame(value));
  handle('preview',async value=>{const label=validate(value);return preview(label,await rasterize(label));});
  handle('enqueue',value=>{pause();const c=config.get();if(c.requiresReset)throw new Error(c.message);return queue.add(validate(value),false,c.config.duplicate.mode==='allow'?0:c.config.duplicate.windowMs);});
  handle('reprint',value=>{pause();if(config.get().requiresReset)throw new Error('请先恢复配置');if(typeof value!=='string'||value.length>64)throw new Error('记录 ID 无效');return queue.reprint(value);});
  handle('history',()=>{if(damaged)throw new Error('历史文件损坏；已停止打印以保护记录，请查看 README 恢复步骤');return queue.list();});
  handle('printers',printers);
  void win.loadFile(index);
  app.on('second-instance',()=>{if(win.isMinimized())win.restore();win.focus();});
});
app.on('window-all-closed',()=>app.quit());
