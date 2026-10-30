'use client';
const names:Record<string,string>={lengthMm:'Length',widthMm:'Width',material:'Material',finish:'Finish',budget:'Budget',latestDate:'Pickup deadline',pickupArea:'Pickup area'};
const display=(key:string,value:any)=>value==null?'Not recorded':key==='budget'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value/100):['lengthMm','widthMm'].includes(key)?`${value} mm`:String(value);
export default function SourceFacts({report}:{report:any}){
 if(!report.ai?.serverRecordedProviderResponse)return null;
 return <details className="source-facts"><summary>Review source facts and proposal changes</summary><p>Original quoted requirements stay visible alongside the saved proposal. A changed fact is not original buyer consent.</p><div className="source-fact-grid">{report.ai.facts.map((f:any,i:number)=>{const next=report.planning?.selectedRequest?.[f.field],changed=next!==f.value;return <article key={i}><div className="history-heading"><b>{names[f.field]||f.field}</b>{changed&&<span className="tag">CHANGED IN PROPOSAL</span>}</div><blockquote>“{f.quote}”</blockquote><small>Source line {f.line} · {display(f.field,f.value)}</small>{changed&&<p><b>Saved proposal:</b> {display(f.field,next)}</p>}</article>;})}</div></details>;
}
