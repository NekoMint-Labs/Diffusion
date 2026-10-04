import { useCallback, useRef } from 'react';
import type { ThoughtHierarchy } from '../../core/hierarchy.ts';
import { hierarchyWheelZoom, zoomDepth } from './hierarchyDisclosure.ts';
import type { resolveWheelZoom } from './gesture.ts';

/** Transient branch expansion and wheel intent share the same current hierarchy.
 * Only the existing camera snapshot persists; authored coordinates never change. */
export function useHierarchyDisclosure(initialZoom: number) {
    const state = useRef({ depth: zoomDepth(initialZoom), maxDepth: 3, strictSelection: false, selection: null as string | null, hierarchy: null as ThoughtHierarchy | null, expanded: new Set<string>(), expansionZoom: 0 });
    const update = useCallback((zoom: number, hierarchy: ThoughtHierarchy, selection: readonly string[]) => {
        // A new deliberate selection/Claim may open reading context. Wheel disclosure owns
        // the existing selection until the person changes it; it never changes the scope itself.
        const selectionKey = JSON.stringify(selection);
        if (state.current.selection !== selectionKey) { state.current.selection = selectionKey; state.current.strictSelection = false; }
        if (state.current.hierarchy !== hierarchy) {
            state.current.hierarchy = hierarchy;
            let maxDepth = 0;
            for (const depth of hierarchy.depth.values()) maxDepth = Math.max(maxDepth, depth);
            state.current.maxDepth = maxDepth;
        }
        const previous = state.current.depth;
        state.current.depth = zoomDepth(zoom, previous, state.current.maxDepth);
        if (state.current.depth < previous || zoom < state.current.expansionZoom - .05) {
            state.current.expanded.clear(); state.current.expansionZoom = 0;
        }
    }, []);
    const wheel = useCallback((zoom: number, resolved: ReturnType<typeof resolveWheelZoom>, hierarchy: ThoughtHierarchy, selection: readonly string[]) => {
        update(zoom, hierarchy, selection);
        if (resolved.pinch) return zoom * Math.exp(-resolved.delta * .0015);
        let depth = state.current.depth;
        for (const id of state.current.expanded) for (const child of hierarchy.children.get(id) ?? []) depth = Math.max(depth, hierarchy.depth.get(child) ?? 0);
        const next = hierarchyWheelZoom(zoom, depth, state.current.maxDepth, resolved.delta, resolved.step);
        if (resolved.step) { state.current.strictSelection = true; state.current.expanded.clear(); state.current.expansionZoom = 0; }
        return next;
    }, [update]);
    const expand = useCallback((id: string, zoom: number) => {
        state.current.expanded.add(id); state.current.expansionZoom = zoom;
    }, []);
    return { state, update, expand, wheel };
}
