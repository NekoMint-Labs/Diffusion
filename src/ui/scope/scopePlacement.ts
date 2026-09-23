export interface ScopeRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type ScopePlacement = ScopeRect & { side: 'bottom' | 'top' | 'right' | 'left' };

export const SCOPE_HUB_CONTENT_CLEARANCE = 24;

const outside = (a: ScopeRect, b: ScopeRect) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const inflate = (rect: ScopeRect, amount: number): ScopeRect => ({ x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function unionScopeBounds(rects: ScopeRect[]): ScopeRect | null {
    if (!rects.length) return null;
    const left = Math.min(...rects.map(rect => rect.x));
    const top = Math.min(...rects.map(rect => rect.y));
    const right = Math.max(...rects.map(rect => rect.x + rect.width));
    const bottom = Math.max(...rects.map(rect => rect.y + rect.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Shortest visible gap between two rectangles. Zero means they touch or overlap. */
export function scopeHubDistance(a: ScopeRect, b: ScopeRect): number {
    const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
    const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
    return Math.hypot(dx, dy);
}

/** Presentation-only anchor selection; coordinates and scope identity stay with the Field.
 *
 * Locality wins over finding a theoretically empty part of the screen. We try the four sides in
 * the product's preferred order, clamp each to the viewport, and only use occupancy as a tiebreaker
 * among placements that still sit outside the selected geometry. Dense Fields may therefore let
 * the Hub cover nearby unselected whitespace/material rather than teleporting it across the screen.
 */
export function computeScopeHubPlacement({ selectionBounds, viewportBounds, occupiedRects = [], hubSize, offset = 20, padding = 16 }: {
    selectionBounds: ScopeRect;
    viewportBounds: ScopeRect;
    occupiedRects?: ScopeRect[];
    hubSize: { width: number; height: number };
    offset?: number;
    padding?: number;
}): ScopePlacement {
    const minX = viewportBounds.x + padding;
    const minY = viewportBounds.y + padding;
    const maxX = Math.max(minX, viewportBounds.x + viewportBounds.width - hubSize.width - padding);
    const maxY = Math.max(minY, viewportBounds.y + viewportBounds.height - hubSize.height - padding);
    const place = (side: ScopePlacement['side'], x: number, y: number): ScopePlacement => ({
        side,
        x: clamp(x, minX, maxX),
        y: clamp(y, minY, maxY),
        ...hubSize,
    });
    const candidates = [
        place('top', selectionBounds.x + (selectionBounds.width - hubSize.width) / 2, selectionBounds.y - hubSize.height - offset),
        place('bottom', selectionBounds.x + (selectionBounds.width - hubSize.width) / 2, selectionBounds.y + selectionBounds.height + offset),
        place('right', selectionBounds.x + selectionBounds.width + offset, selectionBounds.y + (selectionBounds.height - hubSize.height) / 2),
        place('left', selectionBounds.x - hubSize.width - offset, selectionBounds.y + (selectionBounds.height - hubSize.height) / 2),
    ];
    const clearedRects = occupiedRects.map(rect => inflate(rect, SCOPE_HUB_CONTENT_CLEARANCE));
    const outsideSelection = candidates.filter(candidate => outside(candidate, selectionBounds));
    const clear = outsideSelection.find(candidate => clearedRects.every(rect => outside(candidate, rect)));
    if (clear) return clear;
    if (outsideSelection.length) return outsideSelection.reduce((best, candidate) => scopeHubDistance(candidate, selectionBounds) < scopeHubDistance(best, selectionBounds) ? candidate : best);
    return candidates.reduce((best, candidate) => scopeHubDistance(candidate, selectionBounds) < scopeHubDistance(best, selectionBounds) ? candidate : best);
}
