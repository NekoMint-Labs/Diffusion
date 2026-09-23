import { describe, expect, it } from 'vitest';
import type { RelationPhenomenon } from '../../src/field/phenomena/describe.ts';
import { placeRelationLabels } from '../../src/field/phenomena/relationLabelPlacement.ts';

function relation(id: string, a: { x: number; y: number }, b: { x: number; y: number }, label = 'shared idea', confirmed = false): RelationPhenomenon {
    return {
        id,
        kind: 'resonance',
        label,
        confirmed,
        a,
        b,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        path: `M${a.x},${a.y} L${b.x},${b.y}`,
        released: false,
    };
}

describe('relation label placement', () => {
    it('uses the edge midpoint when clear', () => {
        const placed = placeRelationLabels([relation('r1', { x: 0, y: 0 }, { x: 200, y: 0 })], [], 1).r1;
        expect(placed.anchor).toEqual({ x: 100, y: 0 });
    });

    it('expands deterministically away from blocked Thought bounds', () => {
        const r = relation('r1', { x: 0, y: 0 }, { x: 200, y: 0 });
        const obstacle = { x: 35, y: -2, width: 130, height: 4 };
        const placed = placeRelationLabels([r], [obstacle], 1).r1;
        const token = { x: placed.x, y: placed.y, width: placed.width, height: placed.height };
        const overlaps = !(token.x + token.width <= obstacle.x || obstacle.x + obstacle.width <= token.x || token.y + token.height <= obstacle.y || obstacle.y + obstacle.height <= token.y);
        expect(overlaps).toBe(false);
        expect(placeRelationLabels([r], [obstacle], 1).r1).toEqual(placed);
    });

    it('keeps nearby labels from landing directly on one another and stays stable', () => {
        const relations = [
            relation('candidate', { x: 0, y: 0 }, { x: 200, y: 0 }, 'candidate relation', false),
            relation('confirmed', { x: 0, y: 0 }, { x: 200, y: 0 }, 'confirmed relation', true),
        ];
        const first = placeRelationLabels(relations, [], 1);
        const second = placeRelationLabels(relations, [], 1);
        expect(first).toEqual(second);
        expect(first.candidate.anchor).toEqual({ x: 100, y: 0 });
        expect(first.confirmed.anchor).not.toEqual(first.candidate.anchor);
    });
});
