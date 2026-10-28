import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { validateCase,hashAgreement,AppError } from '@/lib/domain.mjs';
export async function GET(){try{const id=await owner();const {store}=runtime();return response(await store.all('SELECT * FROM recovery_cases WHERE owner=? ORDER BY created_at DESC',id));}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
  mutationGuard(request);const user=await owner();const {store}=runtime();const data=validateCase(await jsonBody(request));
  const count=await store.one('SELECT COUNT(*) AS count FROM recovery_cases WHERE owner=?',user);
  if(Number(count?.count)>=30)throw new AppError('This sandbox workspace is limited to 30 cases.',409);
  const id=crypto.randomUUID();const stamp=new Date().toISOString();const hash=await hashAgreement({...data,id});
  await store.run('INSERT INTO recovery_cases (id,owner,title,currency,deposit,replacement,refund,costs,contingency,agreement_hash,approvals,original_status,replacement_status,refund_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,user,data.title,data.currency,data.deposit,data.replacement,data.refund,data.costs,data.contingency,hash,'{}','NOT_STARTED','NOT_STARTED','NOT_STARTED',stamp,stamp);
  await store.event(id,'CASE_CREATED','Sandbox case created. Product, cost and role data are demo inputs; no payment has moved.',{source:'DEMO_INPUT',agreementHash:hash});
  return response(await store.detail(id,user),201);
}catch(e){return errorResponse(e);}}
