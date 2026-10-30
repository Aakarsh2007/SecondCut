// Three contrasting synthetic tasks. Exactly three live requests, no retries/payments.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {samplePlanningInput,evaluatePlanning} from '../lib/planner.mjs';
import {generateCommercialAlternatives,validateCommercialOutput} from '../lib/commercial-ai.mjs';
export function studyCases(at=new Date()){
 const make=()=>{const q=samplePlanningInput(at);q.needs=q.needs.slice(0,1);q.snapshot.requireStressProtection=true;return q;};
 const a=make(),b=make(),c=make();
 Object.assign(b.snapshot,{lengthMm:1600,widthMm:900,allowShorten:false,cutWidthCost:2000});
 b.needs[0].latestDate=new Date(at.getTime()+3*86400000).toISOString().slice(0,10);
 c.needs[0].material='oak';
 return [{id:'A',name:'Expensive cuts',input:a,expected:'Conditional larger uncut top; changed dimensions need approval.'},{id:'B',name:'Early deadline',input:b,expected:'Later pickup with a single width cut; original requested geometry can be retained.'},{id:'C',name:'Material conflict',input:c,expected:'No eligible recovery: walnut stock cannot satisfy oak-only request.'}];
}
export function contrastMatrix(cases,rows,at){
 const selected=rows.map(r=>r.result?.alternatives?.find(a=>a.status==='REVIEWABLE'));
 const cells=[];
 for(let i=0;i<cases.length;i++)if(selected[i])for(let j=0;j<cases.length;j++){
  const offer=selected[i];const r=validateCommercialOutput(cases[j].input,'studio',{alternatives:[{...offer.offer,rationale:offer.rationale,tradeoff:offer.tradeoff,evidence:offer.evidence}]},at);
  cells.push({from:cases[i].id,to:cases[j].id,status:r.alternatives[0].status,reason:r.alternatives[0].reason});
 }
 return cells;
}
if(process.argv[1]&&new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll('\\','/').toLowerCase().replace(/^[A-Z]:/i,''))){await main();}
async function main(){
 const at=new Date(),cases=studyCases(at),report={schemaVersion:1,createdAt:at.toISOString(),scenarioSource:'SYNTHETIC',live:process.argv.includes('--live'),requestBudget:3,automaticRetries:0,payments:0,rows:[],crossContext:[],limits:['Three development scenarios cannot establish originality, market demand or general accuracy.','Conditional offers require fresh buyer and maker agreement.','Counterfactual failure may be caused by a mismatching source reference as well as incompatible geometry/economics. A separate geometry replay is reported.','Automated timings are not human time saved.']};
 const save=()=>{mkdirSync(new URL('../outputs/',import.meta.url),{recursive:true});writeFileSync(new URL('../outputs/context-study.json',import.meta.url),JSON.stringify(report,null,2)+'\n');};
 let config={...process.env};try{for(const l of readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)config[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}}catch{}
 if(report.live&&(config.AI_FREE_TIER_CONFIRMED!=='true'||!config.GEMINI_API_KEY||(config.GEMINI_MODEL&&config.GEMINI_MODEL!=='gemini-2.5-flash')))throw Error('Requires confirmed free-tier Gemini 2.5 Flash.');
 for(const [i,c] of cases.entries()){
  const base=evaluatePlanning(c.input,at).candidates[0];
  const row={id:c.id,name:c.name,expected:c.expected,input:c.input,baseline:{status:base.status,reasons:base.reasons.map(r=>r.code)},status:'NOT_RUN',providerCalls:0};
  if(report.live){if(i)await new Promise(r=>setTimeout(r,13000));const start=performance.now();try{row.result=await generateCommercialAlternatives(c.input,'studio',[],config,async(...args)=>{row.providerCalls++;return fetch(...args);},at);row.status='COMPLETED';}catch(e){row.status='UNAVAILABLE';row.reason=e.message;}row.elapsedMs=Math.round(performance.now()-start);}
  row.reviewable=row.result?.alternatives.filter(a=>a.status==='REVIEWABLE').length??null;
  row.expectedOutcomeMet=row.status==='COMPLETED'&&(c.id==='C'?row.reviewable===0:c.id==='A'?row.result.alternatives.some(a=>a.status==='REVIEWABLE'&&a.offer.lengthMm===1800&&a.offer.widthMm===800):row.result.alternatives.some(a=>a.status==='REVIEWABLE'&&a.offer.lengthMm===1600&&a.offer.widthMm===700&&a.offer.latestDate>=c.input.snapshot.readyDate));
  report.rows.push(row);save();console.log(JSON.stringify({id:row.id,status:row.status,reviewable:row.reviewable,expectedOutcomeMet:row.expectedOutcomeMet,elapsedMs:row.elapsedMs}));
 }
 report.crossContext=contrastMatrix(cases,report.rows,at);
 // Replay the selected terms under each target context with target-native evidence.
 report.geometryReplay=[];
 for(const row of report.rows){const a=row.result?.alternatives.find(a=>a.status==='REVIEWABLE');if(!a)continue;for(const c of cases){const r=validateCommercialOutput(c.input,'studio',{alternatives:[{...a.offer,rationale:a.rationale,tradeoff:a.tradeoff,evidence:[{ref:'snapshot.lengthMm',value:String(c.input.snapshot.lengthMm)}]}]},at);report.geometryReplay.push({from:row.id,to:c.id,status:r.alternatives[0].status,reason:r.alternatives[0].reason});}}
 report.summary={completed:report.rows.filter(r=>r.status==='COMPLETED').length,requests:report.rows.reduce((s,r)=>s+r.providerCalls,0),expectedOutcomes:report.rows.filter(r=>r.expectedOutcomeMet).length,uniqueReviewableTerms:new Set(report.rows.flatMap(r=>r.result?.alternatives.filter(a=>a.status==='REVIEWABLE').map(a=>JSON.stringify(a.offer))||[])).size,unavailable:report.rows.filter(r=>r.status==='UNAVAILABLE').length};save();console.log(JSON.stringify(report.summary));
 if(report.live){mkdirSync(new URL('../docs/',import.meta.url),{recursive:true});writeFileSync(new URL('../docs/CONTEXT_STUDY_RESULTS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
}
