import zh from './zh-CN.json';
import en from './en.json';
export type Locale='zh-CN'|'en';
export type LanguagePreference='auto'|Locale;
export type MessageCode=keyof typeof zh;
export type Message={code:MessageCode;params?:Record<string,string|number>};
export type DisplayMessage=Message|string;
export const catalogs:Record<Locale,Record<MessageCode,string>>={'zh-CN':zh,en};
export const msg=(code:MessageCode,params?:Message['params']):Message=>params?{code,params}:{code};
export function resolveLocale(preference:LanguagePreference,systemLocale:string):Locale {
  if(preference!=='auto')return preference;
  const language=systemLocale.toLowerCase().split(/[-_]/)[0];
  return language==='en'?'en':'zh-CN';
}
export function parseMessage(value:unknown):Message {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid message');
  const o=value as Record<string,unknown>;
  if(typeof o.code!=='string'||!Object.prototype.hasOwnProperty.call(zh,o.code))throw new Error('Invalid message code');
  let params:Message['params'];
  if(o.params!==undefined){
    if(!o.params||typeof o.params!=='object'||Array.isArray(o.params))throw new Error('Invalid message params');
    params={};const entries=Object.entries(o.params);if(entries.length>8)throw new Error('Too many message params');
    for(const [key,value] of entries){if(!/^[a-zA-Z]{1,32}$/.test(key)||!(typeof value==='string'&&value.length<=2048||typeof value==='number'&&Number.isFinite(value)))throw new Error('Invalid message param');params[key]=value;}
  }
  return msg(o.code as MessageCode,params);
}
const prefix='YOVAL_MESSAGE:';
export function appError(message:DisplayMessage):Error{return new Error(typeof message==='string'?message:prefix+JSON.stringify(message));}
export function errorMessage(error:unknown):Message {
  const text=error instanceof Error?error.message:String(error);
  const start=text.indexOf(prefix);
  if(start>=0){try{return parseMessage(JSON.parse(text.slice(start+prefix.length)));}catch{/* unknown external diagnostic */}}
  return msg('external',{reason:text.slice(0,2048)});
}
export function translate(locale:Locale,message:DisplayMessage):string {
  // Legacy history text is preserved verbatim; never translate user content heuristically.
  if(typeof message==='string')return message;
  return catalogs[locale][message.code].replace(/\{([a-zA-Z]+)\}/g,(_match,key:string)=>{
    const value=message.params?.[key];return typeof value==='number'?new Intl.NumberFormat(locale,{useGrouping:false}).format(value):value===undefined?`{${key}}`:String(value);
  });
}
