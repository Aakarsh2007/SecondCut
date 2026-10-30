import {owner,runtime,response,errorResponse,mutationGuard,jsonBody} from '@/lib/runtime';
import {requestCommercialAdvice} from '@/lib/commercial-ai.mjs';
export async function POST(request:Request){try{mutationGuard(request);const user=await owner(),body=await jsonBody(request),{store,config}=runtime();return response(await requestCommercialAdvice(store,user,body,config));}catch(e){return errorResponse(e);}}
