import { waitUntil } from 'cloudflare:workers';
import { runtime,response,errorResponse } from '@/lib/runtime';
import { enqueueWebhook,processWebhook } from '@/lib/webhooks.mjs';
import {parseWebhook,readWebhookBody} from '@/lib/webhook-input.mjs';
import { AppError } from '@/lib/domain.mjs';
export async function POST(request:Request){try{
  const body=await readWebhookBody(request),{signatureHeaders}=parseWebhook(body,request.headers);
  const {store,provider,config}=runtime();if(!config.PAYPAL_WEBHOOK_ID)throw new AppError('Register and configure the sandbox webhook before delivery.',503);
  const queued=await enqueueWebhook(store,provider,body,signatureHeaders);
  if(!['PROCESSED','DUPLICATE'].includes(queued.status))waitUntil(processWebhook(store,provider,queued.id));
  return response({received:true,status:queued.status,duplicate:queued.duplicate},202);
}catch(e){return errorResponse(e);}}
