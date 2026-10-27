import { existsSync, readFileSync, statSync, renameSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import { msg, appError, resolveLocale, type LanguagePreference, type Locale, type Message } from '../shared/i18n';
export type LanguageSnapshot={preference:LanguagePreference;locale:Locale;needsChoice:boolean;warning?:Message};
export function parsePreference(value:unknown):LanguagePreference {
  if(value!=='auto'&&value!=='zh-CN'&&value!=='en')throw appError(msg('languageInvalid'));return value;
}
/** Per-user preferences override installer hints. Installer files contain only a validated enum. */
export class LanguageStore {
  private preference:LanguagePreference='auto';private chosen=false;private damaged=false;
  constructor(private path:string,private systemLocale:string,hintPath?:string){
    if(existsSync(path)){
      try{if(statSync(path).size>1024)throw new Error('size');const o=JSON.parse(readFileSync(path,'utf8'));if(o.version!==1)throw new Error('version');this.preference=parsePreference(o.preference);this.chosen=true;}catch{this.damaged=true;}
      return; // Never overwrite an existing user's choice with an installer hint, including corrupt files.
    }
    if(hintPath&&existsSync(hintPath)){
      try{if(statSync(hintPath).size>32)throw new Error('size');const preference=parsePreference(readFileSync(hintPath,'utf8').replace(/\r?\n$/,''));this.save(preference);}catch{/* invalid hint: show first-run choice */}
    }
  }
  get():LanguageSnapshot{return {preference:this.preference,locale:resolveLocale(this.preference,this.systemLocale),needsChoice:!this.chosen,...(this.damaged?{warning:msg('languageDamaged')}:{})};}
  save(value:unknown):LanguageSnapshot {
    const preference=parsePreference(value);
    if(this.damaged&&existsSync(this.path))renameSync(this.path,`${this.path}.backup-${Date.now()}`);
    const fd=openSync(`${this.path}.tmp`,'w',0o600);
    try{writeFileSync(fd,JSON.stringify({version:1,preference}));fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(`${this.path}.tmp`,this.path);this.preference=preference;this.chosen=true;this.damaged=false;return this.get();
  }
}
