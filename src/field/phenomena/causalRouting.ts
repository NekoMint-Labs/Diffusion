import type { Point } from '../../core/model.ts';
import type { ConnectionStyle } from '../../ui/appearance.ts';
import { center, intersects, type Bounds } from '../spatial/geometry.ts';
import { boundaryToward } from './describe.ts';

function segmentHits(a: Point, b: Point, box: Bounds): boolean {
    const x0 = box.x - 5, y0 = box.y - 5, x1 = box.x + box.width + 5, y1 = box.y + box.height + 5;
    let low = 0, high = 1;
    for (const [p, q] of [[a.x - b.x, a.x - x0], [b.x - a.x, x1 - a.x], [a.y - b.y, a.y - y0], [b.y - a.y, y1 - a.y]]) {
        if (p === 0) { if (q < 0) return false; }
        else if (p < 0) low = Math.max(low, q / p);
        else high = Math.min(high, q / p);
        if (low > high) return false;
    }
    return true;
}
const clear = (points: Point[], obstacles: Bounds[]) => !obstacles.some(box => points.some((point, index) => index > 0 && segmentHits(points[index - 1], point, box)));
const polyline = (points: Point[]) => points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
const routeBounds = (points: Point[]): Bounds => {
    const x = Math.min(...points.map(p => p.x)) - 6, y = Math.min(...points.map(p => p.y)) - 6;
    return { x, y, width: Math.max(...points.map(p => p.x)) - x + 6, height: Math.max(...points.map(p => p.y)) - y + 6 };
};
function roundCorners(points: Point[]): string {
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1], b = points[i], c = points[i + 1];
        const before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(c.x - b.x, c.y - b.y);
        const radius = Math.min(14, before / 2, after / 2);
        if (!radius) continue;
        const start = { x: b.x + (a.x - b.x) / before * radius, y: b.y + (a.y - b.y) / before * radius };
        const end = { x: b.x + (c.x - b.x) / after * radius, y: b.y + (c.y - b.y) / after * radius };
        path += ` L${start.x},${start.y} Q${b.x},${b.y} ${end.x},${end.y}`;
    }
    const end = points.at(-1)!;
    return `${path} L${end.x},${end.y}`;
}
/** A bounded presentation route. Authored positions never move to make room for a connector.
 * Crowded cases use an outside corridor; when none clears the cards, provenance stays in its
 * explicit source inspector rather than drawing a misleading line through somebody's words. */
export function routeCausalTrace(parent: Bounds, child: Bounds, style: ConnectionStyle, obstacles: Bounds[]): { a: Point; b: Point; path: string; routeBounds: Bounds } | null {
    if (intersects(parent, child)) return null;
    const a = boundaryToward(parent, center(child)), b = boundaryToward(child, center(parent));
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const first = horizontal ? { x: (a.x + b.x) / 2, y: a.y } : { x: a.x, y: (a.y + b.y) / 2 };
    const second = horizontal ? { x: first.x, y: b.y } : { x: b.x, y: first.y };
    const points = [a, first, second, b];
    if (style === 'elbow' && clear(points, obstacles)) return { a, b, path: polyline(points), routeBounds: routeBounds(points) };
    if (style === 'curve') {
        const samples: Point[] = [];
        const steps = Math.min(1024, Math.max(24, Math.ceil((Math.hypot(b.x - a.x, b.y - a.y) + 100) / 10)));
        for (let i = 0; i <= steps; i++) { const t = i / steps, u = 1 - t; samples.push({ x: u ** 3 * a.x + 3 * u * u * t * first.x + 3 * u * t * t * second.x + t ** 3 * b.x, y: u ** 3 * a.y + 3 * u * u * t * first.y + 3 * u * t * t * second.y + t ** 3 * b.y }); }
        if (clear(samples, obstacles)) return { a, b, path: `M${a.x},${a.y} C${first.x},${first.y} ${second.x},${second.y} ${b.x},${b.y}`, routeBounds: routeBounds(points) };
    }
    const boxes = [parent, child, ...obstacles];
    const top = Math.min(...boxes.map(box => box.y)) - 28, bottom = Math.max(...boxes.map(box => box.y + box.height)) + 28;
    const left = Math.min(...boxes.map(box => box.x)) - 28, right = Math.max(...boxes.map(box => box.x + box.width)) + 28;
    for (const [axis, coordinate] of [['y', top], ['y', bottom], ['x', left], ['x', right]] as const) {
        const start = boundaryToward(parent, { ...center(parent), [axis]: coordinate });
        const end = boundaryToward(child, { ...center(child), [axis]: coordinate });
        const route = [start, { ...start, [axis]: coordinate }, { ...end, [axis]: coordinate }, end];
        if (clear(route, obstacles)) return { a: start, b: end, path: style === 'elbow' ? polyline(route) : roundCorners(route), routeBounds: routeBounds(route) };
    }
    return null;
}
