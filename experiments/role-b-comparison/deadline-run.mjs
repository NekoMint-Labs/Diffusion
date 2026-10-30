import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {PRODUCT_SOURCE,ORIGIN,FLAGS,LIMIT,OUTPUT_CAP,hash,schedule,fixture,canonical,intervene,guard} from './deadline-policy.mjs';
const {values}=parseArgs({options:{out:{type:'string'},session:{type:'string'},execute:{type:'boolean',default:false},injected:{type:'boolean',default:false}}});
if(!values.out)throw new Error('New output directory required');
const cases=JSON.parse(fs.readFileSync(new URL('./plain-answer-cases.zh-CN.json',import.meta.url),'utf8')).cases;
const runs=schedule(cases),toolSource=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const plan={productSource:PRODUCT_SOURCE,toolSource,origin:ORIGIN,flags:FLAGS,model:'deepseek-v4-pro',depth:'deep',maxRequests:LIMIT,maxTokens:OUTPUT_CAP,totalCap:LIMIT*OUTPUT_CAP,automaticRetries:0,injected:values.injected,schedule:runs.map(x=>({index:x.index,case:x.case.id,arm:x.arm,action:x.case.action,fixtureSha:hash(JSON.stringify(fixture(x.case)))})),scope:'Same frozen product; control removes only the exact opt-in wording block in browser route. Existing provider defaults and 45s product timeout. No search, summary or warmup.'};
console.log(JSON.stringify(plan,null,2));if(!values.execute)process.exit(0);
if(!values.session)throw new Error('Session receipt required');
const out=path.resolve(values.out);fs.mkdirSync(out);const save=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');save('plan.json',plan);
const manifest=await fetch(ORIGIN+'/deadline-source.json').then(r=>r.json());
if(manifest.source!==PRODUCT_SOURCE||manifest.flags!==FLAGS)throw new Error('Frozen product mismatch');
for(const[file,sha]of Object.entries(manifest.assets))if(hash(Buffer.from(await fetch(ORIGIN+'/'+file).then(r=>r.arrayBuffer())))!==sha)throw new Error('Served asset mismatch');save('build-manifest.json',manifest);
const session=JSON.parse(fs.readFileSync(values.session,'utf8'));
if(session.source!==PRODUCT_SOURCE||session.manifestSha!==hash(JSON.stringify(manifest))||!path.basename(session.profile).startsWith('b-deadline-20261030-')||!Number.isInteger(session.port))throw new Error('Session identity mismatch');
if(values.injected&&!session.profile.includes('-injected'))throw new Error('Injected mode requires fake-key-only profile');
const {chromium,expect}=await import('@playwright/test');const {createProject}=await import('../../src/core/model.ts');const {openField,command,restoreExport}=await import('./flow.mjs');
const check='$taskListeners=@(Get-NetTCPConnection -LocalPort '+session.port+' -State Listen -ErrorAction Stop | Where-Object { $_.LocalAddress -eq "127.0.0.1" }); if($taskListeners.Count -ne 1){throw "Expected one listener"}; (Get-CimInstance Win32_Process -Filter ("ProcessId = " + $taskListeners[0].OwningProcess)).CommandLine';
const args=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',check],{encoding:'utf8',timeout:30000});
const match=/--user-data-dir=(?:"([^"\r\n]+)"|([^\s\r\n]+))/.exec(args);const actual=(match?.[1]??match?.[2]??'').replace(/"$/,'');if(path.resolve(actual).toLowerCase()!==path.resolve(session.profile).toLowerCase())throw new Error('Browser process profile mismatch');
const browser=await chromium.connectOverCDP('http://127.0.0.1:'+session.port);const context=browser.contexts()[0],page=context.pages().find(p=>p.url().startsWith(ORIGIN+'/'));if(!page)throw new Error('Experiment page missing');
await page.bringToFront();const url=new URL(page.url());for(const[k,v]of new URLSearchParams(FLAGS))if(url.searchParams.get(k)!==v)throw new Error('Flag mismatch');
const scripts=await page.locator('script[src]').evaluateAll(xs=>xs.map(x=>new URL(x.src).pathname.slice(1)));if(!scripts.length||scripts.some(x=>!manifest.assets[x]))throw new Error('Loaded script mismatch');
const settings=await page.evaluate(()=>{const x=JSON.parse(localStorage.getItem('diffusion-settings')||'{}');return{provider:x.provider,model:x.model,depth:x.thinkingDepth,locale:x.locale};});if(JSON.stringify(settings)!==JSON.stringify({provider:'deepseek',model:'deepseek-v4-pro',depth:'deep',locale:'en'}))throw new Error('Unexpected nonsecret settings');
if(!await page.locator('.settings-surface').isVisible()){await page.keyboard.press('Control+,');await page.locator('.settings-nav [data-section="ai"]').click();}
await expect(page.locator('.settings-surface')).toBeVisible();await expect(page.getByTestId('provider-key')).toHaveAttribute('placeholder',/Stored/);await page.locator('.settings-surface .surface-close').click();save('loaded-build.json',{source:PRODUCT_SOURCE,scripts,settings,profileVerified:true});
const owned=runs.filter((x,i)=>i%2===0).map(x=>fixture(x.case));const hold=createProject('comparison-deadline-hold','模型对照 · deadline-hold',1);
async function store(project,replace=false){await page.evaluate(({project,replace})=>new Promise((resolve,reject)=>{const o=indexedDB.open('diffusion-explorer-v1');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const db=o.result,tx=db.transaction('projects','readwrite'),table=tx.objectStore('projects'),q=table.get(project.id);q.onsuccess=()=>{if(q.result&&!replace){tx.abort();return;}table.put(project);};tx.oncomplete=()=>{db.close();resolve(true);};tx.onabort=()=>{db.close();reject(new Error('Owned fixture collision'));};};}),{project,replace});}
async function saved(id){return page.evaluate(id=>new Promise((resolve,reject)=>{const o=indexedDB.open('diffusion-explorer-v1');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const db=o.result,q=db.transaction('projects').objectStore('projects').get(id);q.onsuccess=()=>{db.close();resolve(q.result);};q.onerror=()=>reject(q.error);};}),id);}
await store(hold);for(const p of owned)await store(p);
let active=null,totalSent=0,blocked=0,routeFailure=null;const fingerprints=new Map(),requests=new Map(),pending=new Set(),results=[];
const write=r=>save(r.index+'-'+r.case+'-'+r.arm+'.json',r);
const routeHandler=async route=>{
 const request=route.request();if(request.method()!=='POST')return route.continue();
 try{
  if(!active||new URL(request.url()).pathname!=='/chat/completions')throw new Error('Unexpected provider request');guard(totalSent,active.requests.length);
  const original=request.postDataJSON(),modified=intervene(original,active.arm),fingerprint=canonical(modified),before=fingerprints.get(active.case);
  if(before&&before!==fingerprint)throw new Error('Paired prompt differs outside experimental block/trace');fingerprints.set(active.case,fingerprint);
  const entry={startedAt:new Date().toISOString(),done:false};active.originalRequestBody=original;active.sentRequestBody=modified;active.promptFingerprint=fingerprint;active.requests.push(entry);requests.set(request,{record:active,entry});totalSent++;write(active);
  // Never read request headers or keys. Original browser authentication is retained.
  if(values.injected){const text='可以先看一节内容依赖哪些概念，这只是一种可选整理方式，不需要假定授课身份。';const type=active.action==='ask'?'respond_in_field':'surface_possibility';return route.fulfill({json:{model:'deepseek-v4-pro',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({intents:[{type,text}]})}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}});}
  return route.continue({postData:JSON.stringify(modified)});
 }catch(error){blocked++;routeFailure=String(error);return route.abort();}
};
const onResponse=response=>{const found=requests.get(response.request());if(!found)return;const task=(async()=>{try{const data=await response.json();Object.assign(found.entry,{status:response.status(),actualModel:data.model??null,usage:data.usage??null,finishReasons:data.choices?.map(c=>c.finish_reason)??null,responseContent:data.choices?.map(c=>c.message?.content??null)??null});}catch{found.entry.observationError='Body unavailable';}finally{found.entry.done=true;found.entry.finishedAt=new Date().toISOString();write(found.record);}})();pending.add(task);task.finally(()=>pending.delete(task));};
const onFailure=request=>{const found=requests.get(request);if(found){found.entry.done=true;found.entry.transportFailed=true;found.entry.finishedAt=new Date().toISOString();write(found.record);}};
await page.route('https://api.deepseek.com/**',routeHandler);page.on('response',onResponse);page.on('requestfailed',onFailure);
try{for(const run of runs){
 const record={index:run.index,case:run.case.id,arm:run.arm,action:run.case.action,productSource:PRODUCT_SOURCE,injected:values.injected,startedAt:new Date().toISOString(),requests:[],results:[]};active=record;write(record);
 try{
  await openField(page,hold.id);const project=fixture(run.case);await store(project,true);await openField(page,project.id);record.fixture=await saved(project.id);if(hash(JSON.stringify(record.fixture))!==plan.schedule[run.index].fixtureSha)throw new Error('Fresh fixture mismatch');
  await page.locator('[data-thought-id="question"]').click();
  if(run.case.action==='ask'){await command(page,'ask');const input=page.getByTestId('speak').locator('textarea');record.explicitInput=run.case.input+'\n请只给我一个方向。';await input.fill(record.explicitInput);await input.press('Enter');}
  else {await page.getByTestId('scope-continue').click();await page.getByRole('group',{name:'Result count',exact:true}).getByRole('button',{name:'1',exact:true}).click();await page.getByTestId('action-preview-run').click();}
  await expect.poll(()=>!!routeFailure||record.requests.length===1&&record.requests[0].done,{timeout:65000}).toBe(true);if(routeFailure)throw new Error(routeFailure);
  await expect.poll(()=>page.locator('.speak-stop,.diffuse-indicator button').filter({hasText:/^Stop$/}).count(),{timeout:15000}).toBe(0);await Promise.all([...pending]);
  const ghosts=page.locator('article.ghost');for(let i=0;i<await ghosts.count();i++){const g=ghosts.nth(i);record.results.push({id:await g.getAttribute('data-thought-id'),fullText:(await g.getAttribute('aria-label')).replace(/^[^:]+:\s*/,''),cardText:await g.locator('.thought-preview').innerText(),focus:await g.getAttribute('data-reading-focus')});}
  if(record.results.length>1)throw new Error('Candidate ceiling violated');record.notices=await page.locator('.notice,.operation-feedback').allTextContents();record.status=record.results.length?'observed-output':'empty-or-failed';write(record);
  for(const item of record.results){const g=page.locator('[data-thought-id="'+item.id+'"]');await g.click();await g.getByRole('button',{name:'Read original',exact:true}).click();await expect(page.getByTestId('reading-original')).toHaveText(item.fullText);item.readerText=await page.getByTestId('reading-original').innerText();await page.locator('.thought-reader .surface-close').click();await g.click();await page.getByTestId('ai-proposal-keep').click();await expect(g).toHaveAttribute('data-kind','thought');await expect.poll(async()=>(await saved(project.id)).thoughts[item.id]?.text).toBe(item.fullText);item.afterKeepCard=await g.locator('.thought-preview').innerText();}
  if(record.results.length){const download=page.waitForEvent('download');await command(page,'export');const file=path.join(out,record.index+'-'+record.case+'-'+record.arm+'-export.json');await(await download).saveAs(file);record.exportedProject=JSON.parse(fs.readFileSync(file,'utf8')).project;const restored=await restoreExport(page,file);record.recoveredProject=await saved(restored);for(const item of record.results){item.originalPreserved=record.exportedProject.thoughts[item.id]?.text===item.fullText&&record.recoveredProject.thoughts[item.id]?.text===item.fullText;if(!item.originalPreserved)throw new Error('Original export/recovery mismatch');item.afterRecoveryCard=await page.locator('[data-thought-id="'+item.id+'"] .thought-preview').innerText();if(item.afterRecoveryCard!==item.afterKeepCard)throw new Error('Card recovery mismatch');}}
  record.singleRequest=record.requests.length===1&&record.requests[0].done;if(!record.singleRequest)throw new Error('Uncertain request count');
 }catch(error){record.status='execution-failed';record.failure=String(error);}
 record.finishedAt=new Date().toISOString();write(record);results.push({index:record.index,case:record.case,arm:record.arm,status:record.status,requests:record.requests.length,outputs:record.results.length});console.log(JSON.stringify(results.at(-1)));if(record.status==='execution-failed')break;
}}finally{await Promise.all([...pending]);await page.unroute('https://api.deepseek.com/**',routeHandler);page.off('response',onResponse);page.off('requestfailed',onFailure);save('summary.json',{injected:values.injected,totalSent,blocked,routeFailure,fingerprints:Object.fromEntries(fingerprints),results,totalCap:totalSent*OUTPUT_CAP,productionDefaultsChanged:false});await browser.close();}
