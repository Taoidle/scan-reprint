import { _electron as electron } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const executablePath=process.env.LEGACY==='1'?require('../runtimes/legacy/node_modules/electron'):undefined;
await mkdir('artifacts',{recursive:true});
const env={...process.env,SCAN_REPRINT_SMOKE:'1'};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath,args:['--no-sandbox','.'],env});
try {
  const page=await app.firstWindow();await page.waitForSelector('textarea');
  const fontsLoaded=await page.evaluate(async()=>{const faces=await document.fonts.load('700 30px "Noto Sans SC"','扫码重印');return faces.length>0&&faces.every(face=>face.status==='loaded');});
  assert.equal(fontsLoaded,true,'bundled Chinese font must load without OS font installation');
  await page.setViewportSize({width:1440,height:1000});
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  assert.equal(await page.evaluate(()=>typeof window.process),'undefined');
  await page.screenshot({path:'artifacts/startup.png',fullPage:true});
  await page.getByLabel('打印机',{exact:true}).selectOption('CI spooler');
  await page.getByLabel('扫码内容',{exact:true}).fill('000123ABC');
  await page.getByRole('img',{name:/标签预览/}).waitFor();
  await page.screenshot({path:'artifacts/workbench.png',fullPage:true});
  await page.setViewportSize({width:1505,height:1045});await page.screenshot({path:'artifacts/concept-size.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'确认打印',exact:true}).click();
  await page.getByText('已提交 · 请核对出纸',{exact:true}).waitFor();
  await page.getByLabel('扫码内容',{exact:true}).fill('000123ABC');
  await page.getByRole('img',{name:/标签预览/}).waitFor();
  await page.getByRole('button',{name:'确认打印',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'重复扫描'}).waitFor();
  await page.getByRole('button',{name:'明确重打',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'确认重打',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===2);
  await page.getByLabel('扫码内容',{exact:true}).fill('https://a.co/^XZ');
  await page.getByRole('img',{name:/标签预览/}).waitFor();assert.ok(page.url().startsWith('file:'));
  await page.getByLabel('自动打印',{exact:true}).check();
  await page.getByLabel('扫码内容',{exact:true}).fill('Auto0001');await page.getByLabel('扫码内容',{exact:true}).press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===3);
  await page.screenshot({path:'artifacts/history.png',fullPage:true});
  await page.setViewportSize({width:850,height:760});await page.screenshot({path:'artifacts/compact.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByLabel('自动打印',{exact:true}).uncheck();
  await page.getByLabel('扫码内容',{exact:true}).fill('x'.repeat(1025));
  assert.equal((await page.getByLabel('扫码内容',{exact:true}).inputValue()).length,1025);
  await page.getByRole('alert').filter({hasText:'raw 格式错误'}).waitFor();
  console.log('Electron smoke: isolation, preview, submission, duplicate protection, reprint, auto mode, URL safety, compact layout passed');
} catch(error) {
  const page=app.windows()[0];
  if(page){await page.screenshot({path:'artifacts/failure.png',fullPage:true});await writeFile('artifacts/failure.html',await page.content());console.error(await page.locator('body').innerText());}
  throw error;
} finally {await app.close();}
