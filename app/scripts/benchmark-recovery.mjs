import assert from 'node:assert/strict';
import {evaluatePlanning,samplePlanningInput} from '../lib/planner.mjs';

// Synthetic, reproducible comparison. This is NOT a test of any named marketplace.
const at=new Date('2026-10-29T12:00:00Z');
const variants=[
 ['smaller-raw-top',()=>{},true,false],
 ['exact-size',i=>{i.needs[0].lengthMm=1800;i.needs[0].widthMm=800;},true,true],
 ['cannot-enlarge',i=>{i.needs[0].lengthMm=2000;},false,false],
 ['finished-top',i=>{i.snapshot.stage='finished';},false,false],
 ['below-price-floor',i=>{i.needs[0].budget=140000;},false,false],
 ['expired-request',i=>{i.needs[0].expiresDate='2026-10-28';},false,false],
 ['unsupported-finish',i=>{i.needs[0].finish='dark';},false,false],
 ['loss-making',i=>{i.snapshot.completion=100000;},false,false],
];
const rows=variants.map(([id,change,expectedAdaptation,expectedExact])=>{
 const input=samplePlanningInput(at);input.needs=input.needs.slice(0,1);change(input);
 const baseline=structuredClone(input);baseline.snapshot.allowShorten=false;baseline.snapshot.allowNarrow=false;
 const adapted=evaluatePlanning(input,at).candidates[0],exact=evaluatePlanning(baseline,at).candidates[0];
 assert.equal(adapted.status==='FEASIBLE',expectedAdaptation,id+' adaptation');assert.equal(exact.status==='FEASIBLE',expectedExact,id+' exact baseline');
 return {id,source:'SYNTHETIC',exactSpecificationStatus:exact.status,secondCutStatus:adapted.status,operations:adapted.operations.map(o=>o.id),modeledAdaptationCostCents:adapted.adaptation??null,modeledMarginCents:adapted.margin??null,reasonCodes:adapted.reasons.map(r=>r.code)};
});
console.log(JSON.stringify({schemaVersion:1,evaluatedAt:at.toISOString(),currency:'USD',scenarioCount:rows.length,exactSpecificationFeasible:rows.filter(r=>r.exactSpecificationStatus==='FEASIBLE').length,secondCutFeasible:rows.filter(r=>r.secondCutStatus==='FEASIBLE').length,rows,limitations:['All scenarios and costs are invented; this is a functional regression benchmark, not a market study.','Baseline uses identical availability, economic and material rules but disallows dimensional adaptation.','No named competitor algorithm, buyer liquidity, conversion, runtime speed or real recovery rate was tested.','AI extraction is tested separately; this benchmark measures the deterministic planner, not LLM accuracy.']},null,2));
