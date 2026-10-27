import type { Settings } from '../shared/model';
type Props={settings:Settings;change:(s:Settings)=>void;printers:{name:string;displayName:string}[];refresh:()=>void;auto:boolean;setAuto:(value:boolean)=>void};
export function SettingsPanel({settings:s,change,printers,refresh,auto,setAuto}:Props) {
  const set=<K extends keyof Settings>(key:K,value:Settings[K])=>change({...s,[key]:value});
  return <section className="settings"><h2>打印设置</h2><div className="dimensions">
    <label>宽度 (mm)<input type="number" min="20" max="150" step="0.1" value={s.width} onChange={e=>set('width',Number(e.target.value))}/></label>
    <label>高度 (mm)<input type="number" min="20" max="150" step="0.1" value={s.height} onChange={e=>set('height',Number(e.target.value))}/></label>
    <label>DPI<select value={s.dpi} onChange={e=>set('dpi',Number(e.target.value))}><option>203</option><option>300</option></select></label>
    <label>份数<input type="number" min="1" max="100" value={s.copies} onChange={e=>set('copies',Number(e.target.value))}/></label>
  </div><label className="check"><input type="checkbox" checked={s.humanText} onChange={e=>set('humanText',e.target.checked)}/>显示码下文字</label>
  <div className="output"><label>输出方式<select value={s.transport} onChange={e=>set('transport',e.target.value as Settings['transport'])}><option value="system">系统打印</option><option value="zpl">ZPL 网络打印</option><option value="tspl">TSPL 网络打印</option></select></label>
  {s.transport==='system'?<label>打印机<select value={s.printer} onChange={e=>set('printer',e.target.value)}><option value="">请选择打印机</option>{printers.map(p=><option key={p.name} value={p.name}>{p.displayName||p.name}</option>)}</select></label>:<><label>打印机 IP<input placeholder="192.168.1.100" value={s.host} onChange={e=>set('host',e.target.value)}/></label><label>端口<input type="number" min="1" max="65535" value={s.port} onChange={e=>set('port',Number(e.target.value))}/></label></>}
  </div><div className="settings-foot"><label className="check"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>自动打印</label>{s.transport==='system'&&<button className="link" onClick={refresh}>刷新打印机</button>}</div>
  {auto&&<p className="notice">已启用：在扫码框按 Enter 将直接加入队列。</p>}
  {s.transport==='tspl'&&<p className="hint">TSPL 使用连续纸（GAP 0），请先核对打印机介质设置。</p>}
  </section>;
}
