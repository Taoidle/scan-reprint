import { msg, appError } from './i18n';
import { isIP } from 'node:net';
import { type Label, type Settings, symbologies } from './model';
function hasUnsupportedCharacters(value: string): boolean {
  return Array.from(value).some(c=>{const n=c.codePointAt(0)!;return n<32||(n>=127&&n<=159)||(n>=0xd800&&n<=0xdfff);});
}
const aimMap = {']Q1':'qrcode',']C0':'code128',']E0':'ean13',']d1':'datamatrix'} as const;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw appError(msg('requestFormat'));
  return value as Record<string,unknown>;
}
function num(o: Record<string,unknown>,key:string,min:number,max:number): number {
  const n=o[key]; if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max) throw appError(msg('fieldRange',{field:key})); return n;
}
function str(o:Record<string,unknown>,key:string,max:number):string {
  const s=o[key]; if(typeof s!=='string'||s.length>max) throw appError(msg('fieldFormat',{field:key})); return s;
}
function bool(o:Record<string,unknown>,key:string):boolean {if(typeof o[key]!=='boolean') throw appError(msg('fieldFormat',{field:key})); return o[key] as boolean;}
export function validateSettings(value:unknown):Settings {
  const s=object(value);
  if(!symbologies.includes(s.symbology as never)) throw appError(msg('symbologyUnsupported'));
  if(!Array.isArray(s.aimPrefixes)||s.aimPrefixes.length>4||s.aimPrefixes.some(p=>typeof p!=='string'||!Object.prototype.hasOwnProperty.call(aimMap,p))) throw appError(msg('aimConfig'));
  const settings: Settings = {symbology:s.symbology as Settings['symbology'],aim:bool(s,'aim'),aimPrefixes:[...s.aimPrefixes],width:num(s,'width',20,150),height:num(s,'height',20,150),dpi:num(s,'dpi',203,300),copies:num(s,'copies',1,100),humanText:bool(s,'humanText'),transport:s.transport as Settings['transport'],printer:str(s,'printer',256),host:str(s,'host',64),port:num(s,'port',1,65535)};
  if(![203,300].includes(settings.dpi)||!Number.isInteger(settings.copies)||!Number.isInteger(settings.port)) throw appError(msg('printNumbers'));
  if(!['system','zpl','tspl'].includes(settings.transport)) throw appError(msg('transportInvalid'));
  if(hasUnsupportedCharacters(settings.printer)) throw appError(msg('printerInvalid'));
  if(settings.transport!=='system'&&!isIP(settings.host)) throw appError(msg('ipOnly'));
  return settings;
}
export function validate(value: unknown): Label {
  const o=object(value), s=object(o.settings), raw=str(o,'raw',1024);
  if(!raw.length) throw appError(msg('contentRequired'));
  // Keyboard wedge is a text transport: never guess binary, FNC1 or GS1 semantics.
  if(hasUnsupportedCharacters(raw)) throw appError(msg('charactersUnsupported'));
  const settings=validateSettings(s);
  let content=raw, symbology=settings.symbology;
  if(settings.aim && raw.startsWith(']')) {
    const prefix=raw.slice(0,3);
    if(!Object.prototype.hasOwnProperty.call(aimMap,prefix)||!settings.aimPrefixes.includes(prefix)) throw appError(msg('aimUnsupported'));
    symbology=aimMap[prefix as keyof typeof aimMap]; content=raw.slice(3);
  }
  if(!content) throw appError(msg('contentEmpty'));
  if(symbology==='datamatrix'&&!/^[\x20-\x7e]+$/.test(content)) throw appError(msg('dataMatrixAscii'));
  if(symbology==='code128'&&!/^[\x20-\x7e]+$/.test(content)) throw appError(msg('code128Ascii'));
  if(symbology==='ean13') {
    if(!/^\d{13}$/.test(content)) throw appError(msg('eanLength'));
    const sum=[...content.slice(0,12)].reduce((a,c,i)=>a+Number(c)*(i%2?3:1),0);
    if((10-sum%10)%10!==Number(content[12])) throw appError(msg('eanCheck'));
  }
  if(settings.humanText&&!/^[\x20-\x7e]+$/.test(content)) throw appError(msg('textAscii'));
  return {raw,settings,content,symbology};
}
