# Diffusion v0.4 - Stage C+D Direct Manipulation and Contextual Actions

Date: 2026-09-19

## Scope

This checkpoint implements only the next two stages from the Visual Identity, Interaction & First-Use Redesign brief:

- Stage C - Direct manipulation
- Stage D - Contextual actions

Stage E (AI activity feedback) and Stage F (First Field Tutorial) are intentionally not implemented here.

## Stage C - Direct manipulation

### Field gesture grammar

The Field now uses the requested default navigation model:

- blank left-drag -> pan
- Shift + blank left-drag -> marquee selection
- Space + drag -> pan
- middle drag -> pan
- Thought drag -> move the Thought
- drag a Thought in an existing multi-selection -> move the selected group

A plain blank click still clears selection when appropriate.

### Ghost movement no longer claims ownership

The previous drag path could cross the AI-to-user authority boundary by claiming a Ghost when it was moved. That path is removed.

Ghost geometry now stays in session/transient state:

- dragging a Ghost changes only transient coordinates;
- drag does not create a canonical Thought;
- drag does not Keep or Claim;
- manual Ghost drag marks the proposal as spatially detached;
- explicit Keep, Enter, or edit remains the ownership path according to existing product semantics.

`commitDraggedItems()` now separates canonical Thought movement from transient Ghost movement so a mixed interaction cannot accidentally commit proposal state.

### Proposal constellation behavior

Generated proposals can remain attached to their generating scope as a presentation constellation.

- Moving the complete generating scope moves still-attached Ghosts by the same delta.
- During pointer movement, attached Ghosts preview that delta live instead of jumping only on pointer-up.
- Undo/redo of canonical anchor movement also restores attached proposal geometry coherently.
- Manually dragging a Ghost detaches it from future automatic following.
- Detachment is presentation/session state and does not claim the Ghost.
- A multi-scope Ghost follows only when its complete generating scope moves together by the same delta.

Canonical user-authored coordinates are not auto-arranged.

### Navigation

Existing pointer-centered zoom behavior is retained and locked with regression coverage.

Added:

- `F` frames the current selection.
- `0` fits meaningful Field content.

The framing math uses shared geometry helpers and does not introduce a minimap or a separate navigation mode.

### Interaction hot path

The pointer hot path remains imperative and transform-based. The implementation does not add React state churn at pointer-move frequency and does not install a new canvas framework.

## Stage D - Contextual actions

### ScopeHub becomes an editorial action strip

ScopeHub has been visually reduced from a generic floating toolbar toward a local editorial strip attached to the selected scope.

Changes include:

- quieter material shell;
- local attachment hairline;
- stronger but compact hit targets;
- less pill-like controls;
- action descriptions shown on hover and keyboard focus.

### AI question vs user-authored question is now explicit

The old action model allowed the primary question entry point to mean opening the user's own question composer. That was ambiguous against the redesign contract.

The paths are now separated:

- `Ask a question` / Chinese `让 AI 提问` -> AI-generated question proposal;
- `Ask your own question` / Chinese `用你自己的话提问` -> human-authored question composer under More.

This restores the rule that one intent has one obvious entry point and keeps user-authored language distinct from AI-authored proposals.

### Action descriptions

Contextual actions now carry short human-language descriptions. These are used by:

- ScopeHub hover/focus feedback;
- command menu rows;
- action preview copy.

Descriptions were aligned for Continue, Another angle, Ask a question, relation, evidence, crystallize, organize and other existing contextual actions.

### Help and localization

Help now reflects the new grammar:

- double-click blank space to write;
- drag blank space to move around;
- drag a Thought to move it;
- Shift-drag blank space to select several Thoughts;
- wheel/pinch to zoom;
- F focuses selection;
- 0 fits the Field.

All added system-authored copy is localized. Chinese explicitly distinguishes `让 AI 提问` from the user's own question path.

## Main files changed

Production:

- `src/core/controller.ts`
- `src/core/model.ts`
- `src/field/Field.tsx`
- `src/field/interactionHygiene.ts`
- `src/field/spatial/geometry.ts`
- `src/field/spatial/gesture.ts`
- `src/field/spatial/pointerTarget.ts`
- `src/locales/zh.ts`
- `src/ui/Workspace.tsx`
- `src/ui/commands/compose.ts`
- `src/ui/commands/contextualActionModel.ts`
- `src/ui/field.css`
- `src/ui/focus/CommandMenu.tsx`
- `src/ui/materials.css`
- `src/ui/scope/ScopeHub.tsx`
- `src/ui/surfaces/ActionPreviewSurface.tsx`

Tests:

- `tests/offline/v04-stage-cd-interaction.test.mjs` (new)
- `tests/offline/v023-identity.test.mjs`
- `tests/offline/v024-signature.test.mjs`
- `tests/offline/v025-motion-reuse.test.mjs`
- `tests/unit/contextualActionModel.test.ts`
- `tests/e2e/field.spec.ts`
- `tests/e2e/phase25.spec.ts`
- `tests/e2e/phase27.spec.ts`
- `tests/e2e/phase3d1.spec.ts`

## Verification

### Passed in the available environment

- Offline syntax/import gate: PASS
  - 222 TS/TSX files syntax-transpiled
  - JSON valid
  - local imports resolve
- Localization gate: PASS
  - dictionary keys: 766
  - missing: 0
  - unwrapped JSX: 0
  - unlocalized: 0
- Offline regression suite: PASS
  - 202 / 202 tests
- Source-size gate: PASS
  - `src/field/Field.tsx`: 632 lines
  - repository maximum: 700 lines

Stage C regression coverage includes:

- attached Ghost follows anchor movement;
- Undo restores attached proposal geometry;
- manual Ghost movement detaches without claim;
- multi-scope following requires the whole scope to move together;
- pointer-centered zoom invariant;
- fit-camera math;
- new pan/marquee grammar;
- explicit no-claim Ghost drag contract.

Stage D regression coverage includes:

- AI-generated question remains the primary question action;
- human-authored question remains a separate More action;
- descriptions are present;
- Chinese primary label is unambiguous.

### Not verified because dependencies are unavailable

The supplied source archive has no `node_modules` directory. `npm run check:offline` therefore stops at dependency-backed `typecheck:core` with missing package/type errors such as `zod` and `ImportMeta.env` types.

An attempt to obtain the repository-pinned pnpm through Corepack also failed because the execution environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`).

Therefore these gates are intentionally NOT claimed as passed:

- dependency-backed TypeScript typecheck;
- full Vitest suite;
- production build;
- Playwright E2E;
- visual/browser inspection;
- Tauri build.

The standalone offline checker explicitly does not substitute for dependency-backed application typechecking.

## Known remaining work

- Stage E - AI activity feedback has not been changed.
- Stage F - First Field Tutorial has not been changed.
- The new interaction behavior has not yet been dogfooded in a mounted production-equivalent UI because dependencies cannot be installed in this environment.
- E2E tests were updated for the new contracts; they could not be executed in the environment this stage was authored in and were run afterwards against the production bundle — see *Run afterwards* in §12 of [the final redesign report](V0_4_FINAL_REDESIGN.md).

## Checkpoint conclusion

Stage C and Stage D are implemented as a coherent checkpoint without crossing into Stage E/F. The key authority invariant is now explicit in both code and tests: geometry changes to a Ghost do not create user ownership.
