import { msg, appError, errorMessage } from '../shared/i18n';
import { randomUUID } from 'node:crypto';
import type { Job, Label } from '../shared/model';
import { UncertainError } from './network';
function clone<T>(value:T):T {return JSON.parse(JSON.stringify(value)) as T;}
export class PrintQueue {
  private jobs:Job[];
  private running=false;
  private recent=new Map<string,number>();
  constructor(private readonly save:(jobs:Job[])=>void,private readonly send:(label:Label)=>Promise<void>,initial:Job[]=[],private readonly outcome:(job:Job)=>void=()=>{}) {
    this.jobs=initial.map(j=>j.status==='submitting'?{...j,status:'uncertain',detail:msg('restartUncertain')}:j.status==='queued'?{...j,status:'failed',detail:msg('restartQueued')}:j);
  }
  list():Job[] {return clone(this.jobs);}
  add(label:Label,force=false,duplicateMs=0):Job {
    if(this.jobs.filter(j=>j.status==='queued'||j.status==='submitting').length>=50)throw appError(msg('queueFull'));
    const key=JSON.stringify([label.content,label.symbology]);const now=Date.now();
    if(!force&&duplicateMs>0&&now-(this.recent.get(key)||0)<duplicateMs)throw appError(msg('duplicateBlocked',{ms:duplicateMs}));
    const job:Job={id:randomUUID(),created:new Date().toISOString(),label:clone(label),status:'queued',detail:msg('queueWaiting')};
    const next=[...this.jobs,job].slice(-200);this.save(next);this.jobs=next;
    this.recent.set(key,now);for(const [k,t] of this.recent)if(now-t>60000)this.recent.delete(k);
    void this.drain();return clone(job);
  }
  reprint(id:string):Job {const job=this.jobs.find(j=>j.id===id);if(!job)throw appError(msg('recordMissing'));if(['queued','submitting'].includes(job.status))throw appError(msg('jobPending'));return this.add(job.label,true);}
  private async drain():Promise<void> {
    if(this.running)return;this.running=true;
    try {
      for(;;) {
        const job=this.jobs.find(j=>j.status==='queued');
        if(!job)break;
        try {job.status='submitting';job.detail=msg('submitting');this.save(this.jobs);}
        catch {job.status='failed';job.detail=msg('historyWrite');this.outcome(clone(job));continue;}
        try {await this.send(job.label);job.status='submitted';job.detail=msg('submittedDetail');}
        catch(error) {job.status=error instanceof UncertainError?'uncertain':'failed';job.detail=errorMessage(error);}
        try {this.save(this.jobs);}catch {job.status='uncertain';job.detail=msg('historyAfterSubmit');}
        this.outcome(clone(job));
      }
    } finally {this.running=false;}
  }
}
