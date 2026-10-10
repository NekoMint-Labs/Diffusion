import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject,makeThought } from '../../src/core/model.ts';
import { reduceProject } from '../../src/core/reducer.ts';
import { userEvent } from '../../src/core/events.ts';
import { forkProject,compareWorlds,bringToMain,continuedThought,handoffMarkdown,exportProjectJSON } from '../../src/core/world.ts';
import { RegionObserver } from '../../src/field/spatial/regions.ts';
const seed=()=>{const p=createProject('main');for(const[key,x,y]of[['a',100,100],['b',400,100],['c',200,300]])p.thoughts[key]=makeThought(key+'?',{x,y},1,key);return p;};
test('fork snapshots identity and provenance without changing Main',()=>{
 const main=seed();const original=JSON.stringify(main);const fork=forkProject(main,'An alternative',2);assert.equal(JSON.stringify(main),original);assert.equal(fork.fork.parentId,'main');assert.equal(fork.thoughts.a.origin.thoughtId,'a');fork.thoughts.a.text='Different';assert.equal(main.thoughts.a.text,'a?');assert.throws(()=>forkProject(fork,'Nested'),/nested/);
});
test('comparison exposes shared, one-sided change and conflicts, ignoring position',()=>{
 const main=seed();const fork=forkProject(main,'Try');fork.thoughts.a.x=9999;assert.equal(compareWorlds(main,fork).find(x=>x.id==='a').kind,'shared');fork.thoughts.a.text='Fork words';assert.equal(compareWorlds(main,fork).find(x=>x.id==='a').kind,'fork-changed');main.thoughts.a.text='Main words';assert.equal(compareWorlds(main,fork).find(x=>x.id==='a').kind,'conflict');delete fork.thoughts.b;assert.equal(compareWorlds(main,fork).find(x=>x.id==='b').kind,'only-main');
});
test('selective Bring to Main never overwrites wording or automatically merges relations',()=>{
 const main=seed();const fork=forkProject(main,'Try');fork.thoughts.a.text='Alternative wording';fork.relations.r={id:'r',a:'a',b:'b',kind:'tension',label:'Only in Fork',status:'confirmed',createdAt:1};const result=bringToMain(main,fork,['a'],{x:1000,y:200});assert.equal(result.count,1);assert.equal(result.project.thoughts.a.text,'a?');assert.equal(result.project.thoughts[result.ids[0]].text,'Alternative wording');assert.equal(result.project.thoughts[result.ids[0]].origin.projectId,fork.id);assert.equal(Object.keys(result.project.relations).length,0);assert.equal(bringToMain(result.project,fork,['a'],{x:0,y:0}).count,0);
});
test('new scope Crystal and Continue require user authority and preserve source thoughts',()=>{
 let p=seed();const crystal={...makeThought('A chosen commitment',{x:1,y:2},3,'cr'),kind:'crystal',kept:true};assert.throws(()=>reduceProject(p,{type:'crystal.create',thought:crystal,basedOn:['a','b'],actor:'ai',at:3}),/AI/);p=reduceProject(p,userEvent({type:'crystal.create',thought:crystal,basedOn:['a','b']},3));assert.equal(p.thoughts.a.text,'a?');const old=JSON.stringify(p.thoughts.cr);const thought=continuedThought(p,'cr',{x:10,y:20});p=reduceProject(p,userEvent({type:'crystal.continue',from:'cr',thought},4));assert.equal(JSON.stringify(p.thoughts.cr),old);assert.equal(p.thoughts[thought.id].origin.thoughtId,'cr');
});
test('Regions need repeated spatial actions and never change Thought geometry',()=>{
 let p=seed();const original=JSON.stringify(p.thoughts);const observer=new RegionObserver();assert.equal(observer.observe(p,['a','b','c']).length,0);assert.equal(observer.observe(p,['a']).length,0);const regions=observer.observe(p,['a']);assert.equal(regions.length,1);assert.equal(regions[0].members.length,3);assert.equal(JSON.stringify(p.thoughts),original);p={...p,regions:Object.fromEntries(regions.map(r=>[r.id,r]))};const observed=observer.observe(p,['b']);assert.equal(observed[0].id,regions[0].id);
});
test('Handoff includes commitments and uncertainty; JSON export strips nonportable local paths',()=>{
 let p=seed();p=reduceProject(p,userEvent({type:'crystal.form',id:'a',text:'A commitment'},2));p.sources.s={id:'s',title:'Source',status:'limited',mime:'text/plain',excerpt:'Only a snippet',inspected:'First paragraph only.',originalPath:'/private/file.txt',originalKey:'local-key',provenance:{}};p.thoughts.a.origin={sourceId:'s'};const text=handoffMarkdown(p,'a');assert.match(text,/A commitment/);assert.match(text,/First paragraph only/);assert.match(text,/not a claim of objective truth/);const json=exportProjectJSON(p);assert.ok(!json.includes('/private/file.txt'));assert.ok(!json.includes('local-key'));assert.equal(JSON.parse(json).project.id,'main');assert.throws(()=>handoffMarkdown(p,'b'),/Crystal/);
});

test('Handoff carries direct generation parents without confirming lineage as a relation', () => {
 const p = seed();
 p.thoughts.b.derivedFrom = ['c'];
 p.thoughts.b.generationAction = 'continue';
 p.thoughts.a.derivedFrom = ['b', 'missing'];
 p.thoughts.a.generationAction = 'continue';
 const formed = reduceProject(p, userEvent({ type: 'crystal.form', id: 'a', text: 'A chosen direction' }, 2));
 // Compatibility: duplicate/self references in an imported record must not duplicate context.
 formed.thoughts.a.derivedFrom.push('b', 'a');
 const original = JSON.stringify(formed);
 const text = handoffMarkdown(formed, 'a');
 assert.match(text, /### Still open \/ b\n\nb\?/);
 assert.equal(text.split('### Still open / b').length - 1, 1);
 assert.ok(!text.includes('### Still open / c'));
 assert.ok(!text.includes('### Stable / a'));
 assert.match(text, /## Confirmed relationships\n\nNone\. Unconfirmed phenomena were not promoted\./);
 assert.equal(JSON.stringify(formed), original);
});

test('Handoff includes direct-parent source scope without local byte locations or credentials', () => {
 const p = seed();
 p.thoughts.a.derivedFrom = ['b'];
 p.thoughts.a.generationAction = 'continue';
 p.thoughts.b.origin = { sourceId: 'parent-source' };
 p.sources['parent-source'] = {
  id: 'parent-source', title: 'Parent reference', status: 'limited', mime: 'text/plain',
  excerpt: 'Bounded excerpt only', inspected: 'One selected paragraph; remainder unread.',
  originalPath: '/private/parent.txt', originalKey: 'private-byte-key',
  lastSubmitted: { at: 123, provider: 'local', characters: 20, requestId: 'private-submission' },
  provenance: { locator: 'Paragraph 2' },
 };
 const formed = reduceProject(p, userEvent({ type: 'crystal.form', id: 'a', text: 'A chosen direction' }, 2));
 const text = handoffMarkdown(formed, 'a');
 assert.match(text, /Parent reference/);
 assert.match(text, /Bounded excerpt only/);
 assert.match(text, /One selected paragraph; remainder unread\./);
 assert.match(text, /Locator: Paragraph 2/);
 assert.match(text, /original bytes are not included/);
 assert.ok(!text.includes('/private/parent.txt'));
 assert.ok(!text.includes('private-byte-key'));
 assert.ok(!text.includes('lastSubmitted'));
});

test('Handoff prioritizes direct parents within the existing bounded context', () => {
 const p = seed();
 p.thoughts.a.derivedFrom = ['b'];
 p.thoughts.a.generationAction = 'continue';
 for (let i = 0; i < 25; i++) {
  const key = `neighbor-${i}`;
  p.thoughts[key] = makeThought(`Neighbor ${i}`, { x: i * 10, y: 100 }, 1, key);
  p.relations[key] = { id: key, a: 'a', b: key, kind: 'support', label: `Confirmed ${i}`, status: 'confirmed', createdAt: 1 };
 }
 const formed = reduceProject(p, userEvent({ type: 'crystal.form', id: 'a', text: 'A chosen direction' }, 2));
 const text = handoffMarkdown(formed, 'a');
 assert.match(text, /### Still open \/ b\n\nb\?/);
 assert.equal((text.match(/^### Still open \/ /gm) ?? []).length, 20);
 assert.ok(!text.includes('### Still open / neighbor-19'));
 assert.equal((text.match(/^- support: Confirmed /gm) ?? []).length, 25);
});
