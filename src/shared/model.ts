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
export type Job = {id: string; created: string; label: Label; status: Status; detail: string};
export type Preview = {dataUrl: string; width: number; height: number; content: string; symbology: Symbology};
export const defaults: Settings = {symbology:'qrcode',aim:false,aimPrefixes:[']Q1',']C0',']E0',']d1'],width:60,height:40,dpi:203,copies:1,humanText:true,transport:'system',printer:'',host:'',port:9100};
export const names: Record<Symbology,string> = {qrcode:'QR Code',code128:'Code 128',ean13:'EAN-13',datamatrix:'Data Matrix'};
export const statuses: Record<Status,string> = {queued:'排队中',submitting:'提交中',submitted:'已提交 · 请核对出纸',failed:'失败 · 未提交',uncertain:'结果不确定 · 请核对'};
export interface Api {
  preview(request: Request): Promise<Preview>;
  enqueue(request: Request): Promise<Job>;
  reprint(id: string): Promise<Job>;
  history(): Promise<Job[]>;
  printers(): Promise<{name:string;displayName:string}[]>;
}
declare global {interface Window {scan: Api}}
