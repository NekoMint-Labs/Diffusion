import type { Camera, Point } from '../../core/model.ts';
export interface Bounds extends Point {
    width: number;
    height: number;
}
export const intersects = (a: Bounds, b: Bounds): boolean => a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
export const center = (b: Bounds): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
export const rectangle = (a: Point, b: Point): Bounds => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) });
export const worldToScreen = (p: Point, c: Camera): Point => ({ x: p.x * c.zoom + c.x, y: p.y * c.zoom + c.y });
export const screenToWorld = (p: Point, c: Camera): Point => ({ x: (p.x - c.x) / c.zoom, y: (p.y - c.y) / c.zoom });
export function viewportBounds(c: Camera, width: number, height: number, overscan = 250): Bounds { return { x: (-c.x - overscan) / c.zoom, y: (-c.y - overscan) / c.zoom, width: (width + overscan * 2) / c.zoom, height: (height + overscan * 2) / c.zoom }; }
export const scaleLevel = (zoom: number): 'local' | 'neighborhood' | 'atlas' => zoom > .62 ? 'local' : zoom > .27 ? 'neighborhood' : 'atlas';
export function zoomCameraAt(camera: Camera, point: Point, zoom: number): Camera {
    const clamped = Math.max(.08, Math.min(2.5, zoom));
    const world = screenToWorld(point, camera);
    return { x: point.x - world.x * clamped, y: point.y - world.y * clamped, zoom: clamped };
}
export function distanceBetween(a: Bounds, b: Bounds): number {
    const dx = Math.max(a.x - b.x - b.width, b.x - a.x - a.width, 0);
    const dy = Math.max(a.y - b.y - b.height, b.y - a.y - a.height, 0);
    return Math.hypot(dx, dy);
}
export function unionBounds(bounds: readonly Bounds[]): Bounds | null {
    if (!bounds.length) return null;
    const left = Math.min(...bounds.map(item => item.x));
    const top = Math.min(...bounds.map(item => item.y));
    const right = Math.max(...bounds.map(item => item.x + item.width));
    const bottom = Math.max(...bounds.map(item => item.y + item.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Frame world-space content in a screen-space viewport without inventing a navigation mode. */
export function fitCameraToBounds(bounds: Bounds, width: number, height: number, padding = 72, maxZoom = 1.15): Camera {
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const zoom = Math.max(.08, Math.min(2.5, maxZoom, availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height)));
    const mid = center(bounds);
    return { x: width / 2 - mid.x * zoom, y: height / 2 - mid.y * zoom, zoom };
}
