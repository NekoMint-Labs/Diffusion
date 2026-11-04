import { compileContext } from '../../src/ai/context.ts';
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { bindProposition } from '../../src/core/proposition.ts';
import { parseProjectExport, recoveredProject, validateProject } from '../../src/core/validation.ts';
import { bringToMain, forkProject } from '../../src/core/world.ts';
import { DexieRepository } from '../../src/storage/dexie.ts';
import { generatedReading } from '../../src/ui/thought/generatedReading.ts';

const original = 'This may be useful only if the premise holds. '.repeat(4);
const revised = 'My own revised wording: I have not accepted that premise.';
const point = 'This may be useful if the premise holds.';
const origin = { note: 'Fixture provider / original model', projectId: 'edit-fixture' };
function setup() {
    const controller = new ProjectController(createProject('edit-fixture', 'Fixture'), async () => {});
    controller.addGhost({ id: 'answer', text: original, x: 300, y: 0, scopeIds: [], createdAt: 1,
        proposalKind: 'thought', origin, proposition: bindProposition(point, original) });
    controller.claim('answer');
    return controller;
}
function edited(controller: ProjectController) {
    const thought = controller.getSnapshot().project.thoughts.answer;
    expect(thought).toMatchObject({ text: revised, generatedBy: 'ai', userEdited: true, origin });
    expect(thought.proposition).toBeUndefined();
    expect(generatedReading(thought)).toBe(false);
    expect(compileContext(controller.getSnapshot().project, ['answer']).scope[0].authored).toBe(true);
    return thought;
}

describe('historical AI origin and current user-edited wording', () => {
    it('Keep → Edit → Undo/Redo restores matching wording, proposition and edit status', () => {
        const controller = setup();
        const before = controller.getSnapshot().project.thoughts.answer;
        expect(before.generatedBy).toBe('ai');
        expect(before.userEdited).toBeUndefined();
        expect(generatedReading(before)).toBe(true);
        expect(compileContext(controller.getSnapshot().project, ['answer']).scope[0].authored).toBe(false);
        controller.dispatch({ type: 'thought.edit', id: 'answer', text: revised });
        edited(controller);
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.answer).toEqual(before);
        expect(generatedReading(controller.getSnapshot().project.thoughts.answer)).toBe(true);
        controller.redo();
        edited(controller);
    });
    it('retains both facts through actual repository close/reopen and JSON recovery', async () => {
        const controller = setup();
        controller.dispatch({ type: 'thought.edit', id: 'answer', text: revised });
        const expected = edited(controller);
        const project = controller.getSnapshot().project;
        const name = 'edited-ai-' + crypto.randomUUID();
        const repository = new DexieRepository(name);
        await repository.saveProject(project); repository.close();
        const reopened = new DexieRepository(name);
        try {
            const loaded = (await reopened.loadProject(project.id))!;
            expect(loaded.thoughts.answer).toEqual(expected);
            const restored = recoveredProject(parseProjectExport(JSON.stringify({ format: 'diffusion-project', version: 1, project: loaded })));
            expect(restored.thoughts.answer).toEqual(expected);
            expect(generatedReading(restored.thoughts.answer)).toBe(false);
        } finally { await reopened.deleteDatabase(); reopened.close(); }
    });
    it('Fork and Bring preserve the historical AI marker and edited wording independently of provenance notes', () => {
        const controller = setup();
        const main = controller.getSnapshot().project;
        const fork = forkProject(main, 'Fork');
        const forkController = new ProjectController(fork, async () => {});
        forkController.dispatch({ type: 'thought.edit', id: 'answer', text: revised });
        const result = bringToMain(main, forkController.getSnapshot().project, ['answer'], { x: 500, y: 300 });
        expect(result.count).toBe(1);
        const brought = result.project.thoughts[result.ids[0]];
        expect(brought).toMatchObject({ text: revised, generatedBy: 'ai', userEdited: true });
        expect(brought.origin?.projectId).toBe(fork.id);
        expect(brought.proposition).toBeUndefined();
        expect(generatedReading(brought)).toBe(false);
        expect(result.project.thoughts.answer).toEqual(main.thoughts.answer);
        const secondFork = forkProject(result.project, 'Another fork');
        expect(secondFork.thoughts[brought.id]).toMatchObject({ generatedBy: 'ai', userEdited: true });
        expect(generatedReading(secondFork.thoughts[brought.id])).toBe(false);
    });
    it('does not mark a no-op, infer origin from notes, or claim manually restored wording is untouched', () => {
        const controller = setup();
        controller.dispatch({ type: 'thought.edit', id: 'answer', text: original });
        expect(controller.getSnapshot().project.thoughts.answer.userEdited).toBeUndefined();
        controller.dispatch({ type: 'thought.edit', id: 'answer', text: revised });
        controller.dispatch({ type: 'thought.edit', id: 'answer', text: original });
        expect(controller.getSnapshot().project.thoughts.answer.userEdited).toBe(true);
        const manual = { ...makeThought('Manual', { x: 0, y: 0 }, 1, 'manual'), origin };
        controller.dispatch({ type: 'thought.create', thought: manual });
        controller.dispatch({ type: 'thought.edit', id: 'manual', text: revised });
        expect(controller.getSnapshot().project.thoughts.manual.generatedBy).toBeUndefined();
        expect(controller.getSnapshot().project.thoughts.manual.userEdited).toBeUndefined();
    });
    it.each([false, 'true', true])('rejects malformed or origin-free edit metadata: %j', value => {
        const project = createProject('invalid-edit', 'Fixture');
        project.thoughts.a = { ...makeThought('Manual', { x: 0, y: 0 }, 1, 'a'), userEdited: value as true };
        expect(() => validateProject(project)).toThrow();
    });
});
