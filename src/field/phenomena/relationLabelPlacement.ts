import type { Bounds } from '../spatial/geometry.ts';
import type { RelationPhenomenon } from './describe.ts';

export interface RelationLabelPlacement {
    id: string;
    /** World-space top-left, ready for the Field's world transform. */
    x: number;
    y: number;
    /** CSS pixel size before the label applies inverse zoom. */
    width: number;
    height: number;
    /** World-space anchor for a contextual relation surface. */
    anchor: { x: number; y: number };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const outside = (a: Bounds, b: Bounds) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const inflate = (rect: Bounds, amount: number): Bounds => ({ x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 });

/** Compact Relation Token dimensions. Candidate state is carried by material, not a second text row. */
export function estimateRelationLabelSize(label: string, tentative: boolean): { width: number; height: number } {
    const glyphs = Array.from(label.trim());
    const wide = glyphs.reduce((sum, char) => sum + (/[^\u0000-\u00ff]/u.test(char) ? 11 : 6.6), 0);
    return { width: clamp(Math.round(wide + 26), 96, 236), height: tentative ? 34 : 30 };
}

function candidateAnchors(relation: RelationPhenomenon, width: number, height: number, safeZoom: number) {
    const dx = relation.b.x - relation.a.x;
    const dy = relation.b.y - relation.a.y;
    const length = Math.hypot(dx, dy) || 1;
    const tangent = { x: dx / length, y: dy / length };
    const normal = { x: -tangent.y, y: tangent.x };
    const px = (value: number) => value / safeZoom;
    const anchors: { x: number; y: number }[] = [];
    const add = (x: number, y: number) => anchors.push({ x, y });

    // Edge midpoint first, then increasingly distant normal slots.
    for (const offset of [0, 18, -18, 34, -34, 54, -54, 78, -78, 108, -108])
        add(relation.mid.x + normal.x * px(offset), relation.mid.y + normal.y * px(offset));

    // Endpoint-side slots are useful when the midpoint sits inside a dense cluster.
    for (const endpoint of [relation.a, relation.b]) {
        for (const normalOffset of [34, -34, 64, -64])
            add(endpoint.x + normal.x * px(normalOffset) + tangent.x * px(endpoint === relation.a ? 28 : -28), endpoint.y + normal.y * px(normalOffset) + tangent.y * px(endpoint === relation.a ? 28 : -28));
    }

    // Small nearby rings make the search resilient without a global layout or random jitter.
    const baseRadius = Math.max(width, height) / 2 + px(26);
    for (let ring = 1; ring <= 6; ring++) {
        const radius = baseRadius + px(ring * 30);
        for (let slot = 0; slot < 12; slot++) {
            const angle = slot * Math.PI / 6;
            add(relation.mid.x + Math.cos(angle) * radius, relation.mid.y + Math.sin(angle) * radius);
        }
    }
    return anchors;
}

/**
 * Deterministic local token placement. A blocked midpoint never becomes permission to overlap a
 * Thought: the search expands outward until a clear nearby slot is found.
 */
export function placeRelationLabels(relations: readonly RelationPhenomenon[], thoughtBounds: readonly Bounds[], zoom: number): Record<string, RelationLabelPlacement> {
    const safeZoom = Math.max(.08, zoom || 1);
    const occupied: Bounds[] = [];
    const result: Record<string, RelationLabelPlacement> = {};
    const clearance = 8 / safeZoom;
    const ordered = [...relations].sort((a, b) => Number(a.confirmed) - Number(b.confirmed) || a.id.localeCompare(b.id));
    for (const relation of ordered) {
        const size = estimateRelationLabelSize(relation.label, !relation.confirmed);
        const width = size.width / safeZoom;
        const height = size.height / safeZoom;
        const blocked = (rect: Bounds) => thoughtBounds.some(bound => !outside(rect, inflate(bound, clearance))) || occupied.some(bound => !outside(rect, inflate(bound, clearance)));
        const anchors = candidateAnchors(relation, width, height, safeZoom);
        let chosen: { rect: Bounds; anchor: { x: number; y: number } } | undefined;
        for (const anchor of anchors) {
            const rect = { x: anchor.x - width / 2, y: anchor.y - height / 2, width, height };
            if (!blocked(rect)) { chosen = { rect, anchor }; break; }
        }
        // Extremely dense Fields still prefer a farther deterministic slot to covering content.
        if (!chosen) {
            for (let step = 1; step <= 20 && !chosen; step++) {
                const anchor = { x: relation.mid.x, y: relation.mid.y - (height + clearance) * (6 + step) };
                const rect = { x: anchor.x - width / 2, y: anchor.y - height / 2, width, height };
                if (!blocked(rect)) chosen = { rect, anchor };
            }
        }
        if (!chosen) {
            for (let ring = 7; ring <= 32 && !chosen; ring++) {
                const radius = Math.max(width, height) / 2 + ring * 42 / safeZoom;
                for (let slot = 0; slot < 16; slot++) {
                    const angle = slot * Math.PI / 8;
                    const anchor = { x: relation.mid.x + Math.cos(angle) * radius, y: relation.mid.y + Math.sin(angle) * radius };
                    const rect = { x: anchor.x - width / 2, y: anchor.y - height / 2, width, height };
                    if (!blocked(rect)) { chosen = { rect, anchor }; break; }
                }
            }
        }
        if (!chosen) continue;
        occupied.push(chosen.rect);
        result[relation.id] = { id: relation.id, x: chosen.rect.x, y: chosen.rect.y, width: size.width, height: size.height, anchor: chosen.anchor };
    }
    return result;
}
