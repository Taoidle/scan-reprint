import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { errorMessage, msg, translate, type DisplayMessage, type LanguagePreference, type Locale } from '../shared/i18n';
import type { LanguageSnapshot } from '../main/language';
type Context={locale:Locale;preference:LanguagePreference;t:(m:DisplayMessage)=>string;number:(n:number)=>string;save:(p:LanguagePreference)=>Promise<void>};
const context=createContext<Context|null>(null);
export const useLocale=()=>{const value=useContext(context);if(!value)throw new Error('Locale context missing');return value;};
export function LanguageOptions(){
  const {t}=useLocale();return <><option value="auto">{t(msg('autoLanguage'))}</option><option value="zh-CN">简体中文</option><option value="en">English</option></>;
}
export function LanguagePicker(){
  const {t,preference,save}=useLocale();const [error,setError]=useState<DisplayMessage>(''),[busy,setBusy]=useState(false);
  return <section className="panel language-panel"><label>{t(msg('languageTitle'))}<select aria-label={t(msg('languageTitle'))} value={preference} disabled={busy} onChange={e=>{setBusy(true);setError('');void save(e.target.value as LanguagePreference).catch(e=>setError(errorMessage(e))).finally(()=>setBusy(false));}}><LanguageOptions/></select></label><p className="hint">{t(msg('languageHint'))}</p>{error&&<p role="alert">{t(error)}</p>}</section>;
}
export function LocaleRoot({children}:{children:ReactNode}){
  const [state,setState]=useState<LanguageSnapshot|null>(null),[choice,setChoice]=useState<LanguagePreference>('auto'),[error,setError]=useState<DisplayMessage>(''),[busy,setBusy]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{void window.scan.language().then(s=>{setState(s);setChoice(s.preference);}).catch(e=>setError(errorMessage(e)));},[]);
  useEffect(()=>{if(state?.needsChoice)dialog.current?.showModal();},[state?.needsChoice]);
  const locale=state?.locale||'zh-CN';
  useEffect(()=>{document.documentElement.lang=locale;document.title='YOVAL Scan Reprint';},[locale]);
  if(!state)return <main><h1>YOVAL Scan Reprint</h1><p role="alert">{translate(locale,error)}</p></main>;
  const save=async(preference:LanguagePreference)=>{await window.scan.pauseWork();setState(await window.scan.saveLanguage(preference));};
  const t=(m:DisplayMessage)=>translate(locale,m);
  return <context.Provider value={{locale,preference:state.preference,t,number:n=>new Intl.NumberFormat(locale,{useGrouping:false}).format(n),save}}>{children}
    {state.needsChoice&&<dialog ref={dialog} className="modal language-dialog" aria-label="选择语言 / Choose language" onCancel={e=>e.preventDefault()}><h2>{t(msg('chooseLanguage'))}</h2><p>{t(msg('languageFirst'))}</p><label>{t(msg('languageTitle'))}<select autoFocus aria-label="Language preference" value={choice} onChange={e=>setChoice(e.target.value as LanguagePreference)}><LanguageOptions/></select></label><p>{t(msg('languageHint'))}</p>{state.warning&&<p role="alert">{t(state.warning)}</p>}{error&&<p role="alert">{t(error)}</p>}<button className="primary" disabled={busy} onClick={()=>{setBusy(true);void save(choice).catch(e=>setError(errorMessage(e))).finally(()=>setBusy(false));}}>{t(msg('continueLanguage'))}</button></dialog>}
  </context.Provider>;
}
