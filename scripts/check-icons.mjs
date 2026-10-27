import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
const ico=await readFile('build/icon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),7);
const sizes=[16,24,32,48,64,128,256];
for(let i=0;i<sizes.length;i++){
  const at=6+i*16,size=ico[at]||256;assert.equal(size,sizes[i]);assert.equal(ico.readUInt16LE(at+6),32);
  const offset=ico.readUInt32LE(at+12),length=ico.readUInt32LE(at+8);assert.ok(offset+length<=ico.length);
  const png=PNG.sync.read(await readFile(`build/icons/${size}x${size}.png`));assert.equal(png.width,size);assert.equal(png.height,size);
  assert.equal(png.data[3],0,'transparent outer corners');assert.ok(png.data.some(v=>v===255));
  if(size===256)assert.deepEqual(ico.subarray(offset,offset+length),await readFile('dist/icons/icon.png'));
  else{assert.equal(ico.readUInt32LE(offset),40);assert.equal(ico.readInt32LE(offset+8),size*2);}
}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/icon-256.png',await readFile('dist/icons/icon.png'));await writeFile('artifacts/icon-16.png',await readFile('build/icons/16x16.png'));
console.log('Icon resources: seven ICO sizes, DIB/PNG payloads and transparent PNGs verified');
