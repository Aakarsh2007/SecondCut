import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { AppError } from '@/lib/domain.mjs';
import { submitCounteroffer } from '@/lib/negotiation.mjs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await owner(),{id}=await params,{store}=runtime();const row=await store.one('SELECT * FROM negotiations WHERE id=? AND owner=?',id,user);if(!row)throw new AppError('Negotiation not found.',404);return response({...row,rounds:JSON.parse(row.rounds),remaining:3-row.revision,mode:'OWNER_CONTROLLED_DEMO'});}catch(e){return errorResponse(e);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{mutationGuard(request);const user=await owner(),{id}=await params,body=await jsonBody(request),{store}=runtime();return response(await submitCounteroffer(store,user,id,body));}catch(e){return errorResponse(e);}}
