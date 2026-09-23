# Diffusion Explorer v0.2.6 — Interaction Visibility Audit

## Scope

This pass makes the existing interaction chain legible without changing Core, provider/evidence, Dexie, lifecycle, Ghost Claim, Recall Wake, Thread, Deep Dive, or camera/pointer/drag/lasso semantics.

> Selection defines scope. Scope creates nearby possibility. Writing gets a stable place. Global controls stay global.

## Interaction changes

- **Scope Hub:** `Field` derives a presentation-only union from currently visible selected geometry. A quiet Hub appears outside that union for both one and many selections. It has no group entity, persisted bounds, selection box, coordinate mutation, or AI side effect.
- **Placement:** `computeScopeHubPlacement` prefers below, then above, right, and left; it clamps to the viewport, avoids selected and nearby visible Thought rectangles, reserves the global-control corner, and switches to a bottom-center position above idle Speak when the selection occupies more than 60% of the viewport. Pointer release is not an input, so lasso direction cannot move the Hub.
- **Scope actions:** Explore uses the exact selected ID snapshot; Ask / Continue thinking open scoped Speak. The Hub disappears when composition gets focus.
- **Scoped Speak:** Speak receives the selected ID snapshot, displays `About here` / `About N thoughts` (`关于这里` / `关于这 N 个思绪`), and submits that snapshot. The idle bottom composer is visually quiet while a scope is active; keyboard focus remains available.
- **Settings:** More still captures an origin for shared-shell continuity, but Settings no longer uses that command row as its final anchor. Its fixed anchored home is the top-right global-control zone (`top: 85px; right: 30px; width: min(400px, ...)`). The existing exclusive transient/focus ownership remains unchanged.
- **Demo:** The deterministic demo is a compact thinking situation: six text-first Thoughts, a confirmed relation, Crystal, a memory Thought that can be recalled through the existing runtime, and deterministic Ghost output via the existing Demo provider. System demo Thoughts are rendered through the locale dictionary; canonical demo data stays stable, while user-authored text is never translated.

## Code structure

### New modules

- `src/ui/scope/scopePlacement.ts` — 48 LOC pure presentation geometry: union and stable Hub placement.
- `src/ui/scope/ScopeHub.tsx` — 25 LOC localized contextual rendering and action forwarding.
- `tests/unit/scopePlacement.test.ts` — pure placement coverage.

### Modified production responsibilities

- `src/field/Field.tsx` — exposes existing cached selected/visible geometry to the scope presentation module and renders its result. It does not own placement rules, persistent scope state, or new pointer-frame work.
- `src/ui/Workspace.tsx` — owns the transient scoped-Speak snapshot and passes it to existing Speak submission.
- `src/ui/workspace/Speak.tsx` — renders localized snapshot count/copy only.
- `src/ui/surfaces/SettingsSurface.tsx` — final-home behavior only; existing transient/motion shell remains intact.
- `src/core/demo.ts`, `src/ui/thought/ThoughtView.tsx`, `src/ai/mock.ts`, `src/locales/zh.ts` — deterministic demo locale presentation and real demo Recall path.

`src/ui/focus/ContextActions.tsx` was removed because the Scope Hub supersedes its rendered responsibility.

### Size review

- `src/field/Field.tsx` — **527 LOC**, touched and >500. It remains the performance-sensitive camera/gesture/geometry/culling owner. This pass adds only one render-boundary conversion from cached geometry to the focused scope module; extracting camera/lasso code merely to reach a numeric target would fragment the hot path.
- `src/ui/Workspace.tsx` — **339 LOC**, touched but below the 350 LOC review threshold.
- `src/ui/field.css` — **226 LOC**.
- `src/locales/zh.ts` — **354 LOC**, static dictionary exception.

No new presentation state is persisted. No canonical Core semantic state changed.

## Localization

- Added localized Scope Hub labels and scoped Speak count copy.
- Added Chinese equivalents for all system-provided demo Thoughts and their Crystal/Recall material.
- The demo’s canonical English keys are translated only for `origin.note === 'system-demo'`; user-authored wording remains verbatim.

## Verification

- `npm run typecheck` — PASS.
- `npm test` — PASS, 6 files / 33 tests.
- `npm run build` — PASS (Vite reports its existing >500 kB chunk warning).
- `npm run test:e2e` — PASS, **42** real React/Chromium tests.
- `npm run check:offline` — PASS, **139 / 139** contracts plus core typecheck, locale check, and source-size check.
- Placement unit tests cover union, bottom preference, top/right/left fallback, selection exclusion, and large-scope fallback.
- E2E covers single/multi Hub, scoped Speak snapshot, no coordinate mutation, blank/Escape dismissal, Ghost lasso non-claim, Settings top-right bounds/exclusive ownership/reopen, zh/en demo copy, and Demo runtime Recall Wake.
- Real mounted React screenshots: `verification/v0.2.6/screenshots/zh-scope-hub.png`, `zh-scoped-speak.png`, `settings-top-right.png`, and `zh-graphite-reduced.png`.
- Paper Day, Graphite Night, and reduced motion were exercised by the E2E suite and the captured Graphite/reduced-motion screen.

## Remaining limits

- Native Tauri runtime/build was not run; no native code or permissions changed.
- A short recording was not captured; the four real React screenshots and E2E interaction coverage are retained instead.
