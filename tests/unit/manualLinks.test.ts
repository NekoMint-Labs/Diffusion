import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { manualLink } from '../../src/core/manualLinks.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { validateProject } from '../../src/core/validation.ts';
import { reduceProject } from '../../src/core/reducer.ts';
import { userEvent } from '../../src/core/events.ts';
import { DexieRepository } from '../../src/storage/dexie.ts';
import { linkPath, linkPoint } from '../../src/field/freeLinks/geometry.ts';
const fixture = () => { const p = createProject(); for (const key of ['a','b','c']) p.thoughts[key] = makeThought(key,{ x: 100, y: 100 },1,key); return p; };
describe('explicit manual associations', () => {
    it('supports multiple incoming links without changing provenance or organization', () => {
        let p=fixture(); const original=structuredClone(p.thoughts);
        for(const [a,b] of [['a','c'],['b','c'],['a','b']]) p=reduceProject(p,userEvent({type:'relation.confirm',relation:manualLink(p,a,b,{aPort:'left',bPort:'right'})}));
        expect(Object.keys(p.relations)).toHaveLength(3); expect(p.thoughts).toEqual(original); expect(validateProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    });
    it('rejects opposite creation and reconnection at helper and Core, leaving the project intact', () => {
        let p=fixture();const forward=manualLink(p,'a','b',{aPort:'left',bPort:'right'});
        p=reduceProject(p,userEvent({type:'relation.confirm',relation:forward}));
        const other=manualLink(p,'c','a',{aPort:'right',bPort:'left'});
        p=reduceProject(p,userEvent({type:'relation.confirm',relation:other}));const original=structuredClone(p);
        expect(()=>manualLink(p,'b','a',{aPort:'left',bPort:'left'})).toThrow('already have');
        expect(()=>manualLink(p,'b','a',{aPort:'right',bPort:'left'},other.id)).toThrow('already have');
        expect(()=>reduceProject(p,userEvent({type:'relation.confirm',relation:{...forward,id:'reverse',a:'b',b:'a'}}))).toThrow('already have');
        expect(()=>reduceProject(p,userEvent({type:'relation.confirm',relation:{...other,a:'b'}}))).toThrow('already have');
        expect(p).toEqual(original);
    });
    it('reconnects, deletes and undoes using one existing history entry per command', () => {
        const c=new ProjectController(fixture(),async()=>{}); const first=manualLink(c.getSnapshot().project,'a','c',{aPort:'left',bPort:'left'});
        c.dispatch({type:'relation.confirm',relation:first});
        c.dispatch({type:'relation.confirm',relation:manualLink(c.getSnapshot().project,'b','c',{aPort:'right',bPort:'left'},first.id)});
        expect(c.getSnapshot().project.relations[first.id].a).toBe('b');c.undo();expect(c.getSnapshot().project.relations[first.id]).toEqual(first);c.redo();expect(c.getSnapshot().project.relations[first.id].a).toBe('b');
        c.dispatch({type:'relation.remove',id:first.id});expect(c.getSnapshot().project.relations).toEqual({});c.undo();expect(c.getSnapshot().project.relations[first.id].a).toBe('b');
    });
    it('rejects self, missing, duplicate and malformed endpoints, and non-user mutations', () => {
        let p=fixture(); expect(()=>manualLink(p,'a','a',{aPort:'left',bPort:'right'})).toThrow();expect(()=>manualLink(p,'a','missing',{aPort:'left',bPort:'right'})).toThrow();
        const relation=manualLink(p,'a','b',{aPort:'left',bPort:'right'});p=reduceProject(p,userEvent({type:'relation.confirm',relation}));expect(()=>manualLink(p,'a','b',relation.manual!)).toThrow();
        for(const actor of ['ai','system'] as const) expect(()=>reduceProject(p,{type:'relation.confirm',relation,actor,at:1})).toThrow();
        const bad={...relation,manual:{aPort:'top',bPort:'left'}};expect(()=>reduceProject(p,userEvent({type:'relation.confirm',relation:bad as typeof relation}))).toThrow();
        expect(()=>validateProject({...p,relations:{[bad.id]:bad}})).toThrow();
    });
    it('preserves selected ports through actual Dexie close/reopen and portable validation', async () => {
        const name='free-links-'+crypto.randomUUID();let r=new DexieRepository(name);try{let p=fixture();p=reduceProject(p,userEvent({type:'relation.confirm',relation:manualLink(p,'a','b',{aPort:'left',bPort:'right'})}));await r.saveProject(p);r.close();r=new DexieRepository(name);expect(await r.loadProject(p.id)).toEqual(p);expect(validateProject(JSON.parse(JSON.stringify(p)))).toEqual(p);}finally{await r.deleteDatabase();r.close();}
    });
    it('routes from the selected side even when the other card is on the opposite side', () => {
        expect(linkPoint({x:50,y:60,width:200,height:100},'left')).toEqual({x:50,y:110});
        const path=linkPath({x:50,y:110},{x:600,y:110},{aPort:'left',bPort:'right'});expect(path).toMatch(/^M 50 110 C -5 110/);expect(path).toContain('L 655 10');expect(path).toMatch(/655 110, 600 110$/);
    });
});
