import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { DexieRepository } from '../../src/storage/dexie.ts';
import { demoProject } from '../../src/core/demo.ts';
import { userEvent } from '../../src/core/events.ts';
import { makeThought } from '../../src/core/model.ts';
let repository: DexieRepository;
beforeEach(() => { repository = new DexieRepository('diffusion-test-' + crypto.randomUUID()); });
afterEach(async () => { await repository.deleteDatabase(); repository.close(); });
describe('actual Dexie repository with fake IndexedDB', () => {
    it('deletes a Field without changing its duplicate or shared original bytes', async () => {
        const project = demoProject();
        project.sources.shared = { id: 'shared', title: 'Reference', mime: 'text/plain', status: 'ready', excerpt: 'read', inspected: 'All', provenance: {}, originalKey: 'shared-bytes' };
        project.sources.private = { ...project.sources.shared, id: 'private', originalKey: 'private-bytes' };
        const copy = structuredClone({ ...project, id: 'copy' });
        delete copy.sources.private;
        await repository.saveProject(project);
        await repository.saveProject(copy);
        await repository.saveOriginal('shared-bytes', new Blob(['shared']));
        await repository.saveOriginal('private-bytes', new Blob(['private']));
        await repository.deleteProject(project.id);
        expect(await repository.loadProject(project.id)).toBeNull();
        expect(await repository.wasProjectDeleted(project.id)).toBe(true);
        expect(await repository.loadProject(copy.id)).toEqual(copy);
        expect(await (await repository.getOriginal('shared-bytes'))?.text()).toBe('shared');
        expect(await repository.getOriginal('private-bytes')).toBeUndefined();
        await repository.deleteProject(copy.id);
        expect(await repository.getOriginal('shared-bytes')).toBeUndefined();
    });
    it('rejects a late save from another repository connection after deletion and reopen', async () => {
        const name = 'diffusion-deletion-' + crypto.randomUUID();
        const first = new DexieRepository(name);
        let second = new DexieRepository(name);
        try {
            const project = demoProject();
            await first.saveProject(project);
            const stale = (await second.loadProject(project.id))!;
            await first.deleteProject(project.id);
            second.close(); second = new DexieRepository(name);
            await expect(second.saveProject(stale)).rejects.toThrow('deleted');
            expect(await second.loadProject(project.id)).toBeNull();
            expect(await second.listProjects()).toEqual([]);
        } finally { second.close(); await first.deleteDatabase(); first.close(); }
    });
    it('rolls back the Field, original bytes and deletion marker together on storage failure', async () => {
        const name = 'diffusion-delete-rollback-' + crypto.randomUUID();
        const isolated = new DexieRepository(name);
        const project = demoProject();
        project.sources.s = { id: 's', title: 'Reference', mime: 'text/plain', status: 'ready', excerpt: '', inspected: '', provenance: {}, originalKey: 'bytes' };
        try {
            await isolated.saveProject(project);
            await isolated.saveOriginal('bytes', new Blob(['original']));
            // Failure inside the actual deletion transaction, after projects.delete has run.
            const put = IDBObjectStore.prototype.put;
            const fault = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
                if (this.name === 'deletedProjects') throw new Error('Injected tombstone write failure');
                return key === undefined ? put.call(this, value) : put.call(this, value, key);
            });
            try { await expect(isolated.deleteProject(project.id)).rejects.toThrow(); }
            finally { fault.mockRestore(); }
            expect(await isolated.loadProject(project.id)).toEqual(project);
            expect(await isolated.wasProjectDeleted(project.id)).toBe(false);
            expect(await (await isolated.getOriginal('bytes'))?.text()).toBe('original');
        } finally { await isolated.deleteDatabase(); isolated.close(); }
    });
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
