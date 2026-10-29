import fs from 'node:fs';
import path from 'node:path';
import {spawn}from'node:child_process';
import {chromium,expect}from'@playwright/test';
const root=process.argv[2];if(!root||fs.existsSync(root))throw new Error('Use a new verification directory');fs.mkdirSync(root);
const profile=path.join(root,'b-model-comparison-20261029-budget-injected');
const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.COMPARISON_CHROMIUM,viewport:{width:1440,height:960},reducedMotion:'reduce',args:['--remote-debugging-port=9241','--remote-debugging-address=127.0.0.1']});
const page=await context.newPage();let leaked=0;
// The driver must intercept and fulfill every POST in injected mode. Any leak is blocked.
await context.route('https://api.deepseek.com/**',route=>{leaked++;return route.abort();});
await page.goto('http://127.0.0.1:4191/?locale=en&readingTrial=1&propositionTrial=1');await expect(page.getByTestId('field')).toBeVisible();
await page.evaluate(()=>{localStorage.setItem('diffusion-settings',JSON.stringify({provider:'deepseek',model:'deepseek-v4-pro',thinkingDepth:'standard',locale:'en',theme:'light'}));localStorage.setItem('diffusion-first-field-tutorial-v1',JSON.stringify({status:'complete'}));});
await page.reload();await expect(page.getByTestId('field')).toBeVisible();await page.keyboard.press('Control+,');await page.locator('.settings-nav [data-section="ai"]').click();await page.getByTestId('provider-key').fill('public-budget-fixture-not-a-real-key');await page.getByTestId('provider-key-save').click();
const receipt=path.join(root,'session.json');fs.writeFileSync(receipt,JSON.stringify({profile,port:9241}));
const child=spawn(process.execPath,['experiments/role-b-comparison/budget-run.mjs','--out',path.join(root,'run'),'--session',receipt,'--port','9241','--execute','--injected'],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const code=await new Promise(resolve=>child.on('close',resolve));fs.writeFileSync(path.join(root,'stdout.log'),stdout);fs.writeFileSync(path.join(root,'stderr.log'),stderr);
try{
 if(code!==0)throw new Error('Verification driver failed: '+stderr);
 const summary=JSON.parse(fs.readFileSync(path.join(root,'run/summary.json'),'utf8'));
 expect(summary.injected).toBe(true);expect(summary.totalSent).toBe(8);expect(summary.blocked).toBe(0);expect(summary.results).toHaveLength(8);expect(Object.keys(summary.promptFingerprints)).toHaveLength(2);expect(leaked).toBe(0);
 for(const result of summary.results){expect(result.status).toBe('observed-output');expect(result.requests).toBe(1);const record=JSON.parse(fs.readFileSync(path.join(root,'run',result.scenario+'-'+result.arm+'.json'),'utf8'));for(const item of record.results){expect(item.originalPreserved).toBe(true);expect(item.fullText).toBe(item.readerText);expect(item.afterRecoveryCard).toBe(item.afterKeepCard);}}
 const checkpoint=path.join(root,'checkpoint');fs.mkdirSync(checkpoint);
 for(const file of ['plan.json','loaded-build.json','build-manifest.json','ask-high-1600.json'])fs.copyFileSync(path.join(root,'run',file),path.join(checkpoint,file));
 const failure=JSON.parse(fs.readFileSync(path.join(root,'run','ask-high-4000.json'),'utf8'));failure.requests=[];failure.results=[];failure.status='execution-failed';failure.failure='Injected zero-request interruption for continuation verification';delete failure.singleRequest;
 fs.writeFileSync(path.join(checkpoint,'ask-high-4000.json'),JSON.stringify(failure,null,2));
 fs.writeFileSync(path.join(checkpoint,'summary.json'),JSON.stringify({...summary,totalSent:1,results:[summary.results[0],{scenario:'ask',arm:'high-4000',status:'execution-failed',requests:0,outputs:0}],promptFingerprints:{ask:summary.promptFingerprints.ask}},null,2));
 const resumed=spawn(process.execPath,['experiments/role-b-comparison/budget-run.mjs','--out',path.join(root,'continued'),'--resume',checkpoint,'--session',receipt,'--port','9241','--execute','--injected'],{stdio:['ignore','pipe','pipe']});let continuedOut='',continuedErr='';resumed.stdout.on('data',b=>continuedOut+=b);resumed.stderr.on('data',b=>continuedErr+=b);const resumedCode=await new Promise(resolve=>resumed.on('close',resolve));fs.writeFileSync(path.join(root,'continued-stdout.log'),continuedOut);fs.writeFileSync(path.join(root,'continued-stderr.log'),continuedErr);expect(resumedCode).toBe(0);
 const continued=JSON.parse(fs.readFileSync(path.join(root,'continued/summary.json'),'utf8'));expect(continued.totalSent).toBe(8);expect(continued.previousSent).toBe(1);expect(continued.previousCap).toBe(1600);expect(continued.results).toHaveLength(8);expect(continued.results.every(r=>r.status==='observed-output')).toBe(true);expect(fs.existsSync(path.join(root,'continued/ask-high-1600.json'))).toBe(false);expect(leaked).toBe(0);
 console.log(JSON.stringify({status:'PASS',continuationArms:7,spentFirstArmSkipped:true,injectedArms:8,realProviderRequests:0,promptGroups:2,exportAndNewProjectRecovery:true}));
}catch(error){console.log(stdout);throw error;}finally{await context.close();}
