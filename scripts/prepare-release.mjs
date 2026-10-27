import { readdir, readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export function expectedPackages(version) {
  if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Release requires a stable numeric package version');
  return {
    'windows-legacy-x64':[`scan-reprint-${version}-legacy-win-x64.exe`],
    'windows-modern-x64':[`scan-reprint-${version}-modern-win-x64.exe`],
    'ubuntu-amd64':[`scan-reprint-${version}-modern-linux-amd64.deb`,`scan-reprint-${version}-modern-linux-x86_64.AppImage`],
    'ubuntu-arm64':[`scan-reprint-${version}-modern-linux-arm64.deb`,`scan-reprint-${version}-modern-linux-arm64.AppImage`]
  };
}
export async function prepareRelease(source,destination,version,provenance) {
  const expected=expectedPackages(version),lines=[];
  for(const [target,files] of Object.entries(expected)) {
    const dir=`${source}/scan-reprint-${target}`;
    const actual=(await readdir(dir)).sort();
    if(JSON.stringify(actual)!==JSON.stringify([...files,'SHA256SUMS.txt'].sort()))throw new Error(`Unexpected artifact inventory: ${target}`);
    const manifest=(await readFile(`${dir}/SHA256SUMS.txt`,'utf8')).trimEnd().split('\n');
    if(manifest.length!==files.length)throw new Error(`Invalid manifest: ${target}`);
    for(const file of files) {
      const hash=createHash('sha256').update(await readFile(`${dir}/${file}`)).digest('hex');
      const line=`${hash}  ${file}`;
      if(manifest.filter(item=>item===line).length!==1)throw new Error(`Checksum mismatch: ${file}`);
      lines.push(line);
    }
  }
  await mkdir(destination,{recursive:true});
  for(const [target,files] of Object.entries(expected))for(const file of files)await copyFile(`${source}/scan-reprint-${target}/${file}`,`${destination}/${file}`);
  await writeFile(`${destination}/SHA256SUMS.txt`,lines.sort().join('\n')+'\n');
  await writeFile(`${destination}/build-info.json`,JSON.stringify({version,...provenance},null,2)+'\n');
  console.log(`Verified ${lines.length} installers from four targets`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const {version}=JSON.parse(await readFile('package.json','utf8'));
  if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==`v${version}`)throw new Error('Tag does not match package version');
  await prepareRelease('collected','publish',version,{commit:process.env.GITHUB_SHA,ref:process.env.GITHUB_REF,run:process.env.GITHUB_RUN_ID,repository:process.env.GITHUB_REPOSITORY});
}
