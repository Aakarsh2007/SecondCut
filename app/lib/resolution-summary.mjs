// A completed financial workflow must never imply physical fulfillment.
export function resolutionSummary(report){
 const p=report.physical||{},f=report.financial||{},cp=report.checkpoints||{};
 const captured=cp.replacementCaptureVerified===true,refunded=cp.originalRefundVerified===true;
 const stage=p.stage||'NOT_STARTED';
 const labels={NOT_STARTED:'Not started',READY:'Maker reported ready',RECEIVED:'Buyer reported receipt',ISSUE_OPEN:'Issue reported'};
 const next={NOT_STARTED:'Next: maker checks the agreed dimensions, finish and condition, then reports readiness. The replacement buyer separately reports receipt.',READY:'Next: the replacement buyer checks the work and reports receipt or an issue.',RECEIVED:'Receipt is participant-reported. It does not independently certify manufacturing quality, safety or delivery.',ISSUE_OPEN:'Merchant review is required. An issue report does not automatically authorize another payment or refund.'};
 return {financialComplete:report.joinedSandboxJourneyComplete===true,captured,refunded,authorizationRecorded:!!f.replacement?.authorization,physicalStage:stage,physicalLabel:labels[stage]||'Not verified',physicalIndependentlyVerified:false,closeout:p.closeout||'OPEN',next:next[stage]||'Resolve the outstanding physical evidence before claiming fulfillment.'};
}
