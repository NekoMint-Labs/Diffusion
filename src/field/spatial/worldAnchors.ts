import type { Point } from '../../core/model.ts';

/** World anchors share the exact movement preview of their unmounted Thoughts. */
export function worldAnchorPath(ids: readonly string[], items: Record<string, Point>, zoom: number, positions: Record<string, Point> = {}, offset: Point = { x: 0, y: 0 }): string {
    const size = 7 / zoom;
    return ids.map(id => {
        const item = positions[id] ?? items[id];
        if (!item) return '';
        const delta = positions[id] ? offset : { x: 0, y: 0 };
        return `M${item.x + delta.x},${item.y + delta.y}h${size}v${size}h-${size}z`;
    }).join(' ');
}
