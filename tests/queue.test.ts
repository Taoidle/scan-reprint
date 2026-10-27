import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, type Job } from '../src/shared/model';
import { validate } from '../src/shared/validate';
import { PrintQueue } from '../src/main/queue';
import { UncertainError } from '../src/main/network';
const label=(raw='000abc')=>validate({raw,settings:defaults});
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
test('serial queue accepts new jobs while sending and rejects duplicates',async()=>{
  const gates:(()=>void)[]=[];const sent:string[]=[];
  const q=new PrintQueue(()=>{},l=>new Promise<void>(resolve=>{sent.push(l.content);gates.push(resolve);}));
  const first=q.add(label());assert.throws(()=>q.add(label()),/重复/);q.add(label('other'));
  assert.deepEqual(sent,['000abc']);gates.shift()!();await tick();assert.deepEqual(sent,['000abc','other']);gates.shift()!();await tick();
  assert.ok(q.list().every(j=>j.status==='submitted'));q.reprint(first.id);assert.equal(sent.length,3);gates.shift()!();await tick();
});
test('persist before send; failure and uncertainty remain distinct',async()=>{
  let sent=false;const q=new PrintQueue(()=>{throw new Error('disk');},async()=>{sent=true;});assert.throws(()=>q.add(label()));assert.equal(sent,false);
  const failed=new PrintQueue(()=>{},async()=>{throw new Error('refused');});failed.add(label());await tick();assert.equal(failed.list()[0].status,'failed');
  const unknown=new PrintQueue(()=>{},async()=>{throw new UncertainError('partial');});unknown.add(label());await tick();assert.equal(unknown.list()[0].status,'uncertain');
});
test('restart never resends pending work',()=>{
  const initial:Job[]=['queued','submitting'].map((status,i)=>({id:String(i),created:new Date().toISOString(),label:label(),status:status as Job['status'],detail:''}));
  const q=new PrintQueue(()=>{},async()=>{throw new Error('must not run');},initial);
  assert.deepEqual(q.list().map(j=>j.status),['failed','uncertain']);
});
test('copies, content and settings are immutable snapshots',async()=>{
  const l=label();const q=new PrintQueue(()=>{},async()=>{});q.add(l);l.settings.copies=99;l.content='changed';await tick();assert.equal(q.list()[0].label.settings.copies,1);assert.equal(q.list()[0].label.content,'000abc');
});
