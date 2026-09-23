# V0.3.2 extraction review — behavioral regressions only

Scope: `src/ui/Workspace.tsx` → `src/ui/workspace/*`, `src/field/spatial/pointerTarget.ts`,
`src/field/phenomena/*`, `src/ui/surfaces/surfaceMotion.ts`. Read-only over `src/**`.

Baseline note: the refactor is uncommitted; `HEAD` is an older revision (pre-v0.3.1 + pre-v0.3.2).
For most files the working-tree delta from `HEAD` is small enough to diff directly. Where a
pre-extraction revision is not recoverable (notably the `window` surface-motion role, added in
v0.3.1), that is called out explicitly.

## (a) Per-item verdict

| # | Area | Verdict |
|---|------|---------|
| 1 | Hook/effect order, dep identity | PASS |
| 2 | Provider switch: compare old→new, stop+cancel before apply | PASS |
| 3 | Disposal exactly once; no disposal of mounted systems | PASS |
| 4 | `useTransientFocus` wiring + `closeMenu` blank-point clear | PASS |
| 5 | `openSurface` / `closeSurface` routing | PASS |
| 6 | `buildCommands` deps vs registry | PASS |
| 7 | `useThinkingIntents.submit()` | PASS |
| 8 | `useFieldActions` (observe/duplicate/dropText/openSource/openRegion) | PASS |
| 9 | `Field.tsx` selector lists / context menu / relation render | **PARTIAL** — 2 of 5 selector lists changed (D1); context menu and relation rendering PASS |
| 10 | `Surface.tsx` derived motion values | PASS (window role unverifiable — see (d)) |

## (b) Divergences

### D1 — `select` added to two gesture selector lists (item 9)

- `src/field/spatial/pointerTarget.ts:28` — `GESTURE_OWNERS = 'textarea,input,button,select,[data-surface],.context-actions,.relation-hit'`
- `src/field/spatial/pointerTarget.ts:30` — `DOUBLE_CLICK_OWNERS = 'button,textarea,input,select,[data-surface],.relation-hit'`

Used at `src/field/Field.tsx:243` (`pointerDown` via `ownsPointerGesture`) and
`src/field/Field.tsx:438` (`doubleClick` via `ownsDoubleClick`).

Previous lists (HEAD, and v0.3.1 explicitly did not change gesture classification):
- pointerDown: `textarea,input,button,[data-surface],.context-actions,.relation-hit` (no `select`)
- doubleClick: `button,textarea,input,[data-surface],.relation-hit` (no `select`)

User change: a pointer-down or double-click landing on a `<select>` is now swallowed instead of
starting a Field gesture / creating a thought. **No reachable impact was found**: no `<select>` is
rendered anywhere inside the Field subtree (`Field`, `ThoughtView`, `ScopeHub`, region/frontier
labels, find/recall edges); the only selects (`provider-select` etc.) live in the Settings surface.

Smallest correct fix: drop `select` from both constants so the classification matches the previous
lists exactly.

### D2 — keydown guard widened from `HTMLElement` to `Node` (item 9, minor)

`src/field/Field.tsx:184`: `if (!(e.target instanceof Node) || !element.contains(e.target) || ownsKeyboard(e.target)) return;`
Previous (HEAD): `if (isTyping(e.target) || !(e.target instanceof HTMLElement) || !element.contains(e.target) || e.target.closest('button,a,[role=button]')) return;`.

User change: a keydown whose target is a non-`HTMLElement` `Node` (e.g. an SVG element inside the
viewport) no longer bails, so `Space` can begin pan mode. Not reachable through normal focus (the
focused target is the viewport `<div>`), so no observed effect. Fix: keep
`!(e.target instanceof HTMLElement)`.

## (c) Commands run and results

- `git show HEAD:src/ui/Workspace.tsx` / `HEAD:src/field/Field.tsx` / `HEAD:src/ui/surfaces/Surface.tsx` — recovered baselines.
- `git diff HEAD -- src/field/Field.tsx src/ui/motion.ts src/field/spatial/geometry.ts src/ui/workspace/useTransientFocus.ts` — full deltas inspected; `glyphs`→`relationGlyphs`, `contains` and `MOTION_EASE_IN_OUT` deletions confirmed unused.
- `npm run typecheck` → clean (exit 0).
- `npx vitest run` → 14 files, 86 tests passed (incl. `pointerTarget`, `phenomena`, `surfaceMotion`, `presentation`, `interactionLayer`).
- `npm run check:offline` (typecheck:core + locales + offline tests + source-size) → `"result": "PASS"`.
- `grep -rn "<select" src/field src/ui/thought src/ui/scope` → no matches (D1 reachability).
- `test:e2e` deliberately not started.

## (d) Highest-risk assumptions I could not fully verify

1. **Item 10 `window` role.** The pre-extraction inline for `level === 'window'` does not exist in
   `HEAD` (added in v0.3.1), so `surfaceMotion.ts:26-27` (window `initial`), `:40`
   (`panelTransition`) and `:41` (`center center`) could not be byte-diffed against the immediately
   preceding inline code. All HEAD-era roles (`split`/`focus`/`bar`/`anchored`, with/without anchor
   and shared layout, reduced and not) reproduce the HEAD inline exactly, and the new unit test
   passes — but the window/shared interaction is taken on trust.
2. **The exact pre-extraction selector lists.** The task says the old code had local
   `isTyping`/`interactionTarget`; `HEAD` has only `isTyping`. D1/D2 are stated against the `HEAD`
   baseline plus the documented v0.3.1 changes; if an intermediate uncommitted revision already
   carried `select`, D1 would collapse to a no-op. No such revision is recoverable.
3. **`Surface`/`Workspace` extractions were presented as behavior-preserving and I verified them by
   line-by-line reading against `HEAD`; I did not run the e2e suite, so a purely visual/motion
   regression is outside the evidence here.**

Net: no behavioral regression with reachable user impact was found. The only concrete drifts are
D1 (`select` in two selector lists) and D2 (`instanceof Node`), both currently unreachable in the
shipped Field.

## (e) Adjudication by the implementing session (added after the review)

The reviewer was right to state its baseline explicitly, and that baseline was older than the code
it was reviewing: `HEAD` predates the uncommitted v0.3.1 pass, while the extraction was taken from
the working tree. Both findings were therefore re-checked against the true pre-extraction revision.

- **D1 — false positive.** The literals that became `GESTURE_OWNERS` and `DOUBLE_CLICK_OWNERS` were
  copied character-for-character from the pre-extraction working tree, which already read
  `textarea,input,button,select,[data-surface],.context-actions,.relation-hit` (pointer start) and
  `button,textarea,input,select,[data-surface],.relation-hit` (double-click). `select` was present
  before the extraction, was carried over deliberately, and is unreachable in the Field subtree
  either way (no `<select>` is rendered inside `.field`). No change made.
- **D2 — real, fixed.** The window-level `Space` pan guard had been widened from
  `!(e.target instanceof HTMLElement)` to `!(e.target instanceof Node)`. That is a semantic
  widening, even though it is unreachable through normal focus, so it was restored to the original
  `HTMLElement` check at `src/field/Field.tsx`.
- The reviewer's own unreachable-in-practice notes about the `window` motion role are covered by
  `tests/unit/surfaceMotion.test.ts`, which pins every level's initial/exit/origin and the reduced
  motion collapse, and by an A/B run in section (f).

## (f) Flaky harness assertion found, and why it is not this pass

`tests/e2e/refinement.spec.ts` — "motion is measured: a dedicated surface arrives transformed and
settles to rest" — failed 5/5 on this machine once the tree was frozen. It is not a product
regression:

- The test samples the transform once, immediately after the arrival starts (~27 ms after
  `Ctrl+,`), then asserts the surface is at rest. A panel spring that starts 35 px away is still
  ~2 % off scale at that moment, so the assertion measures the first frames of the motion, not its
  end.
- **A/B evidence:** with the pre-extraction inline motion expressions restored verbatim in
  `src/ui/surfaces/Surface.tsx`, the same test produced the same failures 5/5 (`scale` 0.978–0.981,
  and one run `y` 1.17), and the extracted form produced 0.979–0.985. The two revisions are
  indistinguishable; the surface file was restored byte-identically afterwards (sha256
  `1a52dee1…4021` before and after).
- **Fix (strengthening, not weakening):** the harness now waits for rest with a bounded
  `expect.poll` before asserting rest. All three original assertions keep their exact strength
  (`toBeCloseTo(1, 2)`, `|x| < 1`, `|y| < 1`); the arrival assertions are untouched. The test now
  measures what its name claims.
