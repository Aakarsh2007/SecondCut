import {parseWebhook,readWebhookBody} from './webhook-input.mjs';
export function webhookRelay({provider,forward,onEvidence=()=>{}}){
 let windowStart=Date.now(),requests=0,inflight=0;
 return async function handle(request){
  const url=new URL(request.url);
  if(url.pathname==='/health'&&request.method==='GET')return Response.json({service:'SecondCut sandbox webhook receiver',temporaryTestReceiver:true});
  if(url.pathname!=='/paypal/webhook'||url.search)return new Response('Not found',{status:404});
  if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
  if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}
  if(++requests>30||inflight>=3)return new Response('Retry later',{status:429,headers:{'Retry-After':'60'}});
  inflight++;
  try{
   const body=await readWebhookBody(request),{event,signatureHeaders}=parseWebhook(body,request.headers);
   if(!await provider.verifyWebhook(signatureHeaders,event)){onEvidence({outcome:'SIGNATURE_REJECTED'});return new Response('Invalid signature',{status:400});}
   const result=await forward({body,event,signatureHeaders});
   if(!result.ok){onEvidence({eventId:event.id,eventType:event.event_type,outcome:'FORWARD_PENDING',status:result.status});return new Response('Private receiver unavailable; retry delivery',{status:503});}
   onEvidence({eventId:event.id,eventType:event.event_type,resourceId:event.resource?.id||null,transmissionId:signatureHeaders['paypal-transmission-id'],outcome:'VERIFIED_AND_FORWARDED',privateStatus:result.receipt?.status||'ACCEPTED'});
   return Response.json({received:true});
  }catch(error){onEvidence({outcome:'RECEIVER_ERROR',code:error.code||'UNAVAILABLE'});return new Response('Receiver rejected or could not verify delivery',{status:error.status&&error.status<500?error.status:503});}
  finally{inflight--;}
 };
}
