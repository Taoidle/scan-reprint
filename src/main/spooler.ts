import { msg, appError } from '../shared/i18n';
import { UncertainError } from './network';
export function submitSpooler(submit:(callback:(success:boolean,reason:string)=>void)=>void,timeout=30000):Promise<void> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new UncertainError(msg('spoolTimeout'))),timeout);
    try {submit((success,reason)=>{clearTimeout(timer);if(success)resolve();else reject(new UncertainError(msg('spoolRejected',{reason:reason.slice(0,2048)})));});}
    catch(error){clearTimeout(timer);reject(new UncertainError(msg('spoolException',{reason:String(error).slice(0,2048)})));}
  });
}

export function beforeSubmission<T>(operation: Promise<T>, timeout=15000): Promise<T> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(appError(msg('prepareTimeout'))),timeout);
    operation.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
