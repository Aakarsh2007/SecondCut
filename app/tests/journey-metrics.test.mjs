import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyMetrics} from '../lib/journey-metrics.mjs';
test('journey metrics count observed operations without inventing savings or unpaid revenue',()=>{
 const c={replacement:170000,refund:90000,replacement_status:'NOT_STARTED',refund_status:'NOT_STARTED',operations:[{kind:'original_order',status:'COMPLETED',attempts:1,created_at:'2026-10-30T01:00:00Z'},{kind:'original_refund',status:'FAILED',attempts:2,updated_at:'2026-10-30T01:05:00Z'}]};
 const r=journeyMetrics(c,{latencyMs:4264,alternatives:[{status:'REVIEWABLE'},{status:'BLOCKED'}]},{rounds:[{}]});
 assert.equal(r.completedOperations,1);assert.equal(r.operationAttempts,3);assert.equal(r.verifiedReplacementMinor,0);assert.equal(r.verifiedRefundMinor,0);assert.equal(r.testJourneyElapsedSeconds,null);assert.equal(r.manualActionsSaved,null);assert.equal(r.manualTimeSavedSeconds,null);assert.equal(r.submittedNegotiationRounds,1);assert.equal(r.policyPassAlternatives,1);
 c.refund_status='COMPLETED';c.replacement_status='COMPLETED';c.operations[1].status='COMPLETED';const done=journeyMetrics(c,null,null);assert.equal(done.verifiedReplacementMinor,170000);assert.equal(done.verifiedRefundMinor,90000);assert.equal(done.testJourneyElapsedSeconds,300);assert.match(done.notice,/approval waits/);
});
