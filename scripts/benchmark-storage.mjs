/** Actual project snapshot/Find/reducer costs. Not Dexie/IndexedDB latency. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { performanceProject } from '../src/core/demo.ts';
import { userEvent } from '../src/core/events.ts';
import { reduceProject } from '../src/core/reducer.ts';
import { validateProject } from '../src/core/validation.ts';
import { migrateProjectV2 } from '../src/storage/migrations.ts';
import { searchProject } from '../src/storage/repository.ts';
import { ProjectController } from '../src/core/controller.ts';
function measure(fn, count=80) {const samples=[];for(let i=0;i<count+10;i++){const start=performance.now();fn(i);if(i>=10)samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return{meanMs:+(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(3),p95Ms:+samples[Math.floor(samples.length*.95)].toFixed(3),samples:count};}
const apply=(p,command)=>reduceProject(p,userEvent(command));
const rows=[];
for(const count of [500,2000,5000]){
 const p=performanceProject(count);const encoded=JSON.stringify(p);const now=Date.now();
 const thread={id:'bench-thread',title:'Benchmark thread',scopeIds:['p-1'],messages:[],createdAt:now,updatedAt:now};
 const withThread=apply(p,{type:'thread.create',thread});
 const pressure={activeSession:true,interactions:6,participants:['p-1'],eligibleIds:Object.keys(p.thoughts)};
 const updatedSource=apply(p,{type:'source.update',source:{...p.sources['fixture-source'],inspected:'Fixture source update'}});
 assert.notEqual(updatedSource,p);assert.equal(updatedSource.sources['fixture-source'].inspected,'Fixture source update');
 const appended=apply(withThread,{type:'thread.message',id:'bench-thread',message:{id:'probe',role:'user',text:'A fixture follow-up',at:now}});
 assert.equal(appended.threads['bench-thread'].messages.length,1);
 const operations={
  serialize:measure(()=>JSON.stringify(p)),reloadAndValidate:measure(()=>validateProject(JSON.parse(encoded))),structuredClone:measure(()=>structuredClone(p)),migration:measure(()=>migrateProjectV2(p)),
  findScan:measure(i=>searchProject(p,i%2?'unfinished':'not present query')),
  edit:measure(i=>apply(p,{type:'thought.edit',id:'p-1',text:'Edit '+i})),
  dragCommit:measure(i=>apply(p,{type:'thought.move',positions:{'p-1':{x:100+i,y:200}}})),
  lifecycle:measure(()=>apply(p,{type:'lifecycle.tick',pressure})),
  sourceUpdate:measure(()=>apply(p,{type:'source.update',source:{...p.sources['fixture-source'],inspected:'Fixture source update'}})),
  threadAppend:measure(i=>apply(withThread,{type:'thread.message',id:'bench-thread',message:{id:'m'+i,role:'user',text:'A fixture follow-up',at:now}})),
 };
 const held=[];let saves=0;
 const c=new ProjectController(p,async()=>{saves++;await new Promise(resolve=>held.push(resolve));});
 c.dispatch({type:'thought.edit',id:'p-1',text:'first'});await new Promise(resolve=>setTimeout(resolve,0));
 for(let i=0;i<100;i++)c.dispatch({type:'thought.edit',id:'p-1',text:'latest '+i});
 if(saves!==1)throw new Error('More than one save ran concurrently');
 held.shift()();await new Promise(resolve=>setTimeout(resolve,0));if(saves!==2)throw new Error('Obsolete snapshots were not coalesced');held.shift()();await c.flush();
 rows.push({thoughts:count,serializedBytes:Buffer.byteLength(encoded),mutationFixtureAssertions:'Source update and Thread append changed canonical records',operations,writeQueue:{editsWhileWriterHeld:100,concurrentSaves:1,pendingLatest:1,totalWrites:2}});
}
const report={scope:'Node measurements of actual project snapshots, reducers, migrations, Find and controller queue. Memory-held writer is a deterministic queue test, NOT IndexedDB/Dexie disk latency.',node:process.version,rows};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
