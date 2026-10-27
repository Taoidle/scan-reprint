import { msg, appError } from '../shared/i18n';
import { existsSync, readFileSync, statSync, renameSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { configDefaults, defaults, type AppConfig, type ConfigSnapshot } from '../shared/model';
import { validateSettings } from '../shared/validate';
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw appError(msg('configFormat'));return value as Record<string,unknown>;}
export function parseConfig(value:unknown):AppConfig {
  const o=object(value);
  if(o.version===1){
    // v1 stored printing settings only; missing newer fields get explicit defaults.
    return {version:2,settings:validateSettings({...defaults,...object(o.settings)}),duplicate:{mode:'allow',windowMs:1000}};
  }
  if(o.version!==2)throw appError(msg('configVersion'));
  const d=object(o.duplicate);
  if(!['allow','debounce'].includes(d.mode as string)||typeof d.windowMs!=='number'||!Number.isInteger(d.windowMs)||d.windowMs<100||d.windowMs>60000)throw appError(msg('debounceRange'));
  return {version:2,settings:validateSettings(o.settings),duplicate:{mode:d.mode as 'allow'|'debounce',windowMs:d.windowMs}};
}
export class ConfigStore {
  private state:ConfigSnapshot;
  constructor(private path:string){
    this.state={config:clone(configDefaults),requiresReset:false,message:msg('configFirst')};
    if(!existsSync(path))return;
    try{
      if(statSync(path).size>65536)throw appError(msg('configLarge'));
      const raw=JSON.parse(readFileSync(path,'utf8'));
      this.state={config:parseConfig(raw),requiresReset:false,message:raw.version===1?msg('configMigrated'):msg('configLoaded')};
    }catch{this.state={config:clone(configDefaults),requiresReset:true,message:msg('configDamaged')};}
  }
  get():ConfigSnapshot{return clone(this.state);}
  save(value:unknown):ConfigSnapshot {
    if(this.state.requiresReset)throw appError(msg('configResetFirst'));
    const config=parseConfig(value),fd=openSync(`${this.path}.tmp`,'w',0o600);
    try{writeFileSync(fd,JSON.stringify(config,null,2));fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(`${this.path}.tmp`,this.path);
    this.state={config,requiresReset:false,message:msg('configSaved')};return this.get();
  }
  reset():ConfigSnapshot {
    if(existsSync(this.path))renameSync(this.path,`${this.path}.backup-${Date.now()}-${randomUUID()}.json`);
    this.state={config:clone(configDefaults),requiresReset:false,message:msg('configBackup')};
    const result=this.save(configDefaults);this.state.message=msg('configReset');return {...result,message:this.state.message};
  }
}
