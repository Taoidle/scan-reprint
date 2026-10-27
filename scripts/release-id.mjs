import { readFile } from 'node:fs/promises';
const releases=JSON.parse(await readFile('release-list.json','utf8'));
const tag=process.env.RELEASE_TAG||process.env.GITHUB_REF_NAME;
const matches=releases.filter(r=>r.tag_name===tag);
if(matches.length!==1||!matches[0].draft)throw new Error('Expected exactly one matching draft; never overwrite a published release');
console.log(matches[0].id);
