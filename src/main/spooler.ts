import { UncertainError } from './network';
export function submitSpooler(submit:(callback:(success:boolean,reason:string)=>void)=>void,timeout=30000):Promise<void> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new UncertainError('系统打印回调超时；请核对队列')),timeout);
    try {submit((success,reason)=>{clearTimeout(timer);if(success)resolve();else reject(new UncertainError(`系统未确认成功：${reason}；请核对队列`));});}
    catch(error){clearTimeout(timer);reject(new UncertainError(`系统调用异常：${String(error)}`));}
  });
}

export function beforeSubmission<T>(operation: Promise<T>, timeout=15000): Promise<T> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('打印准备超时，尚未提交')),timeout);
    operation.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
