import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, makeThought, emptySession } from '../../src/core/model.ts';
import { reduceProject, lifecycle } from '../../src/core/reducer.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { migrateProjectV2 } from '../../src/storage/migrations.ts';
import { validateProject } from '../../src/core/validation.ts';
import { AttentionTracker } from '../../src/core/attention.ts';
import { compileContext } from '../../src/ai/context.ts';
import { parseManuscript, safeManuscriptURL } from '../../src/shared/manuscript.ts';
import { discoveryCandidate, readCandidate, reasonCandidate, hasReadPassages, validateReasoning } from '../../src/evidence/pipeline.ts';
import { SourceImporter } from '../../src/evidence/importer.ts';
import { modelRequest, modelJSON } from '../../server/provider.ts';
import { loadConfig } from '../../server/config.ts';
import { setLocale, t, resolveLocale } from '../../src/shared/i18n.ts';
import { focusFor } from '../../src/field/spatial/focus.ts';
import { demoProject } from '../../src/core/demo.ts';
const wait = () => new Promise(resolve => setTimeout(resolve, 0));
function crowded() { const p = createProject('crowded'); for (let i=0;i<18;i++) p.thoughts['t'+i] = makeThought('Question '+i,{x:i*40,y:200},1,'t'+i); return p; }
const tick = (p, patch={}) => reduceProject(p,{type:'lifecycle.tick',actor:'system',at:Date.now()+365*86400000,pressure:{activeSession:true,interactions:6,participants:['t0'],eligibleIds:Object.keys(p.thoughts),...patch}});
const discovery = {id:'candidate',title:'An outside source',url:'https://example.org/article',excerpt:'A discovery snippet says the claim is true.',inspected:'Search only',outcome:'support'};
const body = 'Actual fetched passage says the available findings are mixed and more context is required.';
function reader(overrides={}) { return {label:'Fixture reader',search:async()=>[discovery],fetch:async()=>({url:discovery.url,title:discovery.title,text:body,inspected:'Bounded source body'}),extract:async()=>[{text:body,locator:'section 2, paragraph 1',inspected:'One paragraph'}],reason:async(_claim,passages)=>({outcome:'partial',rationale:'The passage is mixed, not conclusive.',passageIds:[passages[0].id]}),...overrides}; }

test('reopening after a year does not age any ordinary Thought by wall clock',()=>{
 const p=crowded(), before=JSON.stringify(p); for(const thought of Object.values(p.thoughts)) assert.equal(lifecycle(thought,Date.now()+365*86400000),'active');
 assert.equal(reduceProject(p,{type:'lifecycle.tick',actor:'system',at:Date.now()+365*86400000}),p);
 assert.equal(JSON.stringify(p),before); const reopened=new ProjectController(JSON.parse(before),async()=>{}); reopened.coolUnderPressure(true,Object.keys(p.thoughts),[]);assert.equal(JSON.stringify(reopened.getSnapshot().project),before);
});
test('idle, hidden or sparse Fields do not accumulate attention pressure',()=>{
 const p=crowded();assert.equal(tick(p,{activeSession:false}),p);assert.equal(tick(p,{interactions:2}),p);assert.equal(tick(p,{eligibleIds:['t1','t2']}),p);
 const tracker=new AttentionTracker();tracker.note(['t1']);tracker.note(['t2']);tracker.clear();assert.equal(tracker.take(true,[],[]).interactions,0);
});
test('active crowding cools nonparticipants only and never changes geometry',()=>{
 let p=crowded();p.relations.r={id:'r',a:'t0',b:'t1',kind:'resonance',label:'A relation',status:'confirmed',createdAt:1};const before=structuredClone(p);
 for(let i=0;i<2;i++)p=tick(p);
 assert.equal(p.thoughts.t0.life,'active');assert.equal(p.thoughts.t1.life,'active');assert.equal(p.thoughts.t2.life,'cooling');assert.equal(p.history.length,0);
 for(const [id,thought]of Object.entries(p.thoughts)){assert.equal(thought.x,before.thoughts[id].x);assert.equal(thought.y,before.thoughts[id].y);}
});
test('Keep protects persistence rather than foreground and Crystal never fades',()=>{
 let p=crowded();p.thoughts.t2.kept=true;p.thoughts.t3.kind='crystal';
 for(let i=0;i<20;i++)p=tick(p);
 assert.equal(p.thoughts.t2.life,'peripheral');assert.equal(p.thoughts.t2.attentionDebt,24);assert.equal(p.thoughts.t3.life,'active');assert.equal(p.thoughts.t4.life,'memory');
});
test('legacy peripheral state does not inadvertently warm during upgrade or pressure',()=>{
 const p=crowded();p.thoughts.t2.life='peripheral';const m=migrateProjectV2(p);assert.equal(m.thoughts.t2.attentionDebt,12);assert.equal(tick(m).thoughts.t2.life,'peripheral');assert.equal(p.thoughts.t2.attentionDebt,undefined);
});
test('migration is idempotent and retains identities, source references, positions and camera',()=>{
 const p=crowded();p.sources.s={id:'s',title:'Local source',mime:'text/plain',status:'ready',excerpt:'Words',inspected:'Five characters',originalPath:'C:\\private\\source.txt',originalKey:'original-bytes',provenance:{}};
 p.threads.th={id:'th',title:'Working question',scopeIds:['t0'],messages:[],createdAt:1};
 const m=migrateProjectV2(p);assert.deepEqual(migrateProjectV2(m),m);assert.equal(m.id,p.id);assert.deepEqual(m.sources,p.sources);assert.deepEqual(m.camera,p.camera);assert.deepEqual(m.history,p.history);assert.equal(m.threads.th.scopeSnapshot.t0.text,'Question 0');
});
test('Thread wording is frozen despite later Field edits; add-selection is explicit',()=>{
 const c=new ProjectController(crowded(),async()=>{});c.dispatch({type:'thread.create',thread:{id:'th',title:'Thread',scopeIds:['t0'],messages:[],createdAt:1}});
 c.dispatch({type:'thought.edit',id:'t0',text:'Changed after Thread creation'});
 assert.equal(compileContext(c.getSnapshot().project,[],{threadId:'th'}).scope[0].text,'Question 0');
 c.dispatch({type:'thread.scope',id:'th',ids:['t1','t0']});const packet=compileContext(c.getSnapshot().project,['t9'],{threadId:'th'});assert.deepEqual(packet.scope.map(t=>t.text),['Question 0','Question 1']);
});
test('one in-flight write and latest pending state prevent an obsolete snapshot backlog',async()=>{
 let release;const saved=[];const c=new ProjectController(crowded(),async p=>{saved.push(p);if(saved.length===1)await new Promise(r=>{release=r;});});
 c.dispatch({type:'thought.edit',id:'t0',text:'first'});await wait();
 for(let i=0;i<100;i++)c.dispatch({type:'thought.edit',id:'t0',text:'latest-'+i});
 assert.equal(saved.length,1);release();await c.flush();assert.equal(saved.length,2);assert.equal(saved[1].thoughts.t0.text,'latest-99');assert.equal(c.getSnapshot().dirty,false);
});
test('coalesced save failure remains visible and retry persists the latest state',async()=>{
 let fail=true;const saved=[];const c=new ProjectController(crowded(),async p=>{if(fail)throw Error('quota');saved.push(p);});
 c.dispatch({type:'thought.edit',id:'t0',text:'unsaved'});await c.flush();assert.equal(c.getSnapshot().dirty,true);assert.match(c.getSnapshot().persistenceError,/quota/);
 fail=false;c.retrySave();await c.flush();assert.equal(saved[0].thoughts.t0.text,'unsaved');assert.equal(c.getSnapshot().persistenceError,null);
});
test('discovery cannot smuggle outcomes or forged read markers through normalization',()=>{
 const normalized=discoveryCandidate({...discovery,stage:'judged',passages:[{text:'fake'}],judgment:{outcome:'support'}});assert.equal(normalized.stage,'candidate');assert.equal(normalized.outcome,undefined);assert.equal(normalized.passages,undefined);assert.equal(normalized.judgment,undefined);
 assert.equal(compileContext(crowded(),['t0'],{web:true,evidence:[normalized]}).retrieved.sources.length,0);
});
test('reading requires a fetched body and passage text matched to that body',async()=>{
 const empty=await readCandidate(reader({fetch:async()=>({url:discovery.url,title:'Empty',text:'',inspected:'Unavailable'})}),discovery,'claim');assert.equal(hasReadPassages(empty),false);
 const fabricated=await readCandidate(reader({extract:async()=>[{text:'A fabricated snippet that is not in the page',inspected:'Claimed read'}]}),discovery,'claim');assert.equal(hasReadPassages(fabricated),false);assert.match(fabricated.inspected,/No sufficient evidence/);
 const read=await readCandidate(reader(),discovery,'claim');assert.equal(hasReadPassages(read),true);assert.equal(read.passages[0].text,body);assert.equal(read.passages[0].locator,'section 2, paragraph 1');assert.ok(read.passages[0].retrievedAt>0);assert.equal(read.judgment,undefined);
});
test('only explicit reasoning after reading produces a scoped judgment with passage references',async()=>{
 await assert.rejects(()=>reasonCandidate(reader(),discovery,'claim'),/Read and extract/);const read=await readCandidate(reader(),discovery,'claim');const judged=await reasonCandidate(reader(),read,'Claim being assessed');
 assert.equal(judged.stage,'judged');assert.equal(judged.judgment.claim,'Claim being assessed');assert.equal(judged.judgment.outcome,'partial');assert.deepEqual(judged.judgment.passageIds,[read.passages[0].id]);
 assert.throws(()=>validateReasoning({outcome:'support',rationale:'A claim',passageIds:['not-read']},read.passages),/actually read/);
});
test('aborted reads stop before extraction and never fabricate degraded evidence',async()=>{
 const abort=new AbortController();let extracted=0;const provider=reader({fetch:async()=>{abort.abort();return{url:discovery.url,title:'A',text:body,inspected:'Bounded'};},extract:async()=>{extracted++;return[];}});
 await assert.rejects(()=>readCandidate(provider,discovery,'claim',abort.signal),{name:'AbortError'});assert.equal(extracted,0);
});
test('unread Source keeps discovery separate; explicit read preserves Source and Thought identity',async()=>{
 const c=new ProjectController(createProject('source'),async()=>{});const importer=new SourceImporter(c,{}, {},()=>{});const source=importer.candidate(discovery,{x:34,y:72});const thought=Object.values(c.getSnapshot().project.thoughts)[0];assert.equal(source.excerpt,'');assert.equal(source.status,'limited');assert.equal(source.discoverySnippet,discovery.excerpt);
 assert.equal(compileContext(c.getSnapshot().project,[thought.id]).retrieved.sources.length,0);await importer.read(source.id,reader(),'claim');const p=c.getSnapshot().project;assert.equal(Object.keys(p.sources).length,1);assert.equal(p.thoughts[thought.id].x,34);assert.equal(p.sources[source.id].excerpt,body);assert.equal(compileContext(p,[thought.id]).retrieved.sources.length,1);assert.equal(validateProject(p),p);
});
test('undone Source is not resurrected by a late read',async()=>{
 const c=new ProjectController(createProject(),async()=>{}), importer=new SourceImporter(c,{}, {},()=>{});const source=importer.link(discovery.url,{x:0,y:0});let resolve;
 const pending=importer.read(source.id,reader({fetch:()=>new Promise(r=>{resolve=r;})}));c.undo();resolve({url:discovery.url,title:'Source',text:body,inspected:'Bounded'});await pending;assert.equal(Object.keys(c.getSnapshot().project.sources).length,0);
});
test('read evidence archives reject missing provenance and fabricated judgment references',async()=>{
 const c=new ProjectController(createProject(),async()=>{}), importer=new SourceImporter(c,{}, {},()=>{});const source=importer.candidate(await reasonCandidate(reader(),await readCandidate(reader(),discovery,'claim'),'claim'),{x:0,y:0});const p=structuredClone(c.getSnapshot().project);assert.equal(validateProject(p),p);
 p.sources[source.id].evidence.judgment.passageIds=['unread'];assert.throws(()=>validateProject(p),/unread passage/);
});
test('Chat Completions and Responses use explicit distinct wire envelopes',()=>{
 const chat=modelRequest({aiModel:'custom'},'System contract',{claim:'Question'});assert.equal(chat.path,'/chat/completions');assert.equal(chat.body.response_format.type,'json_object');assert.equal(chat.body.messages[0].role,'system');
 const response=modelRequest({aiModel:'custom',aiProtocol:'responses'},'System contract',{claim:'Question'});assert.equal(response.path,'/responses');assert.equal(response.body.text.format.type,'json_object');assert.equal(response.body.store,false);assert.equal(response.body.instructions,'System contract');assert.equal(response.body.messages,undefined);
 assert.equal(modelRequest({aiModel:'custom',aiJSONMode:'none'},'System',{}).body.response_format,undefined);
});
test('wire adapters parse genuine content fields and reject incomplete/refused/malformed output',()=>{
 assert.deepEqual(modelJSON('chat-completions',{choices:[{finish_reason:'stop',message:{content:'{"intents":[]}'}}]}),{intents:[]});
 assert.deepEqual(modelJSON('responses',{status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'{"intents":[]}'}]}]}),{intents:[]});
 for(const value of [{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]},{output:[]}])assert.throws(()=>modelJSON('responses',value));
 assert.throws(()=>modelJSON('chat-completions',{choices:[{finish_reason:'length',message:{content:'{"intents":[]}'}}]}),/incomplete/);assert.throws(()=>modelJSON('chat-completions',{choices:[{message:{content:'```json\n{}\n```'}}]}),/invalid/);
});
test('provider protocol configuration is validated rather than silently guessed',()=>{
 assert.equal(loadConfig({AI_PROTOCOL:'responses'}).aiProtocol,'responses');assert.equal(loadConfig({AI_JSON_MODE:'none'}).aiJSONMode,'none');assert.throws(()=>loadConfig({AI_PROTOCOL:'anthropic'}));assert.throws(()=>loadConfig({AI_JSON_MODE:'guaranteed'}));
});
test('Deep Dive presentation parses structured text without treating HTML as markup',()=>{
 const blocks=parseManuscript('# A heading\n\nA paragraph\n\n| Option | Limit |\n| --- | --- |\n| A | B |\n\n- First\n- Second\n\n```ts\n<script>alert(1)</script>\n```');assert.deepEqual(blocks.map(b=>b.kind),['heading','paragraph','table','list','code']);assert.match(blocks.at(-1).text,/<script>/);assert.equal(safeManuscriptURL('javascript:alert(1)'),null);assert.equal(safeManuscriptURL('https://user:secret@example.org'),null);
});
test('localized demo presentation preserves canonical demo geometry and wording',()=>{
  assert.equal(resolveLocale('system',['zh-CN']),'zh');assert.equal(resolveLocale('system',['en-US']),'en');setLocale('en');const en=demoProject();setLocale('zh');const zh=demoProject();assert.equal(en.thoughts.attention.text,zh.thoughts.attention.text);assert.notEqual(t(zh.thoughts.attention.text),zh.thoughts.attention.text);
  for(const id of Object.keys(en.thoughts)){assert.equal(en.thoughts[id].x,zh.thoughts[id].x);assert.equal(en.thoughts[id].y,zh.thoughts[id].y);}setLocale('en');
});

test('semantic disclosure removes colliding detail without changing world coordinates',async()=>{
 const { readableLabels }=await import('../../src/field/spatial/representation.ts');const items=[{id:'a',x:100,y:100},{id:'b',x:120,y:100},{id:'landmark',x:110,y:100,priority:3},{id:'far',x:3000,y:3000}];const before=structuredClone(items);
 assert.deepEqual(readableLabels(items,{x:0,y:0,zoom:.2},{width:1440,height:960}),['landmark','far']);assert.deepEqual(items,before);
});
test('Recall edge cues point toward original offscreen positions without camera mutation',async()=>{
 const { recallEdge }=await import('../../src/field/spatial/representation.ts');const camera={x:0,y:0,zoom:1};const left=recallEdge({x:-1000,y:480},camera,1440,960),right=recallEdge({x:5000,y:480},camera,1440,960);assert.ok(left.x<150);assert.ok(right.x>1200);assert.deepEqual(camera,{x:0,y:0,zoom:1});
});

test('legacy web snippet migration preserves the words without pretending they were read',()=>{
 const p=createProject('legacy');p.sources.web={id:'web',title:'Old candidate',mime:'text/uri-list',status:'limited',url:discovery.url,excerpt:discovery.excerpt,inspected:'Provider snippet',provenance:{url:discovery.url,note:'Legacy candidate assessment'}};
 p.thoughts.s={...makeThought('Old candidate',{x:31,y:52},1,'s'),kind:'source',sourceId:'web'};
 const upgraded=migrateProjectV2(p);assert.equal(upgraded.sources.web.discoverySnippet,discovery.excerpt);assert.equal(upgraded.sources.web.excerpt,'');assert.equal(upgraded.sources.web.status,'limited');assert.equal(upgraded.thoughts.s.x,31);assert.equal(upgraded.sources.web.url,discovery.url);assert.equal(p.sources.web.excerpt,discovery.excerpt);assert.deepEqual(migrateProjectV2(upgraded),upgraded);assert.equal(compileContext(upgraded,['s']).retrieved.sources.length,0);
});
test('canonical Source updates reject unmatched excerpts and invalid reasoning before persistence',async()=>{
 const c=new ProjectController(createProject(),async()=>{});const importer=new SourceImporter(c,{}, {},()=>{});const source=importer.candidate(await readCandidate(reader(),discovery,'claim'),{x:0,y:0});const before=c.getSnapshot().project;
 assert.throws(()=>c.dispatch({type:'source.update',source:{...source,excerpt:'A forged discovery snippet'}},'system'),/differs from its read passages/);assert.equal(c.getSnapshot().project,before);
 assert.throws(()=>c.dispatch({type:'source.update',source:{...source,evidence:{...source.evidence,stage:'judged',judgment:{outcome:'support',claim:'Claim',rationale:'Reason',provider:'Fake',at:1,passageIds:['missing']}}}},'system'),/unread passage/);assert.equal(c.getSnapshot().project,before);
});
test('incoming invalid Source record never enters canonical state',()=>{
 const c=new ProjectController(createProject(),async()=>{});const before=c.getSnapshot().project;
 assert.throws(()=>c.dispatch({type:'source.add',source:{id:'bad',title:'Bad',mime:'text/plain',status:'ready',excerpt:'Claim',inspected:'Unknown',provenance:{url:'javascript:alert(1)'}},thought:{...makeThought('Bad',{x:0,y:0}),kind:'source',sourceId:'bad'}}),/external URL/);assert.equal(c.getSnapshot().project,before);
});
test('context compilation derives web content from read passages, not a supplied excerpt',async()=>{
 const c=new ProjectController(createProject(),async()=>{}), importer=new SourceImporter(c,{}, {},()=>{});const source=importer.candidate(await readCandidate(reader(),discovery,'claim'),{x:0,y:0});const p=structuredClone(c.getSnapshot().project);p.sources[source.id].excerpt='UNREAD_EXTRA_TEXT';const packet=compileContext(p,[Object.keys(p.thoughts)[0]]);assert.equal(packet.retrieved.sources[0].excerpt,body);assert.match(packet.retrieved.sources[0].inspected,/section 2, paragraph 1/);
});
test('request-visible diagnostics retain safe IDs but never echo an upstream error body',async()=>{
 const {boundedJSON,HTTPResponseError}=await import('../../src/shared/http.ts');let caught;
 try{await boundedJSON(new Response('PRIVATE_UPSTREAM_BODY',{status:502,headers:{'X-Request-ID':'request-123'}}));}catch(error){caught=error;}
 assert.ok(caught instanceof HTTPResponseError);assert.equal(caught.requestId,'request-123');assert.doesNotMatch(caught.message,/PRIVATE/);
 await assert.rejects(()=>boundedJSON(new Response('secret',{status:500,headers:{'X-Request-ID':'not/a/safe/id'}})),error=>error.requestId===undefined);
});
test('Thread snapshot budget filters nonexistent ids before freezing its valid scope',()=>{
 const c=new ProjectController(crowded(),async()=>{});c.dispatch({type:'thread.create',thread:{id:'th',title:'Scoped',scopeIds:[...Array.from({length:24},(_,i)=>'missing'+i),'t0'],messages:[],createdAt:1}});const th=c.getSnapshot().project.threads.th;assert.deepEqual(th.scopeIds,['t0']);assert.equal(th.scopeSnapshot.t0.text,'Question 0');assert.doesNotThrow(()=>validateProject(c.getSnapshot().project));
});

test('explicit evidence upgrades preserve the already-brought Source identity and geometry',async()=>{
 const c=new ProjectController(createProject(),async()=>{}), importer=new SourceImporter(c,{}, {},()=>{});const source=importer.candidate(discovery,{x:55,y:88});const thought=Object.values(c.getSnapshot().project.thoughts)[0];
 const fetched=await readCandidate(reader(),discovery,'claim');assert.equal(importer.candidate(fetched,{x:999,y:999},source.id).id,source.id);const judged=await reasonCandidate(reader(),fetched,'claim');importer.candidate(judged,{x:999,y:999},source.id);const p=c.getSnapshot().project;
 assert.equal(Object.keys(p.sources).length,1);assert.equal(Object.keys(p.thoughts).length,1);assert.equal(p.thoughts[thought.id].x,55);assert.equal(p.thoughts[thought.id].y,88);assert.equal(p.sources[source.id].evidence.stage,'judged');assert.doesNotThrow(()=>validateProject(p));
 importer.candidate(discovery,{x:1,y:1},source.id);assert.equal(c.getSnapshot().project.sources[source.id].evidence.stage,'judged');
});
test('Let fade is reversible and user-owned, not deletion or wall-clock expiry',()=>{
 const c=new ProjectController(crowded(),async()=>{});c.dispatch({type:'thought.keep',ids:['t0']});const before=c.getSnapshot().project.thoughts.t0;c.dispatch({type:'thought.release',ids:['t0']});assert.equal(c.getSnapshot().project.thoughts.t0.kept,false);assert.equal(c.getSnapshot().project.thoughts.t0.life,'cooling');assert.equal(c.getSnapshot().project.thoughts.t0.x,before.x);c.undo();assert.equal(c.getSnapshot().project.thoughts.t0.kept,true);
 assert.throws(()=>reduceProject(c.getSnapshot().project,{type:'thought.release',ids:['t0'],actor:'ai',at:1}));c.dispatch({type:'crystal.form',id:'t0',text:'A commitment'});assert.throws(()=>c.dispatch({type:'thought.release',ids:['t0']}));
});

test('stale selection cannot black out a Field after a selected Thought is undone',()=>{
 const p=crowded(),session=emptySession();const f=focusFor(p,session,['deleted-thought']);assert.equal(f.selected.size,0);assert.equal(f.peripheral.size,0);assert.equal(f.activeRelations.length,0);assert.equal(focusFor(p,session,['deleted-thought','t0']).selected.size,1);
});
