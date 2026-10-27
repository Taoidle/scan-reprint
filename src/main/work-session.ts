import { msg, appError, errorMessage, type DisplayMessage } from '../shared/i18n';
import { randomUUID } from 'node:crypto';
import { type AppConfig, type Job, type WorkStatus } from '../shared/model';
import { validate } from '../shared/validate';
import { parseConfig } from './config';
import type { PrintQueue } from './queue';
export class WorkSession {
  private state:WorkStatus={active:false,sessionId:'',detail:msg('workReady')};
  private config:AppConfig|null=null;
  private sequence=0;
  private results=new Map<number,{job?:Job;error?:DisplayMessage}>();
  constructor(private queue:PrintQueue,private foreground:()=>boolean){}
  status():WorkStatus{return {...this.state};}
  start(config:AppConfig):WorkStatus {
    if(!this.foreground())throw appError(msg('foregroundOnly'));
    this.config=parseConfig(config);this.sequence=0;this.results.clear();
    this.state={active:true,sessionId:randomUUID(),detail:msg('workActive')};return this.status();
  }
  pause(detail:DisplayMessage=msg('workPaused')):WorkStatus {this.state={active:false,sessionId:'',detail};return this.status();}
  frame(value:unknown):Job {
    if(!this.foreground()){this.pause(msg('blurPaused'));throw appError(this.state.detail);}
    if(!this.state.active||!this.config)throw appError(msg('workRestart'));
    if(!value||typeof value!=='object')throw appError(msg('frameFormat'));
    const f=value as Record<string,unknown>;
    if(f.sessionId!==this.state.sessionId||!Number.isSafeInteger(f.sequence)||typeof f.sequence!=='number'||f.sequence<1)throw appError(msg('frameSession'));
    const cached=this.results.get(f.sequence);
    if(cached){if(cached.error)throw appError(cached.error);return JSON.parse(JSON.stringify(cached.job)) as Job;}
    if(f.sequence!==this.sequence+1)throw appError(msg('frameSequence'));
    this.sequence=f.sequence;
    try{
      const label=validate({raw:f.raw,settings:this.config.settings});
      const job=this.queue.add(label,false,this.config.duplicate.mode==='allow'?0:this.config.duplicate.windowMs);
      this.results.set(f.sequence,{job});return job;
    }catch(e){const error=errorMessage(e);this.results.set(f.sequence,{error});throw appError(error);}
    finally{if(this.results.size>64)this.results.delete(this.sequence-64);}
  }
}
