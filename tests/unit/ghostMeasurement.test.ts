import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { correctMeasuredGhost } from '../../src/field/interactionHygiene.ts';
import { GeometryCache } from '../../src/field/spatial/index.ts';
import { overlapArea } from '../../src/field/spatial/collision.ts';

describe('settled pending proposal geometry', () => {
    function fixture() {
        const project = createProject('p', 'P', 1);
        project.thoughts.a = makeThought('来源', { x: 100, y: 100 }, 1, 'a');
        const controller = new ProjectController(project, async () => {});
        controller.addGhost({ id: 'g', text: '新建议', x: 340, y: 110, createdAt: 2, scopeIds: ['a'] });
        const geometry = new GeometryCache();
        geometry.setPosition('a', 100, 100);
        geometry.measure('a', 176, 100);
        geometry.setPosition('g', 340, 110);
        geometry.measure('g', 176, 100);
        const correct = () => correctMeasuredGhost('g', controller, geometry, ['a', 'g'], { x: 0, y: 0, zoom: 1 }, { left: 0, top: 0, width: 1280, height: 900 });
        return { controller, geometry, correct };
    }
    it('rechecks a later source resize and clears small overlaps without altering canonical content', () => {
        const { controller, geometry, correct } = fixture();
        const canonical = controller.getSnapshot().project;
        correct();
        expect(controller.getSnapshot().session.ghosts.g).toMatchObject({ x: 340, y: 110 });
        geometry.measure('a', 256, 100);
        correct();
        expect(overlapArea(geometry.get('a')!, geometry.get('g')!)).toBe(0);
        const placed = controller.getSnapshot().session.ghosts.g;
        correct();
        expect(controller.getSnapshot().session.ghosts.g).toEqual(placed);
        expect(controller.getSnapshot().project).toBe(canonical);
        expect(controller.canUndo).toBe(false);
    });
    it('preserves a person’s deliberate proposal position when later measurements arrive', () => {
        const { controller, geometry, correct } = fixture();
        controller.moveGhost('g', { x: 110, y: 110 }, { detach: true });
        geometry.setPosition('g', 110, 110);
        correct();
        expect(controller.getSnapshot().session.ghosts.g).toMatchObject({ x: 110, y: 110, spatialDetached: true });
    });
});
