import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);let ts;
try {ts=require('typescript');}catch{ts=require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8',shell:process.platform==='win32'}).trim(),'typescript'));}
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));let count=0;const errors=[];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>['node_modules','.git','dist','target'].includes(e.name)?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const f of walk(root)){
 if(/\.json$/.test(f)){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){errors.push(f+': '+e.message);}}
 if(!/\.tsx?$/.test(f)||f.endsWith('.d.ts'))continue;
 const text=fs.readFileSync(f,'utf8');count++;
 const result=ts.transpileModule(text,{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true}});
 for(const d of result.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)errors.push(f+': '+ts.flattenDiagnosticMessageText(d.messageText,' '));
 for(const m of text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)){
  const base=path.resolve(path.dirname(f),m[2]);if(!['','.ts','.tsx','.css','/index.ts','/index.tsx'].some(e=>fs.existsSync(base+e))) errors.push('Unresolved local import: '+f+' -> '+m[2]);
 }
 if(f.includes('/src/core/')&&/from ['"](?:react|zustand|dexie|motion)/.test(text))errors.push('Core depends on renderer: '+f);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`PASS: ${count} TS/TSX files syntax-transpiled, JSON valid, local imports resolve. This is NOT dependency-backed application typechecking.`);
