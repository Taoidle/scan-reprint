import { readdir, readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
if(process.platform==='linux'){
  const deb=(await readdir('release')).find(name=>name.endsWith('.deb'));assert.ok(deb);
  const result=spawnSync('dpkg-deb',['--contents',`release/${deb}`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  for(const size of [16,32,48,128,256,512])assert.ok(result.stdout.includes(`/icons/hicolor/${size}x${size}/apps/scan-reprint.png`),`deb must install ${size}px icon`);
  const folder=await mkdtemp(join(tmpdir(),'yoval-deb-'));const extract=spawnSync('dpkg-deb',['--extract',`release/${deb}`,folder],{encoding:'utf8'});assert.equal(extract.status,0,extract.stderr);
  const desktop=await readFile(join(folder,'usr/share/applications/scan-reprint.desktop'),'utf8');assert.match(desktop,/Name=YOVAL Scan Reprint/);
  const metadata=spawnSync('dpkg-deb',['--field',`release/${deb}`,'Maintainer'],{encoding:'utf8'});assert.equal(metadata.status,0);assert.ok(metadata.stdout.includes('广州铱川创新科技有限公司'));
  console.log('Deb installer contains desktop icons at six verified sizes');
}
