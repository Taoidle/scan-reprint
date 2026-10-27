import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { PNG } from 'pngjs';
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library';
import { defaults, type Symbology } from '../src/shared/model';
import { validate } from '../src/shared/validate';
import { rasterize, zpl, tspl } from '../src/main/raster';
import { sendNetwork, UncertainError } from '../src/main/network';
import { beforeSubmission, submitSpooler } from '../src/main/spooler';
import { trustedFrame, escapeHtml } from '../src/main/security';
for(const [symbology,content] of [['qrcode','000aB ^XZ ~JA " & < >'],['qrcode','中文🙂'],['code128','000aB^XZ'],['ean13','4006381333931'],['datamatrix','000aB']] as [Symbology,string][]) {
  test(`${symbology} round trips actual label pixels`,async()=>{
    const label=validate({raw:content,settings:{...defaults,symbology,width:100,height:60,humanText:false}});
    const r=await rasterize(label),png=PNG.sync.read(r.png),gray=new Uint8ClampedArray(png.width*png.height);
    for(let i=0;i<gray.length;i++)gray[i]=png.data[i*4];
    const reader=new MultiFormatReader();reader.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.QR_CODE,BarcodeFormat.CODE_128,BarcodeFormat.EAN_13,BarcodeFormat.DATA_MATRIX]]]));
    const decoded=reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(gray,png.width,png.height))));
    assert.equal(decoded.getText(),content);
    assert.equal(r.bits.length,Math.ceil(r.width/8)*r.height);
  });
}
test('raster printer protocols never interpolate user data into commands',async()=>{
  const label=validate({raw:'^XZ\"~JA PRINT 999',settings:{...defaults,humanText:false}}),r=await rasterize(label);
  const z=zpl(label,r).toString('ascii');
  assert.match(z,/^\^XA\^PW/);assert.equal((z.match(/\^XZ/g)||[]).length,1);assert.ok(!z.includes(label.content));
  assert.match(z,new RegExp(`\\^GFA,${r.bits.length},${r.bits.length},${Math.ceil(r.width/8)},[0-9A-F]+\\^FS\\^PQ1\\^XZ$`));
  const t=tspl(label,r),header=Buffer.from(`SIZE 60 mm,40 mm\r\nGAP 0 mm,0 mm\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,${Math.ceil(r.width/8)},${r.height},0,`);
  assert.deepEqual(t.subarray(0,header.length),header);
  assert.deepEqual(t.subarray(header.length,header.length+r.bits.length),Buffer.from(r.bits.map(b=>b^255)));
  assert.equal(t.subarray(header.length+r.bits.length).toString(),'\r\nPRINT 1,1\r\n');
});
test('mock TCP printer receives exact bytes',async()=>{
  const chunks:Buffer[]=[];let received!:()=>void;const done=new Promise<void>(r=>{received=r;});
  const server=createServer(s=>{s.on('data',data=>chunks.push(data));s.on('end',received);});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  try {const address=server.address();assert.ok(address&&typeof address==='object');const data=Buffer.from([0,13,10,255,94,88]);await sendNetwork('127.0.0.1',address.port,data);await done;assert.deepEqual(Buffer.concat(chunks),data);}
  finally {await new Promise<void>(r=>server.close(()=>r()));}
});
test('mock spooler distinguishes submission, failure, thrown errors and timeout',async()=>{
  await submitSpooler(cb=>cb(true,''));
  await assert.rejects(submitSpooler(cb=>cb(false,'failed')),UncertainError);
  await assert.rejects(submitSpooler(()=>{throw new Error('driver');}),UncertainError);
  await assert.rejects(submitSpooler(()=>{},10),UncertainError);
});
test('IPC rejects subframes, other documents, origins and query suffixes',()=>{
  const url='file:///app/index.html';assert.ok(trustedFrame(url,url,true));
  for(const other of ['https://example.com',url+'?x',url+'#x','file:///evil.html'])assert.equal(trustedFrame(other,url,true),false);
  assert.equal(trustedFrame(url,url,false),false);
  assert.equal(escapeHtml('<img src="x">'), '&lt;img src=&quot;x&quot;&gt;');
});

test('pre-submission timeout is a definite non-submission, not an uncertain print',async()=>{
  await assert.rejects(beforeSubmission(new Promise<void>(()=>{}),5),error=>error instanceof Error && !(error instanceof UncertainError));
  assert.equal(await beforeSubmission(Promise.resolve(42)),42);
});

test('page dimensions, outer white margins and packed padding stay bounded',async()=>{
  const l=validate({raw:'000123ABC',settings:{...defaults,width:61,height:40,dpi:300,humanText:false}});
  const r=await rasterize(l),p=PNG.sync.read(r.png),margin=Math.floor(2*l.settings.dpi/25.4);
  assert.equal(r.width,Math.round(61*300/25.4));assert.equal(r.height,Math.round(40*300/25.4));
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++) {
    if(x<margin||y<margin||x>=p.width-margin||y>=p.height-margin)assert.equal(p.data[(y*p.width+x)*4],255);
  }
  const used=r.width%8;if(used)for(let y=0;y<r.height;y++)assert.equal(r.bits[(y+1)*Math.ceil(r.width/8)-1]&((1<<(8-used))-1),0);
});
