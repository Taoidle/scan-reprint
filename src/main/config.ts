import { existsSync, readFileSync, statSync, renameSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { configDefaults, defaults, type AppConfig, type ConfigSnapshot } from '../shared/model';
import { validateSettings } from '../shared/validate';
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('配置格式错误');return value as Record<string,unknown>;}
export function parseConfig(value:unknown):AppConfig {
  const o=object(value);
  if(o.version===1){
    // v1 stored printing settings only; missing newer fields get explicit defaults.
    return {version:2,settings:validateSettings({...defaults,...object(o.settings)}),duplicate:{mode:'allow',windowMs:1000}};
  }
  if(o.version!==2)throw new Error('配置版本不支持');
  const d=object(o.duplicate);
  if(!['allow','debounce'].includes(d.mode as string)||typeof d.windowMs!=='number'||!Number.isInteger(d.windowMs)||d.windowMs<100||d.windowMs>60000)throw new Error('防抖窗口须为 100–60000 ms');
  return {version:2,settings:validateSettings(o.settings),duplicate:{mode:d.mode as 'allow'|'debounce',windowMs:d.windowMs}};
}
export class ConfigStore {
  private state:ConfigSnapshot;
  constructor(private path:string){
    this.state={config:clone(configDefaults),requiresReset:false,message:'请配置打印目标并保存'};
    if(!existsSync(path))return;
    try{
      if(statSync(path).size>65536)throw new Error('配置过大');
      const raw=JSON.parse(readFileSync(path,'utf8'));
      this.state={config:parseConfig(raw),requiresReset:false,message:raw.version===1?'已迁移旧配置；保存后升级为版本 2':'已读取本机配置'};
    }catch{this.state={config:clone(configDefaults),requiresReset:true,message:'配置损坏或版本不支持；请先备份并重置配置。原文件未覆盖。'};}
  }
  get():ConfigSnapshot{return clone(this.state);}
  save(value:unknown):ConfigSnapshot {
    if(this.state.requiresReset)throw new Error('请先备份并重置损坏配置');
    const config=parseConfig(value),fd=openSync(`${this.path}.tmp`,'w',0o600);
    try{writeFileSync(fd,JSON.stringify(config,null,2));fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(`${this.path}.tmp`,this.path);
    this.state={config,requiresReset:false,message:'配置已保存；点击开始扫码后生效'};return this.get();
  }
  reset():ConfigSnapshot {
    if(existsSync(this.path))renameSync(this.path,`${this.path}.backup-${Date.now()}-${randomUUID()}.json`);
    this.state={config:clone(configDefaults),requiresReset:false,message:'原配置已备份'};
    const result=this.save(configDefaults);this.state.message='原配置已备份到同一目录；请重新配置并保存';return {...result,message:this.state.message};
  }
}
