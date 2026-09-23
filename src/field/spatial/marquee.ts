import type { Bounds } from './geometry.ts';

/** How much of a Thought a marquee has to cover before it joins the selection.
 *
 * A marquee is a bounding rectangle, so it is *always* larger than the gesture that drew it: a
 * casual 40 px drag on blank space produces a 40 px rectangle that crosses whatever is beside it.
 * With a plain intersection test, that graze was enough to hand the person a selection of Thoughts
 * they never pointed at — and a marquee *replaces* the selection, so the mistake was destructive.
 *
 * A third of the Thought's own box is the smallest share that can only be reached deliberately: the
 * marquee has to cover a real part of the Thought, not merely touch its edge. Together with the
 * gesture contract in `Field.tsx` (a press that lands on a Thought is a drag, never a marquee) this
 * is what makes "a casual drag can never collect unrelated Thoughts" true.
 *
 * This is a *changed* semantic, decided in the Phase 2.7 pass: the previous policy was bare
 * intersection, chosen in Phase 1 and never reviewed against real pointer use.
 */
export const MARQUEE_COVERAGE = 1 / 3;

/** The rectangle two bounds share. Disjoint bounds share nothing, so this is also the exact test. */
export function overlapArea(a: Bounds, b: Bounds): number {
    const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return Math.max(0, width) * Math.max(0, height);
}

/** Does the marquee cover enough of this Thought to mean it? */
export function marqueeCovers(bounds: Bounds, marquee: Bounds, coverage = MARQUEE_COVERAGE): boolean {
    const area = Math.max(1, bounds.width) * Math.max(1, bounds.height);
    return overlapArea(bounds, marquee) >= area * coverage;
}
