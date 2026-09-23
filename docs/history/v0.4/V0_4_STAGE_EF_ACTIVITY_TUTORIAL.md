# v0.4 Stage E + F — AI Activity Feedback & First Field Tutorial

Date: 2026-09-19

## Scope

This checkpoint implements only the next two stages from the redesign brief:

- Stage E — AI activity feedback
- Stage F — First Field Tutorial

Stage G polish is intentionally not included.

## Stage E — AI activity feedback

### What changed

AI work now acknowledges itself at the affected scope instead of relying on a global notice line or on decorative motion alone.

`SpatialActivityLayer` now presents:

- an immediate local activity mark;
- action-specific copy after ~190 ms, so fast operations do not flash status text;
- a local Stop control when the active request actually has a registered cancellation path;
- a short terminal settle/failure/cancel presentation;
- the existing radiate / bridge / anchor / unfold spatial grammar beneath the status surface.

The wording is intent-specific:

- Continue → `Continuing this line...`
- Another angle / Diffuse → `Looking from another direction...`
- Question → `Looking for a useful question...`
- Relation → `Looking for a relation...`
- Verify → `Looking for supporting or challenging evidence...`
- Organize → `Looking for structure already here...`
- Ingest → `Finding structure in your words...`

No percentage, token counter, provider internals, or private reasoning is exposed.

### Cancellation

A small request-scoped cancellation registry now lives in `src/ai/operationControl.ts`.

This avoids putting callbacks in Zustand/UI state while allowing presentation to stop the exact operation it is showing.

Registered cancellation paths now include:

- normal `AIRuntime` requests;
- evidence Search / Read / Assess operations.

`bring` remains a short local operation and does not pretend to offer a Stop control when no meaningful cancellation path exists.

### Operation identity

`ThinkingOperationKind` now retains the important action identity for:

- `continue`
- `angle`
- `question`
- `organize`

rather than collapsing all of them into a generic ask/diffuse presentation. Provider semantics and authority rules are unchanged.

## Stage F — First Field Tutorial

### Core lesson

The tutorial is integrated into the actual Field. It is not a modal slideshow and has no `Step 1 of 9 / Next` flow.

The person learns by doing:

1. write one unfinished Thought using the normal composer;
2. drag the Thought;
3. drag blank space to pan;
4. select the Thought;
5. choose Continue / Another angle / Ask;
6. inspect a Ghost proposal;
7. drag the Ghost and see that moving does not accept it;
8. use Keep to see the proposal settle.

The coach is a quiet, pointer-transparent annotation over the Field. Normal Field controls remain the controls being learned.

### No-provider tutorial path

While the core tutorial is active:

- the first authored Thought is committed locally;
- no provider is called to structure that first tutorial input;
- Continue / Another angle / Ask are intercepted only for the tutorial generation step;
- a deterministic transient Ghost is produced;
- the UI explicitly says `Tutorial demonstration / no live model was used.`

The deterministic Ghost uses the normal placement grammar and the normal Ghost visual language.

### Authority and cleanup

The tutorial never calls `claim()` or `claimAll()` for its practice output.

When the person presses Keep:

- the normal settle presentation is shown;
- a short presentation-only stable fragment demonstrates the transition;
- the deterministic tutorial Ghost is dismissed;
- the person's own authored Thought remains;
- the practice proposal never becomes canonical ProjectState or project history.

This preserves the lesson without permanently polluting the person's Main Field.

### Lifecycle

Tutorial progress is device/UI state in localStorage, not ProjectState.

Supported lifecycle:

- first empty Field starts the lesson automatically unless previously completed/skipped;
- progress resumes where sensible after reload;
- transient Ghost stages fall back to the generation step after reload because session Ghosts are intentionally not canonical;
- Skip Tutorial;
- Help → Restart First Field Tutorial;
- Finish marks the core lesson complete.

### Progressive coaching

After the core lesson, one-time contextual annotations exist for:

- Relation;
- Verify;
- Crystal;
- multi-selection;
- Focus (`F`).

Each is concise, device-local, dismissible, and not Field content.

## Files changed

Production:

- `src/ai/operationControl.ts` — new request-scoped cancellation registry
- `src/ai/runtime.ts` — exact operation identity + cancellation registration
- `src/core/model.ts` — extended presentation operation kinds
- `src/ui/motion/SpatialActivityLayer.tsx` — local delayed AI operation feedback
- `src/ui/motion/spatialActivity.css` — operation status material
- `src/ui/reference/EvidenceSurface.tsx` — evidence cancellation registration
- `src/ui/tutorial/FirstFieldTutorial.tsx` — core + progressive tutorial state/behavior
- `src/ui/tutorial/firstFieldTutorial.css` — tutorial coaching presentation
- `src/ui/workspace/useThinkingIntents.ts` — local-only first tutorial submission path
- `src/ui/Workspace.tsx` — tutorial integration / intercepts / Help restart
- `src/ui/theme.css` — tutorial stylesheet import
- `src/locales/zh.ts` — EN/ZH coverage for new system copy

Tests:

- `tests/offline/v04-stage-ef-feedback-tutorial.test.mjs`
- `tests/e2e/tutorial.spec.ts`

## Verification

### Passed

- `node scripts/offline-check.mjs`
  - PASS
  - 225 TS/TSX files syntax-transpiled
  - JSON valid
  - local imports resolve
- `npm run test:offline`
  - PASS
  - 206 / 206
- `npm run check:locales`
  - PASS
  - missing: 0
  - unwrappedJSX: 0
  - unlocalized: 0
- `npm run check:source-size`
  - PASS
  - `Field.tsx`: 632 lines
  - no production source exceeds 700 lines
- direct TypeScript syntax transpilation of all touched TS/TSX files
  - PASS

### Not dependency-backed / not claimed as passed

- `npm run typecheck`
  - cannot run to a meaningful result because the supplied source archive has no complete dependencies (`@types/node`, `vite/client`, etc.)
- `npm run check:offline`
  - its syntax/import phase passes, then `typecheck:core` stops on missing `zod` / Vite types
- dependency installation was attempted, but the environment stalled before packages were populated; the partial `node_modules` tree was removed before packaging
- full build
- Playwright execution
- mounted browser visual dogfood
- Tauri build

`tests/e2e/tutorial.spec.ts` is authored for the new first-use path but was not executed in this environment.

## Important boundaries retained

- no new provider mode;
- no tutorial content enters canonical ProjectState;
- deterministic tutorial output is explicitly disclosed as non-live;
- moving a Ghost still does not claim it;
- selection still defines scope only;
- no private chain-of-thought presentation;
- no fake progress percentage;
- no Stage G broad polish in this checkpoint.

## Manual checks for the next dependency-backed run

1. Fresh empty install: tutorial appears and composer remains usable.
2. Write first Thought with a live provider configured: no provider request is made during the tutorial write step.
3. Drag Thought → coach advances.
4. Blank drag → pan → coach advances.
5. Select → local action strip remains usable.
6. Tutorial Continue / Angle / Ask produces a deterministic Ghost and the disclosure line.
7. Drag Ghost → it stays a Ghost and coach advances to Keep.
8. Keep → settle presentation appears, practice Ghost disappears, no tutorial Thought remains in canonical history.
9. Skip and Help → Restart both work.
10. Reload mid-tutorial resumes sensibly.
11. Live Continue / Angle / Ask outside tutorial: operation mark appears immediately, copy after ~190 ms, Stop cancels the exact request.
12. Verify: local activity and Stop abort the evidence request.
13. Reduced motion and EN/ZH.

## Next stage

Stage G remains: composition polish, density/spacing tuning, Field title/selection depth, motion/typography consistency, light/dark review, representative screenshots, and mounted visual acceptance.
