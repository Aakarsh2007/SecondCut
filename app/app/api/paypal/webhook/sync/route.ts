import {owner,runtime,response,errorResponse,mutationGuard} from '@/lib/runtime';
import {syncWebhookInbox} from '@/lib/webhook-sync.mjs';
export async function POST(request:Request){try{mutationGuard(request);await owner();const {store,provider,config}=runtime();return response(await syncWebhookInbox(store,provider,config));}catch(e){return errorResponse(e);}}
