import {AppError} from './domain.mjs';
import {fulfillmentView} from './fulfillment.mjs';
import {journeyMetrics} from './journey-metrics.mjs';

// Read only. Export canonical server records, never invitation tokens or signatures.
export async function journeyEvidence(store,id,owner,at=new Date()) {
 const c=await store.detail(id,owner);
 if(!c)throw new AppError('Case not found.',404);
 const run=await store.one('SELECT id,input,result,selected_need,created_at FROM planning_runs WHERE case_id=? AND owner=?',id,owner);
 let planning=null,ai=null,commercial=null,negotiation=null;
 if(run){
  const input=JSON.parse(run.input),result=JSON.parse(run.result),request=input.needs.find(n=>n.id===run.selected_need);
  planning={id:run.id,createdAt:run.created_at,snapshot:input.snapshot,selectedRequest:request||null,selectedResult:result.candidates.find(n=>n.id===run.selected_need)||null,engine:result.engine,assumptions:'Owner-recorded costs, constraints and availability; not independently verified.'};
  const parent=await store.one("SELECT j.value,n.rounds AS history,n.created_at AS started_at FROM negotiations n,json_each(n.rounds) j WHERE n.owner=? AND json_extract(j.value,'$.planId')=? LIMIT 1",owner,run.id);
  if(parent)negotiation={startedAt:parent.started_at,rounds:JSON.parse(parent.history).map(r=>({number:r.number,status:r.status,price:r.price,lengthMm:r.lengthMm,widthMm:r.widthMm,latestDate:r.latestDate,reason:r.reason,createdAt:r.createdAt,selected:r.planId===run.id}))};
  const adviceRef=parent?JSON.parse(parent.value).commercialAdvice:null;
  if(adviceRef){const record=await store.one("SELECT id,result,created_at FROM commercial_advice WHERE id=? AND owner=? AND status='COMPLETED'",adviceRef.id,owner);if(record){const result=JSON.parse(record.result),alternative=result.alternatives.find(a=>a.index===adviceRef.index);const matches=alternative?.status==='REVIEWABLE'&&alternative.offer.price===c.replacement&&['lengthMm','widthMm','latestDate'].every(k=>alternative.offer[k]===request?.[k]);commercial={id:record.id,createdAt:record.created_at,source:result.source,model:result.model,promptVersion:result.promptVersion,latencyMs:result.latencyMs,alternative,alternatives:result.alternatives,baseline:result.baseline,ranking:result.ranking,usage:result.usage||null,serverRecordedProviderResponse:result.source==='GEMINI_API'&&matches,notice:'AI-suggested draft; participant approval and physical feasibility are separate evidence.'};}}
  if(request?.extractionId){
   const record=await store.one('SELECT id,source,status,result,created_at FROM ai_extractions WHERE id=? AND owner=?',request.extractionId,owner);
   if(record?.status==='COMPLETED'&&record.result){
    const output=JSON.parse(record.result);
    ai={id:record.id,recordSource:record.source,createdAt:record.created_at,provider:output.source,model:output.model,promptVersion:output.promptVersion,serverRecordedProviderResponse:output.source==='GEMINI_API',facts:output.facts,missing:output.missing,rejected:output.rejected,editedFields:(output.facts||[]).filter(f=>request[f.field]!==f.value).map(f=>f.field)};
   }else ai={id:request.extractionId,serverRecordedProviderResponse:false,status:'REFERENCED_EXTRACTION_NOT_VERIFIED'};
  }
 }
 const grants=await store.all('SELECT role,actor,status,agreement_hash,expires_at FROM participant_invites WHERE case_id=?',id);
 const roles=['maker','original','replacement'];
 const participants=roles.map(role=>{const g=grants.find(g=>g.role===role),approval=c.approvals?.[role];return {role,status:g?.status||'NOT_INVITED',accountClaimed:!!g?.actor,exactTermsApproved:!!g?.actor&&g.status==='APPROVED'&&g.agreement_hash===c.agreement_hash&&approval?.hash===c.agreement_hash&&approval?.actor===g.actor};});
 const distinctApprovedAccounts=new Set(grants.filter(g=>participants.find(p=>p.role===g.role)?.exactTermsApproved).map(g=>g.actor)).size;
 const resources=[c.original_order_id,c.original_capture_id,c.replacement_order_id,c.authorization_id,c.replacement_capture_id,c.refund_id].map(v=>v||'');
 const webhooks=await store.all("SELECT event_id,status,error,created_at,updated_at FROM webhook_inbox WHERE json_extract(body,'$.resource.id') IN (?,?,?,?,?,?) ORDER BY created_at",...resources);
 const physical=await fulfillmentView(store,id);
 const checkpoints={
  aiExtractionRecorded:ai?.serverRecordedProviderResponse===true,
  feasiblePlanSaved:planning?.selectedResult?.status==='FEASIBLE',
  separateAccountApprovals:c.approval_mode==='PARTICIPANTS'&&participants.every(p=>p.exactTermsApproved)&&distinctApprovedAccounts===3,
  // Refunds change the capture's current status without erasing its verified collection.
  // Retain the successful capture operation as evidence; reversals/unknown states do not qualify.
  originalDepositVerified:['COMPLETED','PARTIALLY_REFUNDED','REFUNDED'].includes(c.original_status)&&!!c.original_capture_id&&c.operations.some(o=>o.kind==='original_capture'&&o.status==='COMPLETED'&&o.resource_id===c.original_capture_id),
  replacementCaptureVerified:c.replacement_status==='COMPLETED'&&!!c.replacement_capture_id,
  originalRefundVerified:c.refund_status==='COMPLETED'&&!!c.refund_id,
  signedCaptureAndRefundEventsProcessed:false,
 };
 // Match each expected event to its resource and type, rather than counting unrelated events.
 const linked=await store.all("SELECT event_id,status,json_extract(body,'$.event_type') AS type,json_extract(body,'$.resource.id') AS resource_id FROM webhook_inbox WHERE json_extract(body,'$.resource.id') IN (?,?,?)",c.original_capture_id||'',c.replacement_capture_id||'',c.refund_id||'');
 checkpoints.signedCaptureAndRefundEventsProcessed=[['PAYMENT.CAPTURE.COMPLETED',c.original_capture_id],['PAYMENT.CAPTURE.COMPLETED',c.replacement_capture_id],['PAYMENT.CAPTURE.REFUNDED',c.refund_id]].every(([type,resource])=>resource&&linked.some(e=>e.type===type&&e.resource_id===resource&&e.status==='PROCESSED'));
 return {schemaVersion:1,generatedAt:at.toISOString(),environment:'PAYPAL_SANDBOX',caseReference:'SC-'+id.slice(0,6).toUpperCase(),checkpoints,joinedSandboxJourneyComplete:Object.values(checkpoints).every(Boolean),commercial,negotiation,metrics:journeyMetrics(c,commercial,negotiation),agenticCommercialJourneyComplete:commercial?.serverRecordedProviderResponse===true&&Object.values(checkpoints).every(Boolean),planning,ai,participants,distinctApprovedAccounts,financial:{currency:c.currency,amountsInMinorUnits:{deposit:c.deposit,replacement:c.replacement,conditionalRefund:c.refund,costs:c.costs,contingency:c.contingency},original:{id:c.original_capture_id,status:c.original_status},replacement:{authorization:c.authorization_id,id:c.replacement_capture_id,status:c.replacement_status},refund:{id:c.refund_id,status:c.refund_status},operations:c.operations},webhooks,physical,audit:c.events,limitations:['All payments are sandbox transactions; no real revenue or refund is claimed.','Account approvals are not verification of a legal identity or PayPal account.','Planning economics and physical constraints require maker validation.','Physical status is participant-reported, not independently verified.','Real buyer demand and environmental impact have not been established.']};
}
