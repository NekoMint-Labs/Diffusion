import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';
import { validateProject } from '../../src/core/validation.ts';

const version = process.argv[2] || 'candidate';
const port = Number(process.argv[3] || 9224);
const out = path.resolve('../../outputs/A-first-round-20261028/live-v3');
fs.mkdirSync(out, { recursive: true });
const common = '我想验证学生是否需要一个考前复习工具。每周只有两小时可以投入，不接触学生的私人作业、成绩或身份资料。目前还没有访谈或试用结果。';
const ask = '在这些条件下，先做什么？请给我一个方向。';
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = browser.contexts()[0].pages().find(p => p.url().startsWith('http://tauri.localhost'));
if (!page) throw new Error('The isolated native test app was not found');
page.setDefaultTimeout(15000);
const network = await page.context().newCDPSession(page);
await network.send('Network.enable');
let requests: any[] = [];
const networkRequests = new Map<string, any>();
network.on('Network.requestWillBeSent', event => {
    if (!event.request.url.endsWith('/native_ai_request') || event.request.method !== 'POST') return;
    let args: any = {}; try { args = JSON.parse(event.request.postData || '{}'); } catch {}
    const entry = {requestedModel:args.body?.model,started:new Date().toISOString(),done:false};
    requests.push(entry); networkRequests.set(event.requestId, entry);
});
network.on('Network.loadingFinished', async event => {
    const entry = networkRequests.get(event.requestId); if(!entry) return;
    try {
        const {body} = await network.send('Network.getResponseBody', {requestId:event.requestId});
        const answer=JSON.parse(body); entry.status=answer.status;
        if(answer.status===200) { const response=JSON.parse(answer.body); entry.actualModel=response.model ?? null;entry.usage=response.usage ?? null;
            entry.finishReasons=response.choices?.map((c:any)=>c.finish_reason);entry.responseContent=response.choices?.map((c:any)=>c.message?.content ?? null); }
    } catch {entry.observationError='IPC response metadata was unavailable';}
    finally {entry.done=true;entry.finished=new Date().toISOString();}
});
network.on('Network.loadingFailed', event => {const entry=networkRequests.get(event.requestId);if(entry){entry.done=true;entry.transportFailed=true;}});
await page.addInitScript(() => {
    localStorage.setItem('diffusion-settings', JSON.stringify({provider:'deepseek',model:'deepseek-v4-pro',thinkingDepth:'standard',locale:'en',theme:'light'}));
    localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({status:'complete'}));
    localStorage.setItem('diffusion-active-project', 'main');
});
for(const name of (process.argv[4]?.split(',') ?? ['ask','continue','angle','diffuse','correction','uncertainty'])) {
    const record: any={version,case:name,date:new Date().toISOString(),source:version==='candidate'?'86b072bba153526350d0c4f1d481d21ef727b65a':'5ab6b209924828127b10528044d05debc9dcceda',
        flags:version==='candidate'?'readingTrial=1&propositionTrial=1':'none',provider:'deepseek',requestedModel:'deepseek-v4-pro',thinkingDepth:'standard',
        harness:'Isolated native WebView, genuine provider transport, no response mocks, public synthetic Field fixtures; not a human usability study',results:[]};
    const file=path.join(out,`${version}-${name}.json`);
    try {
        await page.goto('http://tauri.localhost/'+(version==='candidate'?'?readingTrial=1&propositionTrial=1':''));
        await expect(page.getByTestId('field')).toBeVisible();
        const project=createProject('main','A public comparison'); project.createdAt=1;project.updatedAt=1;
        project.thoughts.question=makeThought(common,{x:300,y:200},1,'question');
        if(name==='correction'||name==='uncertainty') {
            const prior=name==='correction'?'我想验证学生是否需要一个作业辅助工具。每周只有四小时，不接触学生的私人作业、成绩或身份资料。目前还没有访谈或试用结果。':common;
            project.thoughts.prior=makeThought(prior,{x:300,y:40},1,'prior');
            const correction=name==='correction'?'更正：现在每周只有两小时，改为考前复习，不做作业辅助；不接触学生私人作业、成绩或身份资料的限制保持不变。':'我刚才只是设想，还没有确认学生存在这个问题。';
            project.inputs.correction={id:'correction',text:correction,createdAt:2};
            project.thoughts.question={...makeThought(correction,{x:300,y:200},2,'question'),derivedFrom:['prior'],generationAction:'continue',origin:{projectId:'main',thoughtId:'prior',inputId:'correction',ranges:[{inputId:'correction',start:0,end:correction.length}]}};
            record.correctionFixture='Synthetic persisted authored-response ancestry, not a recorded real-user session';
        }
        if(name==='diffuse') {
            project.camera={x:100,y:100,zoom:0.12};project.thoughts.question.x=2400;project.thoughts.question.y=2400;
            project.regions.audit={id:'audit',name:'Audit scope',members:['question'],x:1900,y:1900,activity:10};
            record.budget='Region entry configures 3 steps; explicitly stop after first surfaced candidate; record actual calls, not a claim of a one-step configuration';
        } else record.budget='One requested candidate; no search or Field sources';
        record.fixture=project;record.fixtureSha256=crypto.createHash('sha256').update(JSON.stringify(project)).digest('hex');
        validateProject(project);
        await page.evaluate(project=>new Promise<void>((resolve,reject)=>{const opening=indexedDB.open('diffusion-explorer-v1');opening.onerror=()=>reject(opening.error);opening.onsuccess=()=>{const db=opening.result;const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(project);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};}),project);
        await page.reload(); await expect(page.getByTestId('field')).toBeVisible();
        requests=[];
        if(name==='diffuse') {
            await page.locator('.region-label').filter({hasText:'Audit scope'}).click();
            await page.getByRole('button',{name:'Diffuse here...',exact:true}).click();
        } else {
            await page.locator('[data-thought-id="question"]').click();
            if(name==='ask') {
                await page.keyboard.press('Control+k'); await page.locator('#command-palette-input').fill('Ask your own question');
                await page.locator('[data-command="ask"]').click();
                const input=page.getByTestId('speak').locator('textarea');await input.fill(ask);record.explicitInput=ask;await input.press('Enter');
            } else {
                await page.getByTestId(name==='angle'?'scope-angle':'scope-continue').click();
                await page.getByRole('group',{name:'Result count',exact:true}).getByRole('button',{name:'1',exact:true}).click();
                await page.getByTestId('action-preview-run').click();
            }
        }
        // Preserve failures and empty results. No generation is retried.
        await expect.poll(()=>requests.length>0&&requests.every(r=>r.done),{timeout:75000}).toBe(true);
        if(name==='diffuse') {
            // Atlas represents pending results as anchors. Zoom for reading before counting cards.
            await page.mouse.move(600,450);await page.mouse.wheel(0,-2800);await page.waitForTimeout(200);
            const stop=page.locator('.diffuse-indicator').getByRole('button',{name:'Stop',exact:true});
            await Promise.race([page.locator('article.ghost').first().waitFor({timeout:5000}),page.waitForTimeout(5000)]).catch(()=>{});
            if(await stop.isVisible()) await stop.click();
        }
        await page.waitForTimeout(2000);
        const ghosts=page.locator('article.ghost'); const count=await ghosts.count();
        for(let i=0;i<count;i++) {
            const ghost=ghosts.nth(i);
            record.results.push({id:await ghost.getAttribute('data-thought-id'),fullText:(await ghost.getAttribute('aria-label'))?.replace(/^[^:]+:\s*/,''),cardText:await ghost.locator('.thought-preview').innerText(),focus:await ghost.getAttribute('data-reading-focus'),label:await ghost.locator('.reading-focus-card-label').allTextContents()});
        }
        record.notices=await page.locator('.notice,.operation-feedback,.diffuse-indicator').allTextContents();
        record.requests=requests;
        record.status=record.results.length?'observed-output':'empty-or-failed';
        fs.writeFileSync(file,JSON.stringify(record,null,2));
        await page.screenshot({path:path.join(out,`${version}-${name}.png`)});
        // Keep only this disposable fixture's generated results to check full-text persistence.
        for(const result of record.results) {
            const item=page.locator(`[data-thought-id="${result.id}"]`);await item.click();
            const keep=page.getByTestId('ai-proposal-keep');
            if(await keep.isVisible()) await keep.click(); else await page.keyboard.press('Enter');
            await expect(item).toHaveAttribute('data-kind','thought');
            result.afterKeepCard=await item.locator('.thought-preview').innerText();result.afterKeepFocus=await item.getAttribute('data-reading-focus');
        }
        await page.waitForTimeout(500);
        record.savedProject=await page.evaluate(()=>new Promise((resolve,reject)=>{const opening=indexedDB.open('diffusion-explorer-v1');opening.onsuccess=()=>{const db=opening.result;const req=db.transaction('projects').objectStore('projects').get('main');req.onsuccess=()=>{db.close();resolve(req.result);};req.onerror=()=>reject(req.error);};}));
        fs.writeFileSync(file,JSON.stringify(record,null,2));
    } catch(error) {
        record.status='execution-failed';record.failure=String(error).slice(0,1500);
        record.requests=requests;
        fs.writeFileSync(file,JSON.stringify(record,null,2));
    }
    console.log(JSON.stringify({version,case:name,status:record.status,requests:record.requests?.length,results:record.results.length,failure:record.failure}));
}
await browser.close();
