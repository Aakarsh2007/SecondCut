import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { confirmPlanningRun } from '@/lib/planning-service.mjs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 mutationGuard(request);const user=await owner(),{id}=await params,body=await jsonBody(request),{store}=runtime();
 return response(await confirmPlanningRun(store,id,user,body),201);
}catch(e){return errorResponse(e);}}
