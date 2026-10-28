import {participantIdentity,runtime,response,errorResponse,mutationGuard,jsonBody} from '@/lib/runtime';
import {claimInvite} from '@/lib/participants.mjs';
export async function POST(request:Request){try{mutationGuard(request);return response(await claimInvite(runtime().store,await participantIdentity(),await jsonBody(request)));}catch(e){return errorResponse(e);}}
