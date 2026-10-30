import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { validateBudgetResume } from './budget-resume.mjs';
import { budgetRequest, budgetSchedule, promptFingerprint, assertRequestLimit, TOTAL_OUTPUT_CAP } from './budget-policy.mjs';
const { values } = parseArgs({ strict: true, options: { out:{type:'string'},resume:{type:'string'},session:{type:'string'},port:{type:'string',default:'9239'},execute:{type:'boolean',default:false},injected:{type:'boolean',default:false} } });
if(!values.out)throw new Error('New output directory required');
if(!/^\d+$/.test(values.port)||Number(values.port)<1||Number(values.port)>65535)throw new Error('Invalid port');
if(values.execute&&!values.session)throw new Error('Execution needs a launcher receipt');
const out=path.resolve(values.out),origin='http://127.0.0.1:4191';
const toolSource=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const plan={toolSource,productSource:'5e4f979c5c210246577280ac91fd58d2631d8920',flags:'readingTrial=1&propositionTrial=1',origin,provider:'deepseek',model:'deepseek-v4-pro',injected:values.injected,maxRequests:8,aggregateOutputCap:TOTAL_OUTPUT_CAP,automaticRetries:0,schedule:budgetSchedule(),
 officialReferences:['https://api-docs.deepseek.com/guides/thinking_mode','https://api-docs.deepseek.com/api/create-chat-completion/'],scope:'Parameters modified only by experiment network route; production build and defaults unchanged. No model output is silently retried.'};
console.log(JSON.stringify(plan,null,2));
if(!values.execute)process.exit(0);
let inherited = null, resumeState = null;
if(values.resume){
 const previousDir=path.resolve(values.resume), read=name=>JSON.parse(fs.readFileSync(path.join(previousDir,name),'utf8'));
 const previousPlan=read('plan.json'), previousSummary=read('summary.json');
 const files=['plan.json','summary.json','loaded-build.json','build-manifest.json',...previousSummary.results.map(r=>r.scenario+'-'+r.arm+'.json')];
 const records=previousSummary.results.map(r=>read(r.scenario+'-'+r.arm+'.json'));
 resumeState=validateBudgetResume({plan:previousPlan,summary:previousSummary,records},plan);
 inherited={directory:previousDir,files:Object.fromEntries(files.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(previousDir,name))).digest('hex')])),sessionReceiptSha256:crypto.createHash('sha256').update(fs.readFileSync(values.session)).digest('hex'),consumedCap:resumeState.consumedCap,previousToolSource:previousPlan.toolSource};
}
fs.mkdirSync(out);if(inherited)fs.writeFileSync(path.join(out,'resume.json'),JSON.stringify(inherited,null,2)+'\n');fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify(plan,null,2)+'\n');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=await fetch(origin+'/comparison-source.json').then(r=>r.json());
if(manifest.source!==plan.productSource||manifest.flags!==plan.flags)throw new Error('Source or flags mismatch');
for(const[file,sha]of Object.entries(manifest.assets)){const bytes=await fetch(origin+'/'+file).then(r=>r.arrayBuffer());if(hash(Buffer.from(bytes))!==sha)throw new Error('Served bundle hash mismatch');}
fs.writeFileSync(path.join(out,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const {chromium,expect}=await import('@playwright/test');
const {fixtures}=await import('./fixtures.mjs');
const {createProject}=await import('../../src/core/model.ts');
const {openField,runScenario,command,restoreExport}=await import('./flow.mjs');
const session=JSON.parse(fs.readFileSync(values.session,'utf8'));
if(session.port!==Number(values.port)||!path.basename(session.profile).startsWith('b-model-comparison-20261029-'))throw new Error('Unexpected browser session');
if(values.injected&&!path.basename(session.profile).includes('-injected'))throw new Error('Injected verification requires its own fake-key profile');
const browser=await chromium.connectOverCDP('http://127.0.0.1:'+values.port);
const page=browser.contexts()[0].pages().find(p=>p.url().startsWith(origin+'/'));
if(!page)throw new Error('Dedicated candidate page missing');
const processScript='$taskListeners = @(Get-NetTCPConnection -LocalPort '+values.port+' -State Listen -ErrorAction Stop | Where-Object { $_.LocalAddress -eq "127.0.0.1" }); if ($taskListeners.Count -ne 1) { throw "Expected one browser listener" }; (Get-CimInstance Win32_Process -Filter ("ProcessId = " + $taskListeners[0].OwningProcess)).CommandLine';
const browserArgs=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',processScript],{encoding:'utf8',timeout:30000});
const match=/--user-data-dir=(?:"([^"\r\n]+)"|([^\s\r\n]+))/.exec(browserArgs),actualProfile=(match?.[1]??match?.[2]??'').replace(/"$/,'');
if(path.resolve(actualProfile).toLowerCase()!==path.resolve(session.profile).toLowerCase())throw new Error('Browser profile mismatch');
await page.bringToFront();
const url=new URL(page.url());for(const field of plan.flags.split('&')){const[k,v]=field.split('=');if(url.searchParams.get(k)!==v)throw new Error('Page flag mismatch');}
const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>new URL(n.src).pathname.slice(1)));if(!scripts.length||scripts.some(s=>!manifest.assets[s]))throw new Error('Loaded scripts mismatch');
const settings=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('diffusion-settings')||'{}');return{provider:s.provider,model:s.model,depth:s.thinkingDepth,locale:s.locale};});
if(settings.provider!=='deepseek'||settings.model!==plan.model||settings.depth!=='standard'||settings.locale!=='en')throw new Error('Unexpected configuration');
if(resumeState){
 const previousBuild=JSON.parse(fs.readFileSync(path.join(inherited.directory,'loaded-build.json'),'utf8'));
 const previousManifest=JSON.parse(fs.readFileSync(path.join(inherited.directory,'build-manifest.json'),'utf8'));
 if(JSON.stringify(previousManifest)!==JSON.stringify(manifest)||JSON.stringify(previousBuild.settings)!==JSON.stringify(settings)||JSON.stringify(previousBuild.scripts)!==JSON.stringify(scripts))throw new Error('Resume loaded build differs');
 await page.keyboard.press('Control+,');await page.locator('.settings-nav [data-section="ai"]').click();
}
if(!await page.locator('.settings-surface').isVisible())throw new Error('Leave AI settings open for saved-state verification');
await expect(page.getByTestId('provider-key')).toHaveAttribute('placeholder',/Stored/);
await page.locator('.settings-surface .surface-close').click();
fs.writeFileSync(path.join(out,'loaded-build.json'),JSON.stringify({source:plan.productSource,scripts,settings,profileVerified:true},null,2)+'\n');
const projects=fixtures().filter(p=>['comparison-ask','comparison-continue'].includes(p.id)).map(p=>({...p,id:p.id.replace('comparison-','comparison-budget-'),title:p.title.replace(' · ',' · budget-')}));
const hold=createProject('comparison-budget-hold','模型对照 · budget-hold',1);
async function store(project,replace=false){
 await page.evaluate(({project,replace})=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('diffusion-explorer-v1');open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{const db=open.result;const tx=db.transaction('projects','readwrite');const table=tx.objectStore('projects');const existing=table.get(project.id);
   existing.onsuccess=()=>{if(existing.result&&!replace){tx.abort();return;}table.put(project);};tx.oncomplete=()=>{db.close();resolve(true);};tx.onabort=()=>{db.close();reject(new Error('Experiment fixture already exists or transaction aborted'));};tx.onerror=()=>reject(tx.error);};
 }),{project,replace});
}
async function saved(id){return page.evaluate(id=>new Promise((resolve,reject)=>{const open=indexedDB.open('diffusion-explorer-v1');open.onsuccess=()=>{const db=open.result;const get=db.transaction('projects').objectStore('projects').get(id);get.onsuccess=()=>{db.close();resolve(get.result);};get.onerror=()=>reject(get.error);};}),id);}
if(!resumeState){await store(hold);for(const p of projects)await store(p);}
else {const existingHold=await saved(hold.id);if(JSON.stringify(existingHold)!==JSON.stringify(hold))throw new Error('Resume hold fixture changed');for(const p of projects)if(!await saved(p.id))throw new Error('Resume fixture missing');}
let active=null,totalSent=resumeState?.totalSent??0,blocked=0,routeFailure=null;const canonical=new Map(Object.entries(resumeState?.fingerprints??{})),requests=new Map(),pending=new Set(),results=[...(resumeState?.completed??[])];
const write=record=>fs.writeFileSync(path.join(out,record.scenario+'-'+record.arm.id+'.json'),JSON.stringify(record,null,2)+'\n');
const routeHandler=async route=>{
 const request=route.request();if(request.method()!=='POST')return route.continue();
 if(!active||new URL(request.url()).pathname!=='/chat/completions'){blocked++;routeFailure='Unexpected provider request blocked';return route.abort();}
 try{
  assertRequestLimit(totalSent,active.requests.length);const original=request.postDataJSON(),modified=budgetRequest(original,active.arm.id),fingerprint=promptFingerprint(modified);
  const before=canonical.get(active.scenario);if(before&&before!==fingerprint)throw new Error('Prompt differs beyond per-request trace and experimental parameters');canonical.set(active.scenario,fingerprint);
  const entry={startedAt:new Date().toISOString(),done:false,model:modified.model,maxTokens:modified.max_tokens,thinking:modified.thinking,reasoningEffort:modified.reasoning_effort??null};
  active.requests.push(entry);active.originalRequestBody=original;active.sentRequestBody=modified;active.promptFingerprint=fingerprint;requests.set(request,{entry,record:active});totalSent++;write(active);
  // No request header or credential is read. Browser sends its original authentication.
  if(values.injected){
   const input=JSON.parse(modified.messages.at(-1).content),type=input.intent.kind==='ask'?'respond_in_field':'surface_possibility';
   const text='在没有访谈或试用证据时，先用一组公开例题观察学生是否愿意再次使用。每周两小时只支持一次很小的验证，不接触私人作业、成绩或身份资料。观察应同时记录愿意和不愿意继续的具体原因，不能把展示完成认定为需求已经成立。'.repeat(2);
   const response={id:'injected-budget-verification',model:modified.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({intents:[{type,text,reading:{point:'先用公开例题观察学生是否愿意再用；尚不能认定需求已经成立。'}}]})}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2,completion_tokens_details:{reasoning_tokens:0}}};
   return route.fulfill({json:response});
  }
  return route.continue({postData:JSON.stringify(modified)});
 }catch(error){blocked++;routeFailure=String(error);return route.abort();}
};
const responseHandler=response=>{
 const found=requests.get(response.request());if(!found)return;
 const promise=(async()=>{try{const data=await response.json();found.entry.status=response.status();found.entry.actualModel=data.model??null;found.entry.usage=data.usage??null;found.entry.finishReasons=data.choices?.map(c=>c.finish_reason)??null;found.entry.responseContent=data.choices?.map(c=>c.message?.content??null)??null;}catch{found.entry.observationError='Response body unavailable';}finally{found.entry.done=true;found.entry.finishedAt=new Date().toISOString();write(found.record);}})();
 pending.add(promise);promise.finally(()=>pending.delete(promise));
};
const failureHandler=request=>{const found=requests.get(request);if(found){found.entry.done=true;found.entry.transportFailed=true;found.entry.finishedAt=new Date().toISOString();write(found.record);}};
await page.route('https://api.deepseek.com/**',routeHandler);page.on('response',responseHandler);page.on('requestfailed',failureHandler);
try{
 for(const {scenario,arm}of resumeState?.remaining??plan.schedule){
  const record={scenario,arm,productSource:plan.productSource,injected:values.injected,startedAt:new Date().toISOString(),requests:[],results:[]};active=record;write(record);
  try{
   await openField(page,hold.id);const fixture=projects.find(p=>p.id==='comparison-budget-'+scenario);await store(fixture,true);await openField(page,fixture.id);
   record.fixture=await saved(fixture.id);if(JSON.stringify(record.fixture)!==JSON.stringify(fixture))throw new Error('Fresh public fixture mismatch');
   record.runConfig=await runScenario(page,scenario,'deepseek',()=>record.requests.length);
   await expect.poll(()=>!!routeFailure||record.requests.length===1&&record.requests[0].done,{timeout:75000}).toBe(true);if(routeFailure)throw new Error(routeFailure);
   await expect.poll(async()=>page.locator('.speak-stop,.diffuse-indicator button').filter({hasText:/^Stop$/}).count(),{timeout:15000}).toBe(0);await Promise.all([...pending]);
   const ghosts=page.locator('article.ghost');for(let i=0;i<await ghosts.count();i++){const item=ghosts.nth(i);record.results.push({id:await item.getAttribute('data-thought-id'),fullText:(await item.getAttribute('aria-label')).replace(/^[^:]+:\s*/,''),cardText:await item.locator('.thought-preview').innerText(),focus:await item.getAttribute('data-reading-focus')});}
   record.notices=await page.locator('.notice,.operation-feedback').allTextContents();record.status=record.results.length?'observed-output':'empty-or-failed';write(record);
   for(const item of record.results){const ghost=page.locator('[data-thought-id="'+item.id+'"]');await ghost.click();await ghost.getByRole('button',{name:'Read original',exact:true}).click();await expect(page.getByTestId('reading-original')).toHaveText(item.fullText);item.readerText=await page.getByTestId('reading-original').innerText();await page.locator('.thought-reader .surface-close').click();await ghost.click();const keep=page.getByTestId('ai-proposal-keep');if(await keep.isVisible())await keep.click();else await page.keyboard.press('Enter');await expect(ghost).toHaveAttribute('data-kind','thought');item.afterKeepCard=await ghost.locator('.thought-preview').innerText();}
   if(record.results.length){const download=page.waitForEvent('download');await command(page,'export');const archive=path.join(out,scenario+'-'+arm.id+'-export.json');await(await download).saveAs(archive);record.exportedProject=JSON.parse(fs.readFileSync(archive,'utf8')).project;const restoredId=await restoreExport(page,archive);record.recoveredProject=await saved(restoredId);for(const item of record.results){item.originalPreserved=record.exportedProject.thoughts[item.id]?.text===item.fullText&&record.recoveredProject.thoughts[item.id]?.text===item.fullText;if(!item.originalPreserved)throw new Error('Original changed in export/recovery');item.afterRecoveryCard=await page.locator('[data-thought-id="'+item.id+'"] .thought-preview').innerText();if(item.afterRecoveryCard!==item.afterKeepCard)throw new Error('Recovery card differs from Keep');}}
   record.singleRequest=record.requests.length===1&&record.requests[0].done;if(!record.singleRequest)throw new Error('Unexpected request count');
  }catch(error){record.status='execution-failed';record.failure=String(error);}
  record.finishedAt=new Date().toISOString();write(record);results.push({scenario,arm:arm.id,status:record.status,requests:record.requests.length,outputs:record.results.length});console.log(JSON.stringify(results.at(-1)));if(record.status==='execution-failed')break;
 }
}finally{
 await page.unroute('https://api.deepseek.com/**',routeHandler);page.off('response',responseHandler);page.off('requestfailed',failureHandler);await Promise.all([...pending]);
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({injected:values.injected,totalSent,blocked,routeFailure,...(inherited?{inheritedFrom:inherited.directory,previousSent:resumeState.totalSent,previousCap:resumeState.consumedCap}:{}),promptFingerprints:Object.fromEntries(canonical),results,productionDefaultsChanged:false},null,2)+'\n');await browser.close();
}
