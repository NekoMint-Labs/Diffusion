import type { Camera, Ghost, Thought } from '../../core/model.ts';
import type { ThoughtHierarchy } from '../../core/hierarchy.ts';
import { disclosureBox } from './collision.ts';
import { readableLabels } from './representation.ts';
import { scaleLevel, type Bounds } from './geometry.ts';

// Four readable stages: roots, one child layer, two child layers, all detail. The final
// stage has no artificial depth cap, including deeply imported branches.
const DEPTH_THRESHOLDS = [.25, .50, .80];
const DEPTH_BUDGETS = [0, 1, 2, Infinity];
export function zoomDepth(zoom: number, previous?: number): number {
    let stage = previous === undefined ? 0 : Math.max(0, DEPTH_BUDGETS.indexOf(previous));
    const margin = previous === undefined ? 0 : .025;
    while (stage < DEPTH_THRESHOLDS.length && zoom >= DEPTH_THRESHOLDS[stage] + margin) stage++;
    while (stage > 0 && zoom < DEPTH_THRESHOLDS[stage - 1] - margin) stage--;
    return DEPTH_BUDGETS[stage];
}

/** The same theme roles identify node levels and incoming arrows. Exact depth remains visible
 * in the node label even when a very deep branch cycles through the four ink/line recipes. */
export function hierarchyStyle(depth: number): number { return depth > 0 ? (depth - 1) % 4 + 1 : 0; }

export function discloseHierarchy({ items, hierarchy, found, camera, viewport, depth, selection, editing, currentMatch, matches, recalls, expanded, measured }: {
    items: Record<string, Thought | Ghost>; hierarchy: ThoughtHierarchy; found: string[];
    camera: Camera; viewport: { width: number; height: number }; depth: number;
    selection: readonly string[]; editing: string | null; currentMatch?: string | null;
    matches?: ReadonlySet<string>; recalls: readonly string[]; expanded: ReadonlySet<string>;
    measured: (id: string) => Bounds | undefined;
}): { visible: string[]; roots: string[] } {
    const tier = scaleLevel(camera.zoom);
    const protectedIds = new Set([...selection, ...(editing ? [editing] : []), ...(currentMatch ? [currentMatch] : []), ...matches ?? []]);
    const contextIds = new Set(protectedIds);
    // Protected descendants disclose their current ancestry when it fits. A parent label on
    // every child preserves context even when a reading box is outside the viewport or collides.
    for (const id of protectedIds) {
        let parent = hierarchy.parent.get(id);
        while (parent && !contextIds.has(parent)) { contextIds.add(parent); parent = hierarchy.parent.get(parent); }
    }
    const isRoot = (id: string) => hierarchy.parent.get(id) === null;
    const eligible = found.filter(id => {
        const item = items[id];
        if (!item) return false;
        if (contextIds.has(id) || 'scopeIds' in item) return true;
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
    const roots = found.filter(id => !shown.has(id) && items[id] && 'kind' in items[id] && items[id].kind !== 'source' && (isRoot(id) || hierarchy.originalRoots.has(id) || protectedIds.has(id)));
    return { visible: visible.sort(), roots: roots.sort() };
}
