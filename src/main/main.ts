import { msg, appError, type DisplayMessage } from '../shared/i18n';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import { mkdirSync, realpathSync } from 'node:fs';
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
import { LanguageStore } from './language';
// Keep the v0.1/v0.2 package-name data directory, independent of display branding.
app.setPath('userData',join(app.getPath('appData'),'scan-reprint'));
app.setName('YOVAL Scan Reprint');
const smoke=process.env.SCAN_REPRINT_SMOKE==='1'&&!app.isPackaged;
if(smoke){const profile=process.env.SCAN_REPRINT_SMOKE_PROFILE||String(process.pid);if(!/^[a-zA-Z0-9-]{1,64}$/.test(profile))throw new Error('Invalid smoke profile');const path=join(app.getPath('temp'),`scan-reprint-smoke-${profile}`);mkdirSync(path,{recursive:true});app.setPath('userData',path);}
if(!app.requestSingleInstanceLock())app.quit();
else void app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['file:','data:'].some(p=>details.url.startsWith(p))}));
  mkdirSync(app.getPath('userData'),{recursive:true});
  const historyPath=join(app.getPath('userData'),'history.json'),config=new ConfigStore(join(app.getPath('userData'),'settings.json'));
  const language=new LanguageStore(join(app.getPath('userData'),'language.json'),smoke?(process.env.SCAN_REPRINT_SMOKE_LOCALE||'zh-CN'):app.getLocale(),join(app.getPath('userData'),'installer-language.txt'));
  let initial:Job[]=[];let damaged=false;let epoch=0;
  try {initial=loadHistory(historyPath);} catch {damaged=true;}
  const pause=(detail?:DisplayMessage)=>{epoch++;return work!.pause(detail);};
  const queue=new PrintQueue(jobs=>{if(damaged)throw appError(msg('historyDamaged'));saveHistory(historyPath,jobs);},async label=>{
    const raster=await rasterize(label);
    if(label.settings.transport==='system') {
      if(smoke)return; // Development-only spooler seam; never active in packaged apps.
      await systemPrint(label,raster);
    } else await sendNetwork(label.settings.host,label.settings.port,label.settings.transport==='zpl'?zpl(label,raster):tspl(label,raster));
  },initial,job=>{if(job.status==='failed'||job.status==='uncertain')pause(msg('printPaused'));});
  // Resolve the physical directory before entering ASAR. Chromium canonicalizes Windows 8.3 aliases.
  // Loading and authorizing the same canonical entry keeps strict main-frame IPC validation intact.
  const appDirectory=app.isPackaged?join(realpathSync.native(process.resourcesPath),'app.asar','dist'):realpathSync.native(__dirname);
  const index=join(appDirectory,'index.html'),url=pathToFileURL(index).href;
  const win=new BrowserWindow({title:'YOVAL Scan Reprint',width:1440,height:1000,minWidth:850,minHeight:720,backgroundColor:'#f4f6f8',icon:join(appDirectory,'icons',process.platform==='win32'?'icon.ico':'icon.png'),webPreferences:{preload:join(appDirectory,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  const work=new WorkSession(queue,()=>win.isFocused());
  win.on('blur',()=>pause(msg('blurPaused')));
  win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  const handle=(name:string,fn:(value:unknown)=>unknown)=>ipcMain.handle(name,(event,value:unknown)=>{
    if(event.sender!==win.webContents||!trustedFrame(event.senderFrame?.url||'',url,event.senderFrame===win.webContents.mainFrame))throw appError(msg('untrustedIpc'));return fn(value);
  });
  const printers=async()=>smoke?[{name:'CI spooler',displayName:'CI spooler'}]:(await win.webContents.getPrintersAsync()).map(p=>({name:p.name,displayName:p.displayName}));
  handle('language',()=>language.get());
  handle('save-language',value=>{pause();return language.save(value);});
  handle('config',()=>config.get());
  handle('save-config',value=>{pause();return config.save(value);});
  handle('reset-config',()=>{pause();return config.reset();});
  handle('start-work',async()=>{
    if(language.get().needsChoice)throw appError(msg('languageChoiceRequired'));
    const revision=++epoch,snapshot=config.get();
    if(snapshot.requiresReset)throw appError(snapshot.message);
    if(damaged)throw appError(msg('historyStart'));
    if(snapshot.config.settings.transport==='system'&&!(await printers()).some(p=>p.name===snapshot.config.settings.printer))throw appError(msg('printerSave'));
    if(revision!==epoch)throw appError(msg('workChanged'));
    return work!.start(snapshot.config);
  });
  handle('pause-work',()=>pause());
  handle('work-status',()=>{if(work!.status().active&&!win.isFocused())pause(msg('blurPaused'));return work!.status();});
  handle('scan-frame',value=>work!.frame(value));
  handle('preview',async value=>{const label=validate(value);return preview(label,await rasterize(label));});
  handle('enqueue',value=>{pause();const c=config.get();if(c.requiresReset)throw appError(c.message);return queue.add(validate(value),false,c.config.duplicate.mode==='allow'?0:c.config.duplicate.windowMs);});
  handle('reprint',value=>{pause();if(config.get().requiresReset)throw appError(msg('restoreConfig'));if(typeof value!=='string'||value.length>64)throw appError(msg('invalidId'));return queue.reprint(value);});
  handle('history',()=>{if(damaged)throw appError(msg('historyStopped'));return queue.list();});
  handle('printers',printers);
  void win.loadFile(index);
  app.on('second-instance',()=>{if(win.isMinimized())win.restore();win.focus();});
});
app.on('window-all-closed',()=>app.quit());
