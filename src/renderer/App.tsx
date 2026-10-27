import { useEffect, useRef, useState } from 'react';
import { configDefaults, names, type AppConfig, type ConfigSnapshot, type Job, type Preview, type Request, type WorkStatus } from '../shared/model';
import { ScanFramer } from '../shared/scan-framer';
import { SettingsPanel } from './SettingsPanel';
import { History } from './History';
import { ReprintDialog } from './ReprintDialog';
type View='work'|'config'|'test';
const paused:WorkStatus={active:false,sessionId:'',detail:'保存配置后，点击开始扫码。'};
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
export function App(){
  const [snapshot,setSnapshot]=useState<ConfigSnapshot|null>(null),[draft,setDraft]=useState<AppConfig>(configDefaults),[view,setView]=useState<View>('work');
  const [work,setWork]=useState(paused),[jobs,setJobs]=useState<Job[]>([]),[printers,setPrinters]=useState<{name:string;displayName:string}[]>([]);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirmJob,setConfirmJob]=useState<Job|null>(null),[reset,setReset]=useState(false);
  const [raw,setRaw]=useState(''),[last,setLast]=useState<Request|null>(null),[preview,setPreview]=useState<Preview|null>(null),[previewError,setPreviewError]=useState(''),[previewKey,setPreviewKey]=useState('');
  const [frameLength,setFrameLength]=useState(0);
  const active=useRef(paused),epoch=useRef(0),sequence=useRef(0),framer=useRef(new ScanFramer()),surface=useRef<HTMLElement>(null),configRef=useRef(configDefaults),resetDialog=useRef<HTMLDialogElement>(null);
  const fail=(e:unknown)=>setError(errorText(e));
  const applyWork=(value:WorkStatus)=>{active.current=value;setWork(value);if(!value.active){framer.current.reset();setFrameLength(0);}};
  const pause=()=>{const revision=++epoch.current;applyWork({...paused,detail:'已暂停接收；已入队任务继续处理，不自动重打。'});void window.scan.pauseWork().then(s=>{if(epoch.current===revision)applyWork(s);}).catch(fail);};
  const refresh=()=>{void window.scan.printers().then(setPrinters).catch(fail);};
  const acceptConfig=(s:ConfigSnapshot)=>{setSnapshot(s);setDraft(s.config);configRef.current=s.config;setMessage(s.message);};
  useEffect(()=>{
    void window.scan.config().then(acceptConfig).catch(fail);refresh();
    const poll=()=>{const revision=epoch.current;void window.scan.history().then(setJobs).catch(fail);void window.scan.workStatus().then(s=>{if(revision===epoch.current)applyWork(s);}).catch(fail);};
    poll();const timer=setInterval(poll,400);
    const blur=()=>pause();window.addEventListener('blur',blur);
    const key=(e:KeyboardEvent)=>{
      if(!active.current.active||!document.hasFocus())return;
      if(e.key==='Escape'){e.preventDefault();pause();return;}
      const target=e.target as HTMLElement;
      if(target.closest('input,textarea,select,button,a,[contenteditable="true"],dialog')){if(framer.current.length)framer.current.invalidate('焦点已改变，请重新扫描');return;}
      if(e.ctrlKey||e.metaKey||e.altKey){framer.current.invalidate('扫描包含快捷键，已拒绝整帧');return;}
      if(['Shift','CapsLock','Control','Alt','Meta'].includes(e.key))return;
      if(e.key==='Tab'){framer.current.invalidate('扫描包含 Tab，需使用 Enter 结束后缀');return;}
      e.preventDefault();const result=framer.current.feed(e.key,e.repeat,e.isComposing);setFrameLength(framer.current.length);
      if(result?.kind==='error'){setError(result.message);return;}
      if(result?.kind!=='frame')return;
      const frame={sessionId:active.current.sessionId,sequence:++sequence.current,raw:result.raw};
      setLast({raw:result.raw,settings:configRef.current.settings});setError('');
      void window.scan.scanFrame(frame).then(()=>setMessage('扫描已加入串行队列，请核对出纸。')).catch(fail);
    };
    const paste=(e:ClipboardEvent)=>{if(active.current.active){e.preventDefault();pause();setError('工作模式不接收粘贴，请使用手工测试区。');}};
    const composition=()=>{if(active.current.active)framer.current.invalidate('请关闭输入法组合后重新扫描');};
    document.addEventListener('keydown',key,true);document.addEventListener('paste',paste,true);document.addEventListener('compositionstart',composition);
    return()=>{clearInterval(timer);window.removeEventListener('blur',blur);document.removeEventListener('keydown',key,true);document.removeEventListener('paste',paste,true);document.removeEventListener('compositionstart',composition);};
  },[]);
  useEffect(()=>{if(reset)resetDialog.current?.showModal();},[reset]);
  const config=snapshot?.config||configDefaults,settings=config.settings;
  const request:Request|null=view==='test'&&raw?{raw,settings}:view==='work'?last:null;
  const requestKey=JSON.stringify(request);
  useEffect(()=>{
    let current=true;setPreview(null);setPreviewError('');setPreviewKey('');if(!request)return;
    const timer=setTimeout(()=>{void window.scan.preview(request).then(p=>{if(current){setPreview(p);setPreviewKey(requestKey);}}).catch(e=>{if(current)setPreviewError(errorText(e));});},120);
    return()=>{current=false;clearTimeout(timer);};
  },[requestKey]);
  const navigate=(next:View)=>{pause();setView(next);setError('');if(next==='config'){setDraft(config);refresh();}};
  const start=async()=>{
    const revision=++epoch.current;setBusy(true);setError('');framer.current.reset();sequence.current=0;
    try{const s=await window.scan.startWork();if(revision===epoch.current){applyWork(s);surface.current?.focus();}}
    catch(e){fail(e);}finally{setBusy(false);}
  };
  const save=async()=>{pause();setBusy(true);setError('');try{acceptConfig(await window.scan.saveConfig(draft));setView('work');}catch(e){fail(e);}finally{setBusy(false);}};
  const submit=async()=>{if(!request||busy)return;pause();setBusy(true);setError('');try{await window.scan.enqueue(request);setMessage('测试标签已加入队列，请核对出纸。');}catch(e){fail(e);}finally{setBusy(false);}};
  const reprint=async()=>{if(!confirmJob||busy)return;setBusy(true);try{await window.scan.reprint(confirmJob.id);setConfirmJob(null);setMessage('重打已加入队列；扫码保持暂停。');}catch(e){fail(e);}finally{setBusy(false);}};
  const duplicate=config.duplicate.mode==='allow'?'每次扫描都打印':`${config.duplicate.windowMs} ms 内拦截相同码`;
  const previewPanel=<section className="panel preview-panel"><div className="section-heading"><h2>{view==='test'?'测试标签':'最近标签'}</h2><span className="eyebrow">PREVIEW</span></div><div className="preview-canvas">{preview?<><img className="label-image" alt={`标签预览：${names[preview.symbology]}`} src={preview.dataUrl}/><p>{request?.settings.width} × {request?.settings.height} mm · {request?.settings.dpi} DPI · {names[preview.symbology]}</p><pre className="preview-content">{preview.content}</pre></>:<div className="placeholder"><div className="blank-label"><span className="scan-mark"/>等待标签内容</div><p>{view==='test'?'输入测试内容后生成预览':'开始扫码后，最近标签会显示在这里'}</p></div>}</div><p className="hint">预览使用实际打印位图；系统提交不代表物理出纸。</p></section>;
  return <main><header><div className="brand"><img src="./icons/icon.svg" alt="扫码重印应用图标"/><div><h1>扫码重印</h1><span>SCAN REPRINT</span></div></div><nav aria-label="主导航">{([['work','工作台'],['config','配置'],['test','手工测试']] as const).map(([key,label])=><button key={key} aria-current={view===key?'page':undefined} onFocus={()=>{if(active.current.active)pause();}} onClick={()=>navigate(key)}>{label}</button>)}</nav><span className="local-badge">本机工作站</span></header>
  {snapshot?.requiresReset&&<div className="notice danger" role="alert">{snapshot.message}<button onClick={()=>{pause();setReset(true);}}>备份并重置配置</button></div>}
  {view==='config'?<><div className="page-heading"><div><span className="eyebrow">WORKSTATION SETUP</span><h2>配置一次，安心扫码</h2><p>配置只保存在本机。进入此页即暂停接收，保存后需重新开始。</p></div><span className="state-pill">扫码已暂停</span></div><SettingsPanel config={draft} change={setDraft} printers={printers} refresh={refresh}/><div className="save-bar"><p>建议每次扫描 1 份。请先用手工测试确认打印效果。</p><button className="primary" disabled={busy||!snapshot||snapshot.requiresReset} onClick={()=>void save()}>保存配置</button></div></>:<><div className="workbench">{view==='work'?<section ref={surface} tabIndex={-1} className={`panel intake ${work.active?'listening':''}`} aria-label="扫码工作区"><div className="section-heading"><span className="eyebrow">SCANNER WORKSTATION</span><span className={`state-pill ${work.active?'live':''}`}><i/>{work.active?'工作中':'待开始'}</span></div><h2 className="work-title">{work.active?'正在接收扫码':'已暂停'}</h2><p className="work-detail">{work.detail}</p><button className="primary start-button" disabled={busy||!snapshot||snapshot.requiresReset} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();}}} onClick={()=>{if(work.active){pause();surface.current?.focus();}else void start();}}>{busy?'正在处理…':work.active?'暂停扫码':'开始扫码'}</button><div className="frame-status" role="status">{work.active?(frameLength?`正在接收本帧 · ${frameLength} 字符`:'等待扫码枪输入 · Enter 后自动提交'):'扫码保持暂停 · 点击或空格键开始，Enter 不启动'}</div><dl className="summary"><div><dt>打印目标</dt><dd>{settings.transport==='system'?settings.printer||'尚未选择打印机':`${settings.transport.toUpperCase()} · ${settings.host}:${settings.port}`}</dd></div><div><dt>标签规格</dt><dd>{settings.width} × {settings.height} mm · {settings.dpi} DPI · {names[settings.symbology]}</dd></div><div><dt>扫描规则</dt><dd>{settings.copies} 份 / 次 · {duplicate}</dd></div></dl><div className="scanner-help"><strong>扫码枪设置：USB 键盘模式 + Enter 后缀</strong><p>保持应用在前台，无需点击输入框。切出应用、打开配置或弹窗后暂停；返回时请重新开始。Esc 可暂停。</p></div></section>:<section className="panel test-panel"><span className="eyebrow">MANUAL TEST</span><h2>手工测试</h2><p>用于无扫码枪时验证内容、标签与打印目标。扫码接收已暂停。</p><label>测试内容<textarea value={raw} placeholder="例如 000123ABC；原样保留空格和大小写" onChange={e=>{setRaw(e.target.value);setError('');}}/></label><p className="hint">不会因 Enter 自动打印。采用已保存配置；GS1、二进制与控制字符会明确拒绝。</p><button className="primary" disabled={!preview||previewKey!==requestKey||busy||snapshot?.requiresReset} onClick={()=>void submit()}>确认打印测试标签</button></section>}{previewPanel}</div><History jobs={jobs} reprint={job=>{pause();setConfirmJob(job);}}/></>}
  <div className={`feedback ${error||previewError?'error':''}`} role={error||previewError?'alert':'status'}>{error||previewError||message}</div><footer>仅重建条码内容与码制，不复制原标签图像。打印失败或结果不确定时，请核对设备后明确重打。</footer>
  {confirmJob&&<ReprintDialog job={confirmJob} busy={busy} cancel={()=>setConfirmJob(null)} confirm={()=>void reprint()}/>}
  {reset&&<dialog ref={resetDialog} className="modal" aria-label="恢复配置" onCancel={()=>setReset(false)}><h2>备份并重置配置</h2><p>原文件将保留在用户数据目录，重置后需重新选择打印机。打印历史不变。</p><div className="dialog-actions"><button autoFocus onClick={()=>setReset(false)}>取消</button><button className="primary" disabled={busy} onClick={()=>{setBusy(true);void window.scan.resetConfig().then(s=>{acceptConfig(s);setReset(false);setView('config');}).catch(fail).finally(()=>setBusy(false));}}>确认恢复默认配置</button></div></dialog>}
  </main>;
}
