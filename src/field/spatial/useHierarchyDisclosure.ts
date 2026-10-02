import { useCallback, useRef } from 'react';
import { zoomDepth } from './hierarchyDisclosure.ts';

/** Expansion is transient reading intent. A deliberate zoom-out releases it so it cannot
 * pin a deep branch open across the normal depth stages. No canonical state is changed. */
export function useHierarchyDisclosure(initialZoom: number) {
    const state = useRef({ depth: zoomDepth(initialZoom), expanded: new Set<string>(), expansionZoom: 0 });
    const update = useCallback((zoom: number) => {
        const previous = state.current.depth;
        state.current.depth = zoomDepth(zoom, previous);
        if (state.current.depth < previous || zoom < state.current.expansionZoom - .05) {
            state.current.expanded.clear(); state.current.expansionZoom = 0;
        }
    }, []);
    const expand = useCallback((id: string, zoom: number) => {
        state.current.expanded.add(id); state.current.expansionZoom = zoom;
    }, []);
    return { state, update, expand };
}
