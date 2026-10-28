import {PayPal} from '../lib/paypal.mjs';
import {parseWebhook,readWebhookBody} from '../lib/webhook-input.mjs';
import {AppError} from '../lib/domain.mjs';

async function authorized(request,env){
 const supplied=request.headers.get('authorization')||'';
 if(!env.INBOX_SYNC_KEY||env.INBOX_SYNC_KEY.length<40)return false;
 const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied))),b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('Bearer '+env.INBOX_SYNC_KEY)));
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(request,env,provider=new PayPal(env)){
 const path=new URL(request.url).pathname;
 if(path==='/health'&&request.method==='GET')return json({service:'SecondCut sandbox webhook inbox',environment:'SANDBOX'});
 if(!['/paypal/webhook','/internal/events','/internal/ack'].includes(path)||new URL(request.url).search)return new Response('Not found',{status:404});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
 if(!env.DB)return json({error:'Storage unavailable'},503);
 try{
  if(path.startsWith('/internal/')){
   if(!await authorized(request,env))return json({error:'Unauthorized'},401);
   if(path==='/internal/events'){
    const rows=(await env.DB.prepare('SELECT id,body,headers,received_at FROM verified_events WHERE acknowledged_at IS NULL ORDER BY received_at,id LIMIT 3').all()).results;
    return json({events:rows});
   }
   const raw=await readWebhookBody(request);if(raw.length>4096)throw new AppError('Acknowledgment too large.',413);
   let body;try{body=JSON.parse(raw);}catch{throw new AppError('Invalid JSON.');}
   if(!Array.isArray(body.ids)||body.ids.length>10||body.ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(id)))throw new AppError('Provide at most ten exact event IDs.');
   if(body.ids.length)await env.DB.batch(body.ids.map(id=>env.DB.prepare('UPDATE verified_events SET acknowledged_at=COALESCE(acknowledged_at,?) WHERE id=?').bind(new Date().toISOString(),id)));
   return json({acknowledged:body.ids.length});
  }
  const raw=await readWebhookBody(request),{event,signatureHeaders}=parseWebhook(raw,request.headers);
  if(!env.PAYPAL_WEBHOOK_ID)throw new AppError('Webhook registration unavailable.',503);
  // A bounded global admission budget prevents an unauthenticated signature flood
  // from causing unlimited verification calls. No raw unverified payload is saved.
  const window=new Date().toISOString().slice(0,16);
  const admitted=await env.DB.prepare('INSERT INTO admission_budget (window,attempts) VALUES (?,1) ON CONFLICT(window) DO UPDATE SET attempts=attempts+1 WHERE attempts<60 RETURNING attempts').bind(window).first();
  if(!admitted)return json({error:'Retry delivery later'},429);
  await env.DB.prepare('DELETE FROM admission_budget WHERE window<?').bind(new Date(Date.now()-180000).toISOString().slice(0,16)).run();
  if(!await provider.verifyWebhook(signatureHeaders,event))return json({error:'Invalid signature'},400);
  await env.DB.prepare('INSERT OR IGNORE INTO verified_events (id,body,headers,event_type,resource_id,received_at) VALUES (?,?,?,?,?,?)').bind(event.id,raw,JSON.stringify(signatureHeaders),event.event_type,event.resource?.id||null,new Date().toISOString()).run();
  const saved=await env.DB.prepare('SELECT event_type,resource_id FROM verified_events WHERE id=?').bind(event.id).first();
  if(!saved||saved.event_type!==event.event_type||saved.resource_id!==(event.resource?.id||null))throw new AppError('Event identity conflict.',409);
  return json({received:true},202);
 }catch(error){console.error('Receiver failure',JSON.stringify({name:error?.name,code:error?.code,message:String(error?.message||'Unknown error').slice(0,240)}));return json({error:error instanceof AppError?error.message:'Receiver unavailable; retry delivery'},error instanceof AppError?error.status:503);}
}
export default {fetch(request,env){return handle(request,env);}};
