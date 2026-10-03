import type { Ghost, Thought } from './model.ts';
import { DomainError } from './errors.ts';

type HierarchyItem = Thought | Ghost;
export interface ThoughtHierarchy {
    parent: Map<string, string | null>;
    depth: Map<string, number>;
    children: Map<string, string[]>;
    originalRoots: Set<string>;
}
export function sourceIds(item: HierarchyItem): string[] {
    return 'scopeIds' in item ? item.scopeIds : item.derivedFrom ?? [];
}
/** Source order is the frozen request order. Its first surviving source supplies the default
 * display parent; all sources remain intact. Explicit null means a root, never "use default".
 * Invalid legacy links become roots. Cycles lose one deterministic display edge, without edits. */
export function thoughtHierarchy(items: Record<string, HierarchyItem>): ThoughtHierarchy {
    const parent = new Map<string, string | null>();
    const originalRoots = new Set<string>();
    for (const item of Object.values(items)) {
        const sources = sourceIds(item).filter(id => id !== item.id && Object.hasOwn(items, id));
        if (!sources.length && !('scopeIds' in item)) originalRoots.add(item.id);
        const chosen = 'organizingParentId' in item && item.organizingParentId !== undefined ? item.organizingParentId : sources[0] ?? null;
        parent.set(item.id, typeof chosen === 'string' && chosen !== item.id && Object.hasOwn(items, chosen) ? chosen : null);
    }
    const checked = new Set<string>();
    for (const start of parent.keys()) {
        const path: string[] = [], visiting = new Map<string, number>();
        let cursor: string | null = start;
        while (cursor && !checked.has(cursor) && !visiting.has(cursor)) {
            visiting.set(cursor, path.length); path.push(cursor); cursor = parent.get(cursor) ?? null;
        }
        if (cursor && visiting.has(cursor)) parent.set(path.slice(visiting.get(cursor)).sort()[0], null);
        for (const id of path) checked.add(id);
    }
    const depth = new Map<string, number>(), children = new Map<string, string[]>();
    for (const start of parent.keys()) {
        const path: string[] = [];
        let cursor: string | null = start;
        while (cursor && !depth.has(cursor)) { path.push(cursor); cursor = parent.get(cursor) ?? null; }
        let value = cursor ? depth.get(cursor)! + 1 : 0;
        for (const id of path.reverse()) depth.set(id, value++);
        const ancestor = parent.get(start);
        if (ancestor) {
            const siblings = children.get(ancestor) ?? [];
            siblings.push(start); children.set(ancestor, siblings);
        }
    }
    return { parent, depth, children, originalRoots };
}
export function organizingParentError(thoughts: Record<string, Thought>, id: string, parentId: string | null | undefined): string | null {
    if (!Object.hasOwn(thoughts, id) || thoughts[id].kind === 'source') return 'Thought not found';
    if (parentId === null) return null;
    const followsSources = parentId === undefined;
    if (parentId === undefined) parentId = thoughts[id].derivedFrom?.find(key => key !== id && Object.hasOwn(thoughts, key)) ?? null;
    if (parentId === null) return null;
    if (typeof parentId !== 'string' || !Object.hasOwn(thoughts, parentId) || !followsSources && thoughts[parentId].kind === 'source') return 'The chosen parent no longer exists.';
    const hierarchy = thoughtHierarchy(thoughts);
    let cursor: string | null = parentId;
    while (cursor) {
        if (cursor === id) return 'A thought cannot be its own ancestor.';
        cursor = hierarchy.parent.get(cursor) ?? null;
    }
    return null;
}
export function requireOrganizingParent(thoughts: Record<string, Thought>, id: string, parentId: string | null | undefined): void {
    const error = organizingParentError(thoughts, id, parentId);
    if (error) throw new DomainError(error);
}
