import type { Camera, Ghost, Thought } from '../../core/model.ts';
import type { ThoughtHierarchy } from '../../core/hierarchy.ts';
import { disclosureBox } from './collision.ts';
import { readableLabels } from './representation.ts';
import { scaleLevel, type Bounds } from './geometry.ts';

const DEPTH_THRESHOLDS = [.20, .43, .78, 1.15, 1.65, 2.15];
/** Hysteresis is measured in zoom, so small wheel reversals at a boundary do not blink a branch.
 * Explicit camera framing may cross several thresholds; no disclosure step edits coordinates. */
export function zoomDepth(zoom: number, previous?: number): number {
    if (previous === undefined) return DEPTH_THRESHOLDS.filter(threshold => zoom >= threshold).length;
    let depth = previous;
    while (depth < DEPTH_THRESHOLDS.length && zoom >= DEPTH_THRESHOLDS[depth] + .025) depth++;
    while (depth > 0 && zoom < DEPTH_THRESHOLDS[depth - 1] - .025) depth--;
    return depth;
}

export function discloseHierarchy({ items, hierarchy, found, camera, viewport, depth, selection, editing, currentMatch, matches, recalls, expanded, measured }: {
    items: Record<string, Thought | Ghost>; hierarchy: ThoughtHierarchy; found: string[];
    camera: Camera; viewport: { width: number; height: number }; depth: number;
    selection: readonly string[]; editing: string | null; currentMatch?: string | null;
    matches?: ReadonlySet<string>; recalls: readonly string[]; expanded: ReadonlySet<string>;
    measured: (id: string) => Bounds | undefined;
}): { visible: string[]; roots: string[] } {
    const tier = scaleLevel(camera.zoom);
    const protectedIds = new Set([...selection, ...(editing ? [editing] : []), ...(currentMatch ? [currentMatch] : [])]);
    const isRoot = (id: string) => hierarchy.originalRoots.has(id) || hierarchy.parent.get(id) === null;
    const eligible = found.filter(id => {
        const item = items[id];
        if (!item) return false;
        if (protectedIds.has(id) || 'scopeIds' in item) return true;
        if (item.kind === 'source' && tier !== 'local') return false;
        if (item.life === 'memory' && !isRoot(id) && !recalls.includes(id) && !matches?.has(id)) return false;
        return isRoot(id) || (hierarchy.depth.get(id) ?? 0) <= depth || expanded.has(hierarchy.parent.get(id) ?? '');
    });
    const limit = tier === 'local' ? 240 : 64;
    const candidates = eligible.map(id => {
        const item = items[id], kind = 'kind' in item ? item.kind : 'thought';
        const box = measured(id);
        const size = box ? { width: box.width * camera.zoom, height: box.height * camera.zoom } : disclosureBox(item.text, camera.zoom, kind);
        return { id, x: item.x, y: item.y, ...size, priority: id === editing ? 9 : id === currentMatch ? 8 : protectedIds.has(id) ? 7 : 'scopeIds' in item ? 6 : kind === 'crystal' ? 5 : isRoot(id) ? 4 : 2 };
    });
    // Local retains authored overlaps. Compact tiers disclose only collision-free reading boxes.
    const visible = tier === 'local' ? candidates.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, limit).map(item => item.id) : readableLabels(candidates, camera, viewport, limit);
    const shown = new Set(visible);
    // Dense roots retain their exact spatial anchors and a bounded, searchable reading entry.
    const roots = found.filter(id => !shown.has(id) && items[id] && 'kind' in items[id] && items[id].kind !== 'source' && (isRoot(id) || protectedIds.has(id)));
    return { visible: visible.sort(), roots: roots.sort() };
}
