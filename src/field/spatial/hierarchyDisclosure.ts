import type { Camera, Ghost, Thought } from '../../core/model.ts';
import type { ThoughtHierarchy } from '../../core/hierarchy.ts';
import { disclosureBox } from './collision.ts';
import { readableLabels } from './representation.ts';
import { scaleLevel, type Bounds } from './geometry.ts';

// Every actual hierarchy level gets a reachable zoom band. Deep branches share the
// remaining NORMAL reading range, so ordinary disclosure never magnifies the whole
// Field beyond 100%. Explicit pinch/manual zoom keeps its existing independent range.
const READING_ZOOM = 1;
const DEEP_BOUNDARY = .98;
function depthBoundary(depth: number, maxDepth: number): number {
    if (depth <= 3) return [.08, .25, .50, .80][depth];
    return .80 * Math.pow(DEEP_BOUNDARY / .80, (depth - 3) / (maxDepth - 3));
}
function depthMargin(depth: number, maxDepth: number): number {
    const boundary = depthBoundary(depth, maxDepth);
    const next = depth < maxDepth ? depthBoundary(depth + 1, maxDepth) : READING_ZOOM;
    return Math.min(.025, (boundary - depthBoundary(depth - 1, maxDepth)) / 4, (next - boundary) / 4);
}
export function zoomDepth(zoom: number, previous?: number, maxDepth = 3): number {
    const estimate = maxDepth > 3 && zoom >= .8 ? 3 + Math.floor(Math.log(zoom / .8) / Math.log(DEEP_BOUNDARY / .8) * (maxDepth - 3)) : 0;
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
    const upper = next < maxDepth ? depthBoundary(next + 1, maxDepth) - depthMargin(next + 1, maxDepth) - 1e-8 : maxDepth ? READING_ZOOM : 2.5;
    const center = Math.max(lower, Math.min(upper, [.16, .38, .65, 1][next] ?? (lower + upper) / 2));
    const proposed = zoom * Math.exp(-delta * .0015);
    const target = next === depth ? proposed : step > 0 ? Math.max(center, proposed) : Math.min(center, proposed);
    return Math.max(lower, Math.min(upper, target));
}

/** The same theme roles identify node levels and incoming arrows. Exact depth remains visible
 * in the node label even when a very deep branch cycles through the four ink/line recipes. */
export function hierarchyStyle(depth: number): number { return depth > 0 ? (depth - 1) % 4 + 1 : 0; }

export interface DisclosureProjection {
    visible: string[];
    roots: string[];
    /** Eligible independent of viewport culling: the input to fit-to-content. */
    eligible: string[];
    hidden: string[];
    suggestions: string[];
}

/** One visibility contract for rendering, hit testing, placement and camera framing. */
export function discloseHierarchy({ items, hierarchy, found, camera, viewport, depth, editing, currentMatch, recalls, expanded, branches = {}, measured }: {
    items: Record<string, Thought | Ghost>; hierarchy: ThoughtHierarchy; found: string[];
    camera: Camera; viewport: { width: number; height: number }; depth: number;
    selection: readonly string[]; editing: string | null; currentMatch?: string | null;
    matches?: ReadonlySet<string>; recalls: readonly string[]; expanded: ReadonlySet<string>;
    branches?: Readonly<Record<string, boolean>>;
    measured: (id: string) => Bounds | undefined; selectionReveals?: boolean;
}): DisclosureProjection {
    const tier = scaleLevel(camera.zoom);
    // Selection and an entire Find result set are not blanket visibility exceptions.
    const protectedIds = new Set([...(editing ? [editing] : []), ...(currentMatch ? [currentMatch] : [])]);
    const contextIds = new Set(protectedIds);
    for (const id of protectedIds) {
        let parent = hierarchy.parent.get(id);
        while (parent && !contextIds.has(parent)) { contextIds.add(parent); parent = hierarchy.parent.get(parent); }
    }
    const isRoot = (id: string) => hierarchy.parent.get(id) === null;
    const blocked = new Map<string, boolean>();
    const branchAllows = (id: string): boolean => {
        const path: string[] = [];
        let cursor: string | null = id;
        while (cursor && !blocked.has(cursor)) {
            path.push(cursor);
            const parent: string | null = hierarchy.parent.get(cursor) ?? null;
            if (parent && branches[parent] === false) { blocked.set(cursor, true); break; }
            cursor = parent;
        }
        const hidden = cursor ? blocked.get(cursor) ?? false : false;
        for (const member of path) blocked.set(member, hidden);
        if (hidden) return false;
        const directParent = hierarchy.parent.get(id) ?? '';
        return isRoot(id) || (hierarchy.depth.get(id) ?? 0) <= depth || expanded.has(directParent);
    };
    const eligible = Object.keys(items).filter(id => {
        const item = items[id];
        const ghost = 'scopeIds' in item;
        if (id === editing) return true;
        if (ghost && tier === 'atlas') return false;
        if (contextIds.has(id)) return true;
        if (!branchAllows(id)) return false;
        if (ghost) return true;
        if (item.kind === 'source' && tier !== 'local') return false;
        if (item.life === 'memory' && !isRoot(id) && !recalls.includes(id)) return false;
        // At Atlas, branch detail is represented by its root, even if explicitly expanded.
        return tier !== 'atlas' || isRoot(id) || item.kind === 'crystal';
    });
    const eligibleSet = new Set(eligible);
    const candidates = found.filter(id => eligibleSet.has(id)).map(id => {
        const item = items[id], kind = 'kind' in item ? item.kind : 'thought';
        const box = measured(id);
        const size = box ? { width: box.width * camera.zoom, height: box.height * camera.zoom } : disclosureBox(item.text, camera.zoom, kind);
        return { id, x: item.x, y: item.y, ...size, priority: id === editing ? 9 : id === currentMatch ? 8 : contextIds.has(id) ? 7 : 'scopeIds' in item ? 6 : kind === 'crystal' ? 5 : isRoot(id) ? 4 : 2 };
    });
    const limit = tier === 'local' ? 240 : 64;
    const visible = tier === 'atlas' && !hierarchy.children.size
        ? readableLabels(candidates, camera, viewport, limit)
        : candidates.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, limit).map(item => item.id);
    const shown = new Set(visible);
    const roots = found.filter(id => !shown.has(id) && 'kind' in items[id] && items[id].kind !== 'source' && (hierarchy.originalRoots.has(id) || eligibleSet.has(id) && (isRoot(id) || protectedIds.has(id))));
    return {
        visible: visible.sort(), roots: roots.sort(), eligible,
        hidden: Object.keys(items).filter(id => !eligibleSet.has(id)),
        suggestions: Object.keys(items).filter(id => 'scopeIds' in items[id] && !shown.has(id)),
    };
}
