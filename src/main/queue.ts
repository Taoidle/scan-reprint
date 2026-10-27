import { randomUUID } from 'node:crypto';
import type { Job, Label } from '../shared/model';
import { UncertainError } from './network';
function clone<T>(value:T):T {return JSON.parse(JSON.stringify(value)) as T;}
export class PrintQueue {
  private jobs:Job[];
  private running=false;
  private recent=new Map<string,number>();
  constructor(private readonly save:(jobs:Job[])=>void,private readonly send:(label:Label)=>Promise<void>,initial:Job[]=[]) {
    this.jobs=initial.map(j=>j.status==='submitting'?{...j,status:'uncertain',detail:'上次进程中断，可能已提交；请核对后明确重打'}:j.status==='queued'?{...j,status:'failed',detail:'上次进程中断，未自动恢复打印'}:j);
  }
  list():Job[] {return clone(this.jobs);}
  add(label:Label,force=false):Job {
    if(this.jobs.filter(j=>j.status==='queued'||j.status==='submitting').length>=50)throw new Error('队列已满，请等待');
    const key=JSON.stringify([label.content,label.symbology]);const now=Date.now();
    if(!force&&now-(this.recent.get(key)||0)<5000)throw new Error('5 秒内重复扫描已拦截；如需重打，请在记录中明确重打');
    const job:Job={id:randomUUID(),created:new Date().toISOString(),label:clone(label),status:'queued',detail:'等待串行提交'};
    const next=[...this.jobs,job].slice(-200);this.save(next);this.jobs=next;
    this.recent.set(key,now);for(const [k,t] of this.recent)if(now-t>5000)this.recent.delete(k);
    void this.drain();return clone(job);
  }
  reprint(id:string):Job {const job=this.jobs.find(j=>j.id===id);if(!job)throw new Error('找不到记录');if(['queued','submitting'].includes(job.status))throw new Error('该任务仍在提交，请等待');return this.add(job.label,true);}
  private async drain():Promise<void> {
    if(this.running)return;this.running=true;
    try {
      for(;;) {
        const job=this.jobs.find(j=>j.status==='queued');
        if(!job)break;
        try {job.status='submitting';job.detail='正在提交';this.save(this.jobs);}
        catch {job.status='failed';job.detail='历史写入失败，未发送';continue;}
        try {await this.send(job.label);job.status='submitted';job.detail='仅确认系统/网络提交，请核对物理出纸';}
        catch(error) {job.status=error instanceof UncertainError?'uncertain':'failed';job.detail=error instanceof Error?error.message.slice(0,2048):'打印失败';}
        try {this.save(this.jobs);}catch {job.status='uncertain';job.detail='提交后历史保存失败，请核对打印机；重启后不会自动重试';}
      }
    } finally {this.running=false;}
  }
}
