import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { AppError } from '@/lib/domain.mjs';
import { evaluatePlanning,validatePlanningInput,samplePlanningInput } from '@/lib/planner.mjs';
export async function GET(){try{await owner();return response(samplePlanningInput());}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
  mutationGuard(request);const user=await owner(),input=validatePlanningInput(await jsonBody(request));const {store}=runtime();
  const count=await store.one('SELECT COUNT(*) AS count FROM planning_runs WHERE owner=?',user);
  if(Number(count?.count)>=200)throw new AppError('This prototype allows 200 saved planning runs per workspace.',409);
  const result=evaluatePlanning(input),id=crypto.randomUUID(),stamp=new Date().toISOString();
  await store.run('INSERT INTO planning_runs (id,owner,input,result,created_at) VALUES (?,?,?,?,?)',id,user,JSON.stringify(input),JSON.stringify(result),stamp);
  return response({id,input,result},201);
}catch(e){return errorResponse(e);}}
