import { defaults, names, symbologies, type AppConfig, type Settings } from '../shared/model';
type Props={config:AppConfig;change:(s:AppConfig)=>void;printers:{name:string;displayName:string}[];refresh:()=>void};
export function SettingsPanel({config,change,printers,refresh}:Props) {
  const s=config.settings,set=<K extends keyof Settings>(key:K,value:Settings[K])=>change({...config,settings:{...s,[key]:value}});
  return <div className="config-grid"><section className="panel config-panel"><span className="eyebrow">LABEL</span><h2>标签与编码</h2>
    <label>码制<select aria-label="码制" value={s.symbology} onChange={e=>set('symbology',e.target.value as Settings['symbology'])}>{symbologies.map(key=><option key={key} value={key}>{names[key]}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={s.aim} onChange={e=>set('aim',e.target.checked)}/>识别已配置的 AIM 标识</label>
    {s.aim&&<div className="aim-list">{defaults.aimPrefixes.map(prefix=><label className="check" key={prefix}><input type="checkbox" checked={s.aimPrefixes.includes(prefix)} onChange={e=>set('aimPrefixes',e.target.checked?[...s.aimPrefixes,prefix]:s.aimPrefixes.filter(p=>p!==prefix))}/>{prefix}</label>)}</div>}
    <p className="hint">不猜测码制。无 AIM 标识时使用上方选择；GS1 / FNC1 不支持。</p>
    <div className="dimensions"><label>宽度 (mm)<input type="number" min="20" max="150" step="0.1" value={s.width} onChange={e=>set('width',Number(e.target.value))}/></label><label>高度 (mm)<input type="number" min="20" max="150" step="0.1" value={s.height} onChange={e=>set('height',Number(e.target.value))}/></label><label>DPI<select aria-label="DPI" value={s.dpi} onChange={e=>set('dpi',Number(e.target.value))}><option>203</option><option>300</option></select></label><label>每次扫描份数<input type="number" min="1" max="100" value={s.copies} onChange={e=>set('copies',Number(e.target.value))}/></label></div>
    <label className="check"><input type="checkbox" checked={s.humanText} onChange={e=>set('humanText',e.target.checked)}/>显示码下文字（ASCII）</label>
  </section><section className="panel config-panel"><span className="eyebrow">OUTPUT</span><h2>打印目标与重复码</h2>
    <label>输出方式<select aria-label="输出方式" value={s.transport} onChange={e=>set('transport',e.target.value as Settings['transport'])}><option value="system">系统打印</option><option value="zpl">ZPL 网络打印</option><option value="tspl">TSPL 网络打印</option></select></label>
    {s.transport==='system'?<><label>打印机<select aria-label="打印机" value={s.printer} onChange={e=>set('printer',e.target.value)}><option value="">请选择打印机</option>{s.printer&&!printers.some(p=>p.name===s.printer)&&<option value={s.printer}>{s.printer}（当前不可用）</option>}{printers.map(p=><option key={p.name} value={p.name}>{p.displayName||p.name}</option>)}</select></label><button className="link" onClick={refresh}>刷新打印机</button></>:<div className="dimensions"><label>打印机 IP<input placeholder="例如 192.168.1.100" value={s.host} onChange={e=>set('host',e.target.value)}/></label><label>端口<input type="number" min="1" max="65535" value={s.port} onChange={e=>set('port',Number(e.target.value))}/></label></div>}
    {s.transport==='tspl'&&<p className="hint">TSPL 使用连续纸（GAP 0），请核对介质设置。</p>}
    <div className="divider"/><label>重复码策略<select aria-label="重复码策略" value={config.duplicate.mode} onChange={e=>change({...config,duplicate:{...config.duplicate,mode:e.target.value as 'allow'|'debounce'}})}><option value="allow">每次完整扫描都打印</option><option value="debounce">在指定窗口内拦截相同码</option></select></label>
    {config.duplicate.mode==='debounce'&&<label>防抖窗口 (ms)<input type="number" min="100" max="60000" step="100" value={config.duplicate.windowMs} onChange={e=>change({...config,duplicate:{...config.duplicate,windowMs:Number(e.target.value)}})}/></label>}
    <p className="hint">允许重复时，连续扫同一码也会逐次打印。同一帧重复提交始终只入队一次。</p>
  </section></div>;
}
