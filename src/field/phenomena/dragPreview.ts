import type { Phenomenon, Relation } from '../../core/model.ts';
import type { Gesture } from '../spatial/gesture.ts';
import type { Bounds } from '../spatial/geometry.ts';
import { describeRelations, type GeometryLookup } from './describe.ts';

/** Mirrors a selection drag into confirmed relation SVG without committing geometry.
 *
 * Field gestures preview Thought positions directly on DOM nodes while canonical coordinates stay
 * untouched until pointer-up. This helper gives the visible confirmed topology the same temporary
 * geometry. Tentative phenomena are deliberately ignored: moving something must never turn
 * proximity into semantic commitment, and no model/core state is written here. */
export function paintConfirmedDragRelations(
    layer: SVGGElement | null,
    relations: readonly (Relation | Phenomenon)[],
    geometry: GeometryLookup,
    gesture: Gesture | null,
    zoom: number,
): void {
    if (!layer)
        return;
    const dx = gesture ? (gesture.last.x - gesture.start.x) / zoom : 0;
    const dy = gesture ? (gesture.last.y - gesture.start.y) / zoom : 0;
    const lookup: GeometryLookup = {
        get(id: string): Bounds | undefined {
            const bounds = geometry.get(id);
            const origin = gesture?.positions[id];
            return bounds && origin ? { ...bounds, x: origin.x + dx, y: origin.y + dy } : bounds;
        },
    };
    for (const relation of describeRelations(relations, lookup, false)) {
        if (!relation.confirmed)
            continue;
        const group = layer.querySelector<SVGGElement>(`[data-relation-id="${CSS.escape(relation.id)}"]`);
        if (!group)
            continue;
        const path = group.querySelector('path');
        const text = group.querySelector('text');
        if (path)
            path.setAttribute('d', relation.path);
        if (text) {
            text.setAttribute('x', String(relation.mid.x));
            text.setAttribute('y', String(relation.mid.y));
        }
    }
}
