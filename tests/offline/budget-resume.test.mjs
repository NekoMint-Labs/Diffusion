import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBudgetResume } from '../../experiments/role-b-comparison/budget-resume.mjs';
import { budgetSchedule, budgetRequest, promptFingerprint } from '../../experiments/role-b-comparison/budget-policy.mjs';
function ledger(){
 const plan={productSource:'frozen',flags:'readingTrial=1&propositionTrial=1',origin:'isolated',provider:'deepseek',model:'deepseek-v4-pro',injected:true,maxRequests:8,aggregateOutputCap:17600,automaticRetries:0,schedule:budgetSchedule()};
 const body=budgetRequest({model:'deepseek-v4-pro',max_tokens:1600,stream:false,messages:[{role:'user',content:JSON.stringify({intent:{requestId:'trace'},text:'public'})}]},'high-1600');
 const first={...plan.schedule[0],productSource:'frozen',injected:true,requests:[{done:true}],results:[],status:'empty-or-failed',singleRequest:true,sentRequestBody:body,promptFingerprint:promptFingerprint(body)};
 const failure={...plan.schedule[1],productSource:'frozen',injected:true,requests:[],results:[],status:'execution-failed'};
 const summary={injected:true,totalSent:1,blocked:0,routeFailure:null,promptFingerprints:{ask:first.promptFingerprint},results:[first,failure].map(r=>({scenario:r.scenario,arm:r.arm.id,status:r.status,requests:r.requests.length,outputs:r.results.length}))};
 return {plan,summary,records:[first,failure]};
}
test('Budget resume preserves a spent empty answer and leaves exactly seven calls / 16000 cap',()=>{const old=ledger(),state=validateBudgetResume(old,old.plan);assert.equal(state.totalSent,1);assert.equal(state.consumedCap,1600);assert.equal(state.remaining.length,7);assert.equal(state.remaining.reduce((s,r)=>s+r.arm.maxTokens,0),16000);assert.equal(state.remaining[0].arm.id,'high-4000');});
test('Budget resume refuses unknown counts, changed prompts, unfinished calls, changed plans or route failures',()=>{
 for(const mutate of [x=>x.summary.totalSent++,x=>x.records[0].requests[0].done=false,x=>x.records[0].sentRequestBody.messages[0].content='{}',x=>x.summary.blocked++,x=>x.records[1].requests.push({done:false}),x=>x.summary.results[0].requests++,x=>x.summary.promptFingerprints.ask='changed']){const old=ledger();mutate(old);assert.throws(()=>validateBudgetResume(old,old.plan));}
 const old=ledger();assert.throws(()=>validateBudgetResume(old,{...old.plan,productSource:'changed'}));
});
