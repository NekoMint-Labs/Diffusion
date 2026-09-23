import type { Phenomenon, Point, Relation, RelationKind } from '../../core/model.ts';
import { center, type Bounds } from '../spatial/geometry.ts';

/** One relation between two Thoughts, resolved into world space. Semantic state owns only endpoints;
 * this presentation layer owns where a visible connector meets their measured boundaries. */
export interface RelationPhenomenon {
    id: string;
    kind: RelationKind;
    label: string;
    confirmed: boolean;
    /** Boundary points, never centers inside node content. */
    a: Point;
    b: Point;
    mid: Point;
    path: string;
    released: boolean;
}
export interface GeometryLookup { get(id: string): Bounds | undefined; }

/** Rectangle/ray intersection, adapted as a small geometry contract rather than a diagram engine. */
export function boundaryToward(bounds: Bounds, target: Point): Point {
    const from = center(bounds);
    const dx = target.x - from.x, dy = target.y - from.y;
    if (dx === 0 && dy === 0) return from;
    const halfWidth = Math.max(1, bounds.width / 2);
    const halfHeight = Math.max(1, bounds.height / 2);
    const scale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
    return { x: from.x + dx * scale, y: from.y + dy * scale };
}

export function describeConnection(aId: string, bId: string, geometry: GeometryLookup): Pick<RelationPhenomenon, 'a' | 'b' | 'mid' | 'path'> | null {
    const aBounds = geometry.get(aId), bBounds = geometry.get(bId);
    if (!aBounds || !bBounds) return null;
    const aCenter = center(aBounds), bCenter = center(bBounds);
    const a = boundaryToward(aBounds, bCenter);
    const b = boundaryToward(bBounds, aCenter);
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const bend = Math.max(10, Math.min(34, length * .08));
    const offset = { x: -dy / length * bend, y: dx / length * bend };
    const c1 = { x: a.x + dx * .32 + offset.x, y: a.y + dy * .32 + offset.y };
    const c2 = { x: b.x - dx * .32 + offset.x, y: b.y - dy * .32 + offset.y };
    const mid = {
        x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
        y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
    };
    return { a, b, mid, path: `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}` };
}

/** A relation with no measured endpoint is not presentable yet, so it is absent rather than
 * rendered at an invented position. */
export function describeRelations(relations: readonly (Relation | Phenomenon)[], geometry: GeometryLookup, released: boolean): RelationPhenomenon[] {
    const described: RelationPhenomenon[] = [];
    for (const relation of relations) {
        const connection = describeConnection(relation.a, relation.b, geometry);
        if (!connection) continue;
        described.push({ id: relation.id, kind: relation.kind, label: relation.label, confirmed: 'status' in relation, ...connection, released });
    }
    return described;
}
