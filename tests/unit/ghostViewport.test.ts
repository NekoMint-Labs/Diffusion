import { describe, expect, it } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { GeometryCache } from '../../src/field/spatial/index.ts';
import { correctMeasuredGhost } from '../../src/field/interactionHygiene.ts';
import { correctSevereOverlap, overlapArea } from '../../src/field/spatial/collision.ts';

describe('new proposal visibility', () => {
    it('corrects a clipped result even when it does not overlap, without changing the source or camera', () => {
        const project = createProject('viewport');
        project.thoughts.a = makeThought('已有想法', { x: 153, y: 415 }, 1, 'a');
        const controller = new ProjectController(project, async () => {});
        controller.addGhost({ id: 'g', text: '新想法', x: 639, y: 612, scopeIds: ['a'], createdAt: 2, proposalAction: 'continue' });
        const before = controller.getSnapshot().project;
        const geometry = new GeometryCache();
        geometry.setPosition('a', 153, 415); geometry.measure('a', 328, 120);
        geometry.setPosition('g', 639, 612); geometry.measure('g', 328, 120);
        correctMeasuredGhost('g', new Set(), controller, geometry, ['a', 'g'], { x: 0, y: 0, zoom: 1 }, { left: 0, top: 0, width: 898, height: 804 });
        const bounds = geometry.get('g')!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(898);
        expect(bounds.y + bounds.height + 64).toBeLessThanOrEqual(804);
        expect(overlapArea(bounds, geometry.get('a')!)).toBe(0);
        expect(controller.getSnapshot().project).toBe(before);
        expect(controller.canUndo).toBe(false);
    });
    it('keeps deliberate dragged positions under the existing drag policy', () => {
        const desired = { x: 639, y: 612, width: 328, height: 120 };
        expect(correctSevereOverlap(desired, [], { x: 0, y: 0, width: 898, height: 804 })).toEqual({ x: 639, y: 612 });
        const controller = new ProjectController(createProject(), async () => {});
        controller.addGhost({ id: 'g', text: 'Dragged by the person', ...desired, scopeIds: [], createdAt: 2 });
        controller.moveGhost('g', desired, { detach: true });
        const geometry = new GeometryCache();
        geometry.setPosition('g', desired.x, desired.y); geometry.measure('g', desired.width, desired.height);
        correctMeasuredGhost('g', new Set(), controller, geometry, ['g'], { x: 0, y: 0, zoom: 1 }, { left: 0, top: 0, width: 898, height: 804 });
        expect(controller.getSnapshot().session.ghosts.g).toMatchObject({ ...desired, spatialDetached: true });
    });
});
