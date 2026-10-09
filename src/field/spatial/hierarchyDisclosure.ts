import type { Camera, Ghost, Thought } from '../../core/model.ts';
import type { ThoughtHierarchy } from '../../core/hierarchy.ts';
import { disclosureBox } from './collision.ts';
import { readableLabels } from './representation.ts';
import { scaleLevel, type Bounds } from './geometry.ts';

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
export function discloseHierarchy({ items, hierarchy, found, camera, viewport, editing, currentMatch, recalls, branches = {}, measured }: {
    items: Record<string, Thought | Ghost>; hierarchy: ThoughtHierarchy; found: string[];
    camera: Camera; viewport: { width: number; height: number };
    selection: readonly string[]; editing: string | null; currentMatch?: string | null;
    matches?: ReadonlySet<string>; recalls: readonly string[];
    branches?: Readonly<Record<string, boolean>>;
    measured: (id: string) => Bounds | undefined;
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
    // Sources are omitted at Atlas. The first Thought on each source-only path stands in for
    // that branch, using its existing coordinates and effective parent, never editing lineage.
    const sourcePaths = new Map<string, boolean>();
    const sourceOnlyPath = (id: string | null): boolean => {
        const path: string[] = [];
        let cursor = id;
        while (cursor && !sourcePaths.has(cursor)) {
            const item = items[cursor];
            if (!item || !('kind' in item) || item.kind !== 'source') break;
            path.push(cursor); cursor = hierarchy.parent.get(cursor) ?? null;
        }
        const onlySources = cursor === null || sourcePaths.get(cursor) === true;
        for (const member of path) sourcePaths.set(member, onlySources);
        return onlySources;
    };
    const atlasAnchors = new Set(tier === 'atlas' ? Object.keys(items).filter(id => {
        const item = items[id];
        return 'kind' in item && item.kind !== 'source' && sourceOnlyPath(hierarchy.parent.get(id) ?? null);
    }) : []);

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
        return true;
    };
    const eligible = Object.keys(items).filter(id => {
        const item = items[id];
        const ghost = 'scopeIds' in item;
        if (id === editing) return true;
        if (ghost && tier === 'atlas' && !contextIds.has(id)) return false;
        if (contextIds.has(id)) return true;
        if (!branchAllows(id)) return false;
        if (ghost) return true;
        if (item.kind === 'source' && tier !== 'local') return false;
        if (item.life === 'memory' && !isRoot(id) && !atlasAnchors.has(id) && !recalls.includes(id)) return false;
        return true;
    });
    const eligibleSet = new Set(eligible);
    // Overview changes detail only. Eligible descendants still contribute to fit and world anchors.
    const candidates = found.filter(id => eligibleSet.has(id) && (tier !== 'atlas' || isRoot(id) || atlasAnchors.has(id) || contextIds.has(id) || 'kind' in items[id] && items[id].kind === 'crystal')).map(id => {
        const item = items[id], kind = 'kind' in item ? item.kind : 'thought';
        const box = measured(id);
        const size = box ? { width: box.width * camera.zoom, height: box.height * camera.zoom } : disclosureBox(item.text, camera.zoom, kind);
        return { id, x: item.x, y: item.y, ...size, priority: id === editing ? 9 : id === currentMatch ? 8 : contextIds.has(id) ? 7 : 'scopeIds' in item ? 6 : kind === 'crystal' ? 5 : isRoot(id) || atlasAnchors.has(id) ? 4 : 2 };
    });
    const limit = tier === 'local' ? 240 : 64;
    const visible = tier === 'atlas' && !hierarchy.children.size
        ? readableLabels(candidates, camera, viewport, limit)
        : candidates.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, limit).map(item => item.id);
    const shown = new Set(visible);
    const roots = found.filter(id => !shown.has(id) && 'kind' in items[id] && items[id].kind !== 'source' && eligibleSet.has(id));
    return {
        visible: visible.sort(), roots: roots.sort(), eligible,
        hidden: Object.keys(items).filter(id => !eligibleSet.has(id)),
        suggestions: Object.keys(items).filter(id => 'scopeIds' in items[id] && !shown.has(id)),
    };
}
