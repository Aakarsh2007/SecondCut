'use client';
import {useState} from 'react';
const usd=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v/100);
export default function CommercialAlternatives({run,need,session,onChoose}:{run:any,need:any,session:any,onChoose:(value:any)=>void}){
 const [permission,setPermission]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[advice,setAdvice]=useState<any>(null);
 async function generate(){setBusy(true);setError('');setAdvice(null);try{const r=await fetch('/api/ai/alternatives',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:run.id,needId:need.id,sessionId:session?.id,shareWithGoogle:permission})});const data:any=await r.json();if(!r.ok)throw new Error(data.error);setAdvice(data);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="commercial-advice"><h4>Ask Gemini for commercial alternatives</h4><p>AI suggests tradeoffs; rules check every price and constraint. Suggestions do not establish buyer acceptance.</p>
 <label className="planner-check"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/> Send this structured scenario’s dimensions, pricing and dates to Google. Names, notes, account and payment identifiers are excluded.</label>
 <button className="secondary" disabled={busy||!permission||session?.remaining===0} onClick={generate}>{busy?'Generating and checking…':'Generate alternatives'}</button>
 {error&&<p role="alert">{error}</p>}{advice&&<div aria-live="polite"><p><b>{advice.status==='COMPLETED'?'Recorded Gemini suggestions':'AI unavailable · manual planner remains available'}</b>{advice.latencyMs!==undefined&&` · ${(advice.latencyMs/1000).toFixed(1)}s`}</p><p>{advice.reason||advice.notice}</p>
 {advice.alternatives.length===0&&<p>No AI alternative is available. Keep the refusal visible or check a documented manual counteroffer.</p>}
 {advice.alternatives.map((a:any)=><article className="commercial-option" key={a.index}><div className="section-title"><b>Alternative {a.index+1}</b><span className="tag">{a.status==='REVIEWABLE'?'PASSES MODELED CHECKS':'BLOCKED'}</span></div>
 {a.offer&&<p><b>{usd(a.offer.price)}</b> · {a.offer.lengthMm} × {a.offer.widthMm} mm · pickup by {a.offer.latestDate}</p>}
 {a.metrics&&<p>Calculated margin {usd(a.metrics.margin)} · stressed margin {usd(a.metrics.stressMargin)} · adaptation {usd(a.metrics.adaptation)}</p>}
 <p>{a.reason}</p>{a.rationale&&<><p><b>{a.status==='BLOCKED'?'AI rationale — rejected by policy:':'AI rationale:'}</b> {a.rationale}</p><p><b>Tradeoff:</b> {a.tradeoff}</p></>}
 {a.changes?.length>0&&<p className="planner-question">Changes buyer requirements: {a.changes.join(', ')}. Buyer agreement remains required.</p>}
 {a.evidence&&<details><summary>Checked source references</summary>{a.evidence.map((e:any,i:number)=><p key={i}><code>{e.ref}</code>: {e.value}</p>)}</details>}
 {a.status==='REVIEWABLE'&&<button className="secondary" disabled={busy||session?.remaining===0} onClick={()=>onChoose({...a,adviceId:advice.id})}>Load draft for review</button>}</article>)}
 {advice.ranking&&<p className="planner-muted">Ranking: {advice.ranking}</p>}
 <details><summary>Prevent avoidable disputes · evidence-based warnings</summary><p>Rule-based warning signs, not dispute predictions.</p>{advice.warnings?.map((w:any,i:number)=><p key={i}><b>{w.code.replaceAll('_',' ')}</b>: {w.evidence}<br/>{w.action}</p>)}</details></div>}</div>;
}
