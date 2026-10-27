import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { expectedPackages, prepareRelease } from '../scripts/prepare-release.mjs';
async function fixture(run) {
  const dir=await mkdtemp(`${tmpdir()}/scan-release-`);
  try {
    for(const [target,files] of Object.entries(expectedPackages('0.1.0'))) {
      const path=`${dir}/scan-reprint-${target}`;await mkdir(path);const lines=[];
      for(const file of files){await writeFile(`${path}/${file}`,file);lines.push(`${createHash('sha256').update(file).digest('hex')}  ${file}`);}
      await writeFile(`${path}/SHA256SUMS.txt`,lines.join('\n')+'\n');
    }
    await run(dir);
  }finally{await rm(dir,{recursive:true,force:true});}
}
test('release assembly verifies six installers and records exact build provenance',()=>fixture(async dir=>{
  await prepareRelease(dir,`${dir}/out`,'0.1.0',{commit:'abc',run:'123'});
  assert.equal((await readFile(`${dir}/out/SHA256SUMS.txt`,'utf8')).trim().split('\n').length,6);
  assert.equal(JSON.parse(await readFile(`${dir}/out/build-info.json`,'utf8')).commit,'abc');
}));
test('release assembly rejects modified bytes and unexpected files',()=>fixture(async dir=>{
  const path=`${dir}/scan-reprint-windows-legacy-x64`;
  await writeFile(`${path}/extra.exe`,'unexpected');
  await assert.rejects(prepareRelease(dir,`${dir}/out`,'0.1.0',{}),/inventory/);
  await rm(`${path}/extra.exe`);await writeFile(`${path}/${expectedPackages('0.1.0')['windows-legacy-x64'][0]}`,'modified');
  await assert.rejects(prepareRelease(dir,`${dir}/out`,'0.1.0',{}),/Checksum mismatch/);
  assert.throws(()=>expectedPackages('../bad'),/numeric/);
}));
