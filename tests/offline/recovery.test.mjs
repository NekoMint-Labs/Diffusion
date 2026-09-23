import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { demoProject,performanceProject } from '../../src/core/demo.ts';
import { validateProject,parseProjectExport,recoveredProject,reenterProject } from '../../src/core/validation.ts';
import { exportProjectJSON } from '../../src/core/world.ts';
import { ProjectController } from '../../src/core/controller.ts';
const source=()=>({id:'s',title:'Notes',mime:'text/plain',status:'processing',excerpt:'',inspected:'Pending extraction',provenance:{},originalKey:'old-secret-key',originalPath:'/private/original.txt'});

test('all demo/performance worlds satisfy the persistence contract',()=>{
 for(const count of [100,500,2000,5000])assert.equal(validateProject(performanceProject(count)).id,`perf-${count}`);
 assert.equal(validateProject(demoProject()).id,'demo');
});
test('export and recovery preserve words but create a separate world',()=>{
 const p=demoProject();const saved=JSON.stringify(p);const original=parseProjectExport(exportProjectJSON(p));const restored=recoveredProject(original);
 assert.notEqual(restored.id,p.id);assert.deepEqual(restored.thoughts,p.thoughts);assert.equal(JSON.stringify(p),saved);assert.equal(restored.history.at(-1).kind,'world.restore');assert.doesNotThrow(()=>validateProject(restored));
});
test('recovery removes local path authority and unfinished worker certainty',()=>{
 const p=demoProject();p.sources.s=source();const restored=recoveredProject(p);
 assert.equal(restored.sources.s.status,'limited');assert.equal(restored.sources.s.originalKey,undefined);assert.equal(restored.sources.s.originalPath,undefined);assert.equal(p.sources.s.status,'processing');
});
test('re-entry degrades only interrupted extraction and preserves original bytes references',()=>{
 const p=demoProject();assert.equal(reenterProject(p),p);p.sources.s=source();const entered=reenterProject(p);
 assert.equal(entered.sources.s.status,'limited');assert.equal(entered.sources.s.originalKey,'old-secret-key');assert.equal(p.sources.s.status,'processing');assert.equal(entered.thoughts,p.thoughts);
});
test('malformed project shapes, missing provenance, and nonfinite positions are rejected',()=>{
 const p=demoProject();p.sources.s=source();delete p.sources.s.provenance;assert.throws(()=>validateProject(p),/provenance/);
 delete p.sources.s;p.thoughts.attention.x=Infinity;assert.throws(()=>validateProject(p),/finite/);
 assert.throws(()=>validateProject({...demoProject(),schemaVersion:2}),/schema/);assert.throws(()=>parseProjectExport('{'),SyntaxError);
 assert.throws(()=>parseProjectExport(JSON.stringify({format:'other',version:1,project:demoProject()})),/supported/);
});
test('prototype keys and dangling graph/source references cannot enter canonical data',()=>{
 const p=demoProject();p.thoughts.attention.sourceId='missing';assert.throws(()=>validateProject(p),/dangling source/);
 delete p.thoughts.attention.sourceId;delete p.thoughts.structure;assert.throws(()=>validateProject(p),/dangling/);
 const poisoned=JSON.parse(exportProjectJSON(demoProject()).replace('"thoughts": {','"thoughts": {"__proto__": {},'));
 assert.throws(()=>validateProject(poisoned.project),/unsafe/);
});
test('untrusted URL schemes, malformed context caches and huge nested data are rejected',()=>{
 const p=demoProject();p.sources.s={...source(),url:'javascript:alert(1)'};assert.throws(()=>validateProject(p),/URL/);delete p.sources.s;
 p.threads.th={id:'th',title:'Thread',scopeIds:[],messages:[],createdAt:1,capsule:{goal:'Goal',confirmed:0}};assert.throws(()=>validateProject(p),/timestamp|array/);
 delete p.threads.th;let deep={};p.extra=deep;for(let n=0;n<25;n++){deep.next={};deep=deep.next;}assert.throws(()=>validateProject(p),/structural/);
});
test('semantic undo records affected thought identity without storing pixel movement logs',()=>{
 const c=new ProjectController(demoProject(),async()=>{});const count=c.getSnapshot().project.history.length;
 c.dispatch({type:'thought.move',positions:{attention:{x:250,y:250}}});assert.equal(c.getSnapshot().project.history.length,count);c.undo();assert.deepEqual(c.getSnapshot().project.history.at(-1).thoughtIds,['attention']);
});
test('Field ancestors never carry the event-exclusion data-surface marker',()=>{
 const workspace=fs.readFileSync(new URL('../../src/ui/Workspace.tsx',import.meta.url),'utf8');
 assert.match(workspace,/<main[^>]*data-active-surface/);assert.doesNotMatch(workspace,/<main[^>]*\sdata-surface=/);
 const styles=fs.readFileSync(new URL('../../src/ui/field.css',import.meta.url),'utf8');assert.doesNotMatch(styles,/\.app\[data-surface=/);
});
