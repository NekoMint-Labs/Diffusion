import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
const root=process.argv[2];if(!root||fs.existsSync(root))throw new Error('Use a new verification directory');fs.mkdirSync(root);
const context=await chromium.launchPersistentContext(path.join(root,'b-model-comparison-20261029-injected'),{headless:true,executablePath:process.env.COMPARISON_CHROMIUM,viewport:{width:1440,height:960},reducedMotion:'reduce',args:['--remote-debugging-port=9240','--remote-debugging-address=127.0.0.1']});
const page=await context.newPage();let requests=0;
await page.route('https://api.deepseek.com/**',async route=>{
 if(route.request().method()!=='POST')return route.fulfill({json:{data:[]}});
 requests++;const body=route.request().postDataJSON();
 const text='先观察学生是否愿意在考前再次使用一组公开例题。当前还没有访谈或试用证据，不能把完成展示认定为需求已经成立。每周两小时只足以支持一项很小的观察；记录对方为什么愿意或不愿意继续，比增加功能更能帮助判断下一步。'.repeat(2);
 await route.fulfill({json:{id:'public-injected-response',model:body.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({intents:[{type:'surface_possibility',text,reading:{point:'先观察学生是否愿意再用公开例题，尚不能把展示完成认定为需求成立。'}}]})}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}});
});
await page.goto('http://127.0.0.1:4191/?locale=en&readingTrial=1&propositionTrial=1');await expect(page.getByTestId('field')).toBeVisible();
await page.evaluate(projects=>new Promise((resolve,reject)=>{const open=indexedDB.open('diffusion-explorer-v1');open.onsuccess=()=>{const db=open.result;const tx=db.transaction('projects','readwrite');for(const p of projects)tx.objectStore('projects').put(p);tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>reject(tx.error);};}),fixtures());
await page.evaluate(()=>{localStorage.setItem('diffusion-settings',JSON.stringify({provider:'deepseek',model:'deepseek-v4-pro',thinkingDepth:'standard',locale:'en',theme:'light'}));localStorage.setItem('diffusion-first-field-tutorial-v1',JSON.stringify({status:'complete'}));localStorage.setItem('diffusion-active-project','comparison-ask');});
await page.reload();await expect(page.getByTestId('field')).toBeVisible();await page.keyboard.press('Control+,');await page.locator('.settings-nav [data-section="ai"]').click();
await page.getByTestId('provider-key').fill('public-injected-fixture-not-a-real-key');await page.getByTestId('provider-key-save').click();
fs.writeFileSync(path.join(root,'session.json'),JSON.stringify({profile:path.join(root,'b-model-comparison-20261029-injected'),port:9240}));
const args=['experiments/role-b-comparison/capture.mjs','--source','5e4f979c5c210246577280ac91fd58d2631d8920','--role','candidate','--flags','readingTrial=1&propositionTrial=1','--url','http://127.0.0.1:4191/','--out',path.join(root,'capture'),'--port','9240','--scenarios','angle,diffuse','--session',path.join(root,'session.json'),'--execute'];
const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
const code=await new Promise(resolve=>child.on('close',resolve));fs.writeFileSync(path.join(root,'driver.stdout.log'),stdout);fs.writeFileSync(path.join(root,'driver.stderr.log'),stderr);
try{
 if(code!==0)throw new Error('Capture failed: '+stderr);
 const summary=JSON.parse(fs.readFileSync(path.join(root,'capture/summary.json'),'utf8'));
 for(const r of summary.results){expect(r.status).toBe('observed-output');expect(r.requests).toBe(1);expect(r.singleStepVerified).toBe(true);const record=JSON.parse(fs.readFileSync(path.join(root,'capture',r.scenario,'result.json'),'utf8'));for(const item of record.results){expect(item.originalPreserved).toBe(true);expect(item.readerText).toBe(item.fullText);expect(item.afterRecoveryCard).toBe(item.afterKeepCard);}}
 expect(summary.results).toHaveLength(2);expect(requests).toBe(2);
 console.log(JSON.stringify({status:'PASS',requests,realProviderRequests:0,scope:'Injected network fixture; full capture/read/Keep/download/UI restore pipeline, not model-quality evidence'}));
}catch(error){console.log(stdout);throw error;}finally{await context.close();}
