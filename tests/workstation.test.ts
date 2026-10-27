import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigStore, parseConfig } from '../src/main/config';
import { WorkSession } from '../src/main/work-session';
import { PrintQueue } from '../src/main/queue';
import { ScanFramer } from '../src/shared/scan-framer';
import { configDefaults } from '../src/shared/model';
import { UncertainError } from '../src/main/network';
const config=()=>structuredClone(configDefaults);
test('settings roundtrip uses a whitelist, preserves printer and migrates v1',()=>{
  const dir=mkdtempSync(join(tmpdir(),'scan-config-')),path=join(dir,'settings.json');
  try{
    const c=config();c.settings.printer='Printer 01';c.duplicate={mode:'debounce',windowMs:800};
    new ConfigStore(path).save({...c,raw:'SECRET',content:'SECRET',settings:{...c.settings,raw:'SECRET'}});
    assert.equal(readFileSync(path,'utf8').includes('SECRET'),false);
    assert.deepEqual(new ConfigStore(path).get().config,c);
    writeFileSync(path,JSON.stringify({version:1,settings:{printer:'Old printer'}}));
    const migrated=new ConfigStore(path).get();assert.equal(migrated.requiresReset,false);assert.equal(migrated.config.settings.printer,'Old printer');assert.equal(migrated.config.settings.copies,1);assert.equal(migrated.config.duplicate.mode,'allow');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('corrupt and future settings remain untouched until explicit backup/reset',()=>{
  const dir=mkdtempSync(join(tmpdir(),'scan-config-')),path=join(dir,'settings.json');
  try{
    for(const contents of ['{broken',JSON.stringify({...config(),version:99}),'x'.repeat(65537)]){
      writeFileSync(path,contents);const store=new ConfigStore(path);assert.equal(store.get().requiresReset,true);assert.throws(()=>store.save(config()),/configResetFirst/);assert.equal(readFileSync(path,'utf8'),contents);
      store.reset();assert.equal(new ConfigStore(path).get().requiresReset,false);
      assert.ok(readdirSync(dir).filter(name=>name.includes('.backup-')).some(name=>readFileSync(join(dir,name),'utf8')===contents));
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('config rejects malformed values and returns detached snapshots',()=>{
  assert.throws(()=>parseConfig({...config(),duplicate:{mode:'debounce',windowMs:99}}));
  assert.throws(()=>parseConfig({...config(),settings:{...config().settings,copies:0}}));
  assert.throws(()=>parseConfig({...config(),settings:{...config().settings,transport:'zpl',host:'not-an-ip'}}));
  const store=new ConfigStore(join(tmpdir(),'nonexistent-'+Date.now()));const first=store.get();first.config.settings.copies=90;assert.equal(store.get().config.settings.copies,1);
});
test('complete equal frames each enqueue; replay of one frame never enqueues twice',()=>{
  const q=new PrintQueue(()=>{},async()=>{}),work=new WorkSession(q,()=>true),c=config();
  const session=work.start(c);c.settings.copies=9;
  const first={sessionId:session.sessionId,sequence:1,raw:' 000aBc '};
  const job=work.frame(first);assert.equal(work.frame({...first,raw:'CHANGED'}).id,job.id);assert.equal(q.list().length,1);
  work.frame({...first,sequence:2});work.frame({...first,sequence:3,raw:'Other'});
  assert.equal(q.list().length,3);assert.equal(q.list()[0].label.content,' 000aBc ');assert.equal(q.list()[0].label.settings.copies,1);
  assert.throws(()=>work.frame({...first,sequence:5}),/frameSequence/);
  work.pause();assert.throws(()=>work.frame({...first,sequence:4}),/workRestart/);
  const second=work.start(config());assert.notEqual(second.sessionId,session.sessionId);assert.throws(()=>work.frame(first),/frameSession/);
});
test('configured debounce blocks equal content, allows distinct frames and explicit reprint',async()=>{
  const q=new PrintQueue(()=>{},async()=>{}),work=new WorkSession(q,()=>true),c=config();c.duplicate={mode:'debounce',windowMs:1000};const session=work.start(c);
  work.frame({...session,sequence:1,raw:'Same'});assert.throws(()=>work.frame({...session,sequence:2,raw:'Same'}),/duplicateBlocked.*1000/);assert.throws(()=>work.frame({...session,sequence:2,raw:'Other'}),/duplicateBlocked.*1000/);
  work.frame({...session,sequence:3,raw:'Other'});assert.equal(q.list().length,2);
  await new Promise(resolve=>setTimeout(resolve,0));q.reprint(q.list()[0].id);assert.equal(q.list().length,3);
});
test('foreground boundary and invalid input cannot silently turn into a later print',()=>{
  let foreground=false;const q=new PrintQueue(()=>{},async()=>{}),work=new WorkSession(q,()=>foreground);assert.throws(()=>work.start(config()),/foregroundOnly/);
  foreground=true;const s=work.start(config());assert.throws(()=>work.frame({...s,sequence:1,raw:'A\nB'}),/charactersUnsupported/);assert.throws(()=>work.frame({...s,sequence:1,raw:'AB'}),/charactersUnsupported/);assert.equal(q.list().length,0);
  foreground=false;assert.throws(()=>work.frame({...s,sequence:2,raw:'OK'}),/blurPaused/);assert.equal(work.status().active,false);
});
test('uncertain delivery pauses work through outcome callback and never retries',async()=>{
  let calls=0;
  const q=new PrintQueue(()=>{},async()=>{calls++;throw new UncertainError('unknown');},[],()=>work.pause('uncertain'));
  const work=new WorkSession(q,()=>true);const s=work.start(config());work.frame({...s,sequence:1,raw:'abc'});
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(work.status().active,false);assert.equal(q.list()[0].status,'uncertain');assert.equal(calls,1);
});
test('HID framer preserves text, ignores held Enter, rejects overflow/IME/partial timeout',()=>{
  const f=new ScanFramer();let time=100;
  for(const key of ' 000aBc ')f.feed(key,false,false,time++);
  assert.deepEqual(f.feed('Enter',false,false,time++),{kind:'frame',raw:' 000aBc '});assert.equal(f.feed('Enter',true),null);assert.equal(f.feed('Enter'),null);
  f.feed('A',false,false,100);f.feed('B',false,false,1700);assert.equal(f.feed('Enter',false,false,1701)?.kind,'error');
  for(let i=0;i<1025;i++)f.feed('x',false,false,2000+i);assert.equal(f.feed('Enter',false,false,3026)?.kind,'error');
  f.feed('x',false,true);assert.equal(f.feed('Enter')?.kind,'error');f.feed('A');f.reset();assert.equal(f.feed('Enter'),null);
  f.feed('A');f.feed('Backspace');assert.equal(f.feed('Enter')?.kind,'error');
});
test('debounce expires at its configured duration rather than a fixed five seconds',async()=>{
  const q=new PrintQueue(()=>{},async()=>{}),work=new WorkSession(q,()=>true),c=config();c.duplicate={mode:'debounce',windowMs:100};const s=work.start(c);
  work.frame({...s,sequence:1,raw:'expiry'});assert.throws(()=>work.frame({...s,sequence:2,raw:'expiry'}),/duplicateBlocked.*100/);
  await new Promise(resolve=>setTimeout(resolve,120));work.frame({...s,sequence:3,raw:'expiry'});assert.equal(q.list().length,2);
});
