import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files=(await readdir('release')).filter(f=>/\.(exe|deb|AppImage)$/.test(f)).sort();
const expected=process.platform==='win32'?['.exe']:['.deb','.AppImage'];
for(const extension of expected)if(files.filter(f=>f.endsWith(extension)).length!==1)throw new Error(`Expected exactly one ${extension} installation artifact`);
const lines=await Promise.all(files.map(async f=>`${createHash('sha256').update(await readFile(`release/${f}`)).digest('hex')}  ${f}`));
await writeFile('release/SHA256SUMS.txt',lines.join('\n')+'\n');

console.log(lines.join('\n'));
