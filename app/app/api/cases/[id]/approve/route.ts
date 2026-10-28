import { owner,runtime,response,errorResponse,mutationGuard,jsonBody } from '@/lib/runtime';
import { AppError } from '@/lib/domain.mjs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
  mutationGuard(request);const {id}=await params;const user=await owner();const {role}=await jsonBody(request);
  if(!['maker','original','replacement'].includes(role))throw new AppError('Unknown agreement role.');
  const {store}=runtime();const c=await store.getCase(id,user);if(!c)throw new AppError('Case not found.',404);
  if(c.approval_mode==='PARTICIPANTS')throw new AppError('Each invited participant must sign in and approve their own exact agreement.',403);
  if(c.replacement_order_id||c.active_operation)throw new AppError('Agreement is locked after checkout starts.',409);
  // Atomic JSON update avoids dropping another role's attestation during simultaneous requests.
  const attestation={hash:c.agreement_hash,actor:user,at:new Date().toISOString(),mode:'OWNER_CONTROLLED_DEMO'};
  const changed=await store.one("UPDATE recovery_cases SET approvals=json_set(approvals, ?, json(?)),updated_at=? WHERE id=? AND approval_mode='OWNER_CONTROLLED_DEMO' AND replacement_order_id IS NULL AND active_operation IS NULL RETURNING id",`$.${role}`,JSON.stringify(attestation),new Date().toISOString(),id);
  if(!changed)throw new AppError('Agreement changed or checkout started. Reload.',409);
  await store.event(id,'DEMO_ATTESTATION',`${role} terms acknowledged by workspace owner (demo role, not independently authenticated).`,{role,hash:c.agreement_hash});
  return response(await store.detail(id,user));
}catch(e){return errorResponse(e);}}
