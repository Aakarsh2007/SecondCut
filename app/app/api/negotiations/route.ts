import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { startNegotiation } from '@/lib/negotiation.mjs';
export async function POST(request:Request){try{mutationGuard(request);const user=await owner(),body=await jsonBody(request),{store}=runtime();return response(await startNegotiation(store,user,body.runId,body.needId),201);}catch(e){return errorResponse(e);}}
