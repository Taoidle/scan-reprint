import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { PNG } from 'pngjs';
const require=createRequire(import.meta.url);
await initWasm(await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
const svg=await readFile('assets/icon.svg','utf8');
await mkdir('build/icons',{recursive:true});await mkdir('dist/icons',{recursive:true});
const images=[];
for(const size of [16,24,32,48,64,128,256,512]){
  const renderer=new Resvg(svg,{fitTo:{mode:'width',value:size}}),rendered=renderer.render();
  const png=Buffer.from(rendered.asPng());rendered.free();renderer.free();
  await writeFile(`build/icons/${size}x${size}.png`,png);
  if(size===512)continue;
  if(size===256){images.push({size,data:png});continue;}
  // DIB entries at small sizes support older Windows shell icon loaders.
  const rgba=PNG.sync.read(png),maskStride=Math.ceil(size/32)*4;
  const dib=Buffer.alloc(40+size*size*4+maskStride*size);
  dib.writeUInt32LE(40,0);dib.writeInt32LE(size,4);dib.writeInt32LE(size*2,8);dib.writeUInt16LE(1,12);dib.writeUInt16LE(32,14);dib.writeUInt32LE(size*size*4,20);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const from=(y*size+x)*4,to=40+((size-1-y)*size+x)*4;
    dib[to]=rgba.data[from+2];dib[to+1]=rgba.data[from+1];dib[to+2]=rgba.data[from];dib[to+3]=rgba.data[from+3];
    if(rgba.data[from+3]===0)dib[40+size*size*4+(size-1-y)*maskStride+(x>>3)]|=0x80>>(x%8);
  }
  images.push({size,data:dib});
}
const header=Buffer.alloc(6+images.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);
let offset=header.length;
images.forEach(({size,data},i)=>{const p=6+i*16;header[p]=size===256?0:size;header[p+1]=header[p];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(data.length,p+8);header.writeUInt32LE(offset,p+12);offset+=data.length;});
await writeFile('build/icon.ico',Buffer.concat([header,...images.map(i=>i.data)]));
await copyFile('build/icon.ico','dist/icons/icon.ico');await copyFile('build/icons/256x256.png','dist/icons/icon.png');await copyFile('assets/icon.svg','dist/icons/icon.svg');
