export type FrameResult={kind:'frame';raw:string}|{kind:'error';message:string}|null;
/** A foreground text frame terminated by Enter; never edits or truncates its payload. */
export class ScanFramer {
  private raw='';private invalid='';private last=0;
  reset():void{this.raw='';this.invalid='';this.last=0;}
  invalidate(message:string):void{this.invalid=message;}
  get length():number{return this.raw.length;}
  feed(key:string,repeat=false,composing=false,now=Date.now()):FrameResult {
    if(repeat)return null;
    if(this.raw&&now-this.last>1500)this.invalid='扫描帧间隔超过 1.5 秒，已丢弃整帧，请重新扫描';
    this.last=now;
    if(composing){this.invalid='工作模式不接收输入法组合；请在手工测试区输入';return null;}
    if(key==='Enter'){
      const result:FrameResult=this.invalid?{kind:'error',message:this.invalid}:this.raw?{kind:'frame',raw:this.raw}:null;
      this.reset();return result;
    }
    if(Array.from(key).length!==1){this.invalid='扫描包含不支持的按键；请只配置 Enter 结束后缀';return null;}
    if(this.raw.length+key.length>1024){this.invalid='扫描超过 1024 字符，已拒绝整帧';return null;}
    this.raw+=key;return null;
  }
}
