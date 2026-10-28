// Isolated temporary receiver. Never proxies the UI or arbitrary URLs.
// Short-lived Sites service token is accepted only via hidden stdin.
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {PayPal} from '../lib/paypal.mjs';
import {webhookRelay} from '../lib/webhook-relay.mjs';
import {MAX_WEBHOOK_BYTES} from '../lib/webhook-input.mjs';
const raw=await readFile(new URL('../.dev.vars',import.meta.url),'utf8'),env=Object.fromEntries(raw.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')];}));
const config={PAYPAL_CLIENT_ID:env.PAYPAL_CLIENT_ID,PAYPAL_CLIENT_SECRET:env.PAYPAL_CLIENT_SECRET},provider=new PayPal(config);
let serviceToken='',last=null;const siteOrigin='https://your-secondcut.example.invalid';
const evidence={service:'Temporary isolated sandbox receiver',startedAt:new Date().toISOString(),deliveries:[]};
let persistence=Promise.resolve();function persist(){const snapshot=JSON.stringify(evidence,null,2);persistence=persistence.then(()=>writeFile(new URL('../../WEBHOOK_LIVE_TEST_EVIDENCE.json',import.meta.url),snapshot));return persistence;}
async function forward(payload){if(!serviceToken)return {ok:false,status:503};last=payload;const r=await fetch(siteOrigin+'/api/paypal/webhook',{method:'POST',headers:{'Content-Type':'application/json','OAI-Sites-Authorization':'Bearer '+serviceToken,...payload.signatureHeaders},body:payload.body,redirect:'error',signal:AbortSignal.timeout(25000)});let receipt;try{receipt=await r.json();}catch{}return {ok:r.ok,status:r.status,receipt};}
const handle=webhookRelay({provider,forward,onEvidence:entry=>{evidence.deliveries.push({...entry,at:new Date().toISOString()});persist().catch(()=>{});console.log(JSON.stringify(entry));}});
const server=createServer(async(req,res)=>{try{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_WEBHOOK_BYTES){res.writeHead(413).end();req.destroy();return;}chunks.push(chunk);}const body=Buffer.concat(chunks);const response=await handle(new Request('http://127.0.0.1:8789'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{}),signal:AbortSignal.timeout(60000)}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503).end();}});
server.requestTimeout=35000;server.headersTimeout=10000;server.listen(8789,'127.0.0.1',()=>console.log('Isolated receiver on 127.0.0.1:8789; awaiting hidden runtime configuration.'));
if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.resume();let input='';
process.stdin.on('data',async data=>{for(const c of data){if(c==='\u0003'){await persist();server.close();process.exit(0);}if(c==='\r'||c==='\n'){if(!input.trim())continue;try{const update=JSON.parse(input);input='';if(update.serviceToken)serviceToken=String(update.serviceToken);if(update.webhookId){config.PAYPAL_WEBHOOK_ID=String(update.webhookId);evidence.webhookId=String(update.webhookId);}if(update.publicUrl)evidence.publicUrl=String(update.publicUrl);if(update.inspectLast&&last){const result=await forward(last);console.log(JSON.stringify({inspection:true,status:result.status,receipt:result.receipt}));evidence.privateReceipt=result.receipt;}await persist();console.log('Runtime configuration updated; secrets remain hidden.');}catch{input='';console.log('Configuration or inspection failed.');}}else input+=c;}});
