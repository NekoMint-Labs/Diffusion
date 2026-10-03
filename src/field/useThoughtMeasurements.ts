import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Ghost, Thought } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import type { GeometryCache } from './spatial/index.ts';
import type { Bounds } from './spatial/geometry.ts';
import type { CameraController } from './camera/controller.ts';
import { correctMeasuredGhost } from './interactionHygiene.ts';

/** Measured card bounds invalidate overlay placement, while canonical coordinates stay put.
 * Ghost collision correction and its once-per-identity cache share this measurement lifecycle. */
export function useThoughtMeasurements({ controller, geometry, items, camera, viewport }: {
    controller: ProjectController;
    geometry: GeometryCache;
    items: Record<string, Thought | Ghost>;
    camera: RefObject<CameraController | null>;
    viewport: RefObject<{ left: number; top: number; width: number; height: number }>;
}) {
    const liveItems = useRef(items);
    liveItems.current = items;
    const correctedGhosts = useRef(new Set<string>());
    const measuredSizes = useRef(new Map<string, string>());
    const actionBounds = useRef(new Map<string, Bounds>());
    const [, setMeasurementEpoch] = useState(0);
    useEffect(() => {
        const keys = new Set(Object.keys(items));
        correctedGhosts.current = new Set([...correctedGhosts.current].filter(key => keys.has(key)));
        for (const key of measuredSizes.current.keys()) if (!keys.has(key)) measuredSizes.current.delete(key);
    }, [items]);
    const onMeasure = useCallback((key: string) => {
        correctMeasuredGhost(key, correctedGhosts.current, controller, geometry, Object.keys(liveItems.current), camera.current?.get() ?? controller.getSnapshot().project.camera, viewport.current);
        const bounds = geometry.get(key);
        if (!bounds) return;
        const size = `${bounds.width}:${bounds.height}`;
        if (measuredSizes.current.get(key) !== size) {
            measuredSizes.current.set(key, size);
            setMeasurementEpoch(epoch => epoch + 1);
        }
    }, [controller, geometry, camera, viewport]);
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
    return { onMeasure, onActionsMeasure, actionBounds: actionBounds.current };
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
