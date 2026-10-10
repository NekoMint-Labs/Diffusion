import { describe, expect, it } from 'vitest';
import { GeometryCache } from '../../src/field/spatial/index.ts';
import { relationPlacementObstacles } from '../../src/field/interactionHygiene.ts';
import { placeRelationLabels } from '../../src/field/phenomena/relationLabelPlacement.ts';
import type { RelationPhenomenon } from '../../src/field/phenomena/describe.ts';

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
describe('relations clear the contextual card actions', () => {
    it.each([0.75, 1, 1.5])('keeps the full token outside the card footer at zoom %s', zoom => {
        const geometry = new GeometryCache();
        geometry.setPosition('card', 100, 100);
        geometry.measure('card', 250, 100);
        const actions = new Map([['card', { x: 0, y: 108, width: 280, height: 36 }]]);
        const obstacles = relationPlacementObstacles(['card'], geometry, { x: 0, y: 0, zoom }, { left: 0, top: 0, width: 1200, height: 800 }, null, actions);
        expect(obstacles).toContainEqual({ x: 100, y: 208, width: 280, height: 36 });
        const relation: RelationPhenomenon = { id: 'r', kind: 'gap', label: '指标定义待明确', confirmed: false, released: false, a: { x: 100, y: 220 }, b: { x: 380, y: 220 }, mid: { x: 240, y: 220 }, path: '' };
        const token = placeRelationLabels([relation], obstacles, zoom).r;
        const rect = { x: token.x, y: token.y, width: token.width / zoom, height: token.height / zoom };
        expect(obstacles.every(obstacle => !overlaps(rect, obstacle))).toBe(true);
        expect(geometry.get('card')).toEqual({ x: 100, y: 100, width: 250, height: 100 });
    });
});
