import type { Camera } from '../../core/model.ts';
import { fitCameraToBounds, intersects, type Bounds } from './geometry.ts';

/** A conservative rectangular reading area, in Field-local CSS pixels. */
export function safeArea(viewport: Bounds, occupied: readonly Bounds[], gap = 16): Bounds {
    let left = gap, top = gap, right = viewport.width - gap, bottom = viewport.height - gap;
    for (const box of occupied) {
        if (!box.width || !box.height || !intersects(viewport, box)) continue;
        const x = box.x - viewport.x, y = box.y - viewport.y;
        const distances = [Math.abs(y), Math.abs(viewport.height - y - box.height), Math.abs(x), Math.abs(viewport.width - x - box.width)];
        // Horizontal controls own a top/bottom strip; tall panels own a side strip.
        const edge = box.width >= box.height ? (distances[0] <= distances[1] ? 0 : 1) : (distances[2] <= distances[3] ? 2 : 3);
        if (edge === 0) top = Math.max(top, y + box.height + gap);
        if (edge === 1) bottom = Math.min(bottom, y - gap);
        if (edge === 2) left = Math.max(left, x + box.width + gap);
        if (edge === 3) right = Math.min(right, x - gap);
    }
    return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}
export function measureSafeArea(field: HTMLElement | null, fallback: { width: number; height: number }, committing = false): Bounds {
    if (!field) return { x: 16, y: 16, width: Math.max(1, fallback.width - 32), height: Math.max(1, fallback.height - 32) };
    const viewport = field.getBoundingClientRect();
    const selectors = '.identity, .global-actions, .field-line-key, [data-testid="speak"], .notice, .field-overlay-dock, .surface[data-level="split"], .surface[data-level="anchored"], .find-bar, .hierarchy-disclosure';
    const occupied = [...field.ownerDocument.querySelectorAll<HTMLElement>(selectors)]
        // A committing preview is about to close; persistent panels still reserve space.
        .filter(element => !(committing && ['crystal', 'action-preview'].includes(element.dataset.surfaceOwner ?? '')))
        .filter(element => element.getClientRects().length && !element.closest('[inert]') && getComputedStyle(element).visibility !== 'hidden')
        .map(element => element.getBoundingClientRect());
    return safeArea(viewport, occupied);
}
export function fitInSafeArea(bounds: Bounds, area: Bounds, maxZoom = 1): Camera {
    const camera = fitCameraToBounds(bounds, area.width, area.height, 0, maxZoom);
    return { ...camera, x: camera.x + area.x, y: camera.y + area.y };
}
