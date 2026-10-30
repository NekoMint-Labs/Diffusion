import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {chromium,expect} from '@playwright/test';
import {ORIGIN,FLAGS,PRODUCT_SOURCE,hash} from './deadline-policy.mjs';
const {values}=parseArgs({options:{profile:{type:'string'},receipt:{type:'string'},executable:{type:'string'},port:{type:'string',default:'9240'}}});
if(!values.profile||!values.receipt||!values.executable||fs.existsSync(values.profile)||!path.basename(values.profile).startsWith('b-deadline-20261030-'))throw new Error('Use a new dedicated profile/receipt');
const manifest=await fetch(ORIGIN+'/deadline-source.json').then(r=>r.json());if(manifest.source!==PRODUCT_SOURCE)throw new Error('Source mismatch');
for(const[file,sha]of Object.entries(manifest.assets)){if(hash(Buffer.from(await fetch(ORIGIN+'/'+file).then(r=>r.arrayBuffer())))!==sha)throw new Error('Asset mismatch');}
const context=await chromium.launchPersistentContext(values.profile,{headless:false,executablePath:values.executable,viewport:{width:1440,height:960},reducedMotion:'reduce',args:['--remote-debugging-port='+values.port,'--remote-debugging-address=127.0.0.1']});
const page=context.pages()[0];await page.goto(ORIGIN+'/?'+FLAGS);await expect(page.getByTestId('field')).toBeVisible();
await page.evaluate(()=>{localStorage.setItem('diffusion-settings',JSON.stringify({provider:'deepseek',model:'deepseek-v4-pro',thinkingDepth:'deep',locale:'en',theme:'light'}));localStorage.setItem('diffusion-first-field-tutorial-v1',JSON.stringify({status:'complete'}));});
await page.reload();await expect(page.getByTestId('field')).toBeVisible();await page.keyboard.press('Control+,');await page.locator('.settings-nav [data-section="ai"]').click();
await page.evaluate(()=>document.title='8次对照 · 只需在此保存 DeepSeek key');
fs.writeFileSync(values.receipt,JSON.stringify({profile:path.resolve(values.profile),port:Number(values.port),source:PRODUCT_SOURCE,manifestSha:hash(JSON.stringify(manifest)),createdAt:new Date().toISOString(),realRequests:0},null,2)+'\n',{flag:'wx'});
console.log('Dedicated one-tab browser ready; real model calls: 0');await new Promise(resolve=>context.on('close',resolve));
