import {owner,runtime,response,errorResponse} from '@/lib/runtime';
import {journeyEvidence} from '@/lib/journey-evidence.mjs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await owner(),{id}=await params;return response(await journeyEvidence(runtime().store,id,user));}catch(e){return errorResponse(e);}}
