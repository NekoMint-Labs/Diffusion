# Diffusion v0.4 — Stage G: Polish and Visual Composition

Date: 2026-09-19

## Scope

This checkpoint completes only the final Stage G pass from the redesign brief:

- result spacing;
- local density;
- spatial grammar;
- Field title;
- selection depth;
- motion refinement;
- typography;
- light/dark consistency.

It deliberately does not add new product ontology, AI modes, collaboration, a minimap, a canvas framework, or a new layout engine.

## 1. Spatial placement grammar is explicit

`src/field/spatial/placement.ts` now chooses a semantic posture before collision resolution instead of treating every generated object as the same collision-avoidance problem.

The supported presentation modes are:

- `continue` — extend the current reading direction;
- `branch` — leave the current line diagonally;
- `question` — prefer above / above-diagonal positions;
- `evidence` — prefer a subordinate footnote-like position below the scope;
- `landmark` — give a Crystal a calmer local landing position;
- `default` — retain the general local placement path where no stronger semantic posture exists.

The algorithm still resolves collisions after choosing a posture and keeps a deterministic escape ring as the fallback. It does not move existing user-authored canonical coordinates.

### Routing added

- AI `continue` proposals use `continue`.
- AI `angle` proposals use `branch`.
- AI evidence possibilities use `evidence`.
- brought/imported evidence uses `evidence`.
- continuing from a Crystal uses `continue`.
- a newly created Crystal uses `landmark`.

## 2. Local density and spacing

The placement constants now define one restrained neighborhood rather than a collection of unrelated magic offsets:

- preferred local distance: 88–216 px;
- target distance: 136 px;
- local-density margin: 96 px;
- collision clearance: 18 px.

This keeps generated material near the scope without collapsing everything into a pile or scattering the Field into a board-like layout.

## 3. Field identity

`src/ui/polish.css` gives the Field identity a stronger editorial presence while preserving its role as part of the paper rather than an app header:

- tighter relationship between `FIELD` and the project name;
- clearer typographic scale;
- more deliberate placement and spacing;
- responsive adjustment on narrow viewports.

## 4. Selection depth

Selection is now more legible without becoming a permanent card treatment:

- rest remains quiet;
- hover reveals a little more material presence;
- selection gains a restrained attention edge and surface lift;
- Ghost selection remains weaker than canonical Thought selection;
- selection drag disables transition lag and lifts immediately.

No layout animation was added to drag.

## 5. Typography and material rhythm

The polish layer adds small editorial typography refinements rather than a new type system:

- `text-wrap: pretty` where supported;
- hanging punctuation where supported;
- slight tracking refinement;
- more breathing room around Crystal;
- Source remains subordinate;
- content weight stays with the person's words rather than labels or chrome.

## 6. Relation trace refinement

Relations retain the established editorial-trace model:

- confirmed relations sleep quietly at rest;
- relations near the selected scope wake further;
- tentative traces remain lower-authority;
- transitions are limited to stroke/opacity presentation.

No geometric relation manipulation was introduced and geometry still cannot change semantic truth.

## 7. Light / dark consistency

The final polish layer contains explicit dark-theme counterparts for rest, hover and selection depth. The same hierarchy is preserved in both modes instead of simply inverting the light treatment.

No gradients, glow, blur-heavy surfaces or AI-colored ontology were introduced.

## 8. Files changed in Stage G

Production:

- `src/field/spatial/placement.ts`
- `src/ai/runtime.ts`
- `src/ui/workspace/useFieldActions.ts`
- `src/ui/workspace/useThinkingIntents.ts`
- `src/ui/Workspace.tsx`
- `src/ui/polish.css` (new)
- `src/ui/theme.css`

Tests:

- `tests/offline/v04-stage-g-polish.test.mjs` (new)

Documentation:

- `docs/history/v0.4/V0_4_STAGE_G_POLISH.md`
- `docs/history/v0.4/V0_4_FINAL_REDESIGN.md`

## 9. Regression coverage added

The Stage G offline regression test locks three final contracts:

1. semantic placement posture is chosen before collision escape;
2. evidence and Crystal paths actually route through the new placement grammar;
3. final polish preserves immediate drag, selection depth, dark-theme parity, and rejects gradient-based decoration.

## 10. Verification results

### Passed

- `npm run test:offline`
  - **209 / 209 PASS**
- `node scripts/offline-check.mjs`
  - **PASS**
  - 225 TS/TSX files syntax-transpiled
  - JSON valid
  - local imports resolve
- `npm run check:locales`
  - **PASS**
  - missing: 0
  - unwrappedJSX: 0
  - unlocalized: 0
- `npm run check:source-size`
  - **PASS**
  - `Field.tsx`: 632 lines
  - no checked production source exceeds the configured 700-line limit

### Attempted but not dependency-backed

This stage was authored in an environment without a complete dependency tree, so nothing below is a
measurement of the built application. They were all run afterwards against the production bundle — see
*Run afterwards* in §12 of [the final redesign report](V0_4_FINAL_REDESIGN.md).

- `npm run typecheck`
  - cannot reach project typechecking because the supplied archive has no complete dependency tree (`@types/node`, `vite/client`, etc.)
- `npm run typecheck:core`
  - stops on missing installed dependencies such as `zod`, then cascades into missing Vite environment types
- dependency installation was attempted; registry access repeatedly hit `EAI_AGAIN` / stalled in this environment; the partial `node_modules` directory was removed before packaging

### Not executable in this environment

- full Vite build;
- Vitest full dependency-backed suite;
- Playwright execution;
- mounted browser / desktop visual dogfood;
- representative screenshots;
- Tauri build (`cargo` is unavailable).

These gates are intentionally not reported as passing.

## 11. Visual acceptance status

The source now encodes the target visual system and its regressions, but the redesign is **not claimed visually accepted from source inspection alone**.

A dependency-backed mounted run still needs representative screenshots of:

- empty first-run Field;
- single / selected / dragging Thought;
- Continue / Another Angle / Question proposal;
- Ghost before and after Keep;
- Source and Crystal;
- multi-Thought neighborhood;
- zoomed-out Field;
- light and dark mode;
- tutorial annotations.

That final mounted review should check that the product does not read as a generic whiteboard, node graph, AI dashboard or component-library demo.

## 12. Stage G conclusion

The final pass does not paper over broken semantics. Stages C–F established the interaction, ownership, operation-feedback and tutorial contracts first; Stage G now makes their spatial presentation coherent.

The A–G redesign is source-complete and offline-regression-complete in this environment. Dependency-backed build/E2E and mounted visual acceptance remain the only meaningful unclosed verification gates.
