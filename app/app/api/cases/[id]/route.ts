import { owner,runtime,response,errorResponse } from '@/lib/runtime';
import { AppError } from '@/lib/domain.mjs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const user=await owner();const result=await runtime().store.detail(id,user);if(!result)throw new AppError('Case not found.',404);return response(result);}catch(e){return errorResponse(e);}}
