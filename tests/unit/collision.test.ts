import { describe, expect, it } from 'vitest';
import { correctSevereOverlap, disclosureBox, estimateItemSize, estimateThoughtSize, severeOverlap, thoughtSizeClass, THOUGHT_WIDTHS } from '../../src/field/spatial/collision.ts';

describe('local collision hygiene', () => {
    it('derives bounded visual-width classes across scripts, punctuation, and lines', () => {
        expect(thoughtSizeClass('A')).toBe('compact');
        expect(thoughtSizeClass('Maybe')).toBe('compact');
        expect(thoughtSizeClass('What if this is actually a different problem?')).toBe('regular');
        expect(thoughtSizeClass('A much longer thought that needs several lines of context before its meaning becomes clear.')).toBe('wide');
        expect(thoughtSizeClass('也许？')).toBe('compact');
        expect(thoughtSizeClass('这是一个需要更多空间来完整表达的想法，而且包含中文标点。')).toBe('wide');
        expect(thoughtSizeClass('First line\nSecond line\nThird line')).toBe('regular');
        expect(estimateThoughtSize('A').width).toBe(THOUGHT_WIDTHS.compact.local);
        expect(estimateThoughtSize('A much longer thought that needs several lines of context before its meaning becomes clear.').width).toBe(THOUGHT_WIDTHS.wide.local);
    });

    it('keeps adaptive widths in semantic disclosure', () => {
        expect(disclosureBox('A', .4).width).toBe(THOUGHT_WIDTHS.compact.neighborhood);
        expect(disclosureBox('What if this is actually a different problem?', .4).width).toBe(THOUGHT_WIDTHS.regular.neighborhood);
        expect(disclosureBox('A much longer thought that needs several lines of context before its meaning becomes clear.', .15).width).toBe(THOUGHT_WIDTHS.wide.atlas);
    });

    it('preserves fixed semantic widths for Crystals and Sources', () => {
        expect(estimateItemSize({ text: 'A', kind: 'crystal' }).width).toBe(276);
        expect(estimateItemSize({ text: 'A', kind: 'source' }).width).toBe(236);
        expect(disclosureBox('A', .4, 'crystal').width).toBe(248);
        expect(disclosureBox('A', .15, 'crystal').width).toBe(240);
        expect(disclosureBox('A', .4, 'source').width).toBe(210);
    });

    it('uses text-aware pre-mount height estimates', () => {
        expect(estimateThoughtSize('short').height).toBeLessThan(estimateThoughtSize('这是一段明显更长而且会换行很多次的中文内容'.repeat(8)).height);
    });

    it('leaves small intentional overlap alone', () => {
        const desired = { x: 100, y: 100, width: 256, height: 80 };
        const neighbour = { x: 340, y: 100, width: 256, height: 80 };
        expect(severeOverlap(desired, neighbour)).toBe(false);
        expect(correctSevereOverlap(desired, [neighbour])).toEqual({ x: 100, y: 100 });
    });

    it('moves only the requested object out of severe overlap', () => {
        const desired = { x: 100, y: 100, width: 256, height: 100 };
        const neighbour = { x: 120, y: 110, width: 256, height: 100 };
        const point = correctSevereOverlap(desired, [neighbour], { x: 0, y: 0, width: 1200, height: 800 });
        expect(point).not.toEqual({ x: desired.x, y: desired.y });
        expect(severeOverlap({ ...desired, ...point }, neighbour)).toBe(false);
        expect(neighbour).toEqual({ x: 120, y: 110, width: 256, height: 100 });
    });
});
