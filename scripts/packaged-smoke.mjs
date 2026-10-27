import { _electron as electron } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const legacy=process.env.LEGACY==='1';
const relative=process.platform==='win32'
  ? `release/win-unpacked/Scan Reprint${legacy?' Legacy':''}.exe`
  : `release/linux${process.arch==='arm64'?'-arm64':''}-unpacked/scan-reprint`;
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SCAN_REPRINT_SMOKE;
await mkdir('artifacts',{recursive:true});
const app=await electron.launch({executablePath:resolve(relative),args:['--no-sandbox'],env});
try {
  assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
  const page=await app.firstWindow();await page.waitForSelector('textarea');
  const fontsLoaded=await page.evaluate(async()=>{const faces=await document.fonts.load('700 30px "Noto Sans SC"','扫码重印');return faces.length>0&&faces.every(face=>face.status==='loaded');});
  assert.equal(fontsLoaded,true,'bundled Chinese font must load without OS font installation');
  await page.getByLabel('扫码内容',{exact:true}).fill(' 000aBc ');
  await page.getByRole('img',{name:/标签预览/}).waitFor();
  assert.equal(await page.getByLabel('扫码内容',{exact:true}).inputValue(),' 000aBc ');
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  await page.screenshot({path:'artifacts/packaged.png',fullPage:true});
  console.log('Packaged app: production entry, preload isolation, barcode preview, exact text passed');
} finally {await app.close();}
