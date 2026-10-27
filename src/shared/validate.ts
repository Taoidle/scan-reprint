import { isIP } from 'node:net';
import { type Label, type Settings, symbologies } from './model';
function hasUnsupportedCharacters(value: string): boolean {
  return Array.from(value).some(c=>{const n=c.codePointAt(0)!;return n<32||(n>=127&&n<=159)||(n>=0xd800&&n<=0xdfff);});
}
const aimMap = {']Q1':'qrcode',']C0':'code128',']E0':'ean13',']d1':'datamatrix'} as const;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求格式错误');
  return value as Record<string,unknown>;
}
function num(o: Record<string,unknown>,key:string,min:number,max:number): number {
  const n=o[key]; if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max) throw new Error(`${key} 超出范围`); return n;
}
function str(o:Record<string,unknown>,key:string,max:number):string {
  const s=o[key]; if(typeof s!=='string'||s.length>max) throw new Error(`${key} 格式错误`); return s;
}
function bool(o:Record<string,unknown>,key:string):boolean {if(typeof o[key]!=='boolean') throw new Error(`${key} 格式错误`); return o[key] as boolean;}
export function validateSettings(value:unknown):Settings {
  const s=object(value);
  if(!symbologies.includes(s.symbology as never)) throw new Error('请选择支持的码制');
  if(!Array.isArray(s.aimPrefixes)||s.aimPrefixes.length>4||s.aimPrefixes.some(p=>typeof p!=='string'||!Object.prototype.hasOwnProperty.call(aimMap,p))) throw new Error('AIM 配置含不支持的标识');
  const settings: Settings = {symbology:s.symbology as Settings['symbology'],aim:bool(s,'aim'),aimPrefixes:[...s.aimPrefixes],width:num(s,'width',20,150),height:num(s,'height',20,150),dpi:num(s,'dpi',203,300),copies:num(s,'copies',1,100),humanText:bool(s,'humanText'),transport:s.transport as Settings['transport'],printer:str(s,'printer',256),host:str(s,'host',64),port:num(s,'port',1,65535)};
  if(![203,300].includes(settings.dpi)||!Number.isInteger(settings.copies)||!Number.isInteger(settings.port)) throw new Error('DPI、份数或端口不合法');
  if(!['system','zpl','tspl'].includes(settings.transport)) throw new Error('输出方式不合法');
  if(hasUnsupportedCharacters(settings.printer)) throw new Error('打印机名称不合法');
  if(settings.transport!=='system'&&!isIP(settings.host)) throw new Error('网络打印仅接受明确的 IPv4/IPv6 地址');
  return settings;
}
export function validate(value: unknown): Label {
  const o=object(value), s=object(o.settings), raw=str(o,'raw',1024);
  if(!raw.length) throw new Error('请扫描或输入内容');
  // Keyboard wedge is a text transport: never guess binary, FNC1 or GS1 semantics.
  if(hasUnsupportedCharacters(raw)) throw new Error('不支持控制字符、GS1/FNC1、二进制或无效 Unicode');
  const settings=validateSettings(s);
  let content=raw, symbology=settings.symbology;
  if(settings.aim && raw.startsWith(']')) {
    const prefix=raw.slice(0,3);
    if(!Object.prototype.hasOwnProperty.call(aimMap,prefix)||!settings.aimPrefixes.includes(prefix)) throw new Error('未知、禁用或不支持的 AIM 标识（GS1 不支持）');
    symbology=aimMap[prefix as keyof typeof aimMap]; content=raw.slice(3);
  }
  if(!content) throw new Error('条码内容为空');
  if(symbology==='datamatrix'&&!/^[\x20-\x7e]+$/.test(content)) throw new Error('Data Matrix 暂仅支持 ASCII；Unicode 请使用 QR Code');
  if(symbology==='code128'&&!/^[\x20-\x7e]+$/.test(content)) throw new Error('Code 128 仅支持可打印 ASCII');
  if(symbology==='ean13') {
    if(!/^\d{13}$/.test(content)) throw new Error('EAN-13 必须包含完整的 13 位数字（含校验位）');
    const sum=[...content.slice(0,12)].reduce((a,c,i)=>a+Number(c)*(i%2?3:1),0);
    if((10-sum%10)%10!==Number(content[12])) throw new Error('EAN-13 校验位错误');
  }
  if(settings.humanText&&!/^[\x20-\x7e]+$/.test(content)) throw new Error('码下文字目前仅支持 ASCII；中文内容请关闭码下文字');
  return {raw,settings,content,symbology};
}
