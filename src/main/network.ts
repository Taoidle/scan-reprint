import { msg, appError, errorMessage, type DisplayMessage } from '../shared/i18n';
import { createConnection } from 'node:net';
export class UncertainError extends Error {constructor(message:DisplayMessage){super(appError(message).message);}}
export function sendNetwork(host:string,port:number,data:Buffer,timeout=10000):Promise<void> {
  return new Promise((resolve,reject)=>{
    let started=false,settled=false;
    const socket=createConnection({host,port});
    const fail=(error:Error)=>{if(settled)return;settled=true;socket.destroy();reject(started?new UncertainError(errorMessage(error)):error);};
    socket.setTimeout(timeout,()=>fail(appError(msg('networkTimeout'))));
    socket.on('error',fail);
    socket.on('close',()=>{if(!settled)fail(appError(msg('connectionClosed')));});
    socket.once('connect',()=>{
      started=true;
      socket.end(data,()=>{if(settled)return;settled=true;socket.destroy();resolve();});
    });
  });
}
