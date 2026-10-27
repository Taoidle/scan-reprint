import { msg, errorMessage, type DisplayMessage } from '../shared/i18n';
import { useLocale } from './Locale';
import { useEffect, useRef, useState } from 'react';
import { configDefaults, names, type AppConfig, type ConfigSnapshot, type Job, type Preview, type Request, type WorkStatus } from '../shared/model';
import { ScanFramer } from '../shared/scan-framer';
import { SettingsPanel } from './SettingsPanel';
import { History } from './History';
import { ReprintDialog } from './ReprintDialog';
type View='work'|'config'|'test';
const paused:WorkStatus={active:false,sessionId:'',detail:msg('ready')};
const errorText=errorMessage;
export function App(){
  const {t,number}=useLocale();
  const [snapshot,setSnapshot]=useState<ConfigSnapshot|null>(null),[draft,setDraft]=useState<AppConfig>(configDefaults),[view,setView]=useState<View>('work');
  const [work,setWork]=useState(paused),[jobs,setJobs]=useState<Job[]>([]),[printers,setPrinters]=useState<{name:string;displayName:string}[]>([]);
  const [error,setError]=useState<DisplayMessage>(''),[message,setMessage]=useState<DisplayMessage>(''),[busy,setBusy]=useState(false),[confirmJob,setConfirmJob]=useState<Job|null>(null),[reset,setReset]=useState(false);
  const [raw,setRaw]=useState(''),[last,setLast]=useState<Request|null>(null),[preview,setPreview]=useState<Preview|null>(null),[previewError,setPreviewError]=useState<DisplayMessage>(''),[previewKey,setPreviewKey]=useState('');
  const [frameLength,setFrameLength]=useState(0);
  const active=useRef(paused),epoch=useRef(0),sequence=useRef(0),framer=useRef(new ScanFramer()),surface=useRef<HTMLElement>(null),configRef=useRef(configDefaults),resetDialog=useRef<HTMLDialogElement>(null);
  const fail=(e:unknown)=>setError(errorText(e));
  const applyWork=(value:WorkStatus)=>{active.current=value;setWork(value);if(!value.active){framer.current.reset();setFrameLength(0);}};
  const pause=()=>{const revision=++epoch.current;applyWork({...paused,detail:msg('workPaused')});void window.scan.pauseWork().then(s=>{if(epoch.current===revision)applyWork(s);}).catch(fail);};
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
      if(target.closest('input,textarea,select,button,a,[contenteditable="true"],dialog')){pause();return;}
      if(e.ctrlKey||e.metaKey||e.altKey){framer.current.invalidate(msg('shortcutScan'));return;}
      if(['Shift','CapsLock','Control','Alt','Meta'].includes(e.key))return;
      if(e.key==='Tab'){framer.current.invalidate(msg('tabScan'));return;}
      e.preventDefault();const result=framer.current.feed(e.key,e.repeat,e.isComposing);setFrameLength(framer.current.length);
      if(result?.kind==='error'){setError(result.message);return;}
      if(result?.kind!=='frame')return;
      const frame={sessionId:active.current.sessionId,sequence:++sequence.current,raw:result.raw};
      setLast({raw:result.raw,settings:configRef.current.settings});setError('');
      void window.scan.scanFrame(frame).then(()=>setMessage(msg('scanQueued'))).catch(fail);
    };
    const focus=(e:FocusEvent)=>{const target=e.target as HTMLElement;if(active.current.active&&target.closest('input,textarea,select,button,a,[contenteditable="true"]')&&!target.closest('[data-work-toggle]'))pause();};
    const paste=(e:ClipboardEvent)=>{if(active.current.active){e.preventDefault();pause();setError(msg('pasteScan'));}};
    const composition=()=>{if(active.current.active)framer.current.invalidate(msg('imeScan'));};
    document.addEventListener('focusin',focus);document.addEventListener('keydown',key,true);document.addEventListener('paste',paste,true);document.addEventListener('compositionstart',composition);
    return()=>{clearInterval(timer);window.removeEventListener('blur',blur);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',key,true);document.removeEventListener('paste',paste,true);document.removeEventListener('compositionstart',composition);};
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
  const submit=async()=>{if(!request||busy)return;pause();setBusy(true);setError('');try{await window.scan.enqueue(request);setMessage(msg('testQueued'));}catch(e){fail(e);}finally{setBusy(false);}};
  const reprint=async()=>{if(!confirmJob||busy)return;setBusy(true);try{await window.scan.reprint(confirmJob.id);setConfirmJob(null);setMessage(msg('reprintQueued'));}catch(e){fail(e);}finally{setBusy(false);}};
  const duplicate=config.duplicate.mode==='allow'?t(msg('repeatAll')):t(msg('repeatWindow',{ms:config.duplicate.windowMs}));
  const previewPanel=<section className="panel preview-panel"><div className="section-heading"><h2>{view==='test'?t(msg('testLabel')):t(msg('recentLabel'))}</h2><span className="eyebrow">{t(msg('previewEyebrow'))}</span></div><div className="preview-canvas">{preview?<><img className="label-image" alt={t(msg('previewAlt',{type:names[preview.symbology]}))} src={preview.dataUrl}/><p>{number(request?.settings.width||0)} × {number(request?.settings.height||0)} mm · {request?.settings.dpi} DPI · {names[preview.symbology]}</p><pre className="preview-content">{preview.content}</pre></>:<div className="placeholder"><div className="blank-label"><span className="scan-mark"/>{t(msg('waitingContent'))}</div><p>{view==='test'?t(msg('testPreview')):t(msg('workPreview'))}</p></div>}</div><p className="hint">{t(msg('previewHint'))}</p></section>;
  return <main><header><div className="brand"><img src="./icons/icon.svg" alt={t(msg('iconAlt'))}/><div><h1>YOVAL Scan Reprint</h1><span>广州铱川创新科技有限公司</span></div></div><nav aria-label={t(msg('navigation'))}>{([['work',t(msg('workTab'))],['config',t(msg('configTab'))],['test',t(msg('testTab'))]] as const).map(([key,label])=><button key={key} aria-current={view===key?'page':undefined} onFocus={()=>{if(active.current.active)pause();}} onClick={()=>navigate(key)}>{label}</button>)}</nav><span className="local-badge">{t(msg('localStation'))}</span></header>
  {snapshot?.requiresReset&&<div className="notice danger" role="alert">{t(snapshot.message)}<button onClick={()=>{pause();setReset(true);}}>{t(msg('resetConfigButton'))}</button></div>}
  {view==='config'?<><div className="page-heading"><div><span className="eyebrow">{t(msg('setupEyebrow'))}</span><h2>{t(msg('setupTitle'))}</h2><p>{t(msg('setupHint'))}</p></div><span className="state-pill">{t(msg('scanPaused'))}</span></div><SettingsPanel config={draft} change={setDraft} printers={printers} refresh={refresh}/><div className="save-bar"><p>{t(msg('oneCopyHint'))}</p><button className="primary" disabled={busy||!snapshot||snapshot.requiresReset} onClick={()=>void save()}>{t(msg('saveConfigButton'))}</button></div></>:<><div className="workbench">{view==='work'?<section ref={surface} tabIndex={-1} className={`panel intake ${work.active?'listening':''}`} aria-label={t(msg('workArea'))}><div className="section-heading"><span className="eyebrow">{t(msg('workEyebrow'))}</span><span className={`state-pill ${work.active?'live':''}`}><i/>{work.active?t(msg('working')):t(msg('standby'))}</span></div><h2 className="work-title">{work.active?t(msg('receiving')):t(msg('paused'))}</h2><p className="work-detail">{t(work.detail)}</p><button className="primary start-button" data-work-toggle="true" disabled={busy||!snapshot||snapshot.requiresReset} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(e.key==='Enter'&&e.altKey&&!busy){if(work.active){pause();surface.current?.focus();}else void start();}}}} onClick={()=>{if(work.active){pause();surface.current?.focus();}else void start();}}>{busy?t(msg('processing')):work.active?t(msg('pauseButton')):t(msg('startButton'))}</button><div className="frame-status" role="status">{work.active?(frameLength?t(msg('frameLength',{count:frameLength})):t(msg('waitingScanner'))):t(msg('pausedHelp'))}</div><dl className="summary"><div><dt>{t(msg('printTarget'))}</dt><dd>{settings.transport==='system'?settings.printer||t(msg('noPrinter')):`${settings.transport.toUpperCase()} · ${settings.host}:${settings.port}`}</dd></div><div><dt>{t(msg('labelSpec'))}</dt><dd>{number(settings.width)} × {number(settings.height)} mm · {settings.dpi} DPI · {names[settings.symbology]}</dd></div><div><dt>{t(msg('scanRules'))}</dt><dd>{t(msg('copiesRule',{count:settings.copies,rule:duplicate}))}</dd></div></dl><div className="scanner-help"><strong>{t(msg('scannerSetup'))}</strong><p>{t(msg('scannerHelp'))}</p></div></section>:<section className="panel test-panel"><span className="eyebrow">{t(msg('testEyebrow'))}</span><h2>{t(msg('testTab'))}</h2><p>{t(msg('testHint'))}</p><label>{t(msg('testContent'))}<textarea aria-label={t(msg('testContent'))} value={raw} placeholder={t(msg('testPlaceholder'))} onChange={e=>{setRaw(e.target.value);setError('');}}/></label><p className="hint">{t(msg('testEnterHint'))}</p><button className="primary" disabled={!preview||previewKey!==requestKey||busy||snapshot?.requiresReset} onClick={()=>void submit()}>{t(msg('printTest'))}</button></section>}{previewPanel}</div><History jobs={jobs} reprint={job=>{pause();setConfirmJob(job);}}/></>}
  <div className={`feedback ${error||previewError?'error':''}`} role={error||previewError?'alert':'status'}>{t(error||previewError||message)}</div><footer>{t(msg('footer'))}</footer>
  {confirmJob&&<ReprintDialog job={confirmJob} busy={busy} cancel={()=>setConfirmJob(null)} confirm={()=>void reprint()}/>}
  {reset&&<dialog ref={resetDialog} className="modal" aria-label={t(msg('restoreTitle'))} onCancel={()=>setReset(false)}><h2>{t(msg('resetConfigButton'))}</h2><p>{t(msg('resetHint'))}</p><div className="dialog-actions"><button autoFocus onClick={()=>setReset(false)}>{t(msg('cancel'))}</button><button className="primary" disabled={busy} onClick={()=>{setBusy(true);void window.scan.resetConfig().then(s=>{acceptConfig(s);setReset(false);setView('config');}).catch(fail).finally(()=>setBusy(false));}}>{t(msg('confirmReset'))}</button></div></dialog>}
  </main>;
}
