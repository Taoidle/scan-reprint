// Runs only on disposable Windows GitHub Actions runners. No print jobs are submitted.
import { _electron as electron } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, readdir, rm, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { capture } from './capture.mjs';
const exec=promisify(execFile);
assert.equal(process.platform,'win32');assert.equal(process.env.GITHUB_ACTIONS,'true');
const legacy=process.env.LEGACY==='1',channel=legacy?'legacy':'modern';
const folder=join(tmpdir(),`yoval-installed-${channel}`),profile=join(process.env.APPDATA,'scan-reprint');
await mkdir('artifacts',{recursive:true});await mkdir(profile,{recursive:true});
const oldName=`scan-reprint-0.2.0-${channel}-win-x64.exe`,oldPath=join(tmpdir(),oldName);
const response=await fetch(`https://github.com/Taoidle/scan-reprint/releases/download/v0.2.0/${oldName}`);assert.equal(response.status,200);const oldBytes=Buffer.from(await response.arrayBuffer());
const oldHash=legacy?'390937a3749a12423691300e2e519fb795bf7fd2b46d1bac60d675c6764d5ad2':'8cdc4cc217a51a440c060efc1076a6cf53d9a777bf4557aa75fc946a9f64ddf7';assert.equal(createHash('sha256').update(oldBytes).digest('hex'),oldHash);await writeFile(oldPath,oldBytes);
await exec(oldPath,['/S','/currentuser',`/D=${folder}`],{timeout:120000});
// Keep production data at its historical package-name path through the actual installer upgrade.
const settings={symbology:'qrcode',aim:false,aimPrefixes:[']Q1',']C0',']E0',']d1'],width:60,height:40,dpi:203,copies:1,humanText:true,transport:'system',printer:'Existing Printer 01',host:'',port:9100};
const config=JSON.stringify({version:2,settings,duplicate:{mode:'allow',windowMs:1000}});
const history=JSON.stringify([{id:randomUUID(),created:new Date().toISOString(),label:{raw:' 000aBc ',content:' 000aBc ',symbology:'qrcode',settings},status:'submitted',detail:'旧版中文记录保持原文'}]);
await writeFile(join(profile,'settings.json'),config);await writeFile(join(profile,'history.json'),history);await rm(join(profile,'language.json'),{force:true});
const installer=resolve('release',(await readdir('release')).find(f=>f.endsWith('.exe')));
await exec(installer,['/S','/currentuser','/APP_LANG=en'],{timeout:120000});
const installed=join(folder,'YOVAL Scan Reprint.exe');await access(installed);
assert.equal(await readFile(join(profile,'installer-language.txt'),'utf8'),'en');
let app;
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SCAN_REPRINT_SMOKE;
async function launch(language){
  app=await electron.launch({timeout:60000,executablePath:installed,args:[],env});const page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(30000);
  await page.getByRole('heading',{name:'YOVAL Scan Reprint',exact:true}).waitFor();await page.getByRole('button',{name:language==='en'?'Start scanning':'开始扫码',exact:true}).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.title(),'YOVAL Scan Reprint');
  assert.equal(await page.evaluate(async()=>(await window.scan.workStatus()).active),false);
  assert.equal(await page.evaluate(async()=>(await window.scan.history())[0].label.raw),' 000aBc ');
  assert.equal(await page.evaluate(async()=>(await window.scan.config()).config.settings.printer),'Existing Printer 01');return page;
}
try{
  let page=await launch('en');await capture(page,'artifacts/installed-en.png');await page.evaluate(()=>window.scan.saveLanguage('zh-CN'));await app.close();app=null;
  await exec(installer,['/S','/currentuser','/APP_LANG=en'],{timeout:120000});
  page=await launch('zh-CN');await capture(page,'artifacts/installed-upgrade-zh.png');await app.close();app=null;
  assert.equal(await readFile(join(profile,'settings.json'),'utf8'),config);assert.equal(await readFile(join(profile,'history.json'),'utf8'),history);
  const metadata=await exec('powershell.exe',['-NoProfile','-Command',"[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); $v=(Get-Item -LiteralPath $env:YOVAL_TEST_EXE).VersionInfo; $r=@(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' | Where-Object {$_.InstallLocation -eq $env:YOVAL_TEST_DIR}); @{product=$v.ProductName;company=$v.CompanyName;entries=$r.Count;display=$r[0].DisplayName;publisher=$r[0].Publisher} | ConvertTo-Json -Compress"],{env:{...process.env,YOVAL_TEST_EXE:installed,YOVAL_TEST_DIR:folder}});
  const info=JSON.parse(metadata.stdout.replace(/^\uFEFF/,''));assert.equal(info.product,'YOVAL Scan Reprint');assert.equal(info.company,'广州铱川创新科技有限公司');assert.equal(info.entries,1);assert.equal(info.display,'YOVAL Scan Reprint');assert.equal(info.publisher,'广州铱川创新科技有限公司');
  const uninstaller=join(folder,(await readdir(folder)).find(f=>f.startsWith('Uninstall')&&f.endsWith('.exe')));
  await exec(uninstaller,['/S','/currentuser',`_?=${folder}`],{timeout:120000});
  assert.equal(await readFile(join(profile,'settings.json'),'utf8'),config);assert.equal(await readFile(join(profile,'history.json'),'utf8'),history);assert.equal(JSON.parse(await readFile(join(profile,'language.json'),'utf8')).preference,'zh-CN');
  await assert.rejects(access(installed));
  await writeFile('artifacts/installer-verification.json',JSON.stringify({channel,oldVersion:'0.2.0',installerHint:'en',upgradePreference:'zh-CN',configurationAndHistoryPreserved:true,uninstallPreservedUserData:true,metadata:info,interactiveDialogNotAutomated:true},null,2));
  console.log('Actual v0.2.0 upgrade, language handoff, preference priority, executable/ARP branding and uninstall preservation passed');
}finally{if(app)await app.close();}
