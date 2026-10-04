import type { Camera, Point } from '../core/model.ts';
import type { Bounds } from './spatial/geometry.ts';

/** Imperative Field boundary shared with workspace commands; no renderer state. */
export interface FieldHandle {
    focus: () => void;
    camera: () => Camera;
    restore: (c: Camera) => void;
    centerOn: (ids: string[]) => void;
    reveal: (ids: string[]) => void;
    centerPoint: () => Point;
    zoomOut: () => void;
    visibleIds: () => string[];
    screenPoint: (point: Point) => Point;
    viewBounds: () => Bounds;
}
export interface FieldFind {
    matches: Set<string>;
    current: string | null;
}
