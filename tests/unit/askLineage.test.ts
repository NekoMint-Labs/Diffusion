import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { MockAIProvider } from '../../src/ai/mock.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { validateProject } from '../../src/core/validation.ts';
import { DexieRepository } from '../../src/storage/dexie.ts';

function setup() {
    const project = createProject('ask-lineage', 'Ask lineage', 1);
    for (const id of ['a', 'b']) project.thoughts[id] = makeThought('Source ' + id, { x: 0, y: 0 }, 1, id);
    return new ProjectController(project, async () => {});
}
async function ask(controller: ProjectController) {
    const provider = new MockAIProvider();
    vi.spyOn(provider, 'respond').mockResolvedValue({ providerLabel: 'Test fixture', mock: true, intents: [{ type: 'respond_in_field', text: 'A direct answer with useful content.' }] });
    const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 500, y: 0 }) });
    try { expect(await runtime.run('ask', 'Answer my own question', ['a', 'b'])).toMatchObject({ status: 'completed', emitted: 1 }); }
    finally { runtime.dispose(); }
    return Object.values(controller.getSnapshot().session.ghosts)[0];
}
describe('Ask response causal lineage', () => {
    it('keeps the real Ask action and surviving source IDs through a saved Field restart', async () => {
        const controller = setup();
        const ghost = await ask(controller);
        expect(ghost.proposalAction).toBe('ask');
        expect(controller.getSnapshot().project.thoughts[ghost.id]).toBeUndefined();
        const kept = controller.claim(ghost.id)!;
        expect(kept).toMatchObject({ derivedFrom: ['a', 'b'], generationAction: 'ask', kind: 'thought', kept: false });
        expect(kept.origin?.note).toContain('Test fixture');
        expect(kept.origin?.inputId).toBeUndefined();
        expect(controller.getSnapshot().project.relations).toEqual({});
        const name = 'ask-restart-' + crypto.randomUUID();
        let repository = new DexieRepository(name);
        try {
            await repository.saveProject(controller.getSnapshot().project);
            repository.close(); repository = new DexieRepository(name);
            const reopened = validateProject(await repository.loadProject('ask-lineage'));
            expect(reopened.thoughts[ghost.id]).toMatchObject({ derivedFrom: ['a', 'b'], generationAction: 'ask' });
            expect(reopened.thoughts.a.text).toBe('Source a');
        } finally { await repository.deleteDatabase(); repository.close(); }
        controller.undo(); expect(controller.getSnapshot().project.thoughts[ghost.id]).toBeUndefined();
        controller.redo(); expect(controller.getSnapshot().project.thoughts[ghost.id].generationAction).toBe('ask');
    });
    it('Ignore leaves no committed provenance or mutation', async () => {
        const controller = setup(), before = JSON.stringify(controller.getSnapshot().project);
        const ghost = await ask(controller); controller.dismissGhost(ghost.id);
        expect(JSON.stringify(controller.getSnapshot().project)).toBe(before);
        expect(controller.claim(ghost.id)).toBeNull();
    });
    it('filters missing/self/duplicate IDs at Keep and prunes deleted sources', () => {
        const controller = setup();
        controller.addGhost({ id: 'g', text: 'Answer', x: 400, y: 0, createdAt: 2, scopeIds: ['missing', 'g', 'a', 'a', 'b'], proposalAction: 'ask' });
        controller.dispatch({ type: 'thought.delete', ids: ['b'] });
        const kept = controller.claim('g')!;
        expect(kept.derivedFrom).toEqual(['a']);
        controller.dispatch({ type: 'thought.delete', ids: ['a'] });
        const orphan = controller.getSnapshot().project.thoughts.g;
        expect(orphan.derivedFrom).toBeUndefined(); expect(orphan.generationAction).toBeUndefined();
        expect(() => validateProject(controller.getSnapshot().project)).not.toThrow();
    });
    it.each(['continue', 'angle', 'question'] as const)('retains existing %s action and loads older thoughts without lineage', action => {
        const controller = setup();
        controller.addGhost({ id: 'g', text: 'Proposal', x: 400, y: 0, createdAt: 2, scopeIds: ['a'], proposalAction: action });
        expect(controller.claim('g')!.generationAction).toBe(action);
        expect(validateProject(controller.getSnapshot().project).thoughts.b.derivedFrom).toBeUndefined();
    });
});
