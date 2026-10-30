// Reproducible synthetic evaluation. Live mode makes exactly one Gemini call, never a payment.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {samplePlanningInput} from '../lib/planner.mjs';
import {validateCommercialOutput,generateCommercialAlternatives} from '../lib/commercial-ai.mjs';
const at=new Date(),v=samplePlanningInput(at);v.snapshot.requireStressProtection=true;
const a={price:170000,lengthMm:1800,widthMm:800,latestDate:v.needs[0].latestDate,rationale:'Avoid both quoted cuts; protect the modeled margin.',tradeoff:'Requires explicit buyer acceptance of larger dimensions.',evidence:[{ref:'snapshot.lengthMm',value:'1800'}]};
const cases=[['uncut tradeoff',v,a,'REVIEWABLE'],['original protected terms',v,{...a,lengthMm:1600,widthMm:700},'BLOCKED'],['over-budget offer',v,{...a,price:178000},'BLOCKED'],['impossible enlargement',v,{...a,lengthMm:2200},'BLOCKED'],['invented evidence',v,{...a,evidence:[{ref:'buyer.budget',value:'999999'}]},'BLOCKED'],['unauthorized refund change',v,{...a,refund:0},'BLOCKED'],['expired quote',{...v,snapshot:{...v.snapshot,quoteExpiresDate:'2020-01-01'}},a,'BLOCKED']];
const fixtures=cases.map(([name,input,offer,expected])=>{const start=performance.now(),r=validateCommercialOutput(input,'studio',{alternatives:[offer]},at);return {name,source:'CONTROLLED_FIXTURE_NOT_MODEL',expected,actual:r.alternatives[0].status,passed:r.alternatives[0].status===expected,rulesOnlyBaseline:r.baseline.status,elapsedMs:performance.now()-start};});
const report={schemaVersion:1,createdAt:at.toISOString(),scenarioSource:'SYNTHETIC',fixtures,live:null,limits:'Fixtures measure validator behavior, not Gemini accuracy or customer time savings. No manual-work reduction or business outcomes measured.'};
if(process.argv.includes('--live')){
 const config={...process.env};
 try{for(const line of readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)config[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}}catch{}
 const inspectedFetch=async(...args)=>{const r=await fetch(...args);try{const b=await r.clone().json(),c=b.candidates?.[0];report.liveDiagnostics={httpStatus:r.status,finishReason:c?.finishReason||null,textCharacters:c?.content?.parts?.filter(p=>typeof p.text==='string').map(p=>p.text).join('').length||0,usage:b.usageMetadata||null};}catch{}return r;};
 try{report.live={status:'COMPLETED',...await generateCommercialAlternatives(v,'studio',[],config,inspectedFetch,at)};}catch(e){report.live={status:'UNAVAILABLE',reason:e.message};}
}
mkdirSync(new URL('../outputs/',import.meta.url),{recursive:true});writeFileSync(new URL('../outputs/commercial-evaluation.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({fixturesPassed:fixtures.filter(r=>r.passed).length,fixturesTotal:fixtures.length,live:report.live?{status:report.live.status,reviewable:report.live.alternatives?.filter(a=>a.status==='REVIEWABLE').length,blocked:report.live.alternatives?.filter(a=>a.status==='BLOCKED').length,latencyMs:report.live.latencyMs,reason:report.live.reason}:null}));
if(fixtures.some(r=>!r.passed))process.exitCode=1;
