# Phase 1 — Material, Attention, and Field Depth

## 1. What changed

- Strengthened resting Thought material so canonical Thoughts read as spatial objects at 100% zoom.
- Added a clearer material ladder for ordinary, nearby, direct, selected, hover, drag, and editing states.
- Kept Ghost materially weaker than canonical Thought; Ghost still has no resting card surface.
- Added a restrained italic/unresolved posture for AI question proposals.
- Increased Crystal breathing room and Source editorial/footnote differentiation.
- Shifted the default light palette toward Editorial Warm: warm ivory Field, graphite ink, oxide attention, slate structure.
- Tuned atmosphere warmth/grain without adding grids, spotlights, particles, or decorative gradients.
- Added Phase 1 presentation regression tests.

## 2. Why

The existing v0.4 interaction and attention architecture was already strong, but the resting material values were intentionally so faint that Thought and Field collapsed visually. This phase strengthens presentation rather than rebuilding interaction or authority semantics.

## 3. Files changed

- `src/ui/theme.css`
- `src/ui/materials.css`
- `src/ui/field.css`
- `src/ui/atmosphere.css`
- `tests/unit/presentationPhase1.test.ts`
- `tests/offline/presentation-phase1.test.mjs`
- `PHASE-1-TACTILE-EDITORIAL-REPORT.md`

## 4. Architectural decisions

- No change to canonical ProjectState or session authority.
- No change to focus/emphasis derivation.
- No geometry transform is used for hover lift because Thought world position already owns `transform`; lift is expressed through material/shadow instead.
- Ghost remains presentation-distinct without introducing permanent AI badges.
- Existing reduced-motion behavior remains authoritative.

## 5. Visual decisions

- Resting Thought now uses a visible but quiet surface/boundary.
- Nearby/direct/current states are progressive material presence, not global dimming.
- Selected Thought uses a restrained oxide boundary and local depth rather than glow.
- Drag gets the strongest temporary lift.
- Editing remains the only nearly-opaque writing surface.
- Default light palette uses warm off-white, graphite, oxide attention, and slate structure.
- Background remains a quiet material: grain + broad tonal variation + edge depth.

## 6. Tests added/updated

Added:
- `tests/unit/presentationPhase1.test.ts`
- `tests/offline/presentation-phase1.test.mjs`

The offline Phase 1 tests also ran together with the existing v0.4 Stage A/B visual contract tests.

## 7. Commands run and results

Passed:

```text
node --test tests/offline/presentation-phase1.test.mjs tests/offline/v04-stage-ab-visual.test.mjs
5 tests passed, 0 failed
```

Not completed in this environment:

- `pnpm typecheck` — `pnpm` is not installed.
- `pnpm test` — `pnpm` is not installed.
- `pnpm build` — `pnpm` is not installed.
- Fallback dependency installation with `npm ci --ignore-scripts` stalled in the environment and was stopped rather than blocking the phase.

## 8. Known limitations

- No browser screenshot/manual visual capture was produced, per the instruction to skip unavailable screenshot requirements.
- Full TypeScript/Vitest/Vite verification still needs a normal dependency-installed development environment.
- Dark profile receives the new material hierarchy but its final profile-specific palette is intentionally deferred to Phase 3.

## 9. Screens/manual states still needing human review

- Thought rest / hover / selected / drag / edit at 100% zoom.
- Ghost vs canonical Thought at a glance.
- Light and current dark theme contrast.
- Long Thought wrapping after Crystal/Source typography adjustments.
- Reduced-motion visual feel.

## 10. Commit/checkpoint hash

Unavailable: the uploaded source archive does not contain `.git`, so a real checkpoint commit cannot be created without inventing repository history.
