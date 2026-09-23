import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect } from 'vitest';
import { Database } from '../../src/storage/dexie.ts';
import { demoProject } from '../../src/core/demo.ts';

describe('actual Dexie v1 -> current upgrade transaction', () => {
    it('retains v1 projects, original bytes, positions and scope while adding versioned state', async () => {
        const name = 'diffusion-migrate-' + crypto.randomUUID();
        const legacy = new Dexie(name);
        legacy.version(1).stores({ projects: 'id,updatedAt', originals: 'key' });
        const original = demoProject();
        original.thoughts.attention.life = 'peripheral';
        original.threads.th = { id: 'th', title: 'Before upgrade', scopeIds: ['attention'], messages: [], createdAt: 1 };
        await legacy.table('projects').put(original);
        await legacy.table('originals').put({ key: 'bytes', data: new Blob(['unchanged original']) });
        legacy.close();
        const current = new Database(name);
        try {
            await current.open();
            expect(current.verno).toBe(3);
            const recovered = await current.projects.get(original.id);
            expect(recovered?.thoughts.attention.life).toBe('peripheral');
            expect(recovered?.inputs).toEqual({});
            expect(recovered?.thoughts.attention.attentionDebt).toBe(12);
            expect(recovered?.thoughts.attention.x).toBe(original.thoughts.attention.x);
            expect(recovered?.camera).toEqual(original.camera);
            expect(recovered?.threads.th.scopeSnapshot?.attention.text).toBe(original.thoughts.attention.text);
            expect(await (await current.originals.get('bytes'))?.data.text()).toBe('unchanged original');
            current.close(); await current.open();
            expect(await current.projects.get(original.id)).toEqual(recovered);
        } finally { current.close(); await Dexie.delete(name); }
    });
    it('fails an invalid upgrade transaction rather than deleting the existing database', async () => {
        const name = 'diffusion-migrate-invalid-' + crypto.randomUUID();
        const legacy = new Dexie(name);legacy.version(1).stores({ projects: 'id,updatedAt', originals: 'key' });
        await legacy.table('projects').put({ id: 'invalid', updatedAt: 1 });legacy.close();
        const current = new Database(name);
        try { await expect(current.open()).rejects.toThrow(); current.close();
            const recovered = new Dexie(name);recovered.version(1).stores({ projects: 'id,updatedAt', originals: 'key' });
            await recovered.open();expect(await recovered.table('projects').get('invalid')).toEqual({ id: 'invalid', updatedAt: 1 });recovered.close();
        } finally { current.close();await Dexie.delete(name); }
    });
});
