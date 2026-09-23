import { EXIT_UNOWNED, panelTransition, placementOffset, placementOrigin, recedeTransition, surfaceTransition } from '../motion.ts';

/** The depth classes a place can occupy. Decided by the surface, resolved into motion here. */
export type SurfaceLevel = 'anchored' | 'split' | 'focus' | 'bar' | 'window';

/** Which motion belongs to which kind of place.
 *
 * A place that owns input arrives like a real object (a panel spring, from its own origin) and
 * leaves with a short recede; a projection anchored to a Thought or a pointer arrives from that
 * origin and closes at once; the Field's own in-place changes settle. Nothing here holds state:
 * the semantic ownership change happens in `useUI` before and independently of this derivation,
 * and every role resolves to zero duration under reduced motion rather than hiding the change.
 *
 * A window always performs its own arrival, whatever entry point opened it (menu, palette or
 * shortcut); a shared shell adds visual continuity on top, it does not replace the arrival.
 */
export function surfaceMotionRoles({ level, placement, anchored, reduced, sharedLayout }: {
    level: SurfaceLevel;
    placement: string;
    /** Whether this surface is positioned against a real point rather than a corner. */
    anchored: boolean;
    reduced: boolean;
    sharedLayout: boolean;
}) {
    const offset = placementOffset(placement, 4);
    const initial = level === 'window'
        ? { opacity: reduced ? 1 : 0, scale: reduced ? 1 : .965, x: 0, y: reduced ? 0 : 10 }
        : sharedLayout ? { opacity: 1, scale: 1, x: 0, y: 0 }
            : level === 'anchored' && anchored
                ? { opacity: reduced ? 1 : 0, scale: reduced ? 1 : .992, x: reduced ? 0 : offset.x, y: reduced ? 0 : offset.y }
                : level === 'split'
                    ? { opacity: reduced ? 1 : 0, scale: 1, x: reduced ? 0 : 6, y: 0 }
                    : { opacity: reduced ? 1 : 0, scale: 1, x: 0, y: reduced ? 0 : 3 };
    return {
        initial,
        animate: { opacity: 1, scale: 1, x: 0, y: 0 },
        exit: level === 'split'
            ? { ...EXIT_UNOWNED, x: reduced ? 0 : 8, y: 0, transition: recedeTransition(reduced) }
            : { ...EXIT_UNOWNED, scale: reduced ? 1 : .98, x: 0, y: reduced ? 0 : 3, transition: recedeTransition(reduced) },
        transition: level === 'window' ? panelTransition(reduced) : surfaceTransition(reduced),
        transformOrigin: level === 'anchored' && anchored ? placementOrigin(placement) : level === 'split' ? 'right center' : level === 'window' ? 'center center' : 'center top',
    };
}
