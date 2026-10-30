import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetRequest, promptFingerprint, budgetSchedule, assertRequestLimit, MAX_BUDGET_REQUESTS, TOTAL_OUTPUT_CAP } from '../../experiments/role-b-comparison/budget-policy.mjs';
const request = () => ({model:'deepseek-v4-pro',max_tokens:1600,stream:false,response_format:{type:'json_object'},messages:[{role:'system',content:'frozen instructions'},{role:'user',content:JSON.stringify({intent:{kind:'ask',requestId:'unique'},context:{scope:[{id:'question',text:'public'}]}})}]});
test('fixed eight-request schedule has a bounded output ceiling and balanced arm order',()=>{
 const schedule=budgetSchedule();assert.equal(schedule.length,MAX_BUDGET_REQUESTS);assert.equal(schedule.reduce((n,s)=>n+s.arm.maxTokens,0),TOTAL_OUTPUT_CAP);
 assert.deepEqual(schedule.filter(s=>s.scenario==='continue').map(s=>s.arm.id),schedule.filter(s=>s.scenario==='ask').map(s=>s.arm.id).reverse());
 assert.throws(()=>assertRequestLimit(8,0),/ceiling/);assert.throws(()=>assertRequestLimit(0,1),/ceiling/);assert.doesNotThrow(()=>assertRequestLimit(7,0));
});
test('interventions preserve prompts and refuse changed model/base configuration',()=>{
 const input=request(),before=structuredClone(input);for(const {arm}of budgetSchedule()){
 const out=budgetRequest(input,arm.id);assert.equal(out.max_tokens,arm.maxTokens);assert.deepEqual(out.thinking,{type:arm.thinking});assert.equal(out.reasoning_effort,arm.effort??undefined);assert.deepEqual(out.messages,input.messages);assert.equal(promptFingerprint(out),promptFingerprint(input));}
 assert.deepEqual(input,before);assert.throws(()=>budgetRequest({...input,model:'unknown'},'low-1600'));assert.throws(()=>budgetRequest({...input,max_tokens:4000},'high-4000'));assert.throws(()=>budgetRequest({...input,thinking:{type:'enabled'}},'high-1600'));
});
test('prompt identity ignores only per-request trace and intervention fields',()=>{
 const first=request(),second=request();second.messages[1].content=second.messages[1].content.replace('unique','another');assert.equal(promptFingerprint(first),promptFingerprint(second));second.messages[1].content=second.messages[1].content.replace('public','changed');assert.notEqual(promptFingerprint(first),promptFingerprint(second));
});
