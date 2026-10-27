import { useEffect, useRef, useState } from 'react';
import { defaults, names, type Job, type Preview, type Settings, symbologies } from '../shared/model';
import { SettingsPanel } from './SettingsPanel';
import { History } from './History';
import { ReprintDialog } from './ReprintDialog';
export function App() {
  const [raw,setRaw]=useState(''),[settings,setSettings]=useState<Settings>(defaults),[auto,setAuto]=useState(false);
  const [preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[previewError,setPreviewError]=useState(''),[message,setMessage]=useState('等待扫码或手工输入'),[jobs,setJobs]=useState<Job[]>([]);
  const [printers,setPrinters]=useState<{name:string;displayName:string}[]>([]),[busy,setBusy]=useState(false),[confirmJob,setConfirmJob]=useState<Job|null>(null);
  const input=useRef<HTMLTextAreaElement>(null),revision=useRef(0),rawRef=useRef(''),pending=useRef(0);
  const [previewKey,setPreviewKey]=useState('');
  const requestKey=JSON.stringify({raw,settings});
  const changeRaw=(value:string)=>{rawRef.current=value;setRaw(value);};
  const fail=(e:unknown)=>setError(e instanceof Error?e.message:String(e));
  const refresh=()=>{void window.scan.printers().then(setPrinters).catch(fail);};
  useEffect(()=>{refresh();input.current?.focus();const timer=setInterval(()=>{void window.scan.history().then(setJobs).catch(fail);},750);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    const id=++revision.current;setPreview(null);setPreviewError('');
    if(!raw)return;
    const timer=setTimeout(()=>{void window.scan.preview({raw,settings}).then(p=>{if(id===revision.current){setPreview(p);setPreviewKey(JSON.stringify({raw,settings}));}}).catch(e=>{if(id===revision.current)setPreviewError(e instanceof Error?e.message:String(e));});},180);
    return()=>clearTimeout(timer);
  },[raw,settings]);
  const submit=async()=>{
    const request={raw:rawRef.current,settings};
    if(!request.raw)return;
    pending.current++;setBusy(true);setError('');changeRaw('');
    try {await window.scan.enqueue(request);setMessage('已加入串行队列；请在记录中查看提交状态');input.current?.focus();}
    catch(e){
      if(!auto&&!rawRef.current)changeRaw(request.raw);
      setError(`未提交内容 ${JSON.stringify(request.raw)}：${e instanceof Error?e.message:String(e)}`);
    } finally {pending.current--;setBusy(pending.current>0);}
  };
  const reprint=async()=>{if(!confirmJob||busy)return;setBusy(true);try{await window.scan.reprint(confirmJob.id);setConfirmJob(null);setMessage('重打已加入队列');}catch(e){fail(e);}finally{setBusy(false);}};
  return <main><header><h1>扫码重印</h1><span>Scan Reprint</span></header><div className="workbench"><div className="panel intake"><section><h2>扫码内容</h2><textarea ref={input} aria-label="扫码内容" placeholder="点击这里扫描，或手工输入后按 Enter" value={raw} onChange={e=>{changeRaw(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();if(auto)void submit();else setMessage('请核对预览后点击确认打印');}}}/><p className="hint">保留前导零、大小写与空格 · Enter 作为扫码结束键</p><div className="scan-options"><label>码制<select value={settings.symbology} onChange={e=>setSettings({...settings,symbology:e.target.value as Settings['symbology']})}>{symbologies.map(s=><option key={s} value={s}>{names[s]}</option>)}</select></label><label className="check"><input type="checkbox" checked={settings.aim} onChange={e=>setSettings({...settings,aim:e.target.checked})}/>AIM 识别</label></div>{settings.aim&&<details><summary>配置可识别 AIM 标识</summary><div className="aim-list">{defaults.aimPrefixes.map(prefix=><label className="check" key={prefix}><input type="checkbox" checked={settings.aimPrefixes.includes(prefix)} onChange={e=>setSettings({...settings,aimPrefixes:e.target.checked?[...settings.aimPrefixes,prefix]:settings.aimPrefixes.filter(p=>p!==prefix)})}/>{prefix}</label>)}</div><p className="hint">仅识别勾选的非 GS1 标识；没有标识时使用所选码制。</p></details>}</section><SettingsPanel settings={settings} change={setSettings} printers={printers} refresh={refresh} auto={auto} setAuto={setAuto}/></div>
  <section className="panel preview-panel"><h2>标签预览</h2><div className="preview-canvas">{preview?<><img className="label-image" alt={`标签预览：${names[preview.symbology]}`} src={preview.dataUrl} style={{aspectRatio:`${settings.width}/${settings.height}`}}/><p>{settings.width} × {settings.height} mm · {settings.dpi} DPI · {names[preview.symbology]}</p></>:<div className="placeholder"><div className="blank-label">等待标签内容</div><p>输入后生成实际打印位图</p></div>}</div><button className="primary" disabled={!preview||previewKey!==requestKey||busy} onClick={()=>void submit()}>{busy?'正在加入队列…':'确认打印'}</button><button className="secondary" onClick={()=>input.current?.focus()}>重新聚焦扫码</button><div className="feedback" role={error||previewError?'alert':'status'}>{error||previewError||(preview?'请核对标签与打印设置后确认打印':message)}</div></section></div><History jobs={jobs} reprint={setConfirmJob}/><footer>已提交不代表物理出纸，请核对打印机。仅重建条码内容与码制，不复制原标签图像。</footer>
  {confirmJob&&<ReprintDialog job={confirmJob} busy={busy} cancel={()=>setConfirmJob(null)} confirm={()=>void reprint()}/>}</main>;
}
