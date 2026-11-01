import type { Point, Relation } from '../../core/model.ts';
import type { Bounds } from '../spatial/geometry.ts';
export function linkPoint(box: Bounds, side: 'left' | 'right'): Point {
    return { x: box.x + (side === 'right' ? box.width : 0), y: box.y + box.height / 2 };
}
export function linkPath(a: Point, b: Point, ports: NonNullable<Relation['manual']>): string {
    const bend = Math.max(50, Math.abs(b.x - a.x) * .4);
    const aSign = ports.aPort === 'right' ? 1 : -1, bSign = ports.bPort === 'right' ? 1 : -1;
    if ((b.x - a.x) * aSign < 0 || (a.x - b.x) * bSign < 0) {
        // A chosen outward-facing port must not fold straight back across its own text.
        const lane = Math.min(a.y, b.y) - Math.max(100, Math.abs(b.x - a.x) * .14);
        const ax = a.x + aSign * 55, bx = b.x + bSign * 55;
        return `M ${a.x} ${a.y} C ${ax} ${a.y}, ${ax} ${lane}, ${ax} ${lane} L ${bx} ${lane} C ${bx} ${lane}, ${bx} ${b.y}, ${b.x} ${b.y}`;
    }
    return `M ${a.x} ${a.y} C ${a.x + (ports.aPort === 'right' ? bend : -bend)} ${a.y}, ${b.x + (ports.bPort === 'right' ? bend : -bend)} ${b.y}, ${b.x} ${b.y}`;
}
export const freeLinksEnabled = (): boolean => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('freeLinksTrial') === '1';
