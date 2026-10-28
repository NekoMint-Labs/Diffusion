import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { bindProposition, validProposition } from '../../src/core/proposition.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { validateProject, parseProjectExport, recoveredProject } from '../../src/core/validation.ts';
import { DexieRepository } from '../../src/storage/dexie.ts';
const original = '只有学生同意时，才观察公开例题的复习过程。\r\n这仍不能证明普遍需求。';
const point = '学生同意时观察公开例题复习，不能据此证明普遍需求。';
function setup() {
    const project = createProject('propositions', 'Fixture');
    project.thoughts.source = makeThought('A current question.', { x: 0, y: 0 }, 1, 'source');
    const controller = new ProjectController(project, async () => {});
    controller.addGhost({ id: 'candidate', text: original, x: 400, y: 0, scopeIds: ['source'], createdAt: 2,
        proposalAction: 'continue', proposition: bindProposition(point, original) });
    return controller;
}
describe('optional complete-original-bound propositions', () => {
    it('retains exact original and proposition across Keep, Undo/Redo, JSON recovery and storage reopen', async () => {
        const controller = setup();
        const thought = controller.claim('candidate')!;
        expect(thought.proposition?.text).toBe(point); expect(thought.text).toBe(original);
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.candidate).toBeUndefined();
        expect(controller.getSnapshot().session.ghosts.candidate.proposition?.text).toBe(point);
        controller.redo();
        const project = controller.getSnapshot().project;
        const exported = JSON.stringify({ format: 'diffusion-project', version: 1, project });
        const restored = recoveredProject(parseProjectExport(exported));
        expect(restored.thoughts.candidate.proposition).toEqual(thought.proposition);
        expect(restored.thoughts.candidate.text).toBe(original);
        const name = 'proposition-' + crypto.randomUUID();
        const repository = new DexieRepository(name);
        await repository.saveProject(project); repository.close();
        const reopened = new DexieRepository(name);
        try { expect((await reopened.loadProject(project.id))?.thoughts.candidate).toEqual(thought); }
        finally { await reopened.deleteDatabase(); reopened.close(); }
    });
    it('invalidates on editing and crystallisation while Undo restores the matching pair', () => {
        const controller = setup(); controller.claim('candidate');
        controller.dispatch({ type: 'thought.edit', id: 'candidate', text: 'A changed premise.' });
        expect(controller.getSnapshot().project.thoughts.candidate.proposition).toBeUndefined();
        controller.undo(); expect(controller.getSnapshot().project.thoughts.candidate.proposition?.text).toBe(point);
        controller.redo(); expect(controller.getSnapshot().project.thoughts.candidate.proposition).toBeUndefined();
        controller.undo();
        controller.dispatch({ type: 'crystal.form', id: 'candidate', text: 'A user-confirmed different wording.' });
        expect(controller.getSnapshot().project.thoughts.candidate.proposition).toBeUndefined();
    });
    it('allows explicit manual extraction only through a user command matching the current original', () => {
        const controller = setup(); controller.claim('candidate');
        const proposition = bindProposition('也许先观察一次公开例题复习。', original)!;
        controller.dispatch({ type: 'thought.proposition', id: 'candidate', proposition });
        expect(controller.getSnapshot().project.thoughts.candidate.proposition).toEqual(proposition);
        controller.undo(); expect(controller.getSnapshot().project.thoughts.candidate.proposition?.text).toBe(point);
        expect(() => controller.dispatch({ type: 'thought.proposition', id: 'candidate', proposition }, 'system')).toThrow();
        controller.dispatch({ type: 'thought.edit', id: 'candidate', text: 'Different original.' });
        expect(() => controller.dispatch({ type: 'thought.proposition', id: 'candidate', proposition })).toThrow();
    });
    it.each([null, { version: 2, text: point, original }, { version: 1, text: 'x'.repeat(121), original },
        { version: 1, text: ' ', original }, { version: 1, text: point, original: original.replace('\r\n', '\n') },
        { version: 1, text: point, original, command: 'delete' }])('drops malformed optional imported metadata without mutating the input or relaxing body validation: %j', value => {
        const controller = setup(); controller.claim('candidate');
        const project = structuredClone(controller.getSnapshot().project);
        project.thoughts.candidate.proposition = value as never;
        const before = JSON.stringify(project);
        const checked = validateProject(project);
        expect(checked.thoughts.candidate.proposition).toBeUndefined();
        expect(checked.thoughts.candidate.text).toBe(original);
        expect(JSON.stringify(project)).toBe(before);
        project.thoughts.candidate.x = Number.NaN;
        expect(() => validateProject(project)).toThrow();
    });
    it('keeps legacy data readable and never binds a mismatched or oversized original', () => {
        const legacy = createProject('legacy', 'Legacy');
        legacy.thoughts.a = makeThought('Exact old words.', { x: 0, y: 0 }, 1, 'a');
        expect(validateProject(legacy)).toEqual(legacy);
        expect(bindProposition('A point.', 'x'.repeat(20001))).toBeUndefined();
        expect(validProposition(bindProposition(point, original), original + ' ')).toBe(false);
        expect(bindProposition('🧪'.repeat(120), original)).toBeDefined();
    });
});
