/** Compile only the actual dependency-independent camera and geometry for a browser regression harness. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);let ts;
try{ts=require('typescript');}catch{ts=require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8',shell:process.platform==='win32'}).trim(),'typescript'));}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]||path.join(root,'.tmp','primitives'));
fs.mkdirSync(output,{recursive:true});
for(const relative of ['field/camera/controller.ts','field/spatial/geometry.ts','field/spatial/index.ts','field/spatial/representation.ts']){
 const source=fs.readFileSync(path.join(root,'src',relative),'utf8');
 const emitted=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,isolatedModules:true}}).outputText.replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1.js$2');
 const destination=path.join(output,'modules',relative.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,emitted);
}
fs.mkdirSync(path.join(output,'css'),{recursive:true});for(const name of ['theme.css','field.css'])fs.copyFileSync(path.join(root,'src','ui',name),path.join(output,'css',name));
fs.copyFileSync(path.join(root,'tests','primitives','harness.html'),path.join(output,'index.html'));
console.log(output);
execFileSync(process.execPath,['--experimental-strip-types',path.join(root,'scripts','export-qa-fixtures.mjs'),path.join(output,'fixtures.json')],{stdio:'inherit'});
