import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { causalEdges, causalTraceStates, describeCausalTraces } from '../../src/field/phenomena/causalTrace.ts';
import { lineageDirection } from '../../src/field/spatial/placement.ts';

describe('causal lineage persistence', () => {
    it('crosses the Ghost -> Keep boundary without storing geometry', () => {
        const project = createProject('p', 'P', 1);
        project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
        const controller = new ProjectController(project, async () => {});
        controller.addGhost({ id: 'b', text: 'B', x: 320, y: 0, createdAt: 2, scopeIds: ['a'], proposalKind: 'thought', proposalAction: 'continue' });
        const kept = controller.claim('b')!;
        expect(kept.derivedFrom).toEqual(['a']);
        expect(kept.generationAction).toBe('continue');
        expect(kept).not.toHaveProperty('scopeIds');
        expect(controller.getSnapshot().session.ghosts.b).toBeUndefined();
    });

    it('prunes a deleted parent instead of leaving a dangling edge', () => {
        const project = createProject('p', 'P', 1);
        project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
        project.thoughts.b = { ...makeThought('B', { x: 320, y: 0 }, 2, 'b'), derivedFrom: ['a'], generationAction: 'angle' };
        const controller = new ProjectController(project, async () => {});
        controller.dispatch({ type: 'thought.delete', ids: ['a'] });
        expect(controller.getSnapshot().project.thoughts.b.derivedFrom).toBeUndefined();
        expect(controller.getSnapshot().project.thoughts.b.generationAction).toBeUndefined();
    });
});

describe('causal trace presentation', () => {
    const project = createProject('p', 'P', 1);
    project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
    project.thoughts.b = { ...makeThought('B', { x: 320, y: 0 }, 2, 'b'), derivedFrom: ['a'], generationAction: 'continue' };
    project.thoughts.c = { ...makeThought('C', { x: 640, y: 0 }, 3, 'c'), derivedFrom: ['b'], generationAction: 'continue' };
    project.thoughts.d = { ...makeThought('D', { x: 620, y: 250 }, 4, 'd'), derivedFrom: ['b'], generationAction: 'angle' };
    const boxes = Object.fromEntries(Object.values(project.thoughts).map(t => [t.id, { x: t.x, y: t.y, width: 250, height: 100 }]));
    const geometry = { get: (id: string) => boxes[id] };

    it('wakes ancestry and one nearby branch, but only immediate parent on hover', () => {
        const states = causalTraceStates(project, ['c']);
        expect(states.get('causal:a:b')).toBe('wake');
        expect(states.get('causal:b:c')).toBe('wake');
        expect(states.get('causal:b:d')).toBe('wake');
        const hover = causalTraceStates(project, [], 'c');
        expect(hover.get('causal:b:c')).toBe('parent');
        expect(hover.get('causal:a:b')).toBe('sleep');
    });

    it('uses boundary-attached curved paths and keeps actions separate from Relations', () => {
        const traces = describeCausalTraces(project, geometry, ['c']);
        const continuation = traces.find(trace => trace.id === 'causal:b:c')!;
        const branch = traces.find(trace => trace.id === 'causal:b:d')!;
        expect(continuation.path).toMatch(/^M.+ C/);
        expect(branch.path).toMatch(/^M.+ C/);
        expect(continuation.a.x).toBeGreaterThan(320);
        expect(continuation.b.x).toBeLessThan(640 + 250);
        expect(branch.action).toBe('angle');
    });

    it('derives Continue direction from durable lineage rather than model-authored coordinates', () => {
        const direction = lineageDirection(project, boxes, ['b'])!;
        expect(direction.x).toBeGreaterThan(.99);
        expect(Math.abs(direction.y)).toBeLessThan(.01);
        expect(causalEdges(project)).toHaveLength(3);
    });
});
