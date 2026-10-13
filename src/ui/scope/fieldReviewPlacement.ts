import type { Ghost } from '../../core/model.ts';
import { distanceBetween, intersects, unionBounds, type Bounds } from '../../field/spatial/geometry.ts';
import { RESULT_PREFERRED_DISTANCE } from '../../field/spatial/proposalPlacement.ts';

/** Reading access is separate from culling: a mounted card can still be clipped or covered. */
export function unreadableSuggestionIds(ghosts: readonly Ghost[], visible: readonly string[], view: Bounds, bounds: (id: string) => Bounds | undefined, obstacles: readonly Bounds[], zoom: number): string[] {
    const shown = new Set(visible);
    return ghosts.filter(ghost => {
        const box = bounds(ghost.id);
        if (!shown.has(ghost.id) || !box) return true;
        if (box.x < view.x + 16 || box.y < view.y + 16 || box.x + box.width > view.x + view.width - 16 || box.y + box.height > view.y + view.height - 16) return true;
        if (obstacles.some(other => intersects(box, other))) return true;
        const sources = unionBounds(ghost.scopeIds.map(bounds).filter((box): box is Bounds => !!box && intersects(box, view)));
        return !ghost.spatialDetached && !!sources && distanceBetween(box, sources) > RESULT_PREFERRED_DISTANCE.max * zoom;
    }).map(ghost => ghost.id);
}

/** Compact entries and one temporary panel never reserve a strip of the Field. */
export function placeFieldReview(view: Bounds, entrySize: { width: number; height: number }, obstacles: readonly Bounds[]) {
    const margin = Math.min(24, view.width / 8), gap = 12;
    const width = Math.max(1, Math.min(entrySize.width, view.width - margin * 2));
    const entry = { x: view.x + margin, y: view.y + view.height - entrySize.height - 16, width, height: entrySize.height };
    for (const obstacle of [...obstacles].sort((a, b) => b.y - a.y)) {
        if (intersects(entry, obstacle)) entry.y = Math.max(view.y + 16, obstacle.y - entry.height - gap);
    }
    const panelWidth = Math.max(1, Math.min(420, view.width - margin * 2));
    const left = entry.x, floor = entry.y - gap, ceiling = view.y + 16;
    // Pick a contiguous vertical gap, preserving writing, Stop and relation actions.
    const blockers = obstacles.filter(box => box.x < left + panelWidth && box.x + box.width > left && box.y < floor && box.y + box.height > ceiling).sort((a, b) => b.y - a.y);
    let bottom = floor;
    const slots: Array<{ top: number; bottom: number }> = [];
    for (const box of blockers) {
        const top = Math.max(ceiling, box.y + box.height + gap);
        if (bottom > top) slots.push({ top, bottom });
        bottom = Math.min(bottom, box.y - gap);
    }
    if (bottom > ceiling) slots.push({ top: ceiling, bottom });
    const slot = slots.find(slot => slot.bottom - slot.top >= 140) ?? slots.sort((a, b) => (b.bottom - b.top) - (a.bottom - a.top))[0] ?? { top: ceiling, bottom: floor };
    const height = Math.max(1, Math.min(320, slot.bottom - slot.top));
    return { entry, panel: { x: left, y: slot.bottom - height, width: panelWidth, height } };
}
