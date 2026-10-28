import {participantIdentity,runtime,response,errorResponse,mutationGuard,jsonBody} from '@/lib/runtime';
import {participantView,decide} from '@/lib/participants.mjs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{return response(await participantView(runtime().store,(await params).id,await participantIdentity()));}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{mutationGuard(request);return response(await decide(runtime().store,(await params).id,await participantIdentity(),await jsonBody(request)));}catch(e){return errorResponse(e);}}
