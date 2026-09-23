# v0.3.2 structural cleanup — phase 1 of the visual-runtime preparation

This pass changed no product behaviour and added no dependency. It made frontend responsibilities
explicit, removed proven redundancy, and separated current authority from historical provenance, so
that a later visual-runtime phase (a primitive library, authored signature motion, a GPU phenomena
renderer) can attach without rewriting features.

## Before → after

| Responsibility | Before | After |
|---|---|---|
| Composition root | `src/ui/Workspace.tsx` owned six unrelated capabilities in 460 lines | 206 lines: constructs systems, connects them, renders. Capabilities moved to `src/ui/workspace/` (settings+appearance, thinking service, transient surface ownership, Field actions, thinking intents, project actions, lifecycle). |
| Field pointer classification | five call sites inside `Field.tsx` re-deriving "what did this event land on" | one pure module, `src/field/spatial/pointerTarget.ts`, used at every site (4 unit tests). |
| Relation presentation | Core held the visible glyph table; `Field.tsx` resolved geometry and drew SVG in the same expression | `src/field/phenomena/describe.ts` resolves a typed `RelationPhenomenon[]` in world coordinates; `field/phenomena/glyph.ts` holds the marks; Core knows neither. The SVG renderer consumes the description (4 unit tests). |
| Surface motion | a 12-branch inline derivation inside `Surface.tsx` (cyclomatic complexity 34) | pure `surfaceMotionRoles()` in `src/ui/surfaces/surfaceMotion.ts`; `Surface` drops to 11 (4 unit tests). Every level's initial/exit/origin and the reduced-motion collapse are now pinned. |
| Motion ownership | implicit | written contract: one animation owner per property, semantic ownership never waits for animation (`docs/ARCHITECTURE.md`). |
| Repository truth | current specs, historical build prompts, checkpoint notes and proofs interleaved at the root and in `docs/specs/` | `docs/specs/` = authority; `docs/history/` = provenance (with an index), `verification/README.md` classifies the evidence tree. |

## Redundancy removed (with evidence)

- `geometry.ts::contains` — unused export; no reference in living code, tests or the primitive harness.
- `motion.ts::MOTION_EASE_IN_OUT` — unused export; its CSS twin was unused too.
- `theme.css`: `--focus-ring`, `--motion-surface`, `--ease-in-out-ui` — no references anywhere.
- `field.css`: `.find-results`, `.find-preview` — no markup renders them. `.find-hit` was kept: `ForkSurface` uses it.
- `Field.tsx` read `activeFrontiers(project)` twice per render; the same set now feeds landmark disclosure and the Atlas labels.
- `Workspace.tsx` stopped re-implementing what the extracted owners do.

Deliberately **kept**: `--surface-rest`, `--surface-hover`, `--surface-active`, `--ghost-ink`,
`--recall-ink`, `--system-danger`. They have no current consumer but are named as the declared token
vocabulary in `docs/specs/02_TECH_STACK_AND_IMPLEMENTATION.md`; deleting them would silently diverge
from the authority.

## Verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 14 files / 86 tests (was 11 / 74; +4 pointer-target, +4 phenomena, +4 surface-motion) |
| `npm run check:offline` | PASS — 134 TS/TSX files transpiled, 140 / 140 contracts, core typecheck, locales, source size |
| `npm run build` | PASS — main chunk 785.4 kB → 789.0 kB (+0.46 %); no dependency added |
| `npm run test:e2e` | 66 real React/Chromium tests. Each full run in this container finished with 64–65 passing and 1–2 failures, in a **different** test each run; every failing test passes in isolation (6/6 for the two that were re-run). Two failure mechanisms were identified and neither is product logic: (a) the page does not reach the Field at all — no page error, no Vite error, no reload, boot measured at 0.6–1.5 s even under 4× CPU contention, so a stalled dev-server module fetch during bootstrap is the likely cause; (b) `useThinkingIntents.submit`-adjacent UI asserts focus on a `Speak` textarea that React only auto-focuses on mount — a pre-existing race in the test's expectation. One assertion that was wrong on its own terms was fixed by waiting for rest (strengthened, not weakened); no retry or timeout was added. |
| `npm run bench:spatial` | PASS — unchanged |
| `npm run bench:storage` | PASS — unchanged |
| `npm run bench:history` | PASS — undo mean 8.39 ms, p95 10.96 ms, 60-entry bound intact |

Two independent reviews are recorded: `docs/history/v0.3/V0_3_2_EXTRACTION_REVIEW.md` (an adversarial regression
review of the extraction, plus its adjudication, the A/B proof for a pre-existing flaky harness
assertion, and the one real finding that was fixed) and `docs/history/v0.3/V0_3_2_DELETION_AUDIT.md` (reference
evidence for every deletion).

## Not done in this phase, on purpose

- No primitive-library migration. `Surface`, `CommandMenu` and `SurfaceClose` are already the three
  primitives features ask for; wrapping one-to-three attributes in a fourth layer would re-name DOM,
  not remove a decision. The remaining low-level duplication — the palette's own listbox keyboard
  handling beside `useListNavigation` — belongs to the phase that adopts the primitive library.
- No CSS file split. The Field sheet is asserted as one unit by the offline contracts and the
  primitive harness reads `field.css` + `theme.css` together; splitting it now would be mechanical
  churn on verified styling. Feature-local styles belong to the feature work that adds them.
- No `src/ui/primitives/` directory. Folders were not created to match a diagram.

## The e2e gate in this container, measured

Seven full runs of the suite (66 tests, `workers: 1`) were recorded. Results: 64–65 passing, with
1–2 failures — a **different** test each run, and every failing test passes when run in isolation
(`--repeat-each=6` for two of them: 6/6).

Two mechanisms, separated by experiment:

1. **Boot stalls (five of the seven runs).** The failure was always an element that never appeared
   (`[data-testid="field"]`, `[data-thought-id="attention"]`, or the Settings dialog) with no page
   error, no console error and no Vite error or reload. App boot was measured directly: 0.60–0.94 s
   idle and 1.09–1.46 s under four CPU burners on three cores, so the 10 s assertion timeout is not
   simple CPU starvation. Running the identical suite against a **production build** (`vite
   preview`, no on-demand transform pipeline) removed all of these failures: 65 passed / 1 failed.
   The dev server's module pipeline, not the application, is where they come from.
2. **A real focus race (`tests/e2e/field.spec.ts:179`), pre-existing.** It failed under the dev
   server and again against the production build. `Speak` is rendered inside `AnimatePresence` with
   a fixed `key` and focuses its textarea through `autoFocus={composing}`, and React only applies
   `autoFocus` on mount. When the selection clears, that child starts exiting; if `Ask`/`Continue`
   re-sets the scope before the exit finishes, `AnimatePresence` revives the same key instead of
   mounting a new child, so `autoFocus` is never applied — the surface is visible, `composing` is
   true (its placeholder proves it), and the textarea never takes focus. The pre-refactor code has
   the identical structure, so this pass neither introduced nor widened it. The product-level fix,
   for a later phase, is one effect in `Speak` that focuses the textarea when `composing` turns
   true instead of relying on mount-time `autoFocus`.

One assertion that was wrong on its own terms was fixed by waiting for rest before asserting rest
(`docs/history/v0.3/V0_3_2_EXTRACTION_REVIEW.md` §f), which strengthens it; nothing else in the suite was
touched, and no retry or timeout was added.

### Closed in the finalization of this pass

All three mechanisms are closed, and the gate is green repeatedly without a retry.

**The Speak focus race (real defect, fixed).** `Speak` focused its textarea through mount-time
`autoFocus={composing}`, and `AnimatePresence` revives that keyed child instead of remounting it when
a scope is re-established before its 140 ms exit (`contentTransition`, role `micro`) finishes, so the
surface appeared with `composing` true and no focus. It now claims focus from one effect on the
`composing` transition (`src/ui/workspace/Speak.tsx`), which also covers the plain mount, so
`autoFocus` was removed rather than kept beside it; the real `focus` event still sets `speakFocused`
through the existing `onFocus`, so no state is duplicated, and Escape, scope handling and the exit
animation are untouched. Evidence: the new regression test (`tests/e2e/field.spec.ts`, "Speak takes
focus when a scope is re-established before its exit finishes") failed 6/6 against the pre-fix source
and passed 8/8 after it; the pre-existing `Light, Dark and reduced motion retain a common layout`
failed 1/6 before and passed 6/6 after.

The regression test does not race the animation: it marks the surface element, waits two frames,
clicks Continue from inside the page (so the round trip cannot outrun the exit), asserts that the
same node — not a remount — took focus, and only then asserts focus. That is why it reproduces
deterministically where the older test hit a one-frame window under `reducedMotion: reduce`.

**The gate serves the production bundle.** `playwright.config.ts` now runs
`npm run build && npm run preview` on `127.0.0.1:4173`. That changes no test's behaviour: every
`/api` reference in `tests/e2e` is stubbed or asserted absent, so the dev-only `/api` proxy is never
needed, and the routes the suite uses (`/`, `/demo?locale=en`, `/perf?count=5000`) all resolve
through the preview history fallback. `workers: 1`, the 10 s assertion timeout and
`reuseExistingServer` are unchanged; nothing was retried, slowed or padded, and the only addition is
an explicit 120 s `webServer.timeout` for a cold build. Six full runs since: 66/66, 66/66, 66/66
(before the regression test existed) and 67/67, 67/67, 67/67 (with it).

**A dropped first keystroke after boot (real defect, fixed).** With the module-pipeline stalls gone,
one failure remained, once in six full runs: `refinement.spec.ts:184` pressed `Control+Comma`
immediately after `[data-testid="field"]` became visible and the Settings surface never opened — yet
that command is `global: true` (`src/ui/commands/app.ts:32`), so no application state could have
blocked it, and the test passed 8/8 in isolation. A diagnostic probe (since removed) reproduced it
under CPU load: **1 lost first key press in 30 loaded boots, and the second press always worked.**
The cause is an ordering gap, not a slow boot: React commits the DOM — which is when a person, or a
harness, can see the Field — before passive effects flush, and the keyboard router registered its
`window` listener in a passive `useEffect`. Any press delivered in that gap was dropped. The router is
now wired with the commit (`useLayoutEffect` in `src/ui/workspace/useWorkspaceKeyboard.ts`), so "the
Field is visible" implies "the router is live". Evidence: the same probe under the same load went
from 29/30 to 30/30, and the three full runs above were then green. This is a real defect independent
of the harness — a person pressing a shortcut as the Field appears would see nothing happen. Same
family, not fixed, no demonstrated path: the spacebar pan modifier in `Field.tsx` and the
`beforeunload`/`visibilitychange` listeners in `useWorkspaceLifecycle.ts` are still passive effects;
no test presses Space as its first action after boot, and the pan modifier only matters during a
gesture the pointer already owns.

## Remaining limits

- The e2e gate is green: three consecutive full runs at 67/67 on the production bundle, after three
  at 66/66 before the regression test was added. No retry, no padded timeout and no weakened
  assertion is involved. Pointing the gate back at `npm run dev` brings the module-pipeline boot
  stalls back: that is the dev server, not the application.
- The dropped-first-keystroke defect was reproduced by running a probe under four CPU burners on three
  cores. That is a measurement, not a gate condition — the same technique will still surface
  timing-sensitive assertions in this suite, because several compare camera geometry on a coalesced
  rAF boundary.
- The renderer boundary is described, not abstracted: a GPU renderer can consume
  `RelationPhenomenon[]`, but the SVG-specific geometry constants (path fractions, hit-box offsets)
  still live in `Field.tsx`. Moving those is a renderer-phase task, not a cleanup task.
- `verification/v0.3.2/` was deliberately not created: this pass's measurements (the pre/post-fix A/B
  runs, the six full gate runs, the loaded probe) are recorded above and in the two review documents
  rather than duplicated as screenshot or JSON artifacts.
