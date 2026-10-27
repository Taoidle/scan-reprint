import bwip from 'bwip-js';
import { PNG } from 'pngjs';
import type { Label, Preview } from '../shared/model';
export type Raster = {width:number;height:number;bits:Buffer;png:Buffer};
export async function rasterize(label:Label):Promise<Raster> {
  const {settings:s}=label;
  const width=Math.round(s.width*s.dpi/25.4), height=Math.round(s.height*s.dpi/25.4);
  const margin=Math.ceil(2*s.dpi/25.4);
  const make=(scale:number)=>bwip.toBuffer({bcid:label.symbology,text:label.content,scale,
    height:label.symbology==='qrcode'||label.symbology==='datamatrix'?undefined:12,
    includetext:s.humanText,textxalign:'center',textsize:10,
    paddingwidth:label.symbology==='code128'||label.symbology==='ean13'?10:4,
    paddingheight:4,backgroundcolor:'FFFFFF',parse:false,parsefnc:false});
  const base=PNG.sync.read(await make(1));
  const scale=Math.min(6,Math.floor(Math.min((width-2*margin)/base.width,(height-2*margin)/base.height)));
  if(scale<2) throw new Error('标签容不下可读条码（至少 2 点模块）；请增大标签、减少内容或关闭文字');
  const code=PNG.sync.read(await make(scale));
  if(code.width>width-2*margin||code.height>height-2*margin) throw new Error('条码超出标签安全区域');
  const page=new PNG({width,height}); page.data.fill(255);
  PNG.bitblt(code,page,0,0,code.width,code.height,Math.floor((width-code.width)/2),Math.floor((height-code.height)/2));
  const row=Math.ceil(width/8),bits=Buffer.alloc(row*height);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const i=(y*width+x)*4;
    if(page.data[i]<128) bits[y*row+(x>>3)]|=0x80>>(x%8);
  }
  return {width,height,bits,png:PNG.sync.write(page)};
}
export function preview(label:Label,r:Raster):Preview {return {dataUrl:`data:image/png;base64,${r.png.toString('base64')}`,width:r.width,height:r.height,content:label.content,symbology:label.symbology};}
export function zpl(label:Label,r:Raster):Buffer {
  return Buffer.from(`^XA^PW${r.width}^LL${r.height}^LH0,0^FO0,0^GFA,${r.bits.length},${r.bits.length},${Math.ceil(r.width/8)},${r.bits.toString('hex').toUpperCase()}^FS^PQ${label.settings.copies}^XZ`,'ascii');
}
export function tspl(label:Label,r:Raster):Buffer {
  // TSPL BITMAP has a fixed byte count; pixels never become command text. 1 = white.
  const inverted=Buffer.from(r.bits.map(b=>b^255));
  const s=label.settings;
  return Buffer.concat([Buffer.from(`SIZE ${s.width} mm,${s.height} mm\r\nGAP 0 mm,0 mm\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,${Math.ceil(r.width/8)},${r.height},0,`,'ascii'),inverted,Buffer.from(`\r\nPRINT 1,${s.copies}\r\n`,'ascii')]);
}
