import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseOptions, createRun, summarizeRequests } from './options.mjs';
const options = parseOptions(process.argv.slice(2));
const plan = { ...options, provider: 'deepseek', requestedModel: 'deepseek-v4-pro', depth: 'standard', expectedGenerationRequests: options.scenarios.length,
    scope: 'Browser production UI comparison; not native Windows acceptance', noAutoRetry: true, extraExtractionRequests: 0 };
console.log(JSON.stringify(plan,null,2));
if (!options.execute) process.exit(0);
createRun(options.output,plan);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest=await fetch(options.origin+'/comparison-source.json').then(r=>r.json());
if(manifest.source!==options.source||manifest.flags!==options.flags||manifest.role!==options.role)throw new Error('Served source/flags/role mismatch');
for(const [file,expected] of Object.entries(manifest.assets)){
    const actual=await fetch(options.origin+'/'+file).then(r=>{if(!r.ok)throw new Error('Missing served asset');return r.arrayBuffer();});
    if(sha(Buffer.from(actual))!==expected)throw new Error('Served asset hash mismatch: '+file);
}
fs.writeFileSync(path.join(options.output,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const { chromium, expect }=await import('@playwright/test');
const { runScenario, openField, command, restoreExport }=await import('./flow.mjs');
const { fixtures }=await import('./fixtures.mjs');
const browser=await chromium.connectOverCDP('http://127.0.0.1:'+options.port);
const context=browser.contexts()[0];
const page=context.pages().find(p=>new URL(p.url()).origin===options.origin);
if(!page)throw new Error('Configured isolated comparison page not found');
const session=JSON.parse(fs.readFileSync(options.session,'utf8'));
if(session.port!==options.port||!path.basename(session.profile).startsWith('b-model-comparison-20261029-'))throw new Error('Invalid comparison session receipt');
// Verify only the dedicated Chrome process metadata. Never inspect other process memory.
const script = "$taskListeners = @(Get-NetTCPConnection -LocalPort " + options.port + " -State Listen -ErrorAction Stop | Where-Object { $_.LocalAddress -eq \"127.0.0.1\" }); if ($taskListeners.Count -ne 1) { throw \"Expected one comparison listening process\" }; $taskBrowser = Get-CimInstance Win32_Process -Filter (\"ProcessId = \" + $taskListeners[0].OwningProcess); $taskBrowser.CommandLine";
const commandLine=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',timeout:30000});
const profileMatch=/--user-data-dir=(?:"([^"\r\n]+)"|([^\s\r\n]+))/.exec(commandLine);
const actualProfile=(profileMatch?.[1]??profileMatch?.[2]??'').replace(/"$/,'');
if(path.resolve(actualProfile).toLowerCase()!==path.resolve(session.profile).toLowerCase())throw new Error('Running browser profile differs from launcher receipt');
const params=new URL(page.url()).searchParams;
for(const entry of options.flags.split('&')){const [key,value]=entry.split('=');if(params.get(key)!==value)throw new Error('Loaded page flag mismatch');}
if(options.role==='baseline'&&params.has('propositionTrial'))throw new Error('Baseline must not enable propositions');
const loadedScripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>new URL(n.src).pathname.slice(1)));
if(!loadedScripts.length||loadedScripts.some(s=>!manifest.assets[s]))throw new Error('Loaded script does not match sealed build');
// Settings record is public configuration only; never inspect input values or the credential store.
const settings=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('diffusion-settings')||'{}');return {provider:s.provider,model:s.model,depth:s.thinkingDepth,locale:s.locale};});
if(settings.provider!==plan.provider||settings.model!==plan.requestedModel||settings.depth!==plan.depth||settings.locale!=='en')throw new Error('Comparison requires matched DeepSeek/model/depth and English control labels');
if(await page.locator('.settings-surface').isVisible()){
    await expect(page.getByTestId('provider-key')).toHaveAttribute('placeholder', /Stored/);
    await page.locator('.settings-surface .surface-close').click();
}else throw new Error('Leave configured AI settings open so stored-key presence can be checked without reading it');
fs.writeFileSync(path.join(options.output,'loaded-build.json'),JSON.stringify({source:options.source,loadedScripts,settings,isolatedBrowserProfileConfirmed:true,profile:path.basename(actualProfile)},null,2)+'\n');
let current=null;
const byRequest=new Map();
const pending=new Set();
const onRequest=request=>{
    if(request.method()!=='POST'||new URL(request.url()).hostname!=='api.deepseek.com')return;
    const body=request.postDataJSON();
    const entry={startedAt:new Date().toISOString(),requestedModel:body.model,maxTokens:body.max_tokens??null,done:false};
    // Headers and authentication are never read, copied or logged.
    if(current){current.requests.push(entry);byRequest.set(request,entry);}
};
const onResponse=response=>{
    const entry=byRequest.get(response.request());if(!entry)return;
    const promise=(async()=>{try{entry.status=response.status();const data=await response.json();entry.actualModel=data.model??null;entry.usage=data.usage??null;entry.finishReasons=data.choices?.map(c=>c.finish_reason)??null;entry.responseContent=data.choices?.map(c=>c.message?.content??null)??null;}catch{entry.observationError='Response metadata unavailable';}finally{entry.done=true;entry.finishedAt=new Date().toISOString();}})();
    pending.add(promise);promise.finally(()=>pending.delete(promise));
};
const onFailed=request=>{const entry=byRequest.get(request);if(entry){entry.done=true;entry.transportFailed=true;entry.finishedAt=new Date().toISOString();}};
page.on('request',onRequest);page.on('response',onResponse);page.on('requestfailed',onFailed);
const results=[];
for(const name of options.scenarios){
    const record={scenario:name,source:options.source,flags:options.flags,provider:plan.provider,requestedModel:plan.requestedModel,thinkingDepth:plan.depth,requests:[],results:[],startedAt:new Date().toISOString()};
    current=record;
    const folder=path.join(options.output,name);fs.mkdirSync(folder);
    const write=()=>fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify(record,null,2)+'\n');
    try{
        await openField(page,'comparison-'+name);
        record.fixture=await page.evaluate(id=>new Promise((resolve,reject)=>{const open=indexedDB.open('diffusion-explorer-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const get=db.transaction('projects').objectStore('projects').get(id);get.onsuccess=()=>{db.close();resolve(get.result);};get.onerror=()=>reject(get.error);};}),'comparison-'+name);
        record.fixtureSha256=sha(JSON.stringify(record.fixture));
        if(record.fixtureSha256!==sha(JSON.stringify(fixtures().find(p=>p.id==='comparison-'+name))))throw new Error('Fixture differs from sealed public input; do not reuse changed/prior runs');
        record.runConfig=await runScenario(page,name,plan.provider,()=>record.requests.length);
        await expect.poll(()=>record.requests.length>0&&record.requests.every(r=>r.done),{timeout:75000}).toBe(true);
        await expect.poll(async()=>page.locator('.speak-stop,.diffuse-indicator button').filter({hasText:/^Stop$/}).count(),{timeout:15000}).toBe(0);
        await Promise.all([...pending]);
        record.requestSummary=summarizeRequests(record.requests);write();
        const ghosts=page.locator('article.ghost');
        for(let i=0;i<await ghosts.count();i++){
            const ghost=ghosts.nth(i),id=await ghost.getAttribute('data-thought-id');
            record.results.push({id,fullText:(await ghost.getAttribute('aria-label')).replace(/^[^:]+:\s*/,''),cardText:await ghost.locator('.thought-preview').innerText(),focus:await ghost.getAttribute('data-reading-focus'),label:await ghost.locator('.reading-focus-card-label').allTextContents()});
        }
        record.notices=await page.locator('.notice,.operation-feedback,.diffuse-indicator').allTextContents();
        record.status=record.results.length?'observed-output':'empty-or-failed';write();
        await page.screenshot({path:path.join(folder,'before-keep.png')});
        for(const result of record.results){
            const item=page.locator('[data-thought-id="'+result.id+'"]');await item.click();
            await item.getByRole('button',{name:'Read original',exact:true}).click();
            await expect(page.getByTestId('reading-original')).toHaveText(result.fullText);
            result.readerText=await page.getByTestId('reading-original').innerText();
            await page.locator('.thought-reader .surface-close').click();
            await item.click();const keep=page.getByTestId('ai-proposal-keep');if(await keep.isVisible())await keep.click();else await page.keyboard.press('Enter');
            await expect(item).toHaveAttribute('data-kind','thought');
            result.afterKeepCard=await item.locator('.thought-preview').innerText();
        }
        if(record.results.length){
            const download=page.waitForEvent('download');await command(page,'export');
            const archive=path.join(folder,'export.json');await (await download).saveAs(archive);
            const exported=JSON.parse(fs.readFileSync(archive,'utf8'));
            for(const result of record.results)if(exported.project.thoughts[result.id]?.text!==result.fullText)throw new Error('Export changed complete original');
            const restoredId=await restoreExport(page,archive);
            record.recoveredProject=await page.evaluate(id=>new Promise((resolve,reject)=>{const open=indexedDB.open('diffusion-explorer-v1');open.onsuccess=()=>{const db=open.result;const get=db.transaction('projects').objectStore('projects').get(id);get.onsuccess=()=>{db.close();resolve(get.result);};get.onerror=()=>reject(get.error);};}),restoredId);
            for(const result of record.results){const item=page.locator('[data-thought-id="'+result.id+'"]');await expect(item).toBeVisible();result.afterRecoveryCard=await item.locator('.thought-preview').innerText();result.originalPreserved=exported.project.thoughts[result.id].text===result.fullText&&record.recoveredProject.thoughts[result.id]?.text===result.fullText;if(!result.originalPreserved)throw new Error('Recovery changed complete original');}
            await page.screenshot({path:path.join(folder,'after-recovery.png')});
        }
        const after=summarizeRequests(record.requests);record.requestSummary=after;
        record.singleStepVerified=after.singleRequest&&(['angle','diffuse'].includes(name)?record.runConfig.configuredSteps===1:true);
        if(!after.singleRequest)record.qualificationFailure='Observed request count/completion differs from the single-request comparison';
    }catch(error){record.status='execution-failed';record.failure=String(error).slice(0,1500);record.requestSummary=summarizeRequests(record.requests);}
    record.finishedAt=new Date().toISOString();write();results.push({scenario:name,status:record.status,requests:record.requests.length,results:record.results.length,singleStepVerified:record.singleStepVerified??false});
    console.log(JSON.stringify(results.at(-1)));
    // Preserve a failed attempt and stop: never retry to obtain a good output.
    if(record.status==='execution-failed'||record.qualificationFailure)break;
}
page.off('request',onRequest);page.off('response',onResponse);page.off('requestfailed',onFailed);
fs.writeFileSync(path.join(options.output,'summary.json'),JSON.stringify({source:options.source,results,observedRequests:results.reduce((n,r)=>n+r.requests,0),realQualityAcceptance:'pending independent reading',nativeWindowsAcceptance:false},null,2)+'\n');
await browser.close();
