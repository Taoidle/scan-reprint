import './build-icons.mjs';
import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
await build({entryPoints:['src/main/main.ts'],outfile:'dist/main.cjs',bundle:true,platform:'node',target:'node16',external:['electron'],sourcemap:true});
await build({entryPoints:['src/main/preload.ts'],outfile:'dist/preload.cjs',bundle:true,platform:'node',target:'node16',external:['electron']});
await build({entryPoints:['src/renderer/index.tsx'],outfile:'dist/renderer.js',bundle:true,platform:'browser',target:'chrome108',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
await copyFile('src/renderer/index.html','dist/index.html');
await copyFile('src/renderer/style.css','dist/style.css');

// Bundle local CJK UI fonts so clean Windows/Linux hosts never need web fonts.
const fontRoot='node_modules/@fontsource/noto-sans-sc';
const fontCss=(await Promise.all([400,700].map(weight=>readFile(`${fontRoot}/${weight}.css`,'utf8')))).join('\n');
await mkdir('dist/files',{recursive:true});
const fontFiles=new Set(Array.from(fontCss.matchAll(/url\(['"]?\.\/(files\/[^'")]+)['"]?\)/g),match=>match[1]));
if(!fontFiles.size)throw new Error('Bundled font stylesheet contains no local font files');
await Promise.all([...fontFiles].map(file=>copyFile(`${fontRoot}/${file}`,`dist/${file}`)));
await writeFile('dist/fonts.css',fontCss);
await copyFile(`${fontRoot}/LICENSE`,'dist/font-OFL.txt');
