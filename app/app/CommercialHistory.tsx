'use client';
const usd=(v:number)=>Number.isSafeInteger(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v/100):'Not recorded';
export default function CommercialHistory({report}:{report:any}){
 const c=report.commercial,m=report.metrics;
 if(!c?.serverRecordedProviderResponse)return null;
 return <div className="commercial-history">
  <div className="history-heading"><div><span className="eyebrow">RECORDED GEMINI DECISION</span><h3>Why this recovery was proposed</h3></div><span className="tag">{c.model} · {(c.latencyMs/1000).toFixed(1)}s</span></div>
  <p>Saved alternatives from this agreement’s original AI response. These are historical proposals; reviewing them creates no new offer.</p>
  <div className="journey-metrics"><div><strong>{m?.generatedAlternatives??c.alternatives?.length}</strong><small>Alternatives generated</small></div><div><strong>{m?.policyPassAlternatives}</strong><small>Passed modeled checks</small></div><div><strong>{m?.blockedAlternatives}</strong><small>Blocked by policy</small></div><div><strong>{m?.submittedNegotiationRounds}</strong><small>Submitted rounds</small></div></div>
  {c.baseline&&<p className="history-baseline"><b>Original requirements: {c.baseline.status.replaceAll('_',' ')}</b>. A conditional size or date change needs explicit agreement; it is not a match to unchanged requirements.</p>}
  <details className="history-disclosure"><summary>Review recorded alternatives and tradeoffs</summary><p className="history-note">{c.ranking}</p>
   <div className="history-options">{c.alternatives?.map((a:any)=><article key={a.index} className={`history-option ${a.status==='REVIEWABLE'?'pass':'blocked'}`}>
    <div className="history-heading"><h4>Alternative {a.index+1}</h4><span className="tag">{a.index===c.alternative?.index?(report.checkpoints.separateAccountApprovals?'SELECTED · APPROVED TERMS':'SELECTED PROPOSAL'):a.status==='REVIEWABLE'?'POLICY PASS':'BLOCKED'}</span></div>
    {a.offer&&<p className="history-offer">{usd(a.offer.price)} · {a.offer.lengthMm} × {a.offer.widthMm} mm<br/><small>Pickup by {a.offer.latestDate}</small></p>}
    {a.metrics&&<dl className="history-money"><div><dt>Projected margin</dt><dd>{usd(a.metrics.margin)}</dd></div><div><dt>Stressed margin</dt><dd>{usd(a.metrics.stressMargin)}</dd></div><div><dt>Modification cost</dt><dd>{usd(a.metrics.adaptation)}</dd></div></dl>}
    <p><b>Policy result:</b> {a.reason}</p>{a.rationale&&<p><b>{a.status==='BLOCKED'?'AI explanation — rejected by policy:':'AI explanation:'}</b> {a.rationale}</p>}{a.tradeoff&&<p><b>Tradeoff:</b> {a.tradeoff}</p>}
    {a.changes?.length>0&&<p className="history-note">Changed buyer requirements: {a.changes.map((k:string)=>(({lengthMm:'length',widthMm:'width',latestDate:'pickup deadline'} as Record<string,string>)[k]||k)).join(', ')}. Maker and buyer approval remain separate from model output.</p>}
    {a.evidence&&<details><summary>Grounded source references</summary>{a.evidence.map((e:any,i:number)=><p key={i}><code>{e.ref}</code>: {e.value}</p>)}</details>}
   </article>)}</div>
   {report.negotiation?.rounds?.length>0&&<><h4>Saved negotiation history</h4><ol className="history-rounds">{report.negotiation.rounds.map((r:any,i:number)=><li key={i}><b>Round {r.number} · {r.status}{r.selected?' · selected for this agreement':''}</b><p>{usd(r.price)} · {r.lengthMm} × {r.widthMm} mm · {r.latestDate}</p><small>{r.reason}</small></li>)}</ol></>}
  </details>
  <details className="history-disclosure"><summary>Observed results and measurement limits</summary><div className="journey-metrics"><div><strong>{usd(m?.verifiedReplacementMinor)}</strong><small>Verified sandbox capture</small></div><div><strong>{usd(m?.verifiedRefundMinor)}</strong><small>Verified sandbox refund</small></div><div><strong>{m?.completedOperations}</strong><small>Completed workflow operations</small></div><div><strong>{m?.operationAttempts}</strong><small>Recorded operation attempts</small></div></div><p>Recorded test-journey elapsed time: {m?.testJourneyElapsedSeconds==null?'not complete':Math.floor(m.testJourneyElapsedSeconds/60)+' min '+m.testJourneyElapsedSeconds%60+' sec'}.</p><p>{m?.notice}</p><p>Manual time and actions saved: not measured. Projected margins are not actual profit. Customer adoption, maker inspection and delivery require separate validation.</p><p>Model token usage: {c.usage?.totalTokenCount??'not recorded'} total. API invoice charge is not available in the response; free-tier configuration is not a billing receipt.</p></details>
 </div>;
}
