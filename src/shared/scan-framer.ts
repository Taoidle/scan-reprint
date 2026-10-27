import { msg, type DisplayMessage } from './i18n';
export type FrameResult={kind:'frame';raw:string}|{kind:'error';message:DisplayMessage}|null;
/** A foreground text frame terminated by Enter; never edits or truncates its payload. */
export class ScanFramer {
  private raw='';private invalid:DisplayMessage='';private last=0;
  reset():void{this.raw='';this.invalid='';this.last=0;}
  invalidate(message:DisplayMessage):void{this.invalid=message;}
  get length():number{return this.raw.length;}
  feed(key:string,repeat=false,composing=false,now=Date.now()):FrameResult {
    if(repeat)return null;
    if(this.raw&&now-this.last>1500)this.invalid=msg('frameTimeout');
    this.last=now;
    if(composing){this.invalid=msg('frameIme');return null;}
    if(key==='Enter'){
      const result:FrameResult=this.invalid?{kind:'error',message:this.invalid}:this.raw?{kind:'frame',raw:this.raw}:null;
      this.reset();return result;
    }
    if(Array.from(key).length!==1){this.invalid=msg('frameKey');return null;}
    if(this.raw.length+key.length>1024){this.invalid=msg('frameLong');return null;}
    this.raw+=key;return null;
  }
}
