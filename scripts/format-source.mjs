/** Readability formatting with the installed TypeScript printer.
 * A file is changed only when the normalized emitted JavaScript remains identical.
 * This is a source-format operation, not a dependency-backed application typecheck.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);let ts;
try{ts=require('typescript');}catch{ts=require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8',shell:process.platform==='win32'}).trim(),'typescript'));}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['node_modules','.git','dist','target','.tmp']);
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>ignored.has(entry.name)?[]:entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
const canonicalPrinter=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true});
function emitted(source,file){const js=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;return canonicalPrinter.printFile(ts.createSourceFile('comparison.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS));}
let formatted=0,skipped=0;
for(const file of walk(root).filter(name=>/\.tsx?$/.test(name)&&!name.endsWith('.d.ts'))){
 const before=fs.readFileSync(file,'utf8');const syntax=ts.createSourceFile(file,before,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const after=printer.printFile(syntax);
 if(emitted(before,file)!==emitted(after,file)){console.warn('Skipped: emitted JS would change: '+path.relative(root,file));skipped++;continue;}
 fs.writeFileSync(file,after);formatted++;
}
console.log(`Formatted ${formatted} files with emitted-JS equivalence; skipped ${skipped}.`);
