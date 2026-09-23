# Diffusion Phase 3C.1 — Spatial Hygiene & Interaction Simplification

Implementation basis: the supplied `diffusion-explorer-v0.3.0-source-20260917.zip` archive and the Phase 3C.1 specification. The archive contains no `.git` directory, so repository status/branch/uncommitted-diff checks could not be performed. No commit or push was performed.

## 1. Root cause of Delete failure

`Field.tsx` did not own a direct Delete/Backspace path for the currently selected spatial object. Deletion mainly existed as a command/menu action, and command availability was biased toward canonical Thoughts. Relation surfaces also had no direct Delete handling. As a result, a selected Thought could remain selected while a physical Delete keypress did nothing useful.

Fixed by making direct manipulation own direct deletion:

- Field `Delete` deletes the current canonical Thought selection through `thought.delete`.
- Field `Backspace` does the same only when Field owns keyboard focus and no editable control owns the key.
- Selected Ghosts/proposals use existing dissolve + dismiss semantics rather than canonical deletion.
- RelationSurface handles `Delete`: confirmed relations dispatch `relation.remove`; candidates dissolve/dismiss.
- Editable inputs/textareas/contenteditable keep Delete/Backspace locally and do not delete spatial objects.
- Multiple selected canonical Thoughts are deleted in one history-backed action.

## 2. Root cause of relation candidates disappearing / reappearing

Candidate relations were durable enough to live in `session.phenomena`, but visibility was derived from `focus.activeRelations`. `focusFor(...)` intentionally returns no active relations when there is no selection. Field then used a short retirement echo (~190 ms) as presentation glue. Clearing selection therefore made a real candidate vanish; selecting/right-clicking a related Thought rebuilt focus and made it appear again.

The fix separates semantic existence from emphasis:

- `visibleRelations` comes from canonical `project.relations` plus candidate `session.phenomena`.
- Selection/focus only controls emphasis/progressive disclosure.
- Candidate tokens persist after clicking blank space.
- Confirmed relation lines remain quiet topology.
- The old `lastRelations` / `retiringRelations` selection-retirement mechanism is removed.

## 3. Root cause of generated Thought overlap

Generated placement relied on approximate fixed object dimensions, effectively treating results as similarly sized blocks and making no post-mount correction from real DOM geometry. Longer Ghost content therefore had a larger real footprint than the placement engine reserved.

The fix adds two-stage local hygiene:

1. Before mount, estimate Thought height from text while keeping a stable 256 px width.
2. After mount, use measured DOM bounds and allow one local correction pass for a Ghost if it still severely overlaps.

Generated placement also reserves existing Thoughts, Ghosts, relation-token space, and top-right UI chrome. Existing user-authored Thoughts are never moved to make room.

## 4. Root cause of relation label overlap

The old relation-label placer tried a small fixed family of offsets and eventually accepted a blocked fallback. In dense layouts this made overlap an explicit last resort.

The new relation-token placer performs a deterministic expanding local search:

- edge midpoint;
- increasing normal offsets;
- endpoint-side slots;
- nearby radial rings;
- farther deterministic fallback rings.

Thought bounds, already placed relation tokens, Scope Hub footprint, and top-right UI chrome are obstacles. If the midpoint is blocked, the token moves farther away rather than covering a Thought.

## 5. Delete behavior implemented

Implemented behavior:

- Canonical Thought(s): `Delete` or Field-owned `Backspace` -> `thought.delete`.
- Ghost/proposal: `Delete` or Field-owned `Backspace` -> dissolve + dismiss.
- Confirmed relation while its relation surface is active: `Delete` -> `relation.remove`.
- Candidate relation while its relation surface is active: `Delete` -> dissolve + dismiss.
- Text editing: Delete/Backspace remains text editing.
- Buttons/links/editable controls own their own keyboard behavior.

Canonical Thought/relation removal uses the existing controller history path, preserving Undo.

## 6. Relation Token design and lifecycle

Added `src/field/phenomena/RelationToken.tsx`.

Candidate token:

- compact one-line spatial object where practical;
- estimated 34 px high;
- tentative material treatment;
- direct actions: **Keep / Modify / Ignore**;
- label itself opens the relation surface;
- practical hit target is not the thin relation line.

Confirmed token:

- estimated 30 px high;
- quieter/stable treatment;
- normally shown through progressive disclosure rather than making every relation shout.

The SVG relation line remains separate from the DOM token, preserving geometry/pointer layering.

## 7. Candidate persistence behavior

A semantic candidate now remains present independently of hover, right-click, or selection. It disappears only after an explicit lifecycle action (for example Ignore/dismiss) or becomes canonical after Keep.

Selection now answers “which relations should be emphasized?”, not “which relations exist?”.

## 8. Promote-to-Thought behavior

Not implemented in this pass.

The specification marked Promote-to-Thought as optional/secondary. The pass deliberately avoided adding another feature path while the P0 hygiene and simplification work was still being stabilized.

## 9. Collision hygiene architecture

Added focused modules instead of growing the Field interaction engine:

- `src/field/spatial/collision.ts` — text-aware size estimates, overlap measurement, severe-overlap classification, deterministic local correction.
- `src/field/interactionHygiene.ts` — moved-Thought correction, measured-Ghost correction, direct delete helpers, relation candidate lifecycle helpers, relation/UI placement obstacles.

Rules preserved:

- no force layout;
- no global repack;
- no continuous auto-layout;
- only the newly generated or directly moved object may be corrected;
- small/intentional overlap remains allowed;
- severe overlap triggers local correction;
- Alt bypasses drag-release correction.

`Field.tsx` was brought back to exactly 600 lines, satisfying the repository's stricter legacy offline architecture guard as well as the Phase 3C.1 source-size direction.

## 10. Generated-result placement before / after

Before:

- approximate fixed-size placement;
- no text-aware height;
- no one-pass correction from measured DOM bounds;
- relation-token/UI footprint was not fully reserved.

After:

- 256 px stable width + text-aware estimated height (bounded 52–292 px);
- 16 px placement clearance;
- existing Thoughts and Ghosts indexed as occupied space;
- relation token estimates reserved;
- top-right chrome reserved when viewport bounds are known;
- one measured post-mount correction for Ghosts;
- broad deterministic fallback searches farther instead of stacking.

## 11. User-drag overlap behavior

On single-Thought drag release:

- if overlap is not severe, the user's final position is preserved;
- if overlap is severe, only the moved Thought searches for the nearest reasonable clear slot;
- unrelated Thoughts never move;
- holding Alt bypasses collision correction.

Multi-selection dragging is not globally repacked; it retains the existing direct-manipulation behavior.

## 12. Scope Hub actions before / after

Before the pass the Scope Hub already had the right structural ceiling: three primary actions plus More. That architecture was preserved rather than rewritten.

Before wording/behavior:

- `Explore relation` was exposed generically;
- Ask;
- Continue thinking;
- More.

After:

- exactly two Thoughts: **Find a relation**;
- one or 3+ Thoughts: **Explore** (starts the simplified bounded exploration path);
- Ask;
- Continue thinking;
- More.

Proposal review remains only Keep all / Keep original / More.

## 13. More actions before / after

Selection More before could expose a large warehouse of capabilities: Deep Dive, Verify, Crystallize, Continue Crystal, Handoff, Diffuse, Keep, Fade, Open Reference, Carry, Duplicate, Copy, Delete, History depending on context.

After:

- generic selection More: Verify, Crystallize, Diffuse, Duplicate, Copy, Delete (6);
- Crystal More: Continue Crystal, Handoff, Verify, Diffuse, Copy, Delete (6);
- Source More: Open Reference, Verify, Diffuse, Copy, Delete (5).

Capabilities removed from the contextual page still exist in the command registry/palette where appropriate; they were hidden/merged, not deleted.

Field menu before could expose up to about nine context-valid actions in one popup. After:

- root: Rename Field / New Field / Open Field / More;
- More: at most six context-valid actions (fork and compare-fork are mutually exclusive).

## 14. Maximum visible actions in every major contextual UI

Implemented ceilings:

- Scope Hub normal: 4 controls including More.
- Scope Hub proposal review: 3 controls including More.
- Field root menu: 4 controls including More.
- Field More: <= 6 context-valid actions.
- Generic selection More: 6.
- Crystal More: 6.
- Source More: 5.
- Relation candidate token: 3 direct actions.
- Diffuse advanced options: 3 controls (directions, Field sources, web).
- Running Diffuse indicator: Scope/results + Stop; Resume appears only as recovery for an already-paused internal session.

## 15. More hover implementation

Kept the existing single-popup root/More page architecture.

Added:

- pointer hover over More -> 130 ms intentional delay -> same popup switches to More page;
- click -> immediate switch;
- Enter / Space / ArrowRight -> immediate switch;
- pointer leaving before the delay cancels the switch;
- no nested portal/submenu was introduced;
- Back remains click/keyboard driven.

## 16. Diffuse UI before / after

Before the normal path opened a setup surface containing:

- freeform exploration prompt;
- angle count;
- time limit;
- pause/time explanation;
- Field source toggle;
- web toggle;
- explicit Start;
- Pause/Resume during the run.

After the primary path starts immediately with:

- 3 directions;
- internal 60 second cap;
- Field sources off;
- web off;
- the existing safe default prompt.

The review/restart surface keeps only an optional More section with:

- Directions;
- Use Sources already in this Field;
- Include one web search.

Pause is removed from the normal running UX. The runtime Pause capability remains internally available, and Resume is shown only if an already-paused session must be recovered.

## 17. Exploration activity feedback

Diffuse runtime calls now request `activity: 'radiate'`.

The Field therefore has operation-owned Radiate activity anchored to the selected scope while each bounded exploration request runs. The persistent indicator shows progress as used directions out of the configured total (normally 1/3, 2/3, 3/3), exposes Stop, and provides Scope/results. Results continue to arrive as real Ghost possibilities through the existing runtime path.

## 18. Features hidden/merged but still internally available

Still internally available but no longer all exposed as top-level contextual choices:

- Deep Dive;
- Continue Crystal;
- Handoff;
- Keep/Fade/Carry where those states make sense;
- History;
- detailed Diffuse runtime limits;
- Pause/Resume runtime support.

The command registry and runtime remain the owners; contextual UI now projects a smaller decision space.

## 19. Files changed

Production (25):

- `src/ai/diffuse.ts`
- `src/ai/runtime.ts`
- `src/core/controller.ts`
- `src/field/Field.tsx`
- `src/field/interactionHygiene.ts` (new)
- `src/field/phenomena/RelationLabels.tsx`
- `src/field/phenomena/RelationToken.tsx` (new)
- `src/field/phenomena/relationLabelPlacement.ts`
- `src/field/spatial/collision.ts` (new)
- `src/field/spatial/placement.ts`
- `src/locales/zh.ts`
- `src/ui/Workspace.tsx`
- `src/ui/commands/app.ts`
- `src/ui/commands/compose.ts`
- `src/ui/commands/thinking.ts`
- `src/ui/field.css`
- `src/ui/focus/CommandMenu.tsx`
- `src/ui/focus/RelationSurface.tsx`
- `src/ui/scope/ScopeHub.tsx`
- `src/ui/surfaces/DiffuseSurface.tsx`
- `src/ui/thought/ThoughtView.tsx`
- `src/ui/thread/DeepDiveSurface.tsx`
- `src/ui/thread/ThreadSurface.tsx`
- `src/ui/workspace/useFieldActions.ts`

Tests (13):

- `tests/e2e/field.spec.ts`
- `tests/e2e/friction.spec.ts`
- `tests/e2e/hotfix.spec.ts`
- `tests/e2e/interaction.spec.ts`
- `tests/e2e/lab.spec.ts`
- `tests/e2e/motion.spec.ts`
- `tests/e2e/refinement.spec.ts`
- `tests/offline/phase3b-legibility.test.mjs`
- `tests/offline/phase3c1-hygiene.test.mjs` (new)
- `tests/unit/collision.test.ts` (new)
- `tests/unit/commands.test.ts`
- `tests/unit/interactionLayer.test.ts`
- `tests/unit/relationLabelPlacement.test.ts`
- `tests/unit/scopePlacement.test.ts`

Total directory comparison: 38 changed/added files, approximately 783 insertions and 237 deletions before packaging/report files.

## 20. Tests

### Passed in this environment

- `npm run test:offline` — **PASS, 187/187**.
  - Includes new Phase 3C.1 dependency-free regression coverage for collision hygiene, generated placement, Relation Token placement/persistence source contract, direct Delete exposure, action limits, and immediate bounded exploration defaults.
- `npm run check:locales` — **PASS**; 695 dictionary keys, no missing/unwrapped/unlocalized entries.
- `npm run check:source-size` — **PASS**; `Field.tsx` is exactly 600 lines.
- `node scripts/offline-check.mjs` — **PASS**; 214 TS/TSX files syntax-transpiled, JSON valid, local imports resolve. This check explicitly is not dependency-backed application typechecking.

### Infrastructure-blocked, not claimed as passed

The source archive had no installed dependency set. `npm ci` could not complete because the environment could not reliably reach the npm registry (`EAI_AGAIN`); offline install then failed because required tarballs such as `zustand@5.0.15` were not cached (`ENOTCACHED`). Therefore:

- `npm run typecheck` — blocked by missing `@types/node` and `vite/client` types.
- `npm run typecheck:core` — blocked by missing `zod` and Vite environment types.
- `npm test` — blocked: local `vitest` executable unavailable.
- `npm run build` — blocked at dependency-backed typecheck.
- `npm run test:e2e` — blocked: project Playwright test runner dependency unavailable; the shell resolved a different `playwright` executable that has no `test` command.

These are reported as infrastructure failures, not product passes or product failures.

## 21. Manual dense-Field dogfood

A true browser/manual dense-Field dogfood pass could not be performed because the dependency installation failure prevented a runnable Vite/Playwright application in this environment.

What was verified without pretending this was visual dogfood:

- dependency-free offline suite exercises the new local collision and relation placement behavior;
- deterministic placement is tested repeatedly;
- candidate persistence contract is guarded in source plus E2E coverage was authored for the runnable project environment;
- Delete/Undo, relation candidate persistence, More hover, action limits, and immediate Diffuse flow have E2E tests updated/added, but those browser tests could not be executed here.

Manual dense-Field visual behavior remains the main verification item to run on a machine with dependencies installed.

## 22. Remaining risks

1. Full dependency-backed TypeScript, Vitest, production build, and Playwright gates still need one clean run after `npm ci` succeeds.
2. Manual 8–12 Thought dense-Field dogfood still needs visual confirmation for clickability, calmness, z-index, and edge cases around real font/layout metrics.
3. Promote-to-Thought is intentionally not implemented; it remains optional follow-up work.
4. Single-Thought drag release receives collision correction; multi-selection drag intentionally does not invoke a global/group repack.
5. UI chrome avoidance currently uses the known Scope Hub footprint plus the current top-right chrome footprint. If that chrome geometry changes substantially later, the placement obstacle constant should be kept in sync or centralized.
6. `Field.tsx` is exactly at the repository's 600-line legacy ceiling. This pass extracted new hygiene logic rather than raising the limit, but future Field responsibilities should be moved into focused modules instead of growing the file again.

---

## Verification conclusion

The source-level Phase 3C.1 implementation is complete for the requested P0 interaction and simplification work that can be verified from the supplied archive. The dependency-free gates are green, candidate persistence and local spatial hygiene have dedicated regression coverage, and the UI decision space is bounded. The remaining uncertainty is specifically the dependency-backed/browser verification that the environment prevented, not a claimed finished visual dogfood pass.
