'use client';
import {useEffect,useRef,useState} from 'react';

const labels:Record<string,string>={
 aiExtractionRecorded:'AI provider response recorded',
 feasiblePlanSaved:'Feasible adaptation plan saved',
 separateAccountApprovals:'Three separate accounts approved the exact terms',
 originalDepositVerified:'Original deposit capture verified',
 replacementCaptureVerified:'Replacement capture verified',
 originalRefundVerified:'Original refund verified',
 signedCaptureAndRefundEventsProcessed:'Linked signed payment and refund events processed',
};
export default function JourneyEvidence({caseId,revision}:{caseId:string;revision:string}){
 const [report,setReport]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const requestVersion=useRef(0);
 async function load(){const version=++requestVersion.current;setBusy(true);setError('');try{const r=await fetch(`/api/cases/${caseId}/evidence`,{cache:'no-store'}),data:any=await r.json();if(!r.ok)throw new Error(data.error||'Evidence could not be loaded.');if(version===requestVersion.current)setReport(data);}catch(e){if(version===requestVersion.current)setError((e as Error).message);}finally{if(version===requestVersion.current)setBusy(false);}}
 useEffect(()=>{setReport(null);load();return()=>{requestVersion.current++;};},[caseId,revision]);
 return <section className="panel" aria-label="Joined journey evidence"><div className="section-title"><h2>One journey. Verified records.</h2><span className="tag">SANDBOX EVIDENCE</span></div><p>Each checkpoint uses this case’s saved server records. Missing steps stay visible.</p>{error&&<p role="alert" className="error">{error}</p>}{busy&&!report&&<p role="status">Checking saved evidence…</p>}{report&&<><p role="status"><b>{report.joinedSandboxJourneyComplete?'Joined sandbox financial journey verified.':'Joined sandbox journey is incomplete.'}</b></p><ul>{Object.entries(labels).map(([key,label])=><li key={key}><b>{report.checkpoints[key]?'Verified':'Pending'}</b> · {label}</li>)}</ul>{report.ai?.serverRecordedProviderResponse&&<p>{report.ai.model} · {report.ai.facts?.length||0} cited fields · {report.ai.editedFields?.length||0} fields changed after extraction.</p>}{report.commercial&&<p><b>{report.commercial.serverRecordedProviderResponse?'Recorded AI commercial alternative linked.':'AI commercial provenance not verified.'}</b> {report.commercial.model} · {report.commercial.latencyMs} ms. {report.agenticCommercialJourneyComplete?'Its joined sandbox journey is verified.':'Its full joined journey is not yet verified.'}</p>}<p>{report.distinctApprovedAccounts} distinct accounts approved the current agreement. Physical handoff: <b>{report.physical.stage.replaceAll('_',' ')}</b> (participant reports).</p><small>Sandbox verification does not establish real buyer demand, physical delivery or environmental impact. Use Export evidence for the full record.</small></>}<button className="secondary" disabled={busy} onClick={load}>{busy?'Checking…':'Refresh journey evidence'}</button></section>;
}
