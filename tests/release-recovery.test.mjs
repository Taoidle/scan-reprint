import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, URL } from 'node:url';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
const exec=promisify(execFile);
const script=name=>fileURLToPath(new URL(`../scripts/${name}.mjs`,import.meta.url));
async function fixture(run){const dir=await mkdtemp(`${tmpdir()}/scan-recovery-`);try{await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}
const env={...process.env,RELEASE_TAG:'v0.1.0',SOURCE_RUN:'123',GITHUB_REPOSITORY:'Taoidle/scan-reprint'};
test('draft lookup uses release ID and refuses published or ambiguous matches',()=>fixture(async cwd=>{
  const write=value=>writeFile(`${cwd}/release-list.json`,JSON.stringify(value));
  await write([{id:42,tag_name:'v0.1.0',draft:true}]);
  assert.equal((await exec(process.execPath,[script('release-id')],{cwd,env})).stdout.trim(),'42');
  await write([{id:42,tag_name:'v0.1.0',draft:false}]);
  await assert.rejects(exec(process.execPath,[script('release-id')],{cwd,env}));
  await write([{id:42,tag_name:'v0.1.0',draft:true},{id:43,tag_name:'v0.1.0',draft:true}]);
  await assert.rejects(exec(process.execPath,[script('release-id')],{cwd,env}));
}));
test('recovery requires matching tag provenance and every prerequisite success',()=>fixture(async cwd=>{
  const names=['verify','release-bundle','packages (windows-legacy-x64, windows-2022, win, x64, 1)','packages (windows-modern-x64, windows-2022, win, x64, 0)','packages (ubuntu-amd64, ubuntu-22.04, linux, x64, 0)','packages (ubuntu-arm64, ubuntu-24.04-arm, linux, arm64, 0)'];
  const files={'source-run.json':{id:123,head_sha:'abc',head_branch:'v0.1.0',path:'.github/workflows/ci.yml',repository:{full_name:env.GITHUB_REPOSITORY},event:'workflow_dispatch'},'source-tag.json':{object:{type:'commit',sha:'abc'}},'source-jobs.json':{jobs:names.map(name=>({name,conclusion:'success'}))},'publish/build-info.json':{version:'0.1.0',commit:'abc',ref:'refs/tags/v0.1.0',run:'123',repository:env.GITHUB_REPOSITORY}};
  await mkdir(`${cwd}/publish`);
  for(const [name,value] of Object.entries(files))await writeFile(`${cwd}/${name}`,JSON.stringify(value));
  await exec(process.execPath,[script('validate-release-source')],{cwd,env});
  files['publish/build-info.json'].commit='wrong';await writeFile(`${cwd}/publish/build-info.json`,JSON.stringify(files['publish/build-info.json']));
  await assert.rejects(exec(process.execPath,[script('validate-release-source')],{cwd,env}));
  files['publish/build-info.json'].commit='abc';await writeFile(`${cwd}/publish/build-info.json`,JSON.stringify(files['publish/build-info.json']));
  files['source-jobs.json'].jobs[0].conclusion='failure';await writeFile(`${cwd}/source-jobs.json`,JSON.stringify(files['source-jobs.json']));
  await assert.rejects(exec(process.execPath,[script('validate-release-source')],{cwd,env}));
}));
