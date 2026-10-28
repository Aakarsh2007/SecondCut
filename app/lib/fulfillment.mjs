import {AppError,requireApprovals} from './domain.mjs';
export async function fulfillmentView(store,caseId){const row=await store.one('SELECT * FROM fulfillment_records WHERE case_id=?',caseId),c=await store.one('SELECT refund_status,replacement_status FROM recovery_cases WHERE id=?',caseId);const stage=row?.stage||'NOT_STARTED';return {stage,revision:row?.revision||0,evidence:row?JSON.parse(row.evidence):{},paymentVerified:c?.replacement_status==='COMPLETED',refundVerified:c?.refund_status==='COMPLETED',closeout:stage==='RECEIVED'&&c?.replacement_status==='COMPLETED'&&c?.refund_status==='COMPLETED'?'RECORDED_COMPLETE':stage==='RECEIVED'?'FINANCIAL_RESOLUTION_PENDING':'OPEN',notice:'Readiness, measurements, pickup and issues are participant reports. SecondCut does not independently verify physical delivery or product safety.'};}
export async function recordFulfillment(store,reviewId,actor,body,at=new Date()){
 const grant=await store.one('SELECT * FROM participant_invites WHERE id=? AND actor=?',reviewId,actor.id);if(!grant)throw new AppError('Participant review not found.',404);
 const c=await store.one('SELECT * FROM recovery_cases WHERE id=?',grant.case_id);if(c.approval_mode!=='PARTICIPANTS'||grant.agreement_hash!==c.agreement_hash)throw new AppError('Participant agreement is unavailable or superseded.',409);
 if(!['APPROVED','REJECTED','WITHDRAWN'].includes(grant.status))throw new AppError('Review this agreement before reporting fulfillment.',409);
 if(typeof body.note!=='string'||body.note.trim().length<10||body.note.length>1000||body.confirm!==true)throw new AppError('Provide a 10–1,000 character factual note and confirm the report.');
 if(!['READY','RECEIVED','ISSUE_OPEN'].includes(body.action))throw new AppError('Unknown fulfillment action.');
 if(!Number.isSafeInteger(body.expectedRevision))throw new AppError('Reload the current fulfillment revision.');
 let current=await store.one('SELECT * FROM fulfillment_records WHERE case_id=?',c.id);
 if(!current){await store.run("INSERT OR IGNORE INTO fulfillment_records (case_id,stage,revision,evidence,updated_at) VALUES (?,'NOT_STARTED',0,'{}',?)",c.id,at.toISOString());current=await store.one('SELECT * FROM fulfillment_records WHERE case_id=?',c.id);}
 if(current.revision!==body.expectedRevision)throw new AppError('Fulfillment changed in another request. Reload before reporting.',409);
 const previous=JSON.parse(current.evidence),entry={reportId:crypto.randomUUID(),actor:actor.id,role:grant.role,note:body.note.trim(),at:at.toISOString(),hash:c.agreement_hash};
 if(body.action!=='ISSUE_OPEN'){
  requireApprovals(c);if(c.active_operation||c.replacement_status!=='COMPLETED'||!c.replacement_capture_id)throw new AppError('A verified replacement capture is required before readiness or pickup can be recorded.',409);
  if(grant.status!=='APPROVED')throw new AppError('Only an approving participant can confirm fulfillment.',403);
  if(body.action==='READY'){
   if(grant.role!=='maker'||current.stage!=='NOT_STARTED')throw new AppError('Only the maker can record initial readiness.',403);
   if(body.qualityChecked!==true)throw new AppError('Maker must confirm dimensions, finish, condition, structural checks and pickup readiness.');
   const details=JSON.parse(c.agreement_details);if(details.source==='PLANNING_RUN'){
    if(!Number.isSafeInteger(body.lengthMm)||!Number.isSafeInteger(body.widthMm)||body.lengthMm!==details.request.lengthMm||body.widthMm!==details.request.widthMm)throw new AppError('Reported finished dimensions do not match the approved plan. Report an issue; do not silently change specifications.',409);
    Object.assign(entry,{lengthMm:body.lengthMm,widthMm:body.widthMm});
   }
  }else if(grant.role!=='replacement'||current.stage!=='READY')throw new AppError('Only the replacement buyer can confirm receipt after maker readiness.',403);
 }else if(current.stage==='ISSUE_OPEN')throw new AppError('An issue is already open. Further resolution requires merchant review; no automatic refund or delivery success is inferred.',409);
 const evidence=JSON.stringify({...previous,[body.action]:entry}),stamp=at.toISOString();
 await store.db.batch([
  store.db.prepare('UPDATE fulfillment_records SET stage=?,revision=revision+1,evidence=?,updated_at=? WHERE case_id=? AND revision=?').bind(body.action,evidence,stamp,c.id,current.revision),
  store.db.prepare("INSERT INTO audit_events (id,case_id,type,message,metadata,created_at) SELECT ?,?,'FULFILLMENT_REPORT',?,?,? WHERE EXISTS (SELECT case_id FROM fulfillment_records WHERE case_id=? AND revision=? AND evidence=?)").bind(crypto.randomUUID(),c.id,`${grant.role} reported ${body.action.toLowerCase()}; physical outcome is self-reported.`,JSON.stringify(entry),stamp,c.id,current.revision+1,evidence),
 ]);
 const saved=await store.one('SELECT revision,evidence FROM fulfillment_records WHERE case_id=?',c.id);if(saved.revision!==current.revision+1||saved.evidence!==evidence)throw new AppError('Another fulfillment report won the update. Reload.',409);
 return fulfillmentView(store,c.id);
}
