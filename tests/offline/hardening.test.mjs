import test from 'node:test';
import assert from 'node:assert/strict';
import { demoProject,performanceProject,performanceSession } from '../../src/core/demo.ts';
import { createProject,makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { reduceProject,lifecycle } from '../../src/core/reducer.ts';
import { validateProject } from '../../src/core/validation.ts';
import { compileContext,rebuildCapsule } from '../../src/ai/context.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { searchProject } from '../../src/storage/repository.ts';

test('unknown authority/events and invalid creation metadata cannot enter Core',()=>{
 const p=demoProject();assert.throws(()=>reduceProject(p,{actor:'outsider',type:'thought.delete',ids:['attention'],at:1}),/authority/);
 assert.throws(()=>reduceProject(p,{actor:'user',type:'unknown',at:1}),/Unknown domain/);
 assert.throws(()=>reduceProject(p,{actor:'user',type:'thought.create',thought:{...makeThought('x',{x:1,y:2}),life:'invalid'},at:1}),/Invalid thought/);
 assert.throws(()=>reduceProject(p,{actor:'user',type:'thought.wake',ids:['attention'],at:-1}),/timestamp/);
});
test('ordinary attention reactivates lifecycle without turning clicks into History',()=>{
 const p=demoProject();p.thoughts.attention={...p.thoughts.attention,touchedAt:1,life:'peripheral'};const c=new ProjectController(p,async()=>{});c.touch(['attention'],100000);assert.equal(c.getSnapshot().project.thoughts.attention.life,'active');assert.equal(c.getSnapshot().project.history.length,p.history.length);assert.equal(c.getSnapshot().project.thoughts.attention.x,p.thoughts.attention.x);
 assert.equal(lifecycle({...p.thoughts.attention,kept:true},1e15),'peripheral');assert.equal(lifecycle({...p.thoughts.attention,kind:'crystal'},1e15),'active');
});
test('Diffuse without project Source permission does not submit a selected Source body',async()=>{
 const p=createProject('main');p.sources.s={id:'s',title:'Private source',status:'ready',mime:'text/plain',excerpt:'SENSITIVE_SOURCE_EXCERPT',inspected:'Short text',provenance:{}};p.thoughts.ref={...makeThought('A selected source reference',{x:0,y:0},1,'ref'),kind:'source',sourceId:'s'};
 const c=new ProjectController(p,async()=>{});let packet;const provider={label:'Test',mock:true,respond:async(value)=>{packet=value;return{intents:[],providerLabel:'Test',mock:true};}};const runtime=new AIRuntime(c,()=>provider,{pending:()=>{},notice:()=>{},route:()=>{},anchor:()=>({x:0,y:0})});
 await runtime.run('diffuse','Explore this',['ref'],{runId:'run',projectSources:false});assert.equal(packet.retrieved.sources.length,0);assert.ok(!JSON.stringify(packet).includes('SENSITIVE_SOURCE_EXCERPT'));
 await runtime.run('ask','Inspect this explicitly selected Source',['ref']);assert.equal(packet.retrieved.sources.length,1);runtime.dispose();
});
test('large Thread capsules and raw context retain hard source budgets',()=>{
 const p=createProject('main');for(let i=0;i<60;i++){const sid='s'+i;p.sources[sid]={id:sid,title:'Source',status:'ready',mime:'text/plain',excerpt:'text',inspected:'short text',provenance:{}};p.thoughts['t'+i]={...makeThought('reference',{x:i,y:0},1,'t'+i),kind:'source',sourceId:sid};}
 const thread={id:'th',title:'Many references',scopeIds:Object.keys(p.thoughts),messages:[],createdAt:1};p.threads.th=thread;assert.equal(rebuildCapsule(thread,p).sources.length,24);const packet=compileContext(p,[],{threadId:'th',projectSources:true});assert.equal(packet.scope.length,24);assert.equal(packet.retrieved.sources.length,4);
});
test('Find locates retained orphan Source provenance and does not mutate state',()=>{
 const p=demoProject();p.sources.s={id:'s',title:'Orphan source',status:'limited',mime:'text/plain',excerpt:'specific retained wording',inspected:'snippet',provenance:{}};const before=JSON.stringify(p);const hit=searchProject(p,'specific retained')[0];assert.equal(hit.kind,'source');assert.equal(hit.id,'s');assert.deepEqual(hit.thoughtIds,[]);assert.equal(JSON.stringify(p),before);
});
test('performance fixture includes mixed representations but keeps Ghosts out of canonical state',()=>{
 const p=performanceProject(5000);const session=performanceSession(p);assert.doesNotThrow(()=>validateProject(p));assert.equal(Object.keys(p.thoughts).length,5000);assert.equal(Object.keys(session.ghosts).length,8);assert.ok(Object.keys(p.relations).length>0);assert.ok(Object.keys(p.sources).length>0);assert.ok(!JSON.stringify(p).includes('fixture-ghost-0'));
});
test('repeated deterministic editing/moving never corrupts a reloadable project',()=>{
 let p=demoProject();for(let n=0;n<500;n++){const before=p;const text=before.thoughts.attention.text;const type=n%3===0?'thought.edit':'thought.move';p=reduceProject(p,type==='thought.edit'?{type,id:'attention',text:'Revision '+n,actor:'user',at:Date.now()}:{type,positions:{attention:{x:n*3-600,y:n%100}},actor:'user',at:Date.now()});assert.equal(before.thoughts.attention.text,text);validateProject(p);}assert.equal(p.history.filter(h=>h.kind==='thought.move').length,0);
});
