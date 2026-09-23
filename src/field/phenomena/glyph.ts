import type { RelationKind } from '../../core/model.ts';

/** The visible mark for each relation kind.
 *
 * Presentation data, deliberately outside `src/core/`: the canonical model knows that two
 * Thoughts are related and how, never how that should be drawn.
 * `docs/specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md`
 * defines the vocabulary — phenomenon first, connection second, no arrows by default.
 */
export const relationGlyphs: Record<RelationKind, string> = {
    resonance: '\u2248',
    tension: '\u21af',
    gap: '?',
    support: '\u2713',
    bridge: '\u223c',
};
