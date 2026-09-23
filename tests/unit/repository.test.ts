import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { DexieRepository } from '../../src/storage/dexie.ts';
import { demoProject } from '../../src/core/demo.ts';
import { userEvent } from '../../src/core/events.ts';
import { makeThought } from '../../src/core/model.ts';
let repository: DexieRepository;
beforeEach(() => { repository = new DexieRepository('diffusion-test-' + crypto.randomUUID()); });
afterEach(async () => { await repository.deleteDatabase(); repository.close(); });
describe('actual Dexie repository with fake IndexedDB', () => {
    it('saves and reloads canonical Thought state', async () => {
        const project = demoProject();
        await repository.saveProject(project);
        expect(await repository.loadProject('demo')).toEqual(project);
    });
    it('applies an event transaction and keeps trajectory semantic', async () => {
        await repository.saveProject(demoProject());
        await repository.applyEvent('demo', userEvent({ type: 'thought.edit', id: 'attention', text: 'A revised question' }));
        expect((await repository.getThought('demo', 'attention'))?.text).toBe('A revised question');
        expect((await repository.getTrajectory('demo', 'attention')).at(-1)?.kind).toBe('thought.edit');
    });
    it('preserves source bytes separately from canonical project JSON', async () => {
        await repository.saveOriginal('original-1', new Blob(['the exact original'], { type: 'text/plain' }));
        const original = await repository.getOriginal('original-1');
        expect(await original?.text()).toBe('the exact original');
    });
    it('finds Source excerpts, Region names and raw Threads', async () => {
        const p = demoProject();
        p.sources.s = { id: 's', title: 'Reference', mime: 'text/plain', status: 'ready', excerpt: 'distinct evidence', inspected: 'Full short text', provenance: {} };
        p.thoughts.ref = { ...makeThought('Reference', { x: 900, y: 700 }, 1, 'ref'), kind: 'source', sourceId: 's' };
        p.regions.r = { id: 'r', name: 'distinct neighborhood', x: 1, y: 2, members: ['attention', 'structure'], activity: 4 };
        p.threads.th = { id: 'th', title: 'A Thread', scopeIds: ['attention'], messages: [{ id: 'm', role: 'user', text: 'distinct question', at: 1 }], createdAt: 1 };
        await repository.saveProject(p);
        const hits = await repository.search('demo', 'distinct');
        expect(hits.map(h => h.kind).sort()).toEqual(['region', 'source', 'thread']);
    });
    it('lists separate worlds without silently merging them', async () => {
        const p = demoProject();
        await repository.saveProject(p);
        await repository.saveProject({ ...p, id: 'another', title: 'Another field', updatedAt: p.updatedAt + 1 });
        expect((await repository.listProjects()).map(w => w.id)).toEqual(['another', 'demo']);
    });
});
