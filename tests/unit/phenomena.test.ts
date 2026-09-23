import { describe, expect, it } from 'vitest';
import type { Phenomenon, Relation } from '../../src/core/model.ts';
import { describeRelations, type GeometryLookup } from '../../src/field/phenomena/describe.ts';

const geometry = (boxes: Record<string, { x: number; y: number; width: number; height: number }>): GeometryLookup => ({ get: id => boxes[id] });
const relation = (over: Partial<Relation> = {}): Relation => ({ id: 'r1', a: 'a', b: 'b', kind: 'tension', label: 'A tension', status: 'confirmed', createdAt: 1, ...over });
const phenomenon = (over: Partial<Phenomenon> = {}): Phenomenon => ({ id: 'p1', a: 'a', b: 'b', kind: 'gap', label: 'Maybe', ...over });
const boxes = { a: { x: 100, y: 200, width: 250, height: 100 }, b: { x: 500, y: 400, width: 250, height: 100 } };

describe('relation phenomena description', () => {
    it('resolves boundary-to-boundary endpoints and the world midpoint', () => {
        const [described] = describeRelations([relation()], geometry(boxes), false);
        expect(described.a).toEqual({ x: 325, y: 300 });
        expect(described.b).toEqual({ x: 525, y: 400 });
        expect(described.mid.x).toBeCloseTo(419);
        expect(described.mid.y).toBeCloseTo(362);
        expect(described.path).toMatch(/^M325,300 C.+ 525,400$/);
    });

    it('separates a commitment from a possibility without losing the kind', () => {
        const [confirmed] = describeRelations([relation()], geometry(boxes), false);
        const [tentative] = describeRelations([phenomenon()], geometry(boxes), false);
        expect(confirmed.confirmed).toBe(true);
        expect(confirmed.kind).toBe('tension');
        expect(confirmed.label).toBe('A tension');
        expect(tentative.confirmed).toBe(false);
        expect(tentative.kind).toBe('gap');
    });

    it('omits a relation whose endpoint has not been measured rather than inventing a position', () => {
        expect(describeRelations([relation()], geometry({ a: boxes.a }), false)).toEqual([]);
        expect(describeRelations([relation()], geometry({ a: boxes.a, b: boxes.b }), false)).toHaveLength(1);
    });

    it('carries released as presentation state and never mutates the spatial input', () => {
        const input = structuredClone(boxes);
        const [described] = describeRelations([relation()], geometry(boxes), true);
        expect(described.released).toBe(true);
        expect(boxes).toEqual(input);
    });
});
