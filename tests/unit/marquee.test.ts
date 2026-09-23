import { describe, expect, it } from 'vitest';
import { marqueeCovers, overlapArea } from '../../src/field/spatial/marquee.ts';

/** A Thought's cached bounds: the demo Field's article box (256 × 102 at the default typography). */
const thought = { x: 500, y: 300, width: 256, height: 102 };
const marquee = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe('marquee membership is a deliberate gesture, not a graze', () => {
    it('shares area only where two rectangles actually overlap', () => {
        expect(overlapArea(marquee(0, 0, 10, 10), marquee(5, 5, 10, 10))).toBe(25);
        expect(overlapArea(marquee(0, 0, 10, 10), marquee(10, 10, 10, 10))).toBe(0);
        expect(overlapArea(marquee(0, 0, 10, 10), marquee(40, 40, 10, 10))).toBe(0);
        expect(overlapArea(marquee(0, 0, 10, 10), marquee(2, 2, 100, 100))).toBe(64);
    });

    it('refuses a marquee that merely crosses a Thought', () => {
        // The real report: a casual blank drag whose rectangle clips a neighbouring Thought.
        expect(marqueeCovers(thought, marquee(520, 380, 40, 100)), 'a 40px sliver below the box').toBe(false);
        expect(marqueeCovers(thought, marquee(400, 380, 120, 40)), 'a 12% graze').toBe(false);
        expect(marqueeCovers(thought, marquee(760, 300, 100, 102)), 'touching nothing').toBe(false);
    });

    it('accepts a marquee that covers a real part of the Thought', () => {
        expect(marqueeCovers(thought, marquee(500, 300, 256, 102)), 'the whole box').toBe(true);
        // The threshold is a third of the box: 87 × 102 covers more, 85 × 102 covers less.
        expect(marqueeCovers(thought, marquee(500, 300, 86, 102)), 'a third of the box').toBe(true);
        expect(marqueeCovers(thought, marquee(500, 300, 85, 102)), 'just under a third').toBe(false);
    });

    it('fails closed on a degenerate box instead of dividing by zero', () => {
        expect(marqueeCovers({ x: 0, y: 0, width: 0, height: 0 }, marquee(0, 0, 10, 10))).toBe(false);
    });
});
