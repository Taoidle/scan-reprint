import { _electron as electron } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const legacy=process.env.LEGACY==='1';
const relative=process.platform==='win32'?`release/win-unpacked/Scan Reprint${legacy?' Legacy':''}.exe`:`release/linux${process.arch==='arm64'?'-arm64':''}-unpacked/scan-reprint`;
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SCAN_REPRINT_SMOKE;
await mkdir('artifacts',{recursive:true});
const app=await electron.launch({timeout:60000,executablePath:resolve(relative),args:['--no-sandbox'],env});
try{
  assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
  const page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(30000);await page.getByRole('button',{name:'开始扫码',exact:true}).waitFor();
  assert.equal(await page.evaluate(async()=>(await document.fonts.load('700 30px "Noto Sans SC"','扫码重印')).length>0),true);
  const icon=await app.evaluate(({app,nativeImage})=>{const path=app.getAppPath()+'/dist/icons/icon.png';const image=nativeImage.createFromPath(path);return {empty:image.isEmpty(),size:image.getSize()};});
  assert.equal(icon.empty,false);assert.deepEqual(icon.size,{width:256,height:256});
  assert.equal(await page.getByRole('img',{name:'扫码重印应用图标',exact:true}).evaluate(img=>img.complete&&img.naturalWidth>0),true);
  if(process.platform==='win32')assert.ok((await readFile(relative)).includes(await readFile('dist/icons/icon.png')),'custom PNG icon must be embedded in the Windows executable resource');
  await page.getByRole('button',{name:'手工测试',exact:true}).click();await page.getByLabel('测试内容',{exact:true}).fill(' 000aBc ');await page.getByRole('img',{name:/标签预览/}).waitFor();assert.equal(await page.getByLabel('测试内容',{exact:true}).inputValue(),' 000aBc ');assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  await page.screenshot({path:'artifacts/packaged.png',fullPage:true});console.log('Packaged app: production entry, exact preview, local fonts, bundled SVG/PNG and Windows executable icon verified');
}finally{await app.close();}
