import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';

function controller() {
    const project = createProject('relation-test', 'Relations', 1);
    project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
    project.thoughts.b = makeThought('B', { x: 300, y: 0 }, 1, 'b');
    return new ProjectController(project, async () => {});
}

describe('tentative relation authority boundary', () => {
    it('edits only the transient candidate until the user explicitly keeps it', () => {
        const c = controller();
        c.addPhenomenon({ id: 'p1', a: 'a', b: 'b', kind: 'bridge', label: 'possible bridge', explanation: 'Both depend on the same unresolved choice.' });
        c.updatePhenomenon('p1', { label: 'shared unresolved choice' });
        expect(c.getSnapshot().session.phenomena.p1).toMatchObject({ label: 'shared unresolved choice', explanation: 'Both depend on the same unresolved choice.' });
        expect(c.getSnapshot().project.relations.p1).toBeUndefined();
    });

    it('confirming is one reversible user action and undo keeps both Thoughts intact', () => {
        const c = controller();
        c.addPhenomenon({ id: 'p1', a: 'a', b: 'b', kind: 'resonance', label: 'same concern', explanation: 'Both thoughts raise the same concern.' });
        c.confirmPhenomenon('p1');
        expect(c.getSnapshot().project.relations.p1).toMatchObject({ status: 'confirmed', label: 'same concern' });
        expect(c.getSnapshot().session.phenomena.p1).toBeUndefined();

        c.undo();
        expect(c.getSnapshot().project.relations.p1).toBeUndefined();
        expect(c.getSnapshot().project.thoughts.a?.text).toBe('A');
        expect(c.getSnapshot().project.thoughts.b?.text).toBe('B');
    });

    it('ignoring a candidate never changes canonical relations', () => {
        const c = controller();
        c.addPhenomenon({ id: 'p1', a: 'a', b: 'b', kind: 'gap', label: 'missing step' });
        c.dismissPhenomenon('p1');
        expect(c.getSnapshot().session.phenomena.p1).toBeUndefined();
        expect(c.getSnapshot().project.relations.p1).toBeUndefined();
    });
});
