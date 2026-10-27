import { msg, type DisplayMessage, type Message } from './i18n';
export const symbologies = ['qrcode', 'code128', 'ean13', 'datamatrix'] as const;
export type Symbology = typeof symbologies[number];
export type Settings = {
  symbology: Symbology; aim: boolean; aimPrefixes: string[];
  width: number; height: number; dpi: number; copies: number; humanText: boolean;
  transport: 'system' | 'zpl' | 'tspl'; printer: string; host: string; port: number;
};
export type Request = {raw: string; settings: Settings};
export type Label = Request & {content: string; symbology: Symbology};
export type Status = 'queued' | 'submitting' | 'submitted' | 'failed' | 'uncertain';
export type Job = {id: string; created: string; label: Label; status: Status; detail: DisplayMessage};
export type Preview = {dataUrl: string; width: number; height: number; content: string; symbology: Symbology};
export const defaults: Settings = {symbology:'qrcode',aim:false,aimPrefixes:[']Q1',']C0',']E0',']d1'],width:60,height:40,dpi:203,copies:1,humanText:true,transport:'system',printer:'',host:'',port:9100};
export const names: Record<Symbology,string> = {qrcode:'QR Code',code128:'Code 128',ean13:'EAN-13',datamatrix:'Data Matrix'};
export const statuses: Record<Status,Message> = {queued:msg('statusQueued'),submitting:msg('statusSubmitting'),submitted:msg('statusSubmitted'),failed:msg('statusFailed'),uncertain:msg('statusUncertain')};
export type AppConfig = {version:2; settings:Settings; duplicate:{mode:'allow'|'debounce';windowMs:number}};
export type ConfigSnapshot = {config:AppConfig;requiresReset:boolean;message:DisplayMessage};
export type WorkStatus = {active:boolean;sessionId:string;detail:DisplayMessage};
export type ScanFrame = {sessionId:string;sequence:number;raw:string};
export const configDefaults:AppConfig = {version:2,settings:defaults,duplicate:{mode:'allow',windowMs:1000}};
export interface Api {
  language():Promise<import('../main/language').LanguageSnapshot>;
  saveLanguage(value:import('./i18n').LanguagePreference):Promise<import('../main/language').LanguageSnapshot>;
  config():Promise<ConfigSnapshot>;
  saveConfig(config:AppConfig):Promise<ConfigSnapshot>;
  resetConfig():Promise<ConfigSnapshot>;
  startWork():Promise<WorkStatus>;
  pauseWork():Promise<WorkStatus>;
  workStatus():Promise<WorkStatus>;
  scanFrame(frame:ScanFrame):Promise<Job>;
  preview(request: Request): Promise<Preview>;
  enqueue(request: Request): Promise<Job>;
  reprint(id: string): Promise<Job>;
  history(): Promise<Job[]>;
  printers(): Promise<{name:string;displayName:string}[]>;
}
declare global {interface Window {scan: Api}}
