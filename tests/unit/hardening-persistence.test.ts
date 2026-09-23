import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect } from 'vitest';
import { DexieRepository } from '../../src/storage/dexie.ts';
import { migrateProjectV2 } from '../../src/storage/migrations.ts';
import { demoProject } from '../../src/core/demo.ts';
import { ProjectController } from '../../src/core/controller.ts';

describe('v0.2.1 persistence verification without schema redesign', () => {
    it('migrates a legacy Field, edits, saves, closes, reopens and preserves original bytes/frozen scope', async () => {
        const name = 'diffusion-v021-' + crypto.randomUUID();
        const legacy = new Dexie(name);
        legacy.version(1).stores({ projects: 'id,updatedAt', originals: 'key' });
        const before = demoProject();
        before.threads.frozen = { id: 'frozen', title: 'A prior question', scopeIds: ['attention'], messages: [], createdAt: 1 };
        await legacy.table('projects').put(before);
        await legacy.table('originals').put({ key: 'original', data: new Blob(['exact original bytes']) });
        legacy.close();
        let repository = new DexieRepository(name);
        try {
            const migrated = (await repository.loadProject(before.id))!;
            expect(migrateProjectV2(migrated)).toEqual(migrated);
            const controller = new ProjectController(migrated, project => repository.saveProject(project));
            controller.dispatch({ type: 'thought.edit', id: 'attention', text: 'Edited after migration' });
            await controller.flush(); expect(controller.getSnapshot().dirty).toBe(false);
            repository.close(); repository = new DexieRepository(name);
            const reopened = (await repository.loadProject(before.id))!;
            expect(reopened.thoughts.attention.text).toBe('Edited after migration');
            expect(reopened.thoughts.attention.x).toBe(before.thoughts.attention.x);
            expect(reopened.camera).toEqual(before.camera);
            expect(reopened.threads.frozen.scopeSnapshot?.attention.text).toBe(before.thoughts.attention.text);
            expect(await (await repository.getOriginal('original'))?.text()).toBe('exact original bytes');
            expect(migrateProjectV2(migrateProjectV2(reopened))).toEqual(reopened);
            expect(await repository.loadProject(before.id)).toEqual(reopened);
        } finally { repository.close(); await Dexie.delete(name); }
    });
    it('a failed write leaves the durable Field intact; retry saves the latest queued state', async () => {
        const name = 'diffusion-v021-queue-' + crypto.randomUUID();
        let repository = new DexieRepository(name);
        try {
            const original = demoProject(); await repository.saveProject(original);
            let fail = true;
            const controller = new ProjectController(original, async project => {
                if (fail) throw new Error('Injected storage interruption');
                await repository.saveProject(project);
            });
            controller.dispatch({ type: 'thought.edit', id: 'attention', text: 'First queued edit' });
            controller.dispatch({ type: 'thought.edit', id: 'attention', text: 'Latest queued edit' });
            await controller.flush();
            expect(controller.getSnapshot().dirty).toBe(true);
            expect(await repository.loadProject(original.id)).toEqual(original);
            fail = false; controller.retrySave(); await controller.flush();
            expect(controller.getSnapshot().dirty).toBe(false);
            expect(controller.getSnapshot().persistenceError).toBeNull();
            repository.close(); repository = new DexieRepository(name);
            expect((await repository.loadProject(original.id))?.thoughts.attention.text).toBe('Latest queued edit');
        } finally { repository.close(); await Dexie.delete(name); }
    });
});
