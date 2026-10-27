import { createConnection } from 'node:net';
export class UncertainError extends Error {}
export function sendNetwork(host:string,port:number,data:Buffer,timeout=10000):Promise<void> {
  return new Promise((resolve,reject)=>{
    let started=false,settled=false;
    const socket=createConnection({host,port});
    const fail=(error:Error)=>{if(settled)return;settled=true;socket.destroy();reject(started?new UncertainError(`数据可能已发送：${error.message}`):error);};
    socket.setTimeout(timeout,()=>fail(new Error('网络打印超时')));
    socket.on('error',fail);
    socket.on('close',()=>{if(!settled)fail(new Error('连接提前关闭'));});
    socket.once('connect',()=>{
      started=true;
      socket.end(data,()=>{if(settled)return;settled=true;socket.destroy();resolve();});
    });
  });
}
