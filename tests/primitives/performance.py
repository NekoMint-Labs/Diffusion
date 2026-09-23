"""Measured DOM/culling primitive scenario, explicitly not whole React application FPS."""
from __future__ import annotations
import argparse
import json
import os
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('directory')
parser.add_argument('--report',required=True)
args=parser.parse_args()
directory=Path(args.directory)
css=(directory/'css'/'field.css').read_text()+'\n'+re.sub(r'@import[^;]+;','',(directory/'css'/'theme.css').read_text())
modules='\n'.join((directory/'modules'/'field'/relative).read_text() for relative in ['spatial/geometry.js','spatial/index.js','spatial/representation.js','camera/controller.js'])
modules=re.sub(r'^import[^;]+;\s*','',modules,flags=re.MULTILINE)
modules=re.sub(r'\bexport\s+','',modules)
html=f'<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><style>{css}</style></head><body><main class="app"><div class="field" data-level="local"><div class="world"></div></div></main><script>{modules}\nwindow.mechanics={{GeometryCache,CameraController,viewportBounds,readableLabels}};</script></body></html>'
fixtures=json.loads((directory/'fixtures.json').read_text())['performance']
rows=[]
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':960})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.wait_for_function('!!window.mechanics')
 for project in fixtures:
  data=page.evaluate('''async project => {
   const {GeometryCache,CameraController,viewportBounds,readableLabels}=window.mechanics;
   const cache=new GeometryCache(),world=document.querySelector('.world'),field=document.querySelector('.field');
   for(const thought of Object.values(project.thoughts))cache.setPosition(thought.id,thought.x,thought.y);
   let commits=0,painted=0;
   const controller=new CameraController(world,{x:0,y:0,zoom:1},()=>commits++,()=>painted++);
   const measurements=[];let maximum=0;
   function render(camera,level='local'){
    const started=performance.now();field.dataset.level=level;
    let ids=cache.index.query(viewportBounds(camera,1440,960));
    if(level==='atlas')ids=ids.filter(id=>project.thoughts[id].kind==='crystal');
    if(level!=='local')ids=readableLabels(ids.map(id=>({...project.thoughts[id],priority:project.thoughts[id].kind==='crystal'?2:0})),camera,{width:1440,height:960},64);
    ids=ids.slice(0,level==='local'?240:64);if(level==='local')maximum=Math.max(maximum,ids.length);
    const fragment=document.createDocumentFragment();
    for(const id of ids){const thought=project.thoughts[id],element=document.createElement('article'),text=document.createElement('p');element.className='thought '+thought.kind;element.dataset.kind=thought.kind;element.style.transform=`translate(${thought.x}px,${thought.y}px)`;text.textContent=level==='local'?thought.text:thought.text.slice(0,42);element.append(text);fragment.append(element);}
    world.replaceChildren(fragment);
    // Include a forced layout in these construction samples, rather than timing only JS.
    for(const element of world.children)element.getBoundingClientRect();
    measurements.push(performance.now()-started);return ids.length;
   }
   render(controller.get());
   const intervals=[];let previous=0;
   for(let frame=0;frame<120;frame++){
    const stamp=await new Promise(requestAnimationFrame);if(previous)intervals.push(stamp-previous);previous=stamp;
    controller.pan(frame%60<30?2:-2,0);if(frame%6===0)render(controller.get());
   }
   await new Promise(requestAnimationFrame);
   const canonicalCommitsDuringPan=commits;controller.commit();
   controller.set({x:0,y:0,zoom:.15});await new Promise(requestAnimationFrame);const atlasNodes=render(controller.get(),'atlas');
   const atlasFont=world.firstElementChild?parseFloat(getComputedStyle(world.firstElementChild).fontSize)*.15:null;
   controller.destroy();
   function stats(values){const sorted=[...values].sort((a,b)=>a-b);return{meanMs:+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(3),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(3),samples:values.length};}
   return{thoughts:Object.keys(project.thoughts).length,maximumLocalDOMNodes:maximum,atlasNodes,atlasScreenFontPx:atlasFont,constructionAndLayout:stats(measurements),primitiveRAFIntervals:stats(intervals),intervalsOver33ms:intervals.filter(x=>x>33).length,canonicalCommitsDuringPan,finalGestureCommits:commits,worldPaints:painted};
  }''',project)
  assert data['maximumLocalDOMNodes']<=240 and data['atlasNodes']<=64
  assert data['canonicalCommitsDuringPan']==0 and data['finalGestureCommits']==1
  if data['atlasScreenFontPx'] is not None: assert abs(data['atlasScreenFontPx']-18)<.1
  if data['thoughts']>=500:assert data['maximumLocalDOMNodes']<data['thoughts']
  rows.append(data)
 assert not errors,errors
 browser.close()
report={'scope':'Actual source GridIndex/GeometryCache/CameraController/semantic disclosure and product CSS, driven by an authored DOM harness. NOT React application FPS, real-user performance, provider latency, or IndexedDB latency. DOM nodes are reconstructed at sampled culling boundaries; this is not React reconciliation.','viewport':{'width':1440,'height':960},'browser':'Chromium headless in this container','rows':rows,'result':'PASS'}
Path(args.report).parent.mkdir(parents=True,exist_ok=True)
Path(args.report).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
