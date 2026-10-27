import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
await build({entryPoints:['src/main/main.ts'],outfile:'dist/main.cjs',bundle:true,platform:'node',target:'node16',external:['electron'],sourcemap:true});
await build({entryPoints:['src/main/preload.ts'],outfile:'dist/preload.cjs',bundle:true,platform:'node',target:'node16',external:['electron']});
await build({entryPoints:['src/renderer/index.tsx'],outfile:'dist/renderer.js',bundle:true,platform:'browser',target:'chrome108',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
await copyFile('src/renderer/index.html','dist/index.html');
await copyFile('src/renderer/style.css','dist/style.css');
