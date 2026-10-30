'use client';
import {resolutionSummary} from '../lib/resolution-summary.mjs';
const usd=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v/100);
export default function ResolutionOutcome({report}:{report:any}){
 const s=resolutionSummary(report),a=report.financial.amountsInMinorUnits;
 return <section className="resolution-outcome" aria-label="Settlement and fulfillment outcome">
  <div className="history-heading"><h3>{s.financialComplete?'Financial recovery verified. Physical handoff separate.':'Settlement and delivery are separate.'}</h3><span className="tag">PAYPAL SANDBOX</span></div>
  <div className="outcome-grid">
   <article><small>1 · Authorization</small><strong>{s.authorizationRecorded?'Hold recorded':'Not recorded'}</strong><p>A historical hold is not collected money. Capture is checked separately.</p></article>
   <article><small>2 · Replacement capture</small><strong>{s.captured?usd(a.replacement)+' completed':report.financial.replacement.status.replaceAll('_',' ')}</strong><p>{s.captured?'Collected sandbox payment verified.':'A hold alone cannot complete this checkpoint.'}</p></article>
   <article><small>3 · Original refund</small><strong>{s.refunded?usd(a.conditionalRefund)+' completed':report.financial.refund.status.replaceAll('_',' ')}</strong><p>Refund belongs to the original capture, after the replacement capture checks.</p></article>
   <article className="physical"><small>4 · Physical handoff</small><strong>{s.physicalLabel}</strong><p>Closeout: {s.closeout.replaceAll('_',' ')}. Participant reports are separate from provider evidence.</p></article>
  </div><p className="outcome-next">{s.next}</p>
  <p>These records establish the sandbox financial result, not actual merchant profit or independently verified manufacture/delivery.</p>
 </section>;
}
