import { describe, expect, it } from 'vitest';
import type { Ghost } from '../../src/core/model.ts';
import type { Bounds } from '../../src/field/spatial/geometry.ts';
import { intersects } from '../../src/field/spatial/geometry.ts';
import { placeFieldReview, unreadableSuggestionIds } from '../../src/ui/scope/fieldReviewPlacement.ts';

describe('compact Field review access', () => {
    const view = { x: 0, y: 0, width: 1280, height: 720 };
    const ghost: Ghost = { id: 'g', text: '完整建议', x: 500, y: 200, createdAt: 2, scopeIds: ['source'] };
    const source = { x: 300, y: 200, width: 176, height: 100 };
    const read = (box: Bounds, visible = ['g'], obstacles: Bounds[] = [], item = ghost) => unreadableSuggestionIds([item], visible, view, id => id === 'source' ? source : box, obstacles, 1);
    it('keeps a clear nearby proposal on the canvas', () => {
        expect(read({ x: 500, y: 200, width: 176, height: 100 })).toEqual([]);
    });
    it('offers a culled result even when its geometry is absent', () => {
        expect(unreadableSuggestionIds([ghost], [], view, () => undefined, [], 1)).toEqual(['g']);
    });
    it('offers a mounted but clipped or obstructed result without moving it', () => {
        const before = structuredClone(ghost);
        expect(read({ x: 1170, y: 200, width: 176, height: 100 })).toEqual(['g']);
        expect(read({ x: 500, y: 200, width: 176, height: 100 }, ['g'], [{ x: 520, y: 220, width: 20, height: 20 }])).toEqual(['g']);
        expect(ghost).toEqual(before);
    });
    it('offers a distant automatic result but respects an intentionally detached position', () => {
        const distant = { x: 900, y: 200, width: 176, height: 100 };
        expect(read(distant)).toEqual(['g']);
        expect(read(distant, ['g'], [], { ...ghost, spatialDetached: true })).toEqual([]);
    });
    it('does not move an old proposal to follow an offscreen source', () => {
        expect(unreadableSuggestionIds([ghost], ['g'], view, id => id === 'source' ? { ...source, x: -1200 } : { x: 500, y: 200, width: 176, height: 100 }, [], 1)).toEqual([]);
    });
    it('uses a small entry and a bounded panel without occupying the centered composer', () => {
        const writing = { x: 400, y: 620, width: 480, height: 70 };
        const { entry, panel } = placeFieldReview(view, { width: 154, height: 36 }, [writing]);
        expect(entry).toEqual({ x: 24, y: 668, width: 154, height: 36 });
        expect(panel.width).toBe(420); expect(panel.height).toBeLessThanOrEqual(320);
        expect(intersects(entry, writing)).toBe(false); expect(intersects(panel, writing)).toBe(false);
    });
    it('moves the compact entry above writing in a narrow window, keeping the panel within it', () => {
        const narrow = { x: 0, y: 0, width: 320, height: 640 }, writing = { x: 16, y: 510, width: 288, height: 110 };
        const { entry, panel } = placeFieldReview(narrow, { width: 170, height: 36 }, [writing]);
        expect(entry.y + entry.height).toBeLessThan(writing.y);
        expect(panel.x).toBeGreaterThanOrEqual(0); expect(panel.x + panel.width).toBeLessThanOrEqual(320);
        expect(panel.y).toBeGreaterThanOrEqual(16); expect(panel.height).toBeLessThanOrEqual(320);
        expect(intersects(panel, writing)).toBe(false);
    });
    it('keeps the temporary panel away from a Stop/decision control in its column', () => {
        const stop = { x: 40, y: 440, width: 180, height: 48 };
        const { panel } = placeFieldReview(view, { width: 150, height: 36 }, [stop]);
        expect(intersects(panel, stop)).toBe(false);
        expect(panel.y + panel.height).toBeLessThanOrEqual(656);
    });
});
