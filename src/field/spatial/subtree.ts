import type { Thought } from '../../core/model.ts';
import { thoughtHierarchy } from '../../core/hierarchy.ts';

/** Movement follows effective organization, never every provenance or relation edge.
 * Membership is computed once per deliberate action, independent of visibility. */
export function subtreeIds(roots: readonly string[], thoughts: Record<string, Thought>): string[] {
    const hierarchy = thoughtHierarchy(thoughts);
    const ids = new Set(roots.filter(id => Object.hasOwn(thoughts, id)));
    for (const id of ids) for (const child of hierarchy.children.get(id) ?? []) ids.add(child);
    return [...ids];
}
