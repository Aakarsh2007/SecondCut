import {AppError} from './domain.mjs';
import {parseWebhook} from './webhook-input.mjs';
import {enqueueWebhook,processWebhook} from './webhooks.mjs';
const inboxOrigin='https://your-sandbox-inbox.example.invalid';
export function inboxConfigured(config){return config.PAYPAL_INBOX_ORIGIN===inboxOrigin&&typeof config.PAYPAL_INBOX_SYNC_KEY==='string'&&config.PAYPAL_INBOX_SYNC_KEY.length>=40&&!!config.PAYPAL_WEBHOOK_ID;}
export async function syncWebhookInbox(store,provider,config,fetcher=(...args)=>fetch(...args)){
 if(!inboxConfigured(config))return {configured:false,fetched:0,processed:0,acknowledged:0,pending:0};
 async function call(path,body){let r;try{r=await fetcher(inboxOrigin+path,{method:'POST',headers:{Authorization:'Bearer '+config.PAYPAL_INBOX_SYNC_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(20000)});}catch(error){console.error('Inbox fetch failure',String(error?.message||'Fetch failed').slice(0,240));throw new AppError('Permanent webhook inbox could not be reached. Verified events remain queued.',503,'WEBHOOK_INBOX_UNAVAILABLE');}if(!r.ok)throw new AppError('Permanent webhook inbox refused synchronization. Check receiver access and server configuration.',503,'WEBHOOK_INBOX_UNAVAILABLE');return r.json();}
 const data=await call('/internal/events',{});if(!Array.isArray(data.events)||data.events.length>10)throw new AppError('Inbox returned an invalid batch.',502);
 const ack=[],errors=[];
 for(const item of data.events){try{
  const storedHeaders=typeof item.headers==='string'?JSON.parse(item.headers):item.headers;
  const {event,signatureHeaders}=parseWebhook(item.body,storedHeaders);if(event.id!==item.id)throw new AppError('Inbox event identity mismatch.');
  // Verify independently with the same PayPal app/webhook binding, even though
  // the durable receiver already verified delivery before storing it.
  const queued=await enqueueWebhook(store,provider,item.body,signatureHeaders);
  await processWebhook(store,provider,queued.id);
  const row=await store.one('SELECT status FROM webhook_inbox WHERE id=?',queued.id);
  if(row?.status==='PROCESSED')ack.push(item.id);else errors.push({id:item.id,code:'RECONCILIATION_PENDING'});
 }catch(error){errors.push({id:typeof item.id==='string'?item.id.slice(0,150):'invalid',code:error.code||'IMPORT_PENDING'});}}
 let acknowledged=0;if(ack.length){await call('/internal/ack',{ids:ack});acknowledged=ack.length;}
 return {configured:true,fetched:data.events.length,processed:ack.length,acknowledged,pending:errors.length,errors};
}
