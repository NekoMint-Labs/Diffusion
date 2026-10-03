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

it('rebuilds the entire current-parent branch on reparent, independence, undo and redo', () => {
    const p = createProject();
    for (const id of ['a', 'b', 'c', 'd', 'x']) p.thoughts[id] = makeThought(id, { x: 0, y: 0 }, 1, id);
    for (const [child, parent] of [['b', 'a'], ['c', 'b'], ['d', 'c']]) Object.assign(p.thoughts[child], { derivedFrom: [parent], generationAction: 'continue' });
    const controller = new ProjectController(p, async () => {});
    const edges = () => causalEdges(controller.getSnapshot().project).map(({ parentId, childId, depth }) => [parentId, childId, depth]);
    expect(edges()).toEqual([['a', 'b', 1], ['b', 'c', 2], ['c', 'd', 3]]);
    controller.dispatch({ type: 'thought.reparent', id: 'x', parentId: 'a' });
    controller.dispatch({ type: 'thought.reparent', id: 'c', parentId: 'a' });
    expect(edges()).toEqual([['a', 'b', 1], ['a', 'c', 1], ['c', 'd', 2], ['a', 'x', 1]]);
    expect(controller.getSnapshot().project.thoughts.c.derivedFrom).toEqual(['b']);
    controller.undo(); expect(edges()).toEqual([['a', 'b', 1], ['b', 'c', 2], ['c', 'd', 3], ['a', 'x', 1]]);
    controller.redo(); expect(edges()).toEqual([['a', 'b', 1], ['a', 'c', 1], ['c', 'd', 2], ['a', 'x', 1]]);
    controller.dispatch({ type: 'thought.reparent', id: 'c', parentId: null });
    expect(edges()).toEqual([['a', 'b', 1], ['c', 'd', 1], ['a', 'x', 1]]);
});
it('uses one surviving effective parent for multi-source suggestions and claimed thoughts', () => {
    const p = createProject();
    for (const id of ['a', 'b']) p.thoughts[id] = makeThought(id, { x: 0, y: 0 }, 1, id);
    const controller = new ProjectController(p, async () => {});
    controller.addGhost({ id: 'g', text: 'From both', x: 400, y: 0, createdAt: 1, scopeIds: ['a', 'b'], proposalKind: 'thought', proposalAction: 'question' });
    const before = controller.getSnapshot();
    expect(causalEdges(before.project, before.session.ghosts)).toHaveLength(1);
    controller.claim('g');
    expect(controller.getSnapshot().project.thoughts.g.derivedFrom).toEqual(['a', 'b']);
    expect(causalEdges(controller.getSnapshot().project)).toEqual([expect.objectContaining({ parentId: 'a', childId: 'g', depth: 1 })]);
    controller.dispatch({ type: 'thought.reparent', id: 'g', parentId: 'b' });
    expect(causalEdges(controller.getSnapshot().project)).toEqual([expect.objectContaining({ parentId: 'b', childId: 'g', depth: 1 })]);
});
