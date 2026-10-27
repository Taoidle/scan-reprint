import { msg } from '../shared/i18n';
import { LanguagePicker, useLocale } from './Locale';
import { defaults, names, symbologies, type AppConfig, type Settings } from '../shared/model';
type Props={config:AppConfig;change:(s:AppConfig)=>void;printers:{name:string;displayName:string}[];refresh:()=>void};
export function SettingsPanel({config,change,printers,refresh}:Props) {
  const {t}=useLocale();
  const s=config.settings,set=<K extends keyof Settings>(key:K,value:Settings[K])=>change({...config,settings:{...s,[key]:value}});
  return <><LanguagePicker/><div className="config-grid"><section className="panel config-panel"><span className="eyebrow">{t(msg('labelEyebrow'))}</span><h2>{t(msg('labelEncoding'))}</h2>
    <label>{t(msg('symbology'))}<select aria-label={t(msg('symbology'))} value={s.symbology} onChange={e=>set('symbology',e.target.value as Settings['symbology'])}>{symbologies.map(key=><option key={key} value={key}>{names[key]}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={s.aim} onChange={e=>set('aim',e.target.checked)}/>{t(msg('aimEnabled'))}</label>
    {s.aim&&<div className="aim-list">{defaults.aimPrefixes.map(prefix=><label className="check" key={prefix}><input type="checkbox" checked={s.aimPrefixes.includes(prefix)} onChange={e=>set('aimPrefixes',e.target.checked?[...s.aimPrefixes,prefix]:s.aimPrefixes.filter(p=>p!==prefix))}/>{prefix}</label>)}</div>}
    <p className="hint">{t(msg('aimHint'))}</p>
    <div className="dimensions"><label>{t(msg('width'))}<input type="number" min="20" max="150" step="0.1" value={s.width} onChange={e=>set('width',Number(e.target.value))}/></label><label>{t(msg('height'))}<input type="number" min="20" max="150" step="0.1" value={s.height} onChange={e=>set('height',Number(e.target.value))}/></label><label>DPI<select aria-label="DPI" value={s.dpi} onChange={e=>set('dpi',Number(e.target.value))}><option>203</option><option>300</option></select></label><label>{t(msg('copies'))}<input type="number" min="1" max="100" value={s.copies} onChange={e=>set('copies',Number(e.target.value))}/></label></div>
    <label className="check"><input type="checkbox" checked={s.humanText} onChange={e=>set('humanText',e.target.checked)}/>{t(msg('humanText'))}</label>
  </section><section className="panel config-panel"><span className="eyebrow">{t(msg('outputEyebrow'))}</span><h2>{t(msg('outputDuplicate'))}</h2>
    <label>{t(msg('outputMethod'))}<select aria-label={t(msg('outputMethod'))} value={s.transport} onChange={e=>set('transport',e.target.value as Settings['transport'])}><option value="system">{t(msg('systemPrint'))}</option><option value="zpl">{t(msg('zplPrint'))}</option><option value="tspl">{t(msg('tsplPrint'))}</option></select></label>
    {s.transport==='system'?<><label>{t(msg('printer'))}<select aria-label={t(msg('printer'))} value={s.printer} onChange={e=>set('printer',e.target.value)}><option value="">{t(msg('choosePrinter'))}</option>{s.printer&&!printers.some(p=>p.name===s.printer)&&<option value={s.printer}>{s.printer} {t(msg('unavailable'))}</option>}{printers.map(p=><option key={p.name} value={p.name}>{p.displayName||p.name}</option>)}</select></label><button className="link" onClick={refresh}>{t(msg('refreshPrinters'))}</button></>:<div className="dimensions"><label>{t(msg('printerIp'))}<input placeholder={t(msg('ipExample'))} value={s.host} onChange={e=>set('host',e.target.value)}/></label><label>{t(msg('port'))}<input type="number" min="1" max="65535" value={s.port} onChange={e=>set('port',Number(e.target.value))}/></label></div>}
    {s.transport==='tspl'&&<p className="hint">{t(msg('tsplHint'))}</p>}
    <div className="divider"/><label>{t(msg('duplicatePolicy'))}<select aria-label={t(msg('duplicatePolicy'))} value={config.duplicate.mode} onChange={e=>change({...config,duplicate:{...config.duplicate,mode:e.target.value as 'allow'|'debounce'}})}><option value="allow">{t(msg('allowDuplicate'))}</option><option value="debounce">{t(msg('debounceDuplicate'))}</option></select></label>
    {config.duplicate.mode==='debounce'&&<label>{t(msg('debounceWindow'))}<input type="number" min="100" max="60000" step="100" value={config.duplicate.windowMs} onChange={e=>change({...config,duplicate:{...config.duplicate,windowMs:Number(e.target.value)}})}/></label>}
    <p className="hint">{t(msg('duplicateHint'))}</p>
  </section></div></>;
}
