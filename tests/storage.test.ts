import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaults, type Job } from '../src/shared/model';
import { validate } from '../src/shared/validate';
import { loadHistory, parseHistory, saveHistory } from '../src/main/storage';
const job=():Job=>({id:randomUUID(),created:new Date().toISOString(),label:validate({raw:' 000aBc ',settings:defaults}),status:'submitted',detail:'已提交'});
test('history round trip preserves exact label and strips unknown properties',()=>{
  const record=job();assert.deepEqual(parseHistory([{...record,extra:'ignored'}]),[record]);
  const dir=mkdtempSync(join(tmpdir(),'scan-reprint-test-')),path=join(dir,'history.json');
  try {assert.deepEqual(loadHistory(path),[]);saveHistory(path,[record]);assert.deepEqual(loadHistory(path),[record]);}
  finally {rmSync(dir,{recursive:true,force:true});}
});
test('malformed, contradictory, duplicate and oversized histories fail closed',()=>{
  const record=job();
  for(const value of [null,{},[null],[{...record,id:'bad'}],[record,record],[{...record,created:'invalid'}],[{...record,label:{...record.label,content:'different'}}],Array(201).fill(record)])assert.throws(()=>parseHistory(value));
  const dir=mkdtempSync(join(tmpdir(),'scan-reprint-test-')),path=join(dir,'history.json');
  try {writeFileSync(path,'x'.repeat(4*1024*1024+1));assert.throws(()=>loadHistory(path),/过大/);}
  finally {rmSync(dir,{recursive:true,force:true});}
});
