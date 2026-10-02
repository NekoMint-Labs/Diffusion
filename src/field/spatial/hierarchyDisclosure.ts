import type { Camera, Ghost, Thought } from '../../core/model.ts';
import type { ThoughtHierarchy } from '../../core/hierarchy.ts';
import { disclosureBox } from './collision.ts';
import { readableLabels } from './representation.ts';
import { scaleLevel, type Bounds } from './geometry.ts';

// Every actual hierarchy level gets a reachable zoom band. Deeper imported branches
// share the remaining camera range rather than jumping from level three to all detail.
function depthBoundary(depth: number, maxDepth: number): number {
    if (depth <= 3) return [.08, .25, .50, .80][depth];
    return .80 * Math.pow(2.35 / .80, (depth - 3) / (maxDepth - 3));
}
function depthMargin(depth: number, maxDepth: number): number {
    const boundary = depthBoundary(depth, maxDepth);
    const next = depth < maxDepth ? depthBoundary(depth + 1, maxDepth) : 2.5;
    return Math.min(.025, (boundary - depthBoundary(depth - 1, maxDepth)) / 4, (next - boundary) / 4);
}
export function zoomDepth(zoom: number, previous?: number, maxDepth = 3): number {
    const estimate = maxDepth > 3 && zoom >= .8 ? 3 + Math.floor(Math.log(zoom / .8) / Math.log(2.35 / .8) * (maxDepth - 3)) : 0;
    let depth = Math.min(maxDepth, Math.max(0, Number.isFinite(previous) ? previous! : estimate));
    while (depth < maxDepth && zoom >= depthBoundary(depth + 1, maxDepth) + (previous === undefined ? 0 : depthMargin(depth + 1, maxDepth))) depth++;
    while (depth > 0 && zoom < depthBoundary(depth, maxDepth) - (previous === undefined ? 0 : depthMargin(depth, maxDepth))) depth--;
    return depth;
}

/** One ordinary wheel step opens or closes exactly one level. Its zoom stays inside
 * that level's stable band, so the camera snapshot restores the same disclosure on reopen. */
export function hierarchyWheelZoom(zoom: number, depth: number, maxDepth: number, delta: number, step: number): number {
    if (!delta || !step) return zoom;
    const next = Math.max(0, Math.min(maxDepth, depth + step));
    const lower = next ? depthBoundary(next, maxDepth) + depthMargin(next, maxDepth) + 1e-8 : .08;
    const upper = next < maxDepth ? depthBoundary(next + 1, maxDepth) - depthMargin(next + 1, maxDepth) - 1e-8 : 2.5;
    const center = Math.max(lower, Math.min(upper, [.16, .38, .65, 1][next] ?? (lower + upper) / 2));
    const proposed = zoom * Math.exp(-delta * .0015);
    const target = next === depth ? proposed : step > 0 ? Math.max(center, proposed) : Math.min(center, proposed);
    return Math.max(lower, Math.min(upper, target));
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
