import { useCallback, useEffect, useRef, useState } from 'react';
import type { Camera, Ghost, Thought } from '../../core/model.ts';
import { scaleLevel, type Bounds } from './geometry.ts';

/** Actual reading boxes, coalesced after layout; camera animation never queues React frames. */
export function useDisclosureMeasurements() {
    const boxes = useRef(new Map<string, { width: number; height: number; zoom: number; tier: string; text: string }>());
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [, setVersion] = useState(0);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    const get = useCallback((id: string, item: Thought | Ghost | undefined, camera: Camera): Bounds | undefined => {
        const box = boxes.current.get(id), tier = scaleLevel(camera.zoom);
        if (!box || !item || box.tier !== tier || box.text !== item.text) return undefined;
        const scale = tier === 'local' ? 1 : box.zoom / camera.zoom;
        return { x: item.x, y: item.y, width: box.width * scale, height: box.height * scale };
    }, []);
    const record = useCallback((id: string, box: Bounds | undefined, item: Thought | Ghost | undefined, camera: Camera, moving: boolean, settled: () => void) => {
        if (!box || !item) return;
        const old = boxes.current.get(id);
        if (old && old.width === box.width && old.height === box.height && old.zoom === camera.zoom && old.text === item.text) return;
        boxes.current.set(id, { width: box.width, height: box.height, zoom: camera.zoom, tier: scaleLevel(camera.zoom), text: item.text });
        if (moving) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { timer.current = null; setVersion(value => value + 1); settled(); }, 100);
    }, []);
    return { get, record };
}
