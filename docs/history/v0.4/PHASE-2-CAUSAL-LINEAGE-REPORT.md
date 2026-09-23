# Phase 2 — Causal Lineage & Thinking Trajectory

Status: **implemented and checkpointed**  
Scope: **Phase 2 only** — no Style Profiles / Background Materials / Phase 3 work was started.

## 1. What changed

Phase 2 adds a durable but deliberately small causal-lineage model and a dedicated presentation layer for the user's thinking trajectory.

### Canonical lineage

Canonical `Thought` now supports two optional fields:

- `derivedFrom?: string[]`
- `generationAction?: 'continue' | 'angle' | 'question'`

A Ghost still remains transient. Dragging it does not claim it and does not write lineage. Only the existing human **Keep / claim** boundary copies valid canonical scope ids into `derivedFrom` and the explicit proposal action into `generationAction`.

Lineage metadata is validated as a pair, rejects empty/self/duplicate/dangling parents, and is pruned safely when an ancestor is deleted. Old projects remain valid because the fields are optional.

Crystal → Continue also records lineage so the trajectory is a thinking-history concept rather than an "AI badge".

### Dedicated CausalTraceLayer

Added a new, independent causal layer instead of overloading semantic Relations:

- `src/field/phenomena/causalTrace.ts`
- `src/field/phenomena/CausalTraceLayer.tsx`
- `src/field/phenomena/causalDragPreview.ts`

The layer derives visual geometry from canonical lineage + current Thought geometry. No path/control-point/anchor geometry is stored in the canonical model.

### Visibility grammar

- Rest: trace sleeps at very low presence.
- Hover Thought: only its immediate parent lineage wakes.
- Select Thought: full ancestry wakes plus one local descendant/branch depth.
- Atlas zoom: causal traces are suppressed so the Atlas remains landmark/region oriented.

### Action grammar

All causal traces use the same structural color (`--trace`). Action meaning is expressed primarily through geometry/rhythm:

- Continue: calm smooth curve.
- Another Angle: stronger bowed/branching curve.
- Question: light dotted curve plus a restrained `?` when awake.

There are no arrowheads and no per-action rainbow colors.

### Geometry / hit separation

- visible stroke: `1.15px` (Angle `1.25px`)
- independent transparent hit path: `12px`
- hit path is intentionally `pointer-events: none` for now so Phase 2 does not create an accidental line editor or interfere with Thought dragging
- endpoints attach to Thought boundaries via the existing geometry authority

### Drag behavior

Causal traces follow the same transient drag preview used by Thoughts. During pointer movement, only traces connected to moved ids are recalculated. Canonical Thought coordinates remain unchanged until the existing pointer-up commit.

### Semantic placement

`Continue` and `Another Angle` now use durable lineage direction when a single selected Thought has a reconstructable incoming trajectory:

- Continue extends forward along the current trajectory.
- Another Angle rotates away from it to create a meaningful branch.
- Existing Question upper/upper-diagonal and evidence/landmark postures are retained.
- Collision escape runs after semantic candidates, so free-space search does not silently erase intent.

## 2. Why

The previous repository already retained proposal scope on Ghosts, but that context disappeared after Keep. This meant a generated-and-kept Thought could no longer answer "where did this come from?" without abusing semantic Relations.

Phase 2 therefore keeps two concepts separate:

- **Causal lineage** = how a Thought was reached.
- **Relation** = what semantic relationship exists between Thoughts.

The new model stores only enough data to reconstruct history, while the renderer owns all curve geometry and transient focus behavior.

## 3. Files changed from the Phase 1 checkpoint

### Core / persistence

- `src/core/model.ts`
- `src/core/controller.ts`
- `src/core/reducer.ts`
- `src/core/validation.ts`
- `src/core/world.ts`

### Field / geometry / rendering

- `src/field/Field.tsx`
- `src/field/spatial/placement.ts`
- `src/field/phenomena/index.ts`
- `src/field/phenomena/causalTrace.ts` **new**
- `src/field/phenomena/CausalTraceLayer.tsx` **new**
- `src/field/phenomena/causalDragPreview.ts` **new**

### Presentation

- `src/ui/thought/ThoughtView.tsx`
- `src/ui/resultSemantics.css`

### Tests

- `tests/offline/phase2-causal-lineage.test.mjs` **new**
- `tests/unit/causalLineage.test.ts` **new**

### Checkpoint manifest

- `PHASE-2-CHECKPOINT.sha256`

No Phase 3 settings/theme/profile/background implementation was started.

## 4. Architectural decisions

1. **Lineage is canonical semantic metadata; trace geometry is presentation state.**
2. **RelationLayer remains untouched as the semantic-relation authority.** CausalTraceLayer is separate in model, rendering and interaction.
3. **Keep remains the AI → human canonical boundary.** Moving a Ghost never promotes it.
4. **Existing user coordinates remain authoritative.** Placement uses lineage only when generating a new proposal; it never reorganizes existing Thoughts.
5. **The hit layer exists without owning pointer input yet.** This keeps the visual/interaction geometry separation while avoiding a premature line-editor UI.
6. **Old project compatibility is additive.** No storage/schema migration is required for projects without lineage fields.
7. **Deletion maintains referential integrity.** Removing an ancestor prunes only the invalid causal reference; it does not rewrite descendant content or position.
8. **Fork Bring-to-Main is conservative.** Lineage is retained only when its parent already exists in the target Main; fork-only ancestry is dropped rather than persisted as a dangling reference.

## 5. Visual decisions

- One muted structural color, no semantic rainbow.
- Curves rather than flowchart elbows/arrows.
- Sleeping traces are deliberately faint so the resting Field does not become a knowledge graph.
- Selection wakes history locally instead of globally darkening the screen.
- Question lineage uses line rhythm and a tiny punctuation cue, not another color.
- Kept generated Questions receive a restrained italic posture when not editing.
- Relation is layered above the causal trace in DOM order, preserving its separate semantic role.

## 6. Tests added / updated

### New Phase 2 offline coverage

`tests/offline/phase2-causal-lineage.test.mjs` now covers:

1. Ghost drag does not Keep; Keep persists semantic lineage.
2. Undo/redo retains lineage and deletion prunes dangling ancestry.
3. Persistence rejects half-formed lineage metadata.
4. Selection wakes ancestry + one nearby branch; hover wakes immediate parent only.
5. Boundary-attached curved geometry and action-specific line grammar.
6. Continue follows incoming trajectory and Another Angle branches away.
7. CausalTraceLayer remains separate from RelationLayer and uses separate visual/hit paths.
8. Drag preview is paint-only and does not write `thought.move`/coordinates.
9. Canonical Thought stores no causal connector geometry.

A Vitest counterpart was also added in `tests/unit/causalLineage.test.ts`; it cannot be executed in this container because repository dependencies are not installed.

## 7. Commands run and results

### Phase 2 strict TypeScript subset

A temporary strict TypeScript config was used against all changed non-React core/spatial/causal files with the globally available TypeScript 5.8.3 compiler.

Result: **PASS**.

This check caught and led to fixing one real type bug in the drag-preview implementation before checkpointing.

### TSX parse/transpile sanity check

Used TypeScript `transpileModule` on:

- `src/field/Field.tsx`
- `src/field/phenomena/CausalTraceLayer.tsx`
- `src/ui/thought/ThoughtView.tsx`

Result: **PASS — 3/3**.

### Focused Phase 1 + Phase 2 + interaction regression set

Command used Node's strip-types test runner over the new Phase 2 suite plus controller/spatial/v0.4 interaction/visual/Phase 1 presentation regressions.

Result: **PASS — 31/31**.

### Full offline suite

`node scripts/run-offline-tests.mjs`

Result: **218 passed / 221 total; 3 failed**.

The three failures are:

- `v023-identity.test.mjs` — still expects the old `.78` nearby opacity.
- `v024-signature.test.mjs` — still expects the old `.78` nearby opacity.
- `v04-materiality.test.mjs` — still expects the old `3%` resting Thought material.

These are **pre-existing Phase 1 baseline failures**, not Phase 2 regressions. The exact same three tests were run against the delivered `Diffusion-phase1-tactile-editorial.zip` and fail there for the same old assertions. They intentionally conflict with Phase 1's stronger material hierarchy, so they were not silently rewritten during Phase 2.

### Repository `pnpm typecheck`, `pnpm test`, `pnpm build`

Skipped in this environment:

- `pnpm` is not installed.
- `node_modules` is absent.
- the prior Phase 1 dependency-install attempt did not complete.

The full project typecheck therefore cannot resolve external packages such as `zod`, React, Vite, etc. The Phase 2 subset/type-syntax checks and dependency-free offline suite were used instead.

## 8. Known limitations

- The 12px causal hit path is present but deliberately non-interactive. Provenance-on-line-hover/edit handles are left for a later explicit interaction pass.
- No global DAG/cycle validator was added. Product-generated lineage is forward-only by construction; validation currently rejects self, duplicate and dangling parents. A hand-edited malicious project could still encode a multi-node cycle, though traversal is cycle-safe.
- Bring-to-Main preserves only lineage parents already present in Main. It does not currently remap a whole newly-brought fork-only lineage subtree in one operation.
- The renderer uses DOM geometry already available to the Field; no attempt was made to build a second geometry authority.
- No browser screenshot or Playwright visual run was performed, per the instruction to skip unavailable screenshot/browser requirements rather than block the phase.

## 9. Manual / visual states still needing human review

When the project is run in the normal local environment, manually inspect:

- a 3+ step Continue chain
- a selected middle node with an Another Angle sibling branch
- generated Question → Keep
- Relation and causal trace crossing/overlap
- multi-parent proposal Keep
- dragging one Thought and a selected group while lineage is awake
- Ghost drag confirming no Keep
- light/dark inherited Phase 1 appearance
- reduced-motion behavior
- local → neighborhood → atlas zoom transitions

No screenshot gate is required for this checkpoint.

## 10. Checkpoint

The supplied source archive contains **no `.git` metadata**, so an honest Git commit hash cannot be produced.

A deterministic SHA-256 manifest of the Phase 2 source/test changes is included as `PHASE-2-CHECKPOINT.sha256`.

**Phase 2 content checkpoint hash:**

`c69e135aa53bc065320499bd18e52f4d39c6234308845bd0e6c65c02993a5ed9`

This is a content checkpoint, not a Git commit id.

## Acceptance status

- Kept generated Thoughts retain reconstructable causal origin: **yes**
- Multi-step Continue chain reconstructable: **yes**
- Another Angle branches visually/spatially: **yes**
- Question has unresolved trajectory grammar: **yes**
- Causal Trace separate from semantic Relation: **yes**
- Drag preview keeps trace attached without canonical jitter/writes: **yes**
- Ghost drag still does not Keep: **yes**
- Canonical lineage stores no visual geometry: **yes**
- New persistence/geometry behavior covered by tests: **yes**
- Screenshot/browser verification: **skipped by instruction / environment**

**STOP: Phase 2 complete. Phase 3 has not been started.**
