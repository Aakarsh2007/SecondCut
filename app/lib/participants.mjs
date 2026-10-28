import {AppError,hashAgreement} from './domain.mjs';
import {evaluatePlanning} from './planner.mjs';
const roles=['maker','original','replacement'];
const stamp=at=>at.toISOString();
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function email(value){if(typeof value!=='string'||value.length>254||!/^\S+@\S+\.\S+$/.test(value))throw new AppError('Enter the intended participant’s sign-in email.');return value.trim().toLowerCase();}
function fresh(c,at){if(c.approval_mode!=='PARTICIPANTS'||c.recovery_status!=='ACTIVE')throw new AppError('Participant agreement is unavailable or stopped.',409);if(!c.agreement_expires_at||Date.parse(c.agreement_expires_at)<=at.getTime())throw new AppError('Agreement expired. No acceptance or capture is allowed.',409);}
export async function enableParticipants(store,id,user,body,at=new Date()){
 const c=await store.getCase(id,user);if(!c)throw new AppError('Case not found.',404);
 if(c.approval_mode==='PARTICIPANTS')throw new AppError('Participant terms are already fixed. Changes require a new case.',409);
 if(c.replacement_order_id||c.active_operation||c.replacement_capture_id||c.refund_id)throw new AppError('Cannot change agreement mode after replacement checkout starts.',409);
 const expiry=new Date(body.expiresAt);if(!Number.isFinite(expiry.getTime())||expiry<=at||expiry.getTime()>at.getTime()+14*86400000)throw new AppError('Choose an agreement expiry within the next 14 days.');
 const plan=await store.one('SELECT input,result,selected_need FROM planning_runs WHERE case_id=? AND owner=?',id,user);
 let details;
 if(plan){const input=JSON.parse(plan.input),need=input.needs.find(n=>n.id===plan.selected_need),result=evaluatePlanning(input,at),candidate=result.candidates.find(n=>n.id===plan.selected_need);if(!need||candidate?.status!=='FEASIBLE')throw new AppError('Planning evidence expired or is no longer feasible. Create a fresh planning proposal.',409);const validThrough=Math.min(Date.parse(input.snapshot.quoteExpiresDate+'T23:59:59.999Z'),Date.parse(need.expiresDate+'T23:59:59.999Z'));if(expiry.getTime()>validThrough)throw new AppError('Agreement expiry cannot exceed the maker quote or buyer request expiry.');details={source:'PLANNING_RUN',snapshot:input.snapshot,request:need,operations:candidate.operations,fulfillment:'Local pickup; maker must confirm structural safety, capacity and ownership rights. No unconditional refund is deferred.'};}
 else{if(typeof body.specifications!=='string'||body.specifications.trim().length<30||body.specifications.length>2000)throw new AppError('Describe physical specifications, approved modifications, pickup date/location and maker constraints (30–2,000 characters).');details={source:'OWNER_RECORDED',specifications:body.specifications.trim(),fulfillment:'Physical specifications and costs require maker validation. No unconditional refund is deferred.'};}
 if(body.confirmTerms!==true)throw new AppError('Confirm the exact financial and physical terms before fixing this agreement.');
 const agreement_details=JSON.stringify(details),agreement_expires_at=expiry.toISOString(),hash=await hashAgreement({...c,agreement_details,agreement_expires_at});
 const changed=await store.one("UPDATE recovery_cases SET approval_mode='PARTICIPANTS',agreement_details=?,agreement_expires_at=?,agreement_hash=?,approvals='{}',updated_at=? WHERE id=? AND owner=? AND approval_mode='OWNER_CONTROLLED_DEMO' AND replacement_order_id IS NULL AND active_operation IS NULL RETURNING id",agreement_details,agreement_expires_at,hash,stamp(at),id,user);
 if(!changed)throw new AppError('Case changed while preparing participant terms. Reload.',409);
 await store.event(id,'PARTICIPANT_TERMS_FIXED','Fixed physical specifications, amounts and expiry; prior demo attestations cleared.',{hash,expiresAt:agreement_expires_at});
 return store.detail(id,user);
}
export async function createInvite(store,id,user,body,at=new Date()){
 const c=await store.getCase(id,user);if(!c)throw new AppError('Case not found.',404);fresh(c,at);
 if(!roles.includes(body.role))throw new AppError('Unknown participant role.');
 if(c.replacement_order_id||c.active_operation)throw new AppError('Invitations are locked once replacement checkout starts.',409);
 const recipient=email(body.email),token=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await digest(token),inviteId=crypto.randomUUID();
 // A claimed role cannot be silently reassigned; make a new agreement instead.
 try{await store.run("INSERT INTO participant_invites (id,case_id,role,email,token_hash,agreement_hash,expires_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'INVITED',?,?) ON CONFLICT(case_id,role) DO UPDATE SET token_hash=excluded.token_hash,email=excluded.email,expires_at=excluded.expires_at,updated_at=excluded.updated_at WHERE participant_invites.actor IS NULL AND participant_invites.status='INVITED'",inviteId,id,body.role,recipient,tokenHash,c.agreement_hash,c.agreement_expires_at,stamp(at),stamp(at));}catch{throw new AppError('Could not create this role invitation.',409);}
 const saved=await store.one('SELECT id,token_hash FROM participant_invites WHERE case_id=? AND role=?',id,body.role);if(saved?.token_hash!==tokenHash)throw new AppError('This role was already claimed. It cannot be reassigned in place.',409);
 await store.event(id,'PARTICIPANT_INVITED',`A targeted ${body.role} invitation was created. No message was sent.`,{role:body.role,invitation:saved.id});
 return {id:saved.id,role:body.role,token,expiresAt:c.agreement_expires_at};
}
function safeView(c,grant){let details=JSON.parse(c.agreement_details);if(grant.role!=='maker'&&details.source==='PLANNING_RUN'){const pick=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]]));details={source:details.source,fulfillment:details.fulfillment,snapshot:pick(details.snapshot,['title','version','unit','lengthMm','widthMm','material','finish','stage','pickupArea','readyDate','quoteExpiresDate']),request:pick(details.request,['lengthMm','widthMm','material','finish','pickupArea','latestDate','source']),operations:details.operations.map(o=>pick(o,['id','from','to','unit']))};}const terms={id:c.id,title:c.title,currency:c.currency,deposit:c.deposit,replacement:c.replacement,refund:c.refund,agreementHash:c.agreement_hash,details,expiresAt:c.agreement_expires_at,recoveryStatus:c.recovery_status,commitmentLocked:!!c.active_operation||!!c.replacement_capture_id||c.replacement_status==='COMPLETED'};if(grant.role==='maker')Object.assign(terms,{costs:c.costs,contingency:c.contingency});return {id:grant.id,role:grant.role,status:grant.status,terms,notice:'Sign-in identifies an account, not a verified legal identity or PayPal account. Agreement applies only to this sandbox workflow.'};}
export async function claimInvite(store,actor,body,at=new Date()){
 if(typeof body.token!=='string'||!/^[a-f0-9-]{72}$/.test(body.token))throw new AppError('Invalid invitation.',404);
 const row=await store.one('SELECT * FROM participant_invites WHERE token_hash=?',await digest(body.token));if(!row)throw new AppError('Invitation not found.',404);
 if(email(actor.email)!==row.email)throw new AppError('Sign in with the email this invitation was addressed to.',403);
 const c=await store.one('SELECT * FROM recovery_cases WHERE id=?',row.case_id);fresh(c,at);
 if(row.agreement_hash!==c.agreement_hash||Date.parse(row.expires_at)<=at.getTime())throw new AppError('Invitation expired or terms changed.',409);
 if(row.actor&&row.actor!==actor.id)throw new AppError('Invitation was already claimed by another account.',403);
 if(row.actor===actor.id)return safeView(c,row);
 if(actor.id===c.owner&&row.role!=='maker')throw new AppError('The workspace owner cannot impersonate either buyer.',403);
 try{const changed=await store.one("UPDATE participant_invites SET actor=?,status='CLAIMED',updated_at=? WHERE id=? AND token_hash=? AND email=? AND expires_at>? AND actor IS NULL AND status='INVITED' AND EXISTS (SELECT id FROM recovery_cases WHERE id=? AND recovery_status='ACTIVE' AND active_operation IS NULL AND agreement_hash=? AND approval_mode='PARTICIPANTS') RETURNING id",actor.id,stamp(at),row.id,row.token_hash,row.email,stamp(at),c.id,c.agreement_hash);if(!changed)throw new Error();}catch{throw new AppError('This account already holds a role or the invitation changed. Each role needs a distinct account.',409);}
 await store.event(c.id,'PARTICIPANT_CLAIMED',`${row.role} invitation claimed by the targeted signed-in account.`,{role:row.role,invitation:row.id});
 return safeView(c,{...row,actor:actor.id,status:'CLAIMED'});
}
export async function participantView(store,id,actor){const row=await store.one('SELECT * FROM participant_invites WHERE id=? AND actor=?',id,actor.id);if(!row)throw new AppError('Participant review not found.',404);return safeView(await store.one('SELECT * FROM recovery_cases WHERE id=?',row.case_id),row);}
export async function decide(store,id,actor,body,at=new Date()){
 const row=await store.one('SELECT * FROM participant_invites WHERE id=? AND actor=?',id,actor.id);if(!row)throw new AppError('Participant review not found.',404);
 const c=await store.one('SELECT * FROM recovery_cases WHERE id=?',row.case_id);fresh(c,at);
 if(body.hash!==c.agreement_hash||row.agreement_hash!==c.agreement_hash)throw new AppError('Terms changed. Review the exact agreement again.',409);
 const decision=body.decision;if(!['APPROVED','REJECTED','WITHDRAWN'].includes(decision)||body.confirm!==true)throw new AppError('Choose and explicitly confirm approval, rejection or withdrawal.');
 if(c.active_operation||c.replacement_status==='COMPLETED'||c.replacement_capture_id)throw new AppError('A payment is in progress or captured. Report an issue to the maker; commitment cannot be silently withdrawn.',409);
 if(row.status===decision)return participantView(store,id,actor);
 if(!['CLAIMED','APPROVED'].includes(row.status))throw new AppError('This participant decision is final for this proposal.',409);
 const ref=crypto.randomUUID(),approved=JSON.stringify({hash:c.agreement_hash,actor:actor.id,at:stamp(at),mode:'PARTICIPANT'}),status=decision==='APPROVED'?'ACTIVE':decision;
 const eligible="SELECT id FROM participant_invites WHERE id=? AND actor=? AND decision_ref=?";
 await store.db.batch([
  store.db.prepare("UPDATE participant_invites SET status=?,decision_ref=?,updated_at=? WHERE id=? AND actor=? AND status IN ('CLAIMED','APPROVED') AND EXISTS (SELECT id FROM recovery_cases WHERE id=? AND recovery_status='ACTIVE' AND active_operation IS NULL AND replacement_capture_id IS NULL AND replacement_status!='COMPLETED' AND agreement_hash=? AND agreement_expires_at>?)").bind(decision,ref,stamp(at),id,actor.id,c.id,c.agreement_hash,stamp(at)),
  store.db.prepare(`UPDATE recovery_cases SET approvals=${decision==='APPROVED'?'json_set(approvals,?,json(?))':'json_remove(approvals,?)'},recovery_status=?,updated_at=? WHERE id=? AND EXISTS (${eligible})`).bind(`$.${row.role}`,...(decision==='APPROVED'?[approved]:[]),status,stamp(at),c.id,id,actor.id,ref),
  store.db.prepare(`INSERT INTO audit_events (id,case_id,type,message,metadata,created_at) SELECT ?,?,'PARTICIPANT_DECISION',?,?,? WHERE EXISTS (${eligible})`).bind(crypto.randomUUID(),c.id,`${row.role}: ${decision.toLowerCase()} exact participant agreement.`,JSON.stringify({role:row.role,hash:c.agreement_hash,actor:actor.id}),stamp(at),id,actor.id,ref),
 ]);
 const saved=await store.one('SELECT decision_ref FROM participant_invites WHERE id=?',id);if(saved.decision_ref!==ref)throw new AppError('Payment or participant state changed. Reload before deciding.',409);
 return participantView(store,id,actor);
}
