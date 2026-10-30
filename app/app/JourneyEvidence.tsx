'use client';
import {useEffect,useRef,useState} from 'react';
import CommercialHistory from './CommercialHistory';
import SourceFacts from './SourceFacts';
const labels:Record<string,string>={aiExtractionRecorded:'AI requirements grounded',feasiblePlanSaved:'Feasible plan saved',separateAccountApprovals:'Three exact-term account approvals',originalDepositVerified:'Original deposit verified',replacementCaptureVerified:'Replacement capture verified',originalRefundVerified:'Original refund verified',signedCaptureAndRefundEventsProcessed:'Linked signed events processed'};
export default function JourneyEvidence({caseId,revision}:{caseId:string;revision:string}){
 const [report,setReport]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const requestVersion=useRef(0);
 async function load(){const version=++requestVersion.current;setBusy(true);setError('');try{const r=await fetch(`/api/cases/${caseId}/evidence`,{cache:'no-store'}),data:any=await r.json();if(!r.ok)throw new Error(data.error||'Evidence could not be loaded.');if(version===requestVersion.current)setReport(data);}catch(e){if(version===requestVersion.current)setError((e as Error).message);}finally{if(version===requestVersion.current)setBusy(false);}}
 useEffect(()=>{setReport(null);load();return()=>{requestVersion.current++;};},[caseId,revision]);
 return <section className="panel journey-panel" aria-label="Joined journey evidence">
  <div className="section-title"><h2>One journey. Verified records.</h2><span className="tag">SANDBOX EVIDENCE</span></div>
  <p className="journey-intro">Each checkpoint uses this case’s saved server records. Missing steps stay visible.</p>
  {error&&<p role="alert" className="error">{error}</p>}{busy&&!report&&<p role="status">Checking saved evidence…</p>}
  {report&&<>
   <div role="status" className={`journey-status ${report.joinedSandboxJourneyComplete?'verified':''}`}><strong>{report.joinedSandboxJourneyComplete?'Joined sandbox financial journey verified.':'Joined sandbox journey is incomplete.'}</strong><span>{Object.values(report.checkpoints).filter(Boolean).length} / 7 checkpoints</span></div>
   <ul className="journey-checks">{Object.entries(labels).map(([key,label])=><li key={key} className={report.checkpoints[key]?'verified':'pending'}><span aria-hidden="true">{report.checkpoints[key]?'✓':'○'}</span><div><b>{label}</b><small>{report.checkpoints[key]?'Verified':'Pending'}</small></div></li>)}</ul>
   {report.ai?.serverRecordedProviderResponse&&<p className="journey-note">{report.ai.model} · {report.ai.facts?.length||0} cited fields · {report.ai.editedFields?.length||0} fields changed after extraction.</p>}
   {report.commercial&&<p className="journey-note"><b>{report.commercial.serverRecordedProviderResponse?'Recorded AI commercial alternative linked.':'AI commercial provenance not verified.'}</b> {report.agenticCommercialJourneyComplete?'Its joined sandbox journey is verified.':'Its full joined journey is not yet verified.'}</p>}
   <SourceFacts report={report}/>
   <CommercialHistory report={report}/>
   <div className="journey-physical"><b>Physical handoff: {report.physical.stage.replaceAll('_',' ')}</b><span>{report.distinctApprovedAccounts} distinct accounts approved the agreement. Fulfillment is participant-reported.</span></div>
   <p className="journey-note">Sandbox verification does not establish real buyer demand, physical delivery or environmental impact. Export evidence contains the complete record.</p>
  </>}
  <button className="secondary" disabled={busy} onClick={load}>{busy?'Checking…':'Refresh journey evidence'}</button>
 </section>;
}
