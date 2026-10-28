import {participantIdentity,runtime,response,errorResponse,mutationGuard,jsonBody} from '@/lib/runtime';
import {participantView} from '@/lib/participants.mjs';
import {fulfillmentView,recordFulfillment} from '@/lib/fulfillment.mjs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const {store}=runtime(),actor=await participantIdentity(),review=await participantView(store,(await params).id,actor);return response(await fulfillmentView(store,review.terms.id));}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{mutationGuard(request);return response(await recordFulfillment(runtime().store,(await params).id,await participantIdentity(),await jsonBody(request)));}catch(e){return errorResponse(e);}}
