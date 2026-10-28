import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
const parts=['lib/domain.mjs','lib/paypal.mjs','lib/webhook-input.mjs','worker/index.js'];
const source=(await Promise.all(parts.map(p=>readFile(p,'utf8')))).map(s=>s.replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?!default)/g,'')).join('\n');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',source);await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/.openai/drizzle',{recursive:true});
const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));if(typeof mod.default?.fetch!=='function')throw new Error('Worker export missing');console.log('Standalone receiver built and validated.');
