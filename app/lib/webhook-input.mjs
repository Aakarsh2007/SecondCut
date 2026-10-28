import {AppError} from './domain.mjs';
export const MAX_WEBHOOK_BYTES=131072;
export const SIGNATURE_HEADERS=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
export function parseWebhook(body,headers){
 if(typeof body!=='string'||new TextEncoder().encode(body).byteLength>MAX_WEBHOOK_BYTES)throw new AppError('Webhook too large.',413);
 let event;try{event=JSON.parse(body);}catch{throw new AppError('Invalid webhook JSON.');}
 if(!event||typeof event.id!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(event.id)||typeof event.event_type!=='string'||!/^[A-Z0-9_.]{1,100}$/.test(event.event_type))throw new AppError('Missing or invalid webhook identity.');
 const signatures={};for(const key of SIGNATURE_HEADERS){const value=typeof headers.get==='function'?headers.get(key):headers[key];if(typeof value!=='string'||!value||value.length>4096)throw new AppError('Missing or invalid PayPal signature header.');signatures[key]=value;}
 let cert;try{cert=new URL(signatures['paypal-cert-url']);}catch{throw new AppError('Invalid PayPal certificate URL.');}
 if(cert.protocol!=='https:'||!['api.sandbox.paypal.com','api-m.sandbox.paypal.com'].includes(cert.hostname)||cert.username||cert.password||cert.port||!cert.pathname.startsWith('/v1/notifications/certs/')||cert.search||cert.hash)throw new AppError('Only PayPal sandbox certificate URLs are accepted.');
 if(signatures['paypal-auth-algo']!=='SHA256withRSA'||Number.isNaN(Date.parse(signatures['paypal-transmission-time'])))throw new AppError('Unsupported signature algorithm or transmission time.');
 return {event,signatureHeaders:signatures};
}
export async function readWebhookBody(request){
 if(Number(request.headers.get('content-length')||0)>MAX_WEBHOOK_BYTES)throw new AppError('Webhook too large.',413);
 const reader=request.body?.getReader();if(!reader)throw new AppError('Webhook body required.');
 let total=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_WEBHOOK_BYTES){await reader.cancel();throw new AppError('Webhook too large.',413);}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new AppError('Webhook must contain valid UTF-8.');}
}
