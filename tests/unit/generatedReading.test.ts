import { describe, expect, it } from 'vitest';
import { generatedReading } from '../../src/ui/thought/generatedReading.ts';
import { createProject, makeThought, type Ghost, type Thought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { bindProposition } from '../../src/core/proposition.ts';
import { parseProjectExport, recoveredProject } from '../../src/core/validation.ts';
import { forkProject, bringToMain, continuedThought } from '../../src/core/world.ts';

const original = '也许先观察一次公开例题的复习过程。'.repeat(10);
const point = '也许先观察一次公开例题复习，这仍是假设。';
const ghost: Ghost = { id: 'diffuse', text: original, x: 400, y: 0, createdAt: 1, scopeIds: ['source'],
    proposalKind: 'thought', origin: { projectId: 'fixture', note: 'Injected model fixture' } };
describe('generated content reading eligibility', () => {
    it('never infers AI generation from Fork or Bring provenance on hand-written cards', () => {
        const controller = new ProjectController(createProject('handwritten', 'Manual'), async () => {});
        controller.dispatch({ type: 'thought.create', thought: makeThought('', { x: 0, y: 0 }, 1, 'manual') });
        controller.dispatch({ type: 'thought.edit', id: 'manual', text: original });
        const main = controller.getSnapshot().project;
        const fork = forkProject(main, 'Handwritten fork');
        expect(generatedReading(fork.thoughts.manual)).toBe(false);
        const restored = recoveredProject(parseProjectExport(JSON.stringify({ format: 'diffusion-project', version: 1, project: fork })));
        expect(generatedReading(restored.thoughts.manual)).toBe(false);
        const forkController = new ProjectController(fork, async () => {});
        forkController.dispatch({ type: 'thought.edit', id: 'manual', text: original + ' 手工修改。' });
        const brought = bringToMain(main, forkController.getSnapshot().project, ['manual'], { x: 300, y: 0 });
        expect(brought.count).toBe(1);
        expect(generatedReading(brought.project.thoughts[brought.ids[0]])).toBe(false);
    });
    it.each([true, false])('keeps ordinary Diffuse eligible through Keep and JSON recovery, with point=%s', withPoint => {
        const controller = new ProjectController(createProject('fixture', 'Fixture'), async () => {});
        controller.addGhost({ ...ghost, ...(withPoint ? { proposition: bindProposition(point, original) } : {}) });
        expect(generatedReading(controller.getSnapshot().session.ghosts.diffuse)).toBe(true);
        const kept = controller.claim('diffuse')!;
        expect(kept.generationAction).toBeUndefined(); expect(kept.derivedFrom).toBeUndefined();
        expect(generatedReading(kept)).toBe(true);
        expect(kept.generatedBy).toBe('ai');
        controller.undo(); expect(controller.getSnapshot().project.thoughts.diffuse).toBeUndefined();
        controller.redo(); expect(controller.getSnapshot().project.thoughts.diffuse.generatedBy).toBe('ai');
        const recovered = recoveredProject(parseProjectExport(JSON.stringify({ format: 'diffusion-project', version: 1, project: controller.getSnapshot().project })));
        expect(generatedReading(recovered.thoughts.diffuse)).toBe(true);
        expect(recovered.thoughts.diffuse.text).toBe(original);
        expect(recovered.thoughts.diffuse.proposition?.text).toBe(withPoint ? point : undefined);
        const fork = forkProject(controller.getSnapshot().project, 'Generated fork');
        expect(generatedReading(fork.thoughts.diffuse)).toBe(true);
        // Deleting the old copy makes this an explicit Bring of unchanged generated content.
        const main = structuredClone(controller.getSnapshot().project); delete main.thoughts.diffuse;
        const brought = bringToMain(main, fork, ['diffuse'], { x: 0, y: 0 });
        expect(generatedReading(brought.project.thoughts[brought.ids[0]])).toBe(true);
    });
    it('retains explicitly claimed Continue eligibility without provider prose or surviving parents', () => {
        const controller = new ProjectController(createProject('continue', 'Fixture'), async () => {});
        controller.addGhost({ ...ghost, origin: undefined, proposalAction: 'continue' });
        expect(generatedReading(controller.claim('diffuse')!)).toBe(true);
    });
    it('does not treat causal actions as generation identity for hand-written Crystal continuations', () => {
        const project = createProject('crystal', 'Fixture');
        project.thoughts.crystal = { ...makeThought('A commitment.', { x: 0, y: 0 }, 1, 'crystal'), kind: 'crystal' };
        const continuation = { ...continuedThought(project, 'crystal', { x: 300, y: 0 }), text: original };
        project.thoughts[continuation.id] = continuation;
        expect(generatedReading(continuation)).toBe(false);
        expect(generatedReading(forkProject(project, 'Manual continuation').thoughts[continuation.id])).toBe(false);
    });
    it('excludes user wording, ingestion candidates, sources, crystals and unclassified legacy notes', () => {
        const generated: Thought = { ...makeThought(original, { x: 0, y: 0 }), generatedBy: 'ai', origin: ghost.origin };
        for (const item of [undefined, makeThought(original, { x: 0, y: 0 }), { ...ghost, proposal: true as const },
            { ...generated, origin: { ...ghost.origin, inputId: 'user-input' } },
            { ...generated, origin: { ...ghost.origin, ranges: [{ inputId: 'user-input', start: 0, end: 1 }] } },
            { ...generated, kind: 'source' as const }, { ...generated, sourceId: 'source' },
            { ...generated, origin: { ...ghost.origin, sourceId: 'source' } },
            { ...generated, origin: { ...ghost.origin, url: 'https://example.com' } },
            { ...generated, kind: 'crystal' as const }, { ...generated, generatedBy: undefined, origin: { note: 'Authored example' } },
            { ...generated, generatedBy: undefined }, { ...ghost, proposalKind: undefined }])
            expect(generatedReading(item)).toBe(false);
    });
    it('validates the optional marker without granting imported content any authority', () => {
        const controller = new ProjectController(createProject('validation', 'Fixture'), async () => {});
        const invalid = { ...makeThought(original, { x: 0, y: 0 }), generatedBy: 'user' as 'ai' };
        expect(() => controller.dispatch({ type: 'thought.create', thought: invalid })).toThrow();
        const project = createProject('invalid', 'Fixture'); project.thoughts[invalid.id] = invalid;
        expect(() => parseProjectExport(JSON.stringify({ format: 'diffusion-project', version: 1, project }))).toThrow();
    });
});
