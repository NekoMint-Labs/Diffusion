/** Shared motion roles. Semantic state ownership always lives outside animation.
 *
 * The vocabulary lives in `motion/tokens.ts` (duration + easing roles). This module turns a role
 * into a concrete Motion transition and names the two things that are not a duration: the panel
 * spring and the shared-shell layout identity.
 *
 * One rule per surface class:
 * - Place      a surface that owns input (settings, palette, history, import) arrives with a
 *              spring and leaves with a short recede. Motion is deliberate, never a fade-only.
 * - Projection a contextual surface anchored to a Thought or a pointer (menus, source,
 *              relation, region) arrives from its own origin and closes immediately.
 * - In-place   the Field itself (title, invitation, arrival) settles with a soft, slower ease.
 *
 * Every role resolves to a zero-duration transition when the user asks for reduced motion.
 * `signature.ts` reads the same roles for GSAP, so the two technologies cannot drift apart.
 */
import { MOTION_EASE, MOTION_DURATION, MOTION_PANEL_SPRING, motionDuration, roleTransition } from './motion/tokens.ts';
export { MOTION_DURATION, MOTION_EASE, MOTION_PANEL_SPRING, motionDuration, roleTransition };
export type { DurationRole, EaseRole } from './motion/tokens.ts';
export const GLOBAL_TRANSIENT_SHELL_LAYOUT_ID = 'diffusion-global-transient-shell';
export function surfaceTransition(reduced: boolean) {
    return roleTransition('surface', reduced, 'enter');
}
export function layoutTransition(reduced: boolean, duration = MOTION_DURATION.spatial) {
    return { duration: reduced ? 0 : duration, ease: MOTION_EASE.move };
}
export function contentTransition(reduced: boolean) {
    return roleTransition('micro', reduced, 'enter');
}
/** A dedicated place (settings, palette, history) arrives like a real object. */
export function panelTransition(reduced: boolean) {
    return reduced ? { duration: 0 } : { ...MOTION_PANEL_SPRING };
}
/** Closing motion is always short and never delays the semantic ownership change.
 * `pointerEvents` is not animatable, so Motion applies it immediately: an exiting
 * surface can never intercept the click the user is already making.
 */
export function recedeTransition(reduced: boolean) {
    return roleTransition('micro', reduced, 'exit');
}
export const EXIT_UNOWNED = { opacity: 0, pointerEvents: 'none' as const };
/** Where a popup should grow from, given the side it was placed on. */
export function placementOrigin(placement: string): string {
    const [side, align = 'center'] = placement.split('-');
    const inline = align === 'start' ? 'left' : align === 'end' ? 'right' : 'center';
    if (side === 'top')
        return `${inline} bottom`;
    if (side === 'bottom')
        return `${inline} top`;
    const block = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';
    return side === 'left' ? `right ${block}` : `left ${block}`;
}
export function placementOffset(placement: string, distance = 4): {
    x: number;
    y: number;
} {
    const side = placement.split('-')[0];
    if (side === 'top')
        return { x: 0, y: distance };
    if (side === 'bottom')
        return { x: 0, y: -distance };
    if (side === 'left')
        return { x: distance, y: 0 };
    return { x: -distance, y: 0 };
}
