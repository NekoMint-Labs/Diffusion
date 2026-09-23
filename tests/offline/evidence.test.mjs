import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBytes,EXCERPT_LIMIT } from '../../src/evidence/extract.ts';
import { SourceImporter } from '../../src/evidence/importer.ts';
import { safeWebURL } from '../../src/platform/contracts.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject } from '../../src/core/model.ts';
import { searchProject } from '../../src/storage/repository.ts';
import { loadConfig,boundedJSON } from '../../server/config.ts';
const bytes=text=>new TextEncoder().encode(text).buffer;
test('small UTF-8 text is ready; long text is honestly limited',()=>{
 const ready=extractBytes({name:'note.md',mime:'',size:5,bytes:bytes('hello')});assert.equal(ready.status,'ready');assert.equal(ready.excerpt,'hello');
 const limited=extractBytes({name:'notes.txt',mime:'text/plain',size:9000,bytes:bytes('x'.repeat(9000))});assert.equal(limited.status,'limited');assert.equal(limited.excerpt.length,EXCERPT_LIMIT);assert.match(limited.inspected,/remainder/);
});
test('PDF, images, and unknown types remain metadata-only',()=>{
 for(const[name,mime]of[['paper.pdf','application/pdf'],['photo.png','image/png'],['model.glb','']]){const result=extractBytes({name,mime,size:200,bytes:bytes('not real content')});assert.equal(result.status,'limited');assert.equal(result.excerpt,'');assert.match(result.inspected,/No PDF/);}
});
test('binary or invalid UTF-8 is not fabricated text',()=>{
 assert.equal(extractBytes({name:'x.txt',mime:'',size:2,bytes:new Uint8Array([255,255]).buffer}).status,'limited');assert.equal(extractBytes({name:'x.txt',mime:'',size:3,bytes:bytes('a\0b')}).excerpt,'');
});
test('unsafe external schemes and embedded credentials are rejected',()=>{
 for(const url of ['javascript:alert(1)','file:///etc/passwd','data:text/html,x','https://user:pass@example.com'])assert.throws(()=>safeWebURL(url));assert.equal(safeWebURL('https://example.com'),'https://example.com/');
});
test('source import preserves original bytes, then commits inspected content',async()=>{
 const c=new ProjectController(createProject(),async()=>{});const originals=new Map();const repository={saveOriginal:async(k,b)=>originals.set(k,b)};const parser={parse:async()=>({status:'ready',excerpt:'quiet attention',inspected:'Entire UTF-8 text.'})};const importer=new SourceImporter(c,repository,parser,()=>{});
 await importer.files([{name:'note.txt',type:'text/plain',size:15,blob:new Blob(['quiet attention'])}],{x:10,y:20});await c.flush();const source=Object.values(c.getSnapshot().project.sources)[0];assert.equal(source.status,'ready');assert.equal(originals.size,1);assert.equal(await originals.get(source.originalKey).text(),'quiet attention');assert.equal(searchProject(c.getSnapshot().project,'quiet')[0].kind,'source');
});
test('an undone pending import does not resurrect itself on extraction completion',async()=>{
 const c=new ProjectController(createProject(),async()=>{});let finish;const parser={parse:()=>new Promise(resolve=>{finish=resolve;})};const importer=new SourceImporter(c,{saveOriginal:async()=>{}},parser,()=>{});const pending=importer.files([{name:'note.txt',type:'text/plain',size:1}],{x:0,y:0});c.undo();finish({status:'ready',excerpt:'x',inspected:'One character.'});await pending;assert.equal(Object.keys(c.getSnapshot().project.sources).length,0);assert.equal(Object.keys(c.getSnapshot().project.thoughts).length,0);
});
test('dropped URLs do not perform automatic fetches',()=>{
 const c=new ProjectController(createProject(),async()=>{});const importer=new SourceImporter(c,{}, {parse:async()=>{throw Error('not expected');}},()=>{});const source=importer.link('https://example.com/paper',{x:1,y:2});assert.equal(source.excerpt,'');assert.equal(source.status,'limited');assert.match(source.inspected,/has not been fetched/);
});
test('public gateway binding requires a token and remote providers require HTTPS',()=>{
 assert.equal(loadConfig({}).host,'127.0.0.1');assert.throws(()=>loadConfig({HOST:'0.0.0.0'}));assert.throws(()=>loadConfig({AI_BASE_URL:'http://remote.example/v1'}));assert.throws(()=>loadConfig({ALLOWED_ORIGIN:'*'}));assert.equal(loadConfig({HOST:'0.0.0.0',GATEWAY_TOKEN:'x'.repeat(24)}).token.length,24);
});
test('upstream response streaming enforces actual bytes, not just Content-Length',async()=>{
 assert.deepEqual(await boundedJSON(new Response('{"ok":true}')),{ok:true});await assert.rejects(()=>boundedJSON(new Response('x'.repeat(100)),50),/byte budget/);await assert.rejects(()=>boundedJSON(new Response('oops',{status:500})),/500/);
});
