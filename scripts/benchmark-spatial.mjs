/** Algorithm measurement only. This does not measure React rendering, DOM frames or laptop FPS. */
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { GridIndex } from '../src/field/spatial/index.ts';
import { performanceProject } from '../src/core/demo.ts';
import { viewportBounds } from '../src/field/spatial/geometry.ts';
const rows=[];
for(const count of [100,500,2000,5000]){
 const project=performanceProject(count);const index=new GridIndex();const start=performance.now();
 for(const t of Object.values(project.thoughts))index.set(t.id,{x:t.x,y:t.y,width:280,height:120});
 const buildMs=performance.now()-start;const samples=[];let maximum=0;
 for(let iteration=0;iteration<1200;iteration++){
  const x=(iteration%8)*190;const y=(iteration%4)*60;const bounds=viewportBounds({x:-x,y:-y,zoom:1},1440,960);const begin=performance.now();const visible=index.query(bounds);const elapsed=performance.now()-begin;if(iteration>=200)samples.push(elapsed);maximum=Math.max(maximum,visible.length);
 }
 if(maximum>=count&&count>=500)throw new Error('Local viewport query failed to cull the project');
 samples.sort((a,b)=>a-b);rows.push({totalThoughts:count,indexBuildMs:Number(buildMs.toFixed(3)),localQueryMeanMs:Number((samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(4)),localQueryP95Ms:Number(samples[Math.floor(samples.length*.95)].toFixed(4)),maximumLocalCandidates:maximum,samples:samples.length});
}
const result={scope:'Spatial-index algorithm only; not application FPS, browser render time or end-to-end interaction latency.',node:process.version,rows};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
