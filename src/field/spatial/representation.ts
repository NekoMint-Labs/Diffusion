import type { Camera, Point } from '../../core/model.ts';
import { intersects, worldToScreen, type Bounds } from './geometry.ts';
export interface LabelCandidate extends Point { id: string; priority?: number; width?: number; height?: number }
/** Screen-space disclosure only: suppress colliding detail; never move canonical objects. */
export function readableLabels(items: LabelCandidate[], camera: Camera, viewport: { width: number; height: number }, limit = 64): string[] {
    const occupied: Bounds[] = [];
    const selected: string[] = [];
    const frame = { x: -120, y: -100, width: viewport.width + 240, height: viewport.height + 200 };
    for (const item of [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))) {
        const screen = worldToScreen(item, camera);
        const bounds = { ...screen, width: item.width ?? 220, height: item.height ?? 62 };
        if (!intersects(frame, bounds) || occupied.some(previous => intersects(previous, bounds))) continue;
        occupied.push({ x: bounds.x - 8, y: bounds.y - 8, width: bounds.width + 16, height: bounds.height + 16 });
        selected.push(item.id);
        if (selected.length >= limit) break;
    }
    return selected;
}
/** A Recall points toward its original position. Merely rendering a cue never travels. */
export function recallEdge(point: Point, camera: Camera, width: number, height: number, index = 0): Point & { angle: number } {
    const screen = worldToScreen(point, camera);
    const dx = screen.x - width / 2, dy = screen.y - height / 2;
    const factor = Math.min((width / 2 - 95) / Math.max(1, Math.abs(dx)), (height / 2 - 70) / Math.max(1, Math.abs(dy)));
    return { x: Math.max(12, Math.min(width - 160, width / 2 + dx * factor - 60)), y: Math.max(70, Math.min(height - 90, height / 2 + dy * factor + index * 26)), angle: Math.atan2(dy, dx) * 180 / Math.PI };
}

export type SemanticZoomLevel = 'local' | 'neighborhood' | 'atlas';

/** Content disclosure for semantic zoom. This changes only the rendered excerpt: canonical wording
 * stays untouched, and zooming back in restores the full Thought. Neighborhood prefers a whole
 * first sentence over an arbitrary character slice; Atlas uses the same rule for landmarks. */
export function semanticExcerpt(text: string, level: SemanticZoomLevel, kind: 'thought' | 'crystal' | 'source' | 'ghost' = 'thought'): string {
    if (level === 'local') return text;
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized) return normalized;
    const limit = level === 'atlas' ? (kind === 'crystal' ? 96 : 72) : (kind === 'crystal' ? 118 : 88);
    const sentence = normalized.match(/^.*?(?:[.!?](?=\s|$)|[。！？])/)?.[0]?.trim();
    const candidate = sentence && sentence.length <= limit + 24 ? sentence : normalized;
    if (candidate.length <= limit) return candidate;
    const clipped = candidate.slice(0, limit + 1);
    const boundary = Math.max(clipped.lastIndexOf(' '), clipped.lastIndexOf('，'), clipped.lastIndexOf(','), clipped.lastIndexOf('；'), clipped.lastIndexOf(';'));
    return `${candidate.slice(0, boundary >= Math.floor(limit * .58) ? boundary : limit).trimEnd()}…`;
}
