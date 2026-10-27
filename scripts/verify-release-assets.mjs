import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const release=JSON.parse(await readFile('release-response.json','utf8'));
const files=(await readdir('publish')).sort();
if(!release.draft||release.tag_name!==process.env.GITHUB_REF_NAME)throw new Error('Expected matching draft release');
if(JSON.stringify(release.assets.map(a=>a.name).sort())!==JSON.stringify(files))throw new Error('Release attachment inventory mismatch');
for(const file of files) {
  const asset=release.assets.find(a=>a.name===file);
  const digest=`sha256:${createHash('sha256').update(await readFile(`publish/${file}`)).digest('hex')}`;
  if(asset.state!=='uploaded'||asset.size!==(await stat(`publish/${file}`)).size||asset.digest!==digest)throw new Error(`Release attachment verification failed: ${file}`);
}
console.log(`Verified ${files.length} release attachments by name, size and SHA256`);
