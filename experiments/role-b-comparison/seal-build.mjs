import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
const {values}=parseArgs({options:{root:{type:'string'},source:{type:'string'},role:{type:'string'},flags:{type:'string'}}});
const root=path.resolve(values.root);
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git(['rev-parse','HEAD'])!==values.source)throw new Error('Build checkout SHA mismatch');
if(!['baseline','candidate'].includes(values.role))throw new Error('Invalid role');
const productPaths=['src','public','index.html','package.json','pnpm-lock.yaml','vite.config.ts','tsconfig.json'];
if(git(['status','--porcelain','--',...productPaths]))throw new Error('Product source tree is dirty');
const files=['index.html',...fs.readdirSync(path.join(root,'dist/assets')).map(n=>'assets/'+n)].sort();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest={source:values.source,tree:git(['rev-parse','HEAD^{tree}']),role:values.role,flags:values.flags,
 sealedAt:new Date().toISOString(),scope:'Browser production bundle; source matches recorded checkout, not a native installer',
 assets:Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,'dist',file)))]))};
fs.writeFileSync(path.join(root,'dist/comparison-source.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
