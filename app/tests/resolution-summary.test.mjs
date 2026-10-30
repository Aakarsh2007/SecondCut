import test from 'node:test';
import assert from 'node:assert/strict';
import {resolutionSummary} from '../lib/resolution-summary.mjs';
import {studyCases} from '../scripts/context-study.mjs';
import {validateCommercialOutput} from '../lib/commercial-ai.mjs';
test('authorization and settlement never imply physical completion',()=>{
 const r={joinedSandboxJourneyComplete:false,checkpoints:{},financial:{replacement:{authorization:'test'}},physical:{stage:'NOT_STARTED',closeout:'OPEN'}};
 assert.equal(resolutionSummary(r).captured,false);assert.equal(resolutionSummary(r).financialComplete,false);
 r.checkpoints={replacementCaptureVerified:true,originalRefundVerified:true};r.joinedSandboxJourneyComplete=true;
 const s=resolutionSummary(r);assert.equal(s.financialComplete,true);assert.equal(s.physicalStage,'NOT_STARTED');assert.equal(s.closeout,'OPEN');assert.equal(s.physicalIndependentlyVerified,false);
 r.physical={stage:'RECEIVED',closeout:'RECORDED_COMPLETE'};assert.equal(resolutionSummary(r).physicalIndependentlyVerified,false);assert.match(resolutionSummary(r).physicalLabel,/reported/);
});
test('contrasting context fixtures require different terms and reject replay',()=>{
 const at=new Date('2026-10-30T12:00:00Z'),cs=studyCases(at),offer=(data,lengthMm,widthMm)=>({price:170000,lengthMm,widthMm,latestDate:data.snapshot.readyDate,rationale:'Synthetic test proposal.',tradeoff:'New terms require explicit agreement.',evidence:[{ref:'snapshot.lengthMm',value:String(data.snapshot.lengthMm)}]});
 const status=(c,l,w)=>validateCommercialOutput(c,'studio',{alternatives:[offer(c,l,w)]},at).alternatives[0].status;
 assert.equal(status(cs[0].input,1800,800),'REVIEWABLE');assert.equal(status(cs[1].input,1600,700),'REVIEWABLE');
 assert.equal(status(cs[1].input,1800,800),'BLOCKED');assert.equal(status(cs[0].input,1600,700),'BLOCKED');assert.equal(status(cs[2].input,1800,800),'BLOCKED');
});
