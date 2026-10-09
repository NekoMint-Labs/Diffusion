import { describe, expect, it } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { GeometryCache } from '../../src/field/spatial/index.ts';
import { placePossibility } from '../../src/field/spatial/placement.ts';
import { correctMeasuredGhost, correctMeasuredProposalBatch } from '../../src/field/interactionHygiene.ts';
import { overlapArea } from '../../src/field/spatial/collision.ts';
import { distanceBetween } from '../../src/field/spatial/geometry.ts';

describe('visible proposals near the active source', () => {
    const view = { x: 0, y: 0, width: 1280, height: 720 };
    const viewport = { left: 0, top: 0, width: view.width, height: view.height };
    function mounted(point = { x: 1030, y: 400 }) {
        const project = createProject('p');
        project.thoughts.source = makeThought('来源', { x: 400, y: 300 }, 1, 'source');
        const controller = new ProjectController(project, async () => {});
        controller.addGhost({ id: 'g', text: '新建议', ...point, createdAt: 2, scopeIds: ['source'] });
        const geometry = new GeometryCache();
        geometry.setPosition('source', 400, 300); geometry.measure('source', 176, 80);
        geometry.setPosition('g', point.x, point.y); geometry.measure('g', 176, 80);
        const correct = (obstacles: typeof view[] = []) => correctMeasuredGhost('g', controller, geometry, ['source', 'g'], { x: 0, y: 0, zoom: 1 }, viewport, obstacles);
        return { controller, geometry, correct };
    }

    it('returns a clear but distant automatic arrival to a visible source without changing the project', () => {
        const { controller, geometry, correct } = mounted();
        const project = controller.getSnapshot().project;
        correct();
        expect(distanceBetween(geometry.get('g')!, geometry.get('source')!)).toBeLessThanOrEqual(216);
        expect(overlapArea(geometry.get('g')!, geometry.get('source')!)).toBe(0);
        expect(controller.getSnapshot().project).toBe(project);
        expect(controller.canUndo).toBe(false);
        const settled = controller.getSnapshot().session.ghosts.g;
        correct();
        expect(controller.getSnapshot().session.ghosts.g).toEqual(settled);
    });

    it('keeps a resized automatic arrival wholly visible even without a collision', () => {
        const { geometry, correct } = mounted({ x: 1120, y: 650 });
        geometry.measure('g', 328, 138);
        correct();
        const placed = geometry.get('g')!;
        expect(placed.x).toBeGreaterThanOrEqual(0);
        expect(placed.y).toBeGreaterThanOrEqual(0);
        expect(placed.x + placed.width).toBeLessThanOrEqual(view.width);
        expect(placed.y + placed.height).toBeLessThanOrEqual(view.height);
    });

    it('clears measured chrome while staying near the source', () => {
        const { controller, geometry, correct } = mounted({ x: 620, y: 300 });
        const reserved = { x: 600, y: 250, width: 260, height: 180 };
        const project = controller.getSnapshot().project;
        correct([reserved]);
        expect(overlapArea(geometry.get('g')!, reserved)).toBe(0);
        expect(distanceBetween(geometry.get('g')!, geometry.get('source')!)).toBeLessThanOrEqual(216);
        expect(controller.getSnapshot().project).toBe(project);
    });

    it('preserves a person’s deliberately detached position and an already settled local arrival', () => {
        const { controller, geometry, correct } = mounted();
        controller.moveGhost('g', { x: 1030, y: 400 }, { detach: true });
        correct();
        expect(geometry.get('g')).toMatchObject({ x: 1030, y: 400 });
        const local = mounted({ x: 620, y: 300 });
        local.correct();
        expect(local.geometry.get('g')).toMatchObject({ x: 620, y: 300 });
    });

    it('fits three measured Continue cards after the review dock reduces the available viewport', () => {
        const project = createProject('crowded');
        project.thoughts.source = makeThought('来源', { x: 153, y: 415 }, 1, 'source');
        project.thoughts.parent = makeThought('上级', { x: 190, y: 310 }, 1, 'parent');
        const controller = new ProjectController(project, async () => {}), geometry = new GeometryCache();
        for (const [id, x, y, width, height] of [['source', 153, 415, 328, 210], ['parent', 190, 310, 256, 74]] as const) {
            geometry.setPosition(id, x, y); geometry.measure(id, width, height);
        }
        for (const [id, x, y] of [['g1', 496.5625, 155.625], ['g2', 609, 451], ['g3', 1253, 663]] as const) {
            controller.addGhost({ id, text: '长建议' + id, x, y, scopeIds: ['source'], createdAt: 2, proposalAction: 'continue' });
            geometry.setPosition(id, x, y); geometry.measure(id, 328, 210);
        }
        const ids = ['source', 'parent', 'g1', 'g2', 'g3'], camera = { x: 0, y: 0, zoom: .8 }, viewport = { left: 0, top: 0, width: 898, height: 702 };
        const chrome = [{ x: 24, y: 22, width: 130, height: 48 }, { x: 837, y: 18, width: 36, height: 34 }];
        const canonical = controller.getSnapshot().project;
        correctMeasuredProposalBatch(controller, geometry, ids, camera, viewport, chrome);
        const cards = ids.slice(2).map(id => geometry.get(id)!);
        for (const [index, card] of cards.entries()) {
            expect(card.x).toBeGreaterThanOrEqual(0); expect(card.y).toBeGreaterThanOrEqual(0);
            expect((card.x + card.width) * .8).toBeLessThanOrEqual(898);
            expect((card.y + card.height) * .8 + 64).toBeLessThanOrEqual(702);
            expect(overlapArea(card, geometry.get('source')!)).toBe(0);
            expect(overlapArea(card, geometry.get('parent')!)).toBe(0);
            expect(cards.slice(0, index).some(other => overlapArea(card, other) > 0)).toBe(false);
        }
        expect(controller.getSnapshot().project).toBe(canonical);
        expect(controller.canUndo).toBe(false);
        const settled = controller.getSnapshot().session.ghosts;
        correctMeasuredProposalBatch(controller, geometry, ids, camera, viewport, chrome);
        expect(controller.getSnapshot().session.ghosts).toBe(settled);
    });
});
