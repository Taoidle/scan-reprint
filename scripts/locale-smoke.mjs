import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { capture } from './capture.mjs';
const require=createRequire(import.meta.url),executablePath=process.env.LEGACY==='1'?require('../runtimes/legacy/node_modules/electron'):undefined;
const env={...process.env,SCAN_REPRINT_SMOKE:'1',SCAN_REPRINT_SMOKE_PROFILE:`locale-${process.pid}-${Date.now()}`,SCAN_REPRINT_SMOKE_LOCALE:'en-US'};delete env.ELECTRON_RUN_AS_NODE;
await mkdir('artifacts',{recursive:true});let app;
async function launch(){app=await electron.launch({timeout:60000,executablePath,args:['--no-sandbox','.'],env});const page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(30000);await page.getByRole('heading',{name:'YOVAL Scan Reprint',exact:true}).waitFor();return page;}
try{
  let page=await launch();await page.getByRole('dialog',{name:'选择语言 / Choose language'}).waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.getByLabel('Language preference').inputValue(),'auto');await capture(page,'artifacts/first-run-en.png');
  await page.getByRole('button',{name:'Save and continue',exact:true}).click();assert.equal((await page.evaluate(()=>window.scan.language())).preference,'auto');await app.close();app=null;
  env.SCAN_REPRINT_SMOKE_LOCALE='fr-FR';page=await launch();await page.getByRole('button',{name:'开始扫码',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');assert.equal(await page.evaluate(async()=>(await window.scan.history()).length),0);assert.equal(await page.evaluate(async()=>(await window.scan.workStatus()).active),false);await capture(page,'artifacts/auto-fallback-zh.png');
  console.log('Real Electron first-run English auto choice persists, restart re-resolves other locale to Chinese without printing');
}finally{if(app)await app.close();}
