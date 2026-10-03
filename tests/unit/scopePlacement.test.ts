import { describe, expect, it } from 'vitest';
import { createProject, emptySession, makeThought } from '../../src/core/model.ts';
import { RESULT_PREFERRED_DISTANCE, placePossibility } from '../../src/field/spatial/placement.ts';
import { estimateItemSize, estimateThoughtSize } from '../../src/field/spatial/collision.ts';
import { distanceBetween } from '../../src/field/spatial/geometry.ts';
import { computeScopeHubPlacement, scopeHubDistance, unionScopeBounds } from '../../src/ui/scope/scopePlacement.ts';

const viewport = { x: 0, y: 0, width: 1000, height: 800 };
const hubSize = { width: 260, height: 42 };
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

describe('scope hub placement', () => {
    it('unions selected geometry without mutating it', () => {
        const selected = [{ x: 100, y: 100, width: 80, height: 30 }, { x: 260, y: 180, width: 120, height: 40 }];
        expect(unionScopeBounds(selected)).toEqual({ x: 100, y: 100, width: 280, height: 120 });
        expect(selected).toEqual([{ x: 100, y: 100, width: 80, height: 30 }, { x: 260, y: 180, width: 120, height: 40 }]);
    });

    it('prefers above-center and keeps the Hub locally attached', () => {
        const selection = { x: 300, y: 240, width: 200, height: 80 };
        const placement = computeScopeHubPlacement({ selectionBounds: selection, viewportBounds: viewport, hubSize });
        expect(placement.side).toBe('top');
        expect(overlaps(placement, selection)).toBe(false);
        expect(scopeHubDistance(placement, selection)).toBe(20);
    });

    it('uses the local fallback below near the top edge', () => {
        const selection = { x: 300, y: 18, width: 200, height: 80 };
        const placement = computeScopeHubPlacement({ selectionBounds: selection, viewportBounds: viewport, hubSize });
        expect(placement.side).toBe('bottom');
        expect(scopeHubDistance(placement, selection)).toBeLessThanOrEqual(20);
    });

    it('keeps left and right edge selections close after viewport clamping', () => {
        for (const selection of [
            { x: 2, y: 340, width: 160, height: 70 },
            { x: 838, y: 340, width: 160, height: 70 },
        ]) {
            const placement = computeScopeHubPlacement({ selectionBounds: selection, viewportBounds: viewport, hubSize });
            expect(scopeHubDistance(placement, selection)).toBeLessThanOrEqual(20);
            expect(placement.x).toBeGreaterThanOrEqual(16);
            expect(placement.x + placement.width).toBeLessThanOrEqual(984);
        }
    });

    it('uses occupancy to choose another local side, not a distant empty region', () => {
        const selection = { x: 300, y: 240, width: 200, height: 80 };
        const topObstacle = { x: 250, y: 130, width: 320, height: 90 };
        const topCandidate = { x: 270, y: 178, ...hubSize };
        expect(overlaps(topCandidate, topObstacle)).toBe(true);
        const placement = computeScopeHubPlacement({ selectionBounds: selection, viewportBounds: viewport, hubSize, occupiedRects: [topObstacle] });
        expect(placement.side).toBe('bottom');
        expect(scopeHubDistance(placement, selection)).toBeLessThanOrEqual(20);
    });

    it('stays local in a dense Field even when every side has nearby content', () => {
        const selection = { x: 300, y: 240, width: 200, height: 80 };
        const occupied = [
            { x: 240, y: 120, width: 340, height: 110 },
            { x: 240, y: 330, width: 340, height: 110 },
            { x: 510, y: 210, width: 300, height: 130 },
            { x: 0, y: 210, width: 290, height: 130 },
        ];
        const placement = computeScopeHubPlacement({ selectionBounds: selection, viewportBounds: viewport, hubSize, occupiedRects: occupied });
        expect(scopeHubDistance(placement, selection)).toBeLessThanOrEqual(20);
        expect(placement.side).not.toBe('fallback');
    });

    it('is stable when selected rectangles arrive in reverse lasso order', () => {
        const selected = [{ x: 160, y: 180, width: 180, height: 70 }, { x: 430, y: 320, width: 150, height: 80 }, { x: 250, y: 440, width: 200, height: 90 }];
        const forward = unionScopeBounds(selected)!;
        const reverse = unionScopeBounds([...selected].reverse())!;
        expect(reverse).toEqual(forward);
        expect(computeScopeHubPlacement({ selectionBounds: reverse, viewportBounds: viewport, hubSize })).toEqual(computeScopeHubPlacement({ selectionBounds: forward, viewportBounds: viewport, hubSize }));
    });

    it('does not invent a far-away fallback for a large multi-selection', () => {
        const selection = { x: 80, y: 90, width: 820, height: 620 };
        const placement = computeScopeHubPlacement({ selectionBounds: selection, viewportBounds: viewport, hubSize });
        expect(placement.side).not.toBe('fallback');
        expect(scopeHubDistance(placement, selection)).toBeLessThanOrEqual(160);
    });

});

describe('scope result placement', () => {
    it('measures multi-selection distance from the union scope edge without moving source geometry', () => {
        const project = createProject('placement');
        project.thoughts.a = makeThought('A', { x: 100, y: 200 }, 1, 'a');
        project.thoughts.b = makeThought('B', { x: 600, y: 260 }, 1, 'b');
        project.thoughts.unselected = makeThought('Elsewhere', { x: 1800, y: 1200 }, 1, 'unselected');
        const before = Object.fromEntries(Object.values(project.thoughts).map(thought => [thought.id, { x: thought.x, y: thought.y }]));
        const camera = { ...project.camera };

        const point = placePossibility(project, emptySession(), { x: 4000, y: 3000 }, 0, ['a', 'b']);
        const aSize = estimateThoughtSize(project.thoughts.a.text);
        const bSize = estimateThoughtSize(project.thoughts.b.text);
        const resultSize = estimateThoughtSize('');
        const scope = {
            x: 100,
            y: 200,
            width: 600 + bSize.width - 100,
            height: Math.max(200 + aSize.height, 260 + bSize.height) - 200,
        };

        expect(overlaps({ ...point, ...resultSize }, scope)).toBe(false);
        expect(distanceBetween({ ...point, ...resultSize }, scope)).toBe(RESULT_PREFERRED_DISTANCE.target);
        expect(Object.fromEntries(Object.values(project.thoughts).map(thought => [thought.id, { x: thought.x, y: thought.y }]))).toEqual(before);
        expect(project.camera).toEqual(camera);
    });

    it('penalizes candidates too close to the source edge', () => {
        const project = createProject('close');
        project.thoughts.a = makeThought('A', { x: 300, y: 200 }, 1, 'a');
        const point = placePossibility(project, emptySession(), { x: 0, y: 0 }, 0, ['a']);
        expect(distanceBetween({ ...point, ...estimateThoughtSize('') }, { x: 300, y: 200, ...estimateThoughtSize('A') })).toBeGreaterThanOrEqual(RESULT_PREFERRED_DISTANCE.min);
    });

    it('penalizes far candidates when good local space exists', () => {
        const project = createProject('far');
        project.thoughts.a = makeThought('A', { x: 300, y: 200 }, 1, 'a');
        const point = placePossibility(project, emptySession(), { x: 4000, y: 3000 }, 0, ['a']);
        expect(distanceBetween({ ...point, ...estimateThoughtSize('') }, { x: 300, y: 200, ...estimateThoughtSize('A') })).toBeLessThanOrEqual(RESULT_PREFERRED_DISTANCE.max);
    });

    it('keeps collision safety ahead of the preferred distance', () => {
        const project = createProject('collision');
        project.thoughts.a = makeThought('A', { x: 300, y: 200 }, 1, 'a');
        project.thoughts.block = makeThought('Block', { x: 300, y: 490 }, 1, 'block');
        const point = placePossibility(project, emptySession(), { x: 0, y: 0 }, 0, ['a'], viewport);
        expect(point).not.toEqual({ x: 300, y: 490 });
        expect(overlaps({ ...point, ...estimateThoughtSize('') }, { x: 284, y: 474, width: estimateThoughtSize('Block').width + 32, height: estimateThoughtSize('Block').height + 32 })).toBe(false);
    });

    it('keeps viewport safety ahead of the preferred distance', () => {
        const project = createProject('viewport');
        project.thoughts.a = makeThought('A', { x: 620, y: 440 }, 1, 'a');
        const point = placePossibility(project, emptySession(), { x: 0, y: 0 }, 0, ['a'], { x: 0, y: 0, width: 800, height: 600 });
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        const resultSize = estimateThoughtSize('');
        expect(point.x + resultSize.width).toBeLessThanOrEqual(800);
        expect(point.y + resultSize.height).toBeLessThanOrEqual(600);
    });

    it('keeps a local result inside the visible Field without moving its source', () => {
        const project = createProject('visible');
        project.thoughts.a = makeThought('A', { x: 300, y: 10 }, 1, 'a');
        project.thoughts.blockBelow = makeThought('Block', { x: 300, y: 178 }, 1, 'blockBelow');

        const point = placePossibility(project, emptySession(), { x: 400, y: 300 }, 0, ['a'], { x: 0, y: 0, width: 800, height: 600 });

        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        const resultSize = estimateThoughtSize('');
        expect(point.x + resultSize.width).toBeLessThanOrEqual(800);
        expect(point.y + resultSize.height).toBeLessThanOrEqual(600);
    });

    it.each(['crystal', 'source'] as const)('keeps a short %s fixed-width identity in placement geometry', kind => {
        const project = createProject(`mixed-${kind}`);
        project.thoughts.anchor = { ...makeThought('A', { x: 300, y: 200 }, 1, 'anchor'), kind };
        const point = placePossibility(project, emptySession(), { x: 0, y: 0 }, 0, ['anchor']);
        const resultSize = estimateThoughtSize('');
        const anchorSize = estimateItemSize(project.thoughts.anchor);

        expect(anchorSize.width).toBe(kind === 'crystal' ? 276 : 236);
        expect(distanceBetween({ ...point, ...resultSize }, { x: 300, y: 200, ...anchorSize })).toBe(RESULT_PREFERRED_DISTANCE.target);
    });

    it('keeps the existing anchor behavior when no source scope is available', () => {
        expect(placePossibility(createProject('empty'), emptySession(), { x: 20, y: 30 })).toEqual({ x: 320, y: 30 });
    });
});


describe('continuation in a narrow reading viewport', () => {
    const wording = '如果智能体决定下一张图从哪里拍，就必须用当前已经能算出来的不确定性作为依据，不能等待最后的重建分数。'.repeat(3);
    it('uses measured source height and puts a long continuation nearby without moving authored cards', () => {
        const project = createProject('narrow');
        project.thoughts.a = makeThought('稀疏视角重建和智能体的结合', { x: 190, y: 310 }, 1, 'a');
        project.thoughts.b = { ...makeThought(wording, { x: 153, y: 415 }, 1, 'b'), derivedFrom: ['a'], generationAction: 'continue' };
        const before = JSON.stringify(project);
        const measured = { a: { x: 190, y: 310, width: 256, height: 43 }, b: { x: 153, y: 415, width: 328, height: 120 } };
        const point = placePossibility(project, emptySession(), { x: 0, y: 0 }, 0, ['b'], { x: 0, y: 0, width: 898, height: 804 }, wording, 'continue', measured);
        const preview = { ...point, width: 328, height: 138 };
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.x + preview.width).toBeLessThanOrEqual(898);
        expect(point.y + preview.height).toBeLessThanOrEqual(804);
        expect(distanceBetween(preview, measured.b)).toBeGreaterThanOrEqual(36);
        expect(distanceBetween(preview, measured.b)).toBeLessThanOrEqual(128);
        expect(JSON.stringify(project)).toBe(before);
    });
    it('reserves bounded previews for successive results before they have been measured', () => {
        const project = createProject('successive');
        project.thoughts.a = makeThought(wording, { x: 153, y: 415 }, 1, 'a');
        const session = emptySession();
        const measured = { a: { x: 153, y: 415, width: 328, height: 120 } };
        const results = [];
        for (let i = 0; i < 3; i++) {
            const point = placePossibility(project, session, { x: 0, y: 0 }, i, ['a'], { x: 0, y: 0, width: 898, height: 804 }, wording, 'continue', measured);
            const box = { ...point, width: 328, height: 138 };
            expect(point.x).toBeGreaterThanOrEqual(0);
            expect(point.y).toBeGreaterThanOrEqual(0);
            expect(point.x + box.width).toBeLessThanOrEqual(898);
            expect(point.y + box.height).toBeLessThanOrEqual(804);
            expect(results.every(previous => !overlaps(previous, box))).toBe(true);
            results.push(box);
            session.ghosts['g' + i] = { id: 'g' + i, text: wording, ...point, scopeIds: ['a'], createdAt: 2 };
        }
    });
});
