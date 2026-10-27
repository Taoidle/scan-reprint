import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { catalogs, resolveLocale, translate, msg, appError, errorMessage, parseMessage } from '../src/shared/i18n';
import { LanguageStore, parsePreference } from '../src/main/language';
import { parseHistory } from '../src/main/storage';
import { defaults } from '../src/shared/model';
import { validate } from '../src/shared/validate';
import { UncertainError } from '../src/main/network';
import { randomUUID } from 'node:crypto';
test('auto matches Chinese and English, other and missing locales fall back to Chinese',()=>{
  for(const locale of ['en-US','en_GB','EN-au'])assert.equal(resolveLocale('auto',locale),'en');
  for(const locale of ['zh-CN','zh-TW','zh_HK','fr-FR','','de'])assert.equal(resolveLocale('auto',locale),'zh-CN');
  assert.equal(resolveLocale('en','zh-CN'),'en');assert.equal(resolveLocale('zh-CN','en-US'),'zh-CN');
  for(const value of ['fr',null,{},'en\n','AUTO'])assert.throws(()=>parsePreference(value));
});
test('catalog keys and interpolation placeholders match exactly, messages survive IPC serialization',()=>{
  assert.deepEqual(Object.keys(catalogs.en).sort(),Object.keys(catalogs['zh-CN']).sort());
  for(const key of Object.keys(catalogs.en) as (keyof typeof catalogs.en)[]){assert.ok(catalogs.en[key]);assert.deepEqual(catalogs.en[key].match(/\{\w+\}/g)?.sort(),catalogs['zh-CN'][key].match(/\{\w+\}/g)?.sort());}
  const message=msg('duplicateBlocked',{ms:800});assert.deepEqual(errorMessage(new Error("Error invoking remote method: "+appError(message).message)),message);
  assert.match(translate('en',message),/800 ms/);assert.match(translate('zh-CN',message),/重复扫描/);
  assert.deepEqual(errorMessage(new UncertainError(msg('networkTimeout'))),msg('networkTimeout'));assert.equal(translate('en',errorMessage(new UncertainError(msg('networkTimeout')))),'Network printing timed out.');
  assert.throws(()=>parseMessage({code:'<script>'}));assert.throws(()=>parseMessage({code:'external',params:{reason:{raw:'secret'}}}));
});
test('first run, installer handoff, reopen and explicit preferences across upgrades are per-user',()=>{
  const dir=mkdtempSync(join(tmpdir(),'yoval-language-')),path=join(dir,'language.json'),hint=join(dir,'installer-language.txt');
  try{
    const fresh=new LanguageStore(path,'en-US');assert.deepEqual(fresh.get(),{preference:'auto',locale:'en',needsChoice:true});
    writeFileSync(hint,'zh-CN');const installed=new LanguageStore(path,'en-US',hint);assert.equal(installed.get().locale,'zh-CN');assert.equal(installed.get().needsChoice,false);
    installed.save('en');writeFileSync(hint,'zh-CN');assert.equal(new LanguageStore(path,'zh-CN',hint).get().locale,'en');
    installed.save('auto');assert.equal(new LanguageStore(path,'fr-FR',hint).get().locale,'zh-CN');assert.equal(new LanguageStore(path,'en-US',hint).get().locale,'en');
    assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),{version:1,preference:'auto'});
    assert.equal(new LanguageStore(join(dir,'other-user.json'),'en-US').get().needsChoice,true);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('corrupt preferences and invalid installer hints recover without losing the original',()=>{
  const dir=mkdtempSync(join(tmpdir(),'yoval-corrupt-')),path=join(dir,'language.json'),hint=join(dir,'installer-language.txt');
  try{
    writeFileSync(hint,'en\nINJECT');assert.equal(new LanguageStore(path,'de',hint).get().needsChoice,true);
    writeFileSync(path,'{broken');writeFileSync(hint,'en');const store=new LanguageStore(path,'de',hint);assert.equal(store.get().needsChoice,true);assert.equal(readFileSync(path,'utf8'),'{broken');
    store.save('zh-CN');assert.ok(readdirSync(dir).some(f=>f.startsWith('language.json.backup-')&&readFileSync(join(dir,f),'utf8')==='{broken'));
    assert.equal(new LanguageStore(path,'en-US',hint).get().locale,'zh-CN');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('structured history localizes status while preserving legacy text and barcode bytes',()=>{
  const label=validate({raw:' 000aBc ',settings:defaults});const base={id:randomUUID(),created:new Date().toISOString(),status:'submitted',label};
  const legacy=parseHistory([{...base,detail:'已提交 · 原文'}])[0];assert.equal(legacy.detail,'已提交 · 原文');
  const modern=parseHistory([{...base,detail:msg('submittedDetail')}])[0];assert.match(translate('en',modern.detail),/submission/);assert.equal(modern.label.raw,' 000aBc ');
});
test('source localization boundary and installer handoff contract',()=>{
  for(const folder of ['src/main','src/shared','src/renderer'])for(const file of readdirSync(folder).filter(f=>/\.tsx?$/.test(f))){
    const text=readFileSync(join(folder,file),'utf8').replaceAll('广州铱川创新科技有限公司','').replaceAll('简体中文','').replaceAll('选择语言 / Choose language','');
    assert.equal(/[\u3400-\u9fff]/.test(text),false,`${folder}/${file} must use message catalogs`);
  }
  const nsis=readFileSync('installer/language.nsh','utf8');for(const contract of ['/APP_LANG=','"auto"','"en"','"zh-CN"','GetUserDefaultUILanguage','Page custom YovalLanguagePage','Call YovalApplyLanguage','SetShellVarContext current','$APPDATA\\scan-reprint\\installer-language.txt','$installMode != "all"'])assert.ok(nsis.includes(contract),contract);
  assert.ok(!nsis.includes('Delete '));assert.ok(!nsis.includes('RMDir '));
  const main=readFileSync('src/main/main.ts','utf8');assert.ok(main.includes("app.setPath('userData',join(app.getPath('appData'),'scan-reprint'))"));
});
