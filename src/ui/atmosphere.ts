/** Atmosphere is presentation state, never semantic state.
 *
 * A Field is a material, not a flat plane. The role vocabulary lives here, separated from the
 * component that renders it and from the stylesheet that draws it, so the meaning ("this space is
 * at rest" / "this space is holding attention") can be reasoned about — and tested — without a DOM.
 *
 * REST is fully implemented. ATTENTION is a restrained, *local* CSS variant whose illumination
 * geometry moves. EMERGENCE and TRANSITION stay part of the vocabulary but are deliberately not
 * implemented as roles: a Field switch (transition) is owned by the authored GSAP sequence in
 * `motion/signature.ts`, and creation emphasis is owned by the first-Thought sequence, so the
 * atmosphere never becomes a second animation owner for the same moment. The semantic background
 * (particles, filaments, region distortion) is a later Pixi concern fed by exactly this vocabulary,
 * and nothing here draws anything.
 */

export type AtmosphereRole = 'rest' | 'attention' | 'emergence' | 'transition';

/** Which atmosphere the presentation currently deserves.
 *
 * Derived only from transient presentation state: a Field's *meaning* never decides how it is lit,
 * and Core never learns that an atmosphere exists. `scoped` is the Field holding a temporary
 * scope — the same kind of transient attention as activity or a diffuse run — so it lights the
 * material the same way; any one of the three is enough. */
export function atmosphereRole(state: { busy: boolean; diffuse: boolean; scoped: boolean }): AtmosphereRole {
    return state.busy || state.diffuse || state.scoped ? 'attention' : 'rest';
}
