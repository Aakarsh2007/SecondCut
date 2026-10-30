// Observed records only. No inferred manual-work baseline or customer savings.
export function journeyMetrics(c,commercial,negotiation){
 const operations=c.operations||[],completed=operations.filter(o=>o.status==='COMPLETED');
 const start=operations.find(o=>o.kind==='original_order'),end=operations.find(o=>o.kind==='original_refund'&&o.status==='COMPLETED');
 const duration=start&&end?Date.parse(end.updated_at)-Date.parse(start.created_at):NaN;
 return {
  completedOperations:completed.length,
  operationAttempts:operations.reduce((sum,o)=>sum+(Number.isSafeInteger(o.attempts)?o.attempts:0),0),
  submittedNegotiationRounds:negotiation?.rounds?.length||0,
  generatedAlternatives:commercial?.alternatives?.length||0,
  policyPassAlternatives:commercial?.alternatives?.filter(a=>a.status==='REVIEWABLE').length||0,
  blockedAlternatives:commercial?.alternatives?.filter(a=>a.status==='BLOCKED').length||0,
  aiLatencyMs:commercial?.latencyMs??null,
  testJourneyElapsedSeconds:Number.isFinite(duration)&&duration>=0?Math.round(duration/1000):null,
  verifiedReplacementMinor:c.replacement_status==='COMPLETED'?c.replacement:0,
  verifiedRefundMinor:c.refund_status==='COMPLETED'?c.refund:0,
  manualTimeSavedSeconds:null,manualActionsSaved:null,
  notice:'Sandbox amounts, saved operation records and model latency. Elapsed time includes approval waits and test coordination; it is not provider processing time or a customer time-saving measurement.'
 };
}
