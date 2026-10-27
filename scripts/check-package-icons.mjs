import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
if(process.platform==='linux'){
  const deb=(await readdir('release')).find(name=>name.endsWith('.deb'));assert.ok(deb);
  const result=spawnSync('dpkg-deb',['--contents',`release/${deb}`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  for(const size of [16,32,48,128,256,512])assert.ok(result.stdout.includes(`/icons/hicolor/${size}x${size}/apps/scan-reprint.png`),`deb must install ${size}px icon`);
  console.log('Deb installer contains desktop icons at six verified sizes');
}
