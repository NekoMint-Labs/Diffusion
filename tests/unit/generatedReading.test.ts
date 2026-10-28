import { describe, expect, it } from 'vitest';
import { generatedReading } from '../../src/ui/thought/generatedReading.ts';
import { createProject, makeThought, type Ghost, type Thought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { bindProposition } from '../../src/core/proposition.ts';
import { parseProjectExport, recoveredProject } from '../../src/core/validation.ts';

const original = '也许先观察一次公开例题的复习过程。'.repeat(10);
const point = '也许先观察一次公开例题复习，这仍是假设。';
const ghost: Ghost = { id: 'diffuse', text: original, x: 400, y: 0, createdAt: 1, scopeIds: ['source'],
    proposalKind: 'thought', origin: { projectId: 'fixture', note: 'Injected model fixture' } };
describe('generated content reading eligibility', () => {
    it.each([true, false])('keeps ordinary Diffuse eligible through Keep and JSON recovery, with point=%s', withPoint => {
        const controller = new ProjectController(createProject('fixture', 'Fixture'), async () => {});
        controller.addGhost({ ...ghost, ...(withPoint ? { proposition: bindProposition(point, original) } : {}) });
        expect(generatedReading(controller.getSnapshot().session.ghosts.diffuse)).toBe(true);
        const kept = controller.claim('diffuse')!;
        expect(kept.generationAction).toBeUndefined(); expect(kept.derivedFrom).toBeUndefined();
        expect(generatedReading(kept)).toBe(true);
        const recovered = recoveredProject(parseProjectExport(JSON.stringify({ format: 'diffusion-project', version: 1, project: controller.getSnapshot().project })));
        expect(generatedReading(recovered.thoughts.diffuse)).toBe(true);
        expect(recovered.thoughts.diffuse.text).toBe(original);
        expect(recovered.thoughts.diffuse.proposition?.text).toBe(withPoint ? point : undefined);
    });
    it('retains Continue eligibility even when its provider note is absent', () => {
        expect(generatedReading({ ...makeThought(original, { x: 0, y: 0 }), generationAction: 'continue' })).toBe(true);
    });
    it('excludes user wording, ingestion candidates, sources, crystals and unclassified legacy notes', () => {
        const generated: Thought = { ...makeThought(original, { x: 0, y: 0 }), origin: ghost.origin };
        for (const item of [undefined, makeThought(original, { x: 0, y: 0 }), { ...ghost, proposal: true as const },
            { ...generated, origin: { ...ghost.origin, inputId: 'user-input' } },
            { ...generated, origin: { ...ghost.origin, ranges: [{ inputId: 'user-input', start: 0, end: 1 }] } },
            { ...generated, kind: 'source' as const }, { ...generated, sourceId: 'source' },
            { ...generated, origin: { ...ghost.origin, sourceId: 'source' } },
            { ...generated, origin: { ...ghost.origin, url: 'https://example.com' } },
            { ...generated, kind: 'crystal' as const }, { ...generated, origin: { note: 'Authored example' } }])
            expect(generatedReading(item)).toBe(false);
    });
});
