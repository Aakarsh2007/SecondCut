import {AppError,assertAmount} from './domain.mjs';
export async function enqueueWebhook(store,provider,body,signatureHeaders){
 const event=JSON.parse(body);
 if(!await provider.verifyWebhook(signatureHeaders,event))throw new AppError('PayPal signature verification failed.',400,'INVALID_WEBHOOK_SIGNATURE');
 const id=crypto.randomUUID(),stamp=new Date().toISOString();
 await store.run("INSERT OR IGNORE INTO webhook_inbox (id,event_id,body,headers,status,created_at,updated_at) VALUES (?,?,?,?,'PENDING',?,?)",id,event.id,body,JSON.stringify(signatureHeaders),stamp,stamp);
 const row=await store.one('SELECT id,status,body FROM webhook_inbox WHERE event_id=?',event.id);
 if(!row)throw new AppError('Verified event could not be durably queued.',503);
 const previous=JSON.parse(row.body);if(previous.event_type!==event.event_type||previous.resource?.id!==event.resource?.id)throw new AppError('PayPal event ID conflicts with saved event evidence.',409,'WEBHOOK_EVENT_CONFLICT');
 return {id:row.id,status:row.status,duplicate:row.id!==id};
}
export async function processWebhook(store,provider,inboxId){
 const row=await store.one('SELECT * FROM webhook_inbox WHERE id=?',inboxId);if(!row||['PROCESSED','DUPLICATE','REJECTED'].includes(row.status))return;
 const stamp=()=>new Date().toISOString();let lease=null;
 try{
  const event=JSON.parse(row.body),headers=JSON.parse(row.headers);
  if(!await provider.verifyWebhook(headers,event)){await store.run("UPDATE webhook_inbox SET status='REJECTED',error=?,updated_at=? WHERE id=? AND status='PENDING'",'PayPal signature verification failed.',stamp(),inboxId);return;}
  // Legacy placeholders must compete for the verified canonical event key.
  if(row.event_id!==event.id){
   try{await store.run('UPDATE webhook_inbox SET event_id=? WHERE id=?',event.id,inboxId);}catch{
    const canonical=await store.one('SELECT id FROM webhook_inbox WHERE event_id=?',event.id);
    if(canonical&&canonical.id!==inboxId){await store.run("UPDATE webhook_inbox SET status='DUPLICATE',updated_at=? WHERE id=?",stamp(),inboxId);return;}throw new Error('Could not claim event key.');
   }
  }
  const token=crypto.randomUUID(),expired=new Date(Date.now()-120000).toISOString();
  const claimed=await store.one("UPDATE webhook_inbox SET status='PROCESSING',processing_token=?,updated_at=? WHERE id=? AND (status='PENDING' OR (status='PROCESSING' AND updated_at<?)) RETURNING id",token,stamp(),inboxId,expired);if(!claimed)return;lease=token;
  const related=event.resource?.supplementary_data?.related_ids,resourceId=event.resource?.id;
  const c=await store.one('SELECT * FROM recovery_cases WHERE original_capture_id=? OR replacement_capture_id=? OR authorization_id=? OR refund_id=? OR original_order_id=? OR replacement_order_id=?',resourceId||'',resourceId||'',resourceId||'',resourceId||'',related?.order_id||'',related?.order_id||'');
  const updates={};
  if(c){
   // Readback only: an event can never create, capture, void or refund.
   for(const [field,statusField,path,amount] of [['original_capture_id','original_status','captures',c.deposit],['replacement_capture_id','replacement_status','captures',c.replacement],['refund_id','refund_status','refunds',c.refund]]){
    if(!c[field])continue;const resource=await provider.request('/v2/payments/'+path+'/'+c[field]);assertAmount(resource,amount);updates[statusField]=resource.status;
   }
   if(c.authorization_id&&!c.replacement_capture_id){const auth=await provider.request('/v2/payments/authorizations/'+c.authorization_id);assertAmount(auth,c.replacement);if(['VOIDED','EXPIRED'].includes(auth.status))updates.replacement_status=auth.status;}
  }
  const eligible="SELECT id FROM webhook_inbox WHERE id=? AND status='PROCESSING' AND processing_token=?",stmts=[],entries=Object.entries(updates);
  if(c&&entries.length)stmts.push(store.db.prepare('UPDATE recovery_cases SET '+entries.map(([k])=>k+'=?').join(',')+',updated_at=? WHERE id=? AND EXISTS ('+eligible+')').bind(...entries.map(([,v])=>v),stamp(),c.id,inboxId,lease));
  if(c)stmts.push(store.db.prepare("INSERT INTO audit_events (id,case_id,type,message,metadata,created_at) SELECT ?,?,'VERIFIED_WEBHOOK',?,?,? WHERE EXISTS ("+eligible+")").bind(crypto.randomUUID(),c.id,'Verified PayPal event: '+event.event_type,JSON.stringify({eventId:event.id,resourceId,source:'PAYPAL_SANDBOX'}),stamp(),inboxId,lease));
  stmts.push(store.db.prepare("UPDATE webhook_inbox SET status='PROCESSED',error=NULL,processing_token=NULL,updated_at=? WHERE id=? AND status='PROCESSING' AND processing_token=?").bind(stamp(),inboxId,lease));
  await store.db.batch(stmts);
 }catch(error){
  if(lease)await store.run("UPDATE webhook_inbox SET status='PENDING',error=?,processing_token=NULL,updated_at=? WHERE id=? AND processing_token=?",String(error?.code||'Verification or reconciliation pending.').slice(0,150),stamp(),inboxId,lease);
  else await store.run("UPDATE webhook_inbox SET error=?,updated_at=? WHERE id=? AND status='PENDING'",String(error?.code||'Verification pending.').slice(0,150),stamp(),inboxId);
 }
}
