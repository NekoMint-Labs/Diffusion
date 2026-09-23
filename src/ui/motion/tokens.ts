/** The motion vocabulary. One place decides how long something takes and how it feels.
 *
 * Before this file, durations were chosen per call site (`0.18` here, `0.28` there), so the
 * product had many timings and no language. A *role* names what a change means; the numbers
 * below are the only place that decides how a meaning is expressed. Both technologies read it:
 * React/Motion imports the role directly, and `signature.ts` registers a GSAP `CustomEase` with
 * the same control points, so "settle" is one curve whether it is a menu or a signature sequence.
 *
 * Times are in seconds because Motion's `Transition` is seconds; the CSS mirror in `theme.css`
 * repeats the same numbers in milliseconds for pointer-frequency micro-states only.
 */

/** How long a change of a given meaning takes. */
export const MOTION_DURATION = {
    /** Perceived as immediate: a state flip the user must not wait for. */
    instant: 0.09,
    /** Local feedback: a hover, a press, a chip. */
    micro: 0.14,
    /** A control changing shape or value: a select, a tab indicator, a toggle. */
    control: 0.2,
    /** A surface arriving or leaving the Field. */
    surface: 0.22,
    /** Something moving through space: shared layout, a Field receding, a title travelling. */
    spatial: 0.34,
    /** A change that should be read rather than noticed: identity, an empty state, a title. */
    settle: 0.4,
    /** An authored sequence the user is meant to watch. Never a per-interaction default. */
    signature: 0.62,
} as const;
export type DurationRole = keyof typeof MOTION_DURATION;

/** Cubic control points. `settle` and `enter` are deliberately close but not identical:
 * `enter` snaps to rest (Emmett-style ease-out), `settle` reads as weight coming to a stop. */
export const MOTION_EASE = {
    enter: [0.22, 1, 0.36, 1],
    exit: [0.4, 0, 1, 1],
    move: [0.32, 0.72, 0, 1],
    settle: [0.16, 1, 0.3, 1],
    attention: [0.3, 0.9, 0.24, 1],
    signature: [0.16, 0.84, 0.24, 1],
} as const;
export type EaseRole = keyof typeof MOTION_EASE;

/** Reduced motion resolves a role to zero rather than hiding the change: the new state must
 * still be comprehensible, it just arrives without travel. */
export type Cubic = [number, number, number, number];
export type RoleTransition = { duration: number; ease: Cubic };
export function cubicPoints(ease: EaseRole): Cubic {
    const [a, b, c, d] = MOTION_EASE[ease];
    return [a, b, c, d];
}
/** The CSS spelling of a role curve, so a CSS transition and a Motion transition can share one. */
export function cubicBezierCSS(ease: EaseRole): string {
    return `cubic-bezier(${MOTION_EASE[ease].join(',')})`;
}
export function roleTransition(role: DurationRole, reduced: boolean, ease: EaseRole = 'enter'): RoleTransition {
    return { duration: reduced ? 0 : MOTION_DURATION[role], ease: cubicPoints(reduced ? 'enter' : ease) };
}
/** A spring for a place that owns input. Arrival only; it is interruptible and not bouncy,
 * so a window feels placed rather than dropped. */
export const MOTION_PANEL_SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const;

/** The legacy duration names the v0.3 codebase used, kept so call sites do not have to change
 * in the same commit that introduces the roles. Each one now points at a role. */
export const motionDuration = {
    instant: MOTION_DURATION.instant,
    micro: MOTION_DURATION.micro,
    surface: MOTION_DURATION.surface,
    recede: MOTION_DURATION.micro,
    transform: MOTION_DURATION.spatial,
    attention: MOTION_DURATION.control,
    representation: MOTION_DURATION.surface,
    panel: MOTION_DURATION.settle,
    title: MOTION_DURATION.settle,
    arrival: MOTION_DURATION.signature,
} as const;
