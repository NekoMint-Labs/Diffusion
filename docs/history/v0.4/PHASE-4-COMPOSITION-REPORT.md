# Phase 4 — Composition, Motion, Region, Zoom, and Final Polish

## Status

Phase 4 is complete. This checkpoint intentionally stops after the fourth and final requested phase.

The work in this phase is presentation- and transient-interaction focused. It does not change the human-authority boundary established earlier: Ghost remains provisional, Keep remains the canonical acceptance boundary, Relation remains semantic, and causal lineage remains a separate concept.

## 1. What changed

### Motion choreography

- Added a restrained causal-trace wake animation so the active ancestry/branch becomes legible when focus changes.
- Added a small Ghost proposal arrival grammar: a pencil-like causal mark arrives before/with the proposal text settling.
- Canonical Thought material now settles through opacity/color/background/shadow transitions without animating world coordinates.
- All Phase 4 motion is disabled under `prefers-reduced-motion: reduce`.
- No particles, global flashes, or decorative motion systems were added.

### Spatial AI operation feedback and receipts

- Extended transient `ThinkingOperation` state with optional `resultCount` completion metadata.
- Runtime completion now reports truthful result counts for generated proposals/ingestion output.
- Bring-reference completion reports either one result or zero results.
- `SpatialActivityLayer` shows short-lived action receipts such as `3 results · Continue` near the operated scope.
- The presentation layer describes actions rather than claiming semantic entities; for example the probe action is labeled `Explore`, not `Relation`.
- Completion metadata remains session/transient UI state and is not written into project semantics.

### Region as a spatial field

- Added `describeRegionFields`, which derives a soft region ellipse from member geometry.
- Added a dedicated, presentation-only `RegionFieldLayer`.
- Region presentation uses an ellipse/ambient field rather than a hard grouping rectangle.
- Local zoom shows only the currently relevant/active Region field; Neighborhood/Atlas may disclose remembered Regions.
- No region bounds are written back to canonical state and member coordinates are never changed by Region presentation.

### Semantic Zoom audit/refinement

- Replaced the old arbitrary 42-character Thought truncation with `semanticExcerpt`.
- Neighborhood prefers a complete first sentence when practical and understands both Western and Chinese sentence punctuation.
- Atlas uses the same semantic excerpt logic for orientation/frontier labels.
- Atlas keeps Crystals primary while allowing selected or explicitly kept Thoughts to survive as orientation anchors.
- Selected/current content, Crystals, unresolved questions, and ordinary context now receive explicit disclosure priority instead of uniform treatment.
- Non-local metadata is reduced so zooming out reads as a change in representation rather than content deletion.
- The existing Local / Neighborhood / Atlas architecture was preserved instead of replaced with a destabilizing new camera/aggregation system.

### Final presentation polish

- Active Region labels receive slightly stronger hierarchy and readability protection.
- Neighborhood Thought width was modestly increased for sentence-level excerpts.
- Unresolved questions retain an unresolved/italic posture at Neighborhood scale.
- Sleeping causal traces become quieter in Neighborhood while waking traces gain clearer temporal emphasis.
- Chinese strings were added for new receipt/action copy.
- Removed one pre-existing duplicate `Auto` localization entry discovered by TypeScript parsing; visible behavior is unchanged.

## 2. Why

The goal of this phase was to make the presentation system behave as one coherent product rather than a stack of unrelated visual features.

The decisions follow four principles:

1. **Motion explains state.** It clarifies arrival, wake, Keep/settle, and focus rather than decorating the canvas.
2. **Spatial structure remains authored by the user.** Regions and semantic zoom derive presentation from canonical geometry without silently rewriting it.
3. **Zoom changes representation, not existence.** A Thought should become more compact or landmark-like, not appear arbitrarily deleted.
4. **AI feedback stays local and provisional.** Activity and receipts appear near scope and never become a permanent chat island or a second source of semantic truth.

## 3. Files changed

### Runtime / transient operation state

- `src/core/model.ts`
- `src/ai/runtime.ts`
- `src/ui/workspace/useThinkingIntents.ts`
- `src/ui/motion/SpatialActivityLayer.tsx`

### Semantic zoom / Field composition

- `src/field/Field.tsx`
- `src/field/spatial/representation.ts`
- `src/ui/thought/ThoughtView.tsx`

### Region presentation

- `src/field/phenomena/regionField.ts` (new)
- `src/field/phenomena/RegionFieldLayer.tsx` (new)
- `src/field/phenomena/index.ts`

### Presentation / motion / localization

- `src/ui/field.css`
- `src/ui/resultSemantics.css`
- `src/ui/polish.css`
- `src/locales/zh.ts`

### Tests

- `tests/offline/phase4-composition.test.mjs` (new)

## 4. Architectural decisions

### Region remains derived presentation

`RegionFieldLayer` receives derived ellipse geometry only. Region geometry is computed from the current member geometry cache; no bounds are persisted and Region never becomes a container that owns or moves its members.

### Semantic Zoom remains a presentation concern

`semanticExcerpt` returns a rendered excerpt only. Canonical Thought text is untouched, so zooming back to Local always restores complete wording.

### Completion receipts remain transient

`resultCount` belongs to `ThinkingOperation`, which is session/transient operation state. It is intentionally not added to Thought, Relation, lineage metadata, or project appearance state.

### Existing zoom/camera architecture retained

The current three-level Local / Neighborhood / Atlas model is adequate for this pass. Phase 4 corrects disclosure and orientation behavior instead of introducing a new clustering engine or camera authority.

### No semantic-layer collapse

Causal lineage remains in `CausalTraceLayer`; semantic Relation remains in `RelationLayer`; Region atmosphere has its own `RegionFieldLayer`. None was overloaded to represent the others.

## 5. Visual decisions

- Region = low-presence structural atmosphere, not a visible group box.
- Causal wake = subtle line activation, not glow or animated arrows.
- Ghost arrival = pencil/annotation motion, not an AI badge or chat bubble.
- Atlas = landmark-oriented composition with Crystal dominance and limited kept/selected Thought anchors.
- Neighborhood = sentence-level reading rather than arbitrary character slicing.
- No particle effects or global scene dimming.
- No color-only semantic dependence was introduced; hierarchy also uses material, typography, line rhythm, persistence, and spatial posture.

## 6. Tests added / updated

Added `tests/offline/phase4-composition.test.mjs`, covering:

1. semantic zoom preserves full Local text and prefers sentence-level Neighborhood excerpts, including Chinese punctuation;
2. Region fields are derived ellipses and do not mutate Region/canonical geometry;
3. Atlas retains explicit orientation anchors without reverting to a dense card field;
4. completion receipts store only transient result counts and do not claim Relation semantics;
5. motion includes causal wake / Ghost settle behavior and respects reduced motion without particles.

The full offline regression suite now passes **235 / 235**.

## 7. Commands run and results

### Passed

- `npm run test:offline` — **PASS, 235/235**
- `node scripts/offline-check.mjs` — **PASS**
  - 234 TS/TSX files syntax-transpiled
  - JSON valid
  - local imports resolved
  - this check explicitly is not dependency-backed application typechecking
- `npm run check:locales` — **PASS**
  - 855 dictionary keys
  - no missing keys
  - no unwrapped JSX
  - no unlocalized strings reported
- `npm run check:source-size` — **PASS**
  - `src/ui/field.css`: 692 lines
  - `src/field/Field.tsx`: 649 lines

### Could not complete because the supplied working archive has no installed dependencies

- `npm run typecheck` — **NOT RUN TO COMPLETION / ENVIRONMENT BLOCKED**
  - TypeScript cannot find the installed type packages `node` and `vite/client`.
- `npm test` — **NOT RUN TO COMPLETION / ENVIRONMENT BLOCKED**
  - `vitest` executable is absent because `node_modules` is absent.
- `npm run build` — **NOT RUN TO COMPLETION / ENVIRONMENT BLOCKED**
  - build stops at the same dependency-backed typecheck failure.
- `npm ci --offline --ignore-scripts` — attempted during this phase but the local package cache does not contain the required `zustand` tarball, so dependencies could not be reconstructed offline.

These are recorded as blocked, not as passes.

## 8. Known limitations

- Browser/desktop visual verification was intentionally skipped because that execution path is unavailable in the current environment and the user explicitly allowed impossible requirements such as screenshots to be skipped.
- Dependency-backed `tsc`, Vitest, Vite build, Playwright, and Tauri verification still need to be run in a normal checkout with dependencies installed.
- `src/ui/field.css` (692/700) and `src/field/Field.tsx` (649/700) are close to the repository source-size ceiling. Future Field work should extract real responsibility boundaries rather than continue accumulating code there.
- Region ellipses are presentation-only and deliberately noninteractive; the Region label remains the interaction anchor.
- Semantic Zoom does not attempt semantic clustering/summarization of very large Fields. It improves representation and orientation within the existing three-level system.

## 9. Screens / manual states still needing human review

When the project is run in a full browser/Tauri environment, the following should still be visually checked:

- Editorial Warm, Studio Slate, Quiet Forest, Graphite Night
- Clean / Paper / Studio / Image Atmosphere backgrounds
- bright and dark Image Atmosphere inputs
- Thought rest / hover / selected / drag / release / edit
- Ghost arrival, Ghost drag without Keep, Keep transition
- lineage wake and branching
- Relation vs causal-lineage visual distinction
- Region fields at Local / Neighborhood / Atlas
- pan / zoom / marquee / multi-select
- Tutorial regression
- operation pending state, Stop, completion receipt
- `prefers-reduced-motion`
- large Fields with many Thoughts/traces/Regions

No screenshots were fabricated.

## 10. Checkpoint

The supplied archive contains no `.git` metadata, so a real Git checkpoint commit/hash cannot be created from this environment. Instead, Phase 4 uses `PHASE-4-CHECKPOINT.sha256`, containing SHA-256 hashes for all Phase 4 changed/new source and test files.

Checkpoint manifest SHA-256: `fa1b74749e904589c8b482fc27ffe9be0344f84aa1faaf22c8381236c8b76bd2`

## Final-phase notes

### Intentionally not implemented

- particle effects;
- a permanent bottom AI chat island;
- a giant lineage editor or permanent connection handles;
- hard rectangular Region frames;
- a new clustering/knowledge-graph system;
- a full semantic-zoom/camera rewrite;
- model-authored raw layout coordinates;
- any chain-of-thought display;
- any project-data persistence for appearance or operation receipts;
- screenshots/browser automation in this environment.

### Remaining visual debt

- Live tuning is still needed for exact Region opacity, causal wake timing, and landmark density across real datasets and all four profiles.
- Image Atmosphere + Region + lineage combinations should be checked with unusually bright/high-contrast user images.
- Atlas density on extremely large Fields may eventually need richer cluster identity than the current Region/Crystal/frontier landmarks.

### Remaining interaction debt

- Region fields themselves are intentionally noninteractive.
- Causal hit geometry from Phase 2 remains available for future provenance inspection/edit affordances, but Phase 4 does not introduce a line editor.
- The semantic zoom transitions are clearer, but very large-canvas navigation should still be usability-tested with real content.

### Does Semantic Zoom need a dedicated future phase?

Not as a blocker for this redesign. The current Local / Neighborhood / Atlas model is now internally coherent enough for the requested pass. A dedicated future phase would be worthwhile only if Diffusion needs semantic cluster summaries, richer Atlas identities, or navigation behavior for very large Fields; those are product capabilities rather than polish fixes.

### Migration / data compatibility

Phase 4 introduces **no new persistent project schema**.

The lineage metadata introduced in Phase 2 (`derivedFrom` and `generationAction`) remains optional, so older projects can load without a migration/schema bump. Lineage stores semantic provenance only, not geometry. Phase 4 only consumes the existing lineage for presentation and adds transient `ThinkingOperation.resultCount`, which is not project data.
