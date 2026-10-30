import type { Relation } from '../../core/model.ts';
import type { GeometryLookup } from '../phenomena/describe.ts';
import type { Gesture } from '../spatial/gesture.ts';
import { linkPath, linkPoint } from './geometry.ts';

/** Same imperative gesture frame as the Field: no React render or canonical write. */
export function paintManualLinks(world: HTMLElement | null, relations: Record<string, Relation>, geometry: GeometryLookup, gesture: Gesture | null, zoom: number): void {
    if (!world) return;
    const dx = gesture ? (gesture.last.x - gesture.start.x) / zoom : 0;
    const dy = gesture ? (gesture.last.y - gesture.start.y) / zoom : 0;
    const box = (id: string) => {
        const measured = geometry.get(id), position = gesture?.positions[id];
        return measured && position ? { ...measured, x: position.x + dx, y: position.y + dy } : measured;
    };
    for (const port of world.querySelectorAll<HTMLElement>('[data-free-link-id]')) {
        const bounds = box(port.dataset.freeLinkId!);
        if (!bounds) continue;
        const point = linkPoint(bounds, port.dataset.freeLinkPort === 'left' ? 'left' : 'right');
        port.style.left = `${point.x}px`; port.style.top = `${point.y}px`;
    }
    for (const halo of world.querySelectorAll<SVGRectElement>('[data-free-link-halo]')) {
        const bounds = box(halo.dataset.freeLinkHalo!);
        if (!bounds) continue;
        halo.setAttribute('x', String(bounds.x - 5));
        halo.setAttribute('y', String(bounds.y - 5));
        halo.setAttribute('width', String(bounds.width + 10));
        halo.setAttribute('height', String(bounds.height + 10));
    }
    for (const relation of Object.values(relations)) {
        if (!relation.manual) continue;
        const a = box(relation.a), b = box(relation.b);
        if (!a || !b) continue;
        const d = linkPath(linkPoint(a, relation.manual.aPort), linkPoint(b, relation.manual.bPort), relation.manual);
        for (const path of world.querySelectorAll<SVGPathElement>(`[data-manual-link="${CSS.escape(relation.id)}"] path`)) path.setAttribute('d', d);
    }
}
