import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
const {values}=parseArgs({options:{profile:{type:'string'},receipt:{type:'string'},executable:{type:'string'},port:{type:'string',default:'9239'}}});
if(!values.profile||!values.receipt||!values.executable)throw new Error('profile/receipt/executable required');
if(fs.existsSync(values.profile))throw new Error('Use a new isolated browser profile; existing profiles are refused');
const versions=[{role:'candidate',origin:'http://127.0.0.1:4191',source:'5e4f979c5c210246577280ac91fd58d2631d8920',flags:'readingTrial=1&propositionTrial=1'},
{role:'baseline',origin:'http://127.0.0.1:4192',source:'79a484483e882c0b252b46c09391f7a3cd84f027',flags:'readingTrial=1'}];
for(const v of versions){const m=await fetch(v.origin+'/comparison-source.json').then(r=>r.json());if(m.source!==v.source||m.flags!==v.flags)throw new Error('Served source manifest mismatch');}
const context=await chromium.launchPersistentContext(values.profile,{headless:false,executablePath:values.executable,viewport:{width:1440,height:960},args:['--remote-debugging-port='+values.port,'--remote-debugging-address=127.0.0.1'],reducedMotion:'reduce'});
const projects=fixtures();
for(const v of versions){
 const page=await context.newPage();await page.goto(v.origin+'/?locale=en&'+v.flags);await expect(page.getByTestId('field')).toBeVisible();
 await page.evaluate(projects=>new Promise((resolve,reject)=>{const open=indexedDB.open('diffusion-explorer-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const tx=db.transaction('projects','readwrite');for(const p of projects)tx.objectStore('projects').put(p);tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>reject(tx.error);};}),projects);
 await page.evaluate(()=>{localStorage.setItem('diffusion-settings',JSON.stringify({provider:'deepseek',model:'deepseek-v4-pro',thinkingDepth:'standard',locale:'en',theme:'light'}));localStorage.setItem('diffusion-first-field-tutorial-v1',JSON.stringify({status:'complete'}));localStorage.setItem('diffusion-active-project','comparison-ask');});
 await page.reload();await expect(page.getByTestId('field')).toBeVisible();
 await page.keyboard.press('Control+,');await page.locator('.settings-nav [data-section="ai"]').click();
 await page.evaluate(role=>{document.title=role==='candidate'?'候选版 5e4f979 · DeepSeek 对照配置':'基线版 79a4844 · DeepSeek 对照配置';},v.role);
}
const receipt={createdAt:new Date().toISOString(),profile:path.resolve(values.profile),port:Number(values.port),versions,publicFixtures:true,realRequests:0,note:'Keys must be entered by user in each existing AI settings UI; no key read/copy, no provider test or generation executed.'};
fs.writeFileSync(values.receipt,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt));
await new Promise(resolve=>context.on('close',resolve));
