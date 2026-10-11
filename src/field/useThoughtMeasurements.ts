import { useCallback, useEffect, useRef, useState } from 'react';
import type { Ghost, Thought } from '../core/model.ts';
import type { GeometryCache } from './spatial/index.ts';
import type { Bounds } from './spatial/geometry.ts';

/** Contextual actions invalidate overlay layout; the Field's disclosure measurement lifecycle
 * continues to own card resize and repeated Ghost correction. Canonical coordinates stay put. */
export function useThoughtActionMeasurements(items: Record<string, Thought | Ghost>) {
    const actionBounds = useRef(new Map<string, Bounds>());
    const [, setMeasurementEpoch] = useState(0);
    useEffect(() => {
        for (const key of actionBounds.current.keys()) if (!items[key]) actionBounds.current.delete(key);
    }, [items]);
    // These offsets belong only to contextual UI placement. They never enter GeometryCache,
    // collision/lasso bounds or canonical state, and do not change on each pointer frame.
    const onActionsMeasure = useCallback((key: string, bounds: Bounds | null) => {
        const old = actionBounds.current.get(key);
        if (!bounds) {
            if (!actionBounds.current.delete(key)) return;
        } else {
            if (old && old.x === bounds.x && old.y === bounds.y && old.width === bounds.width && old.height === bounds.height) return;
            actionBounds.current.set(key, bounds);
        }
        setMeasurementEpoch(epoch => epoch + 1);
    }, []);
    return { onActionsMeasure, actionBounds: actionBounds.current };
}

/** The Hub clears contextual controls without changing the cache used by collision and lasso. */
export function selectionUIBounds(ids: readonly string[], geometry: GeometryCache, actionBounds: ReadonlyMap<string, Bounds>): Bounds[] {
    return ids.flatMap(key => {
        const bounds = geometry.get(key);
        if (!bounds) return [];
        const actions = actionBounds.get(key);
        return actions ? [bounds, { ...actions, x: bounds.x + actions.x, y: bounds.y + actions.y }] : [bounds];
    });
}
