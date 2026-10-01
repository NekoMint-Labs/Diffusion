import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { thoughtHierarchy } from '../../src/core/hierarchy.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { reduceProject } from '../../src/core/reducer.ts';
import { validateProject, parseProjectExport, recoveredProject } from '../../src/core/validation.ts';
import { migrateProjectV2, migrateProjectV3 } from '../../src/storage/migrations.ts';
import { DexieRepository } from '../../src/storage/dexie.ts';
import { exportProjectJSON } from '../../src/core/world.ts';

function branch() {
    const p = createProject('p', 'P', 1);
    for (const [i, id] of ['a', 'b', 'c', 'd', 'e'].entries()) p.thoughts[id] = makeThought(id.toUpperCase(), { x: i * 300, y: 200 }, 1, id);
    for (const [id, source] of [['b', 'a'], ['c', 'b'], ['d', 'c'], ['e', 'b']]) Object.assign(p.thoughts[id], { derivedFrom: [source], generationAction: 'continue' });
    return p;
}
describe('user organization and immutable generated sources', () => {
    it('reparents a branch without rewriting sources, words, geometry or descendants', () => {
        const p = branch(), controller = new ProjectController(p, async () => {});
        controller.dispatch({ type: 'thought.reparent', id: 'c', parentId: 'a' });
        const after = controller.getSnapshot().project;
        expect(after.thoughts.c).toMatchObject({ ...p.thoughts.c, organizingParentId: 'a', updatedAt: after.thoughts.c.updatedAt });
        expect(after.thoughts.d).toEqual(p.thoughts.d);
        expect(thoughtHierarchy(after.thoughts).depth.get('c')).toBe(1);
        expect(thoughtHierarchy(after.thoughts).depth.get('d')).toBe(2);
        controller.undo(); expect(controller.getSnapshot().project.thoughts.c).toEqual(p.thoughts.c);
        controller.redo(); expect(controller.getSnapshot().project.thoughts.c.organizingParentId).toBe('a');
        controller.dispatch({ type: 'thought.reparent', id: 'c', parentId: null });
        expect(thoughtHierarchy(controller.getSnapshot().project.thoughts).depth.get('d')).toBe(1);
        controller.dispatch({ type: 'thought.reparent', id: 'c' });
        expect(thoughtHierarchy(controller.getSnapshot().project.thoughts).depth.get('d')).toBe(3);
    });
    it('rejects AI/system changes, self, descendants and missing targets atomically', () => {
        const p = branch();
        for (const actor of ['ai', 'system'] as const) expect(() => reduceProject(p, { type: 'thought.reparent', id: 'c', parentId: 'a', actor, at: 2 })).toThrow();
        for (const parentId of ['b', 'c', 'd', 'missing']) expect(() => reduceProject(p, { type: 'thought.reparent', id: 'b', parentId, actor: 'user', at: 2 })).toThrow();
        expect(p.thoughts.b.organizingParentId).toBeUndefined();
    });
    it('prevents a source reset from creating a cycle after the parent moved below it', () => {
        const c = new ProjectController(branch(), async () => {});
        c.dispatch({ type: 'thought.reparent', id: 'c', parentId: null });
        c.dispatch({ type: 'thought.reparent', id: 'b', parentId: 'c' });
        expect(() => c.dispatch({ type: 'thought.reparent', id: 'c' })).toThrow('ancestor');
    });
    it('uses frozen source order, protects authored roots and projects malformed legacy trees safely', () => {
        const p = branch();
        p.thoughts.c.derivedFrom = ['e', 'a'];
        p.thoughts.a.organizingParentId = 'b'; // legacy cycle, not a permitted new action
        p.thoughts.d.organizingParentId = 'missing';
        const h = thoughtHierarchy(p.thoughts);
        expect(h.parent.get('c')).toBe('e');
        expect(p.thoughts.c.derivedFrom).toEqual(['e', 'a']);
        expect(h.originalRoots.has('a')).toBe(true);
        expect(h.parent.get('a')).toBeNull();
        expect(h.parent.get('d')).toBeNull();
        expect([...h.depth.values()].every(Number.isFinite)).toBe(true);
    });
    it('resolves Ghost scope and Crystal continuation without accepting a suggestion', () => {
        const p = branch(); p.thoughts.a.kind = 'crystal';
        const ghosts = { g: { id: 'g', text: 'Proposal', x: 0, y: 0, createdAt: 1, scopeIds: ['c', 'a'] } };
        const h = thoughtHierarchy({ ...p.thoughts, ...ghosts });
        expect(h.depth.get('g')).toBe(3);
        expect(p.thoughts.g).toBeUndefined();
        expect(h.parent.get('b')).toBe('a');
    });
    it('handles deletion of an organizing parent without moving the remaining branch', () => {
        const p = branch(); p.thoughts.d.organizingParentId = 'a';
        const c = new ProjectController(p, async () => {});
        c.dispatch({ type: 'thought.delete', ids: ['a'] });
        expect(c.getSnapshot().project.thoughts.d).toMatchObject({ ...p.thoughts.d, organizingParentId: null });
        c.undo(); expect(c.getSnapshot().project.thoughts.d.organizingParentId).toBe('a');
    });
    it('preserves optional organization across old imports, migration, JSON roundtrip and database reopen', async () => {
        const p = branch();
        expect(migrateProjectV3(migrateProjectV2(p)).thoughts.c.organizingParentId).toBeUndefined();
        p.thoughts.c.organizingParentId = 'a'; p.thoughts.e.organizingParentId = null;
        const imported = parseProjectExport(exportProjectJSON(migrateProjectV3(migrateProjectV2(p))));
        expect(recoveredProject(imported).thoughts.c.organizingParentId).toBe('a');
        const name = `hierarchy-${crypto.randomUUID()}`;
        let repository = new DexieRepository(name);
        try {
            await repository.saveProject(imported); repository.close(); repository = new DexieRepository(name);
            const reopened = await repository.loadProject('p');
            expect(reopened?.thoughts.c.organizingParentId).toBe('a');
            expect(reopened?.thoughts.e.organizingParentId).toBeNull();
            expect(reopened?.thoughts.c.derivedFrom).toEqual(['b']);
            expect(reopened?.schemaVersion).toBe(1);
            expect(() => validateProject({ ...p, thoughts: { ...p.thoughts, c: { ...p.thoughts.c, organizingParentId: 123 } } })).toThrow();
        } finally { await repository.deleteDatabase(); }
    });
    it('projects a deep imported chain without recursive stack growth', () => {
        const p = createProject();
        for (let i = 0; i < 10000; i++) p.thoughts[`n${i}`] = { ...makeThought('text', { x: 0, y: 0 }, 1, `n${i}`), organizingParentId: i ? `n${i - 1}` : null };
        expect(thoughtHierarchy(p.thoughts).depth.get('n9999')).toBe(9999);
    });
    it('restores default source organization even when the original source is reference material', () => {
        const p = branch(); p.thoughts.a.kind = 'source'; p.thoughts.b.organizingParentId = null;
        const c = new ProjectController(p, async () => {});
        c.dispatch({ type: 'thought.reparent', id: 'b' });
        expect(c.getSnapshot().project.thoughts.b.organizingParentId).toBeUndefined();
        expect(thoughtHierarchy(c.getSnapshot().project.thoughts).parent.get('b')).toBe('a');
        expect(c.getSnapshot().project.thoughts.b.derivedFrom).toEqual(['a']);
    });
});
