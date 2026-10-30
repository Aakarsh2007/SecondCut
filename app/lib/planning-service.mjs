import { AppError,validateCase,hashAgreement } from './domain.mjs';
import { evaluatePlanning } from './planner.mjs';

export async function confirmPlanningRun(store,id,user,body,at=new Date()) {
  const run=await store.one('SELECT * FROM planning_runs WHERE id=? AND owner=?',id,user);
  if(!run)throw new AppError('Planning run not found.',404);
  if(run.case_id)return store.detail(run.case_id,user);
  if(body.makerConfirmed!==true)throw new AppError('Maker confirmation is required.');
  const input=JSON.parse(run.input),result=evaluatePlanning(input,at),candidate=result.candidates.find(c=>c.id===body.needId);
  if(!candidate||candidate.status!=='FEASIBLE')throw new AppError('This request is no longer feasible or available. Run planning again.',409);
  if(candidate.fragile&&body.acceptFragility!==true)throw new AppError('Acknowledge the cost-overrun risk before creating this proposal.');
  const count=await store.one('SELECT COUNT(*) AS count FROM recovery_cases WHERE owner=?',user);
  if(Number(count?.count)>=30)throw new AppError('This sandbox workspace is limited to 30 cases.',409);
  const s=input.snapshot,decimal=n=>(n/100).toFixed(2);
  const c=validateCase({title:s.title,deposit:decimal(s.deposit),replacement:decimal(candidate.price),refund:decimal(s.refund),costs:decimal(candidate.costs),contingency:decimal(s.contingency)});
  const hash=await hashAgreement({...c,id}),stamp=at.toISOString();
  const parentRound=await store.one("SELECT j.value FROM negotiations n,json_each(n.rounds) j WHERE n.owner=? AND json_extract(j.value,'$.planId')=? LIMIT 1",user,id);
  const commercialAdvice=parentRound?JSON.parse(parentRound.value).commercialAdvice||null:null;
  const metadata=JSON.stringify({planningRun:id,needId:candidate.id,snapshotVersion:s.version,source:candidate.source,extractionId:input.needs.find(n=>n.id===candidate.id)?.extractionId||null,extractionEvidence:input.needs.find(n=>n.id===candidate.id)?.extractionEvidence||null,commercialAdvice,operations:candidate.operations,projectedMargin:candidate.margin,baseline:candidate.baseline,makerConfirmation:'WORKSPACE_OWNER_DEMO'});
  await store.db.batch([
    store.db.prepare('INSERT OR IGNORE INTO recovery_cases (id,owner,title,currency,deposit,replacement,refund,costs,contingency,agreement_hash,approvals,original_status,replacement_status,refund_status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM planning_runs WHERE id=? AND owner=? AND case_id IS NULL').bind(id,user,c.title,c.currency,c.deposit,c.replacement,c.refund,c.costs,c.contingency,hash,'{}','NOT_STARTED','NOT_STARTED','NOT_STARTED',stamp,stamp,id,user),
    store.db.prepare("INSERT INTO audit_events (id,case_id,type,message,metadata,created_at) SELECT ?,?,'PLAN_CONFIRMED','Workspace owner confirmed a demo planning proposal. Physical maker validation and buyer commitment remain required.',?,? FROM planning_runs WHERE id=? AND owner=? AND case_id IS NULL").bind(crypto.randomUUID(),id,metadata,stamp,id,user),
    store.db.prepare('UPDATE planning_runs SET case_id=?,selected_need=? WHERE id=? AND owner=? AND case_id IS NULL').bind(id,candidate.id,id,user),
  ]);
  return store.detail(id,user);
}
