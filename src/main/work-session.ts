import { randomUUID } from 'node:crypto';
import { type AppConfig, type Job, type WorkStatus } from '../shared/model';
import { validate } from '../shared/validate';
import { parseConfig } from './config';
import type { PrintQueue } from './queue';
export class WorkSession {
  private state:WorkStatus={active:false,sessionId:'',detail:'点击开始扫码后，扫枪一扫自动提交。'};
  private config:AppConfig|null=null;
  private sequence=0;
  private results=new Map<number,{job?:Job;error?:string}>();
  constructor(private queue:PrintQueue,private foreground:()=>boolean){}
  status():WorkStatus{return {...this.state};}
  start(config:AppConfig):WorkStatus {
    if(!this.foreground())throw new Error('请返回应用前台后开始扫码');
    this.config=parseConfig(config);this.sequence=0;this.results.clear();
    this.state={active:true,sessionId:randomUUID(),detail:'正在接收扫码；每个 Enter 结束的完整扫描自动加入队列。'};return this.status();
  }
  pause(detail='已暂停接收；已入队任务继续处理，不自动重打。'):WorkStatus {this.state={active:false,sessionId:'',detail};return this.status();}
  frame(value:unknown):Job {
    if(!this.foreground()){this.pause('已离开应用；返回后请明确恢复扫码。');throw new Error(this.state.detail);}
    if(!this.state.active||!this.config)throw new Error('扫码已暂停，请重新开始');
    if(!value||typeof value!=='object')throw new Error('扫描帧格式错误');
    const f=value as Record<string,unknown>;
    if(f.sessionId!==this.state.sessionId||!Number.isSafeInteger(f.sequence)||typeof f.sequence!=='number'||f.sequence<1)throw new Error('扫描会话或序号无效');
    const cached=this.results.get(f.sequence);
    if(cached){if(cached.error)throw new Error(cached.error);return JSON.parse(JSON.stringify(cached.job)) as Job;}
    if(f.sequence!==this.sequence+1)throw new Error('扫描序号已过期或不连续；请暂停后重新开始');
    this.sequence=f.sequence;
    try{
      const label=validate({raw:f.raw,settings:this.config.settings});
      const job=this.queue.add(label,false,this.config.duplicate.mode==='allow'?0:this.config.duplicate.windowMs);
      this.results.set(f.sequence,{job});return job;
    }catch(e){const error=e instanceof Error?e.message:'扫描未提交';this.results.set(f.sequence,{error});throw new Error(error);}
    finally{if(this.results.size>64)this.results.delete(this.sequence-64);}
  }
}
