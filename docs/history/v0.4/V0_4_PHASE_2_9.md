# v0.4 Phase 2.9 — frontend convergence (no regressions, no half-finished surfaces)

A second full sweep of the Phase 2 frontend. It re-verified the fixes the previous pass claimed, then
looked at the whole application as a finished product. It adds no feature, changes no semantic model,
touches no Rust and no backend, and does not reopen the Field, the camera, the gesture machine or the
motion architecture.

It **supersedes the Composer geometry in `docs/history/v0.4/V0_4_PHASE_2_7.md`** (§COMPOSER: padding
`11px 11px 10px`, shell ≈46 px, the keyboard note under the material) and the 15 px → 16 px step in
`docs/history/v0.4/V0_4_PHASE_2_6.md`. Everything else in those records is unchanged and still accurate.

## Audit — what a finished product showed that a passing test suite did not

The suite was green before this pass and is green after it, so every finding below is something no
assertion covered.

| # | Finding | Class | Evidence |
|---|---|---|---|
| 1 | Composer still read as a form panel | NEEDS POLISH | measured idle 250 × **44**, focused 480 × **77** with the focused shell **52** px |
| 2 | Five Settings controls had **no CSS rule at all** | BUG | `.settings-switch`, `.settings-error`, `.settings-key-row`, `.settings-source`, `.settings-group-title` — zero matches in `field.css` |
| 3 | The discovery switch rendered as a **raw browser checkbox** | BUG | native ~13 px square beside 32 px controls; the only control in the product outside the control system |
| 4 | Both key error lines rendered as **unstyled body copy** in `--ink-primary` | BUG | a refusal was indistinguishable from a sentence |
| 5 | The History day label was a **14 px section heading** next to its own **10 px** count | BUG | `.surface h3` (0,1,1) out-specified `.history-day` (0,1,0); the 10 px eyebrow rule had never applied |
| 6 | The focus-level surface's body **ignored its own header's measure** | INCONSISTENT | header inset 160 px / 1120 wide, body at x = 0 / 1440 wide |
| 7 | `1 enabled sources still need a key.` and `1 decisions` | BUG | no singular branch in either string |
| 8 | An **exiting** overlay could close the overlay that replaced it | REGRESSION RISK | `Surface.onOpenChange` compared a *live* store subscription, so the exiting instance always matched |
| 9 | The first-use keyboard note and the feedback line rendered **on the same baseline** | REGRESSION | note y 930–948, notice y 933–950 at 1440 × 960, both bottom-centred |
| 10 | `.speak-note` at **2.53:1** light / **4.07:1** dark; `.settings-error` at **4.42:1** | BUG (a11y) | 10–11 px text owes 4.5:1 |
| 11 | `.speak-mark` animated `height` — the last layout-animating transition in the product | NEEDS POLISH | §15 says transform/opacity only |
| 12 | Post-selection controls lagged **210 ms / 240 ms** after the selection appeared | NEEDS POLISH | delays on `context-actions` / `speak-scope` |

### Re-verified, no regression (previous pass's own fixes)

`PASS` — overlay ownership is a single authority (`transient.ts`); focus restoration is
epoch-guarded, rAF-scheduled and checks `isConnected` / `[inert]`; the marquee coverage rule and the
one-gesture-one-owner contract are unchanged and the nine Phase 2.7 contracts still pass; the Focus
Field keeps selected `1` / direct `.96` / nearby `.78` / receded `.58` / peripheral `.44` with no
scrim, no geometry change and no AI call on selection; the background is still the neutral plane
measured at R−B 2.6 (Paper Day) with the transform-only 24 s drift as the only idle cost.

Nothing was rewritten because it worked. `Workspace.tsx` (267 lines) and `Field.tsx` (595 lines) were
not touched: the structure was not the cause of any finding above, so no extraction was justified.

## What changed

**Composer** (`field.css`, `theme.css`) — the largest single change. The focused shell went from 52 px
to **45 px** and the whole surface from 77 px to **45 px** (idle 44 → **40**, which is the product's
own minimum pointer target and is asserted). It got there by removing three pieces of padding and one
size step rather than by restyling: shell padding `11px 11px 10px` → `8px 10px`, idle `10px 8px` →
`7px 8px`, action `28` → **26 px** tall with a `34 %` resting fill instead of `50 %`, the writing moved
from 15 px to the one `--type-composer-size` (16 px) with the **placeholder** a step below it at 13 px,
and the positioner inset 38 → **34 px**.

The placeholder was the stated complaint ("reads like a title") and the cause was quantifiable: a
centred 15 px **serif sentence** was the largest text in the lower half of an otherwise 18 px Field. It
is now 13 px, still serif, still centred — one role below the writing it invites, which is what a hint
is. The writing itself gained a size, so nothing is lost.

The keyboard note is out of flow (`bottom: 100%`) and carries the same `--interaction-mask` the shell
does, because it floats over the Field. Being out of flow is what makes the surface's geometry
independent of the note: measured identical at 480 × 45 with and without it.

**Settings** — the five missing rules, written in the existing roles rather than in new numbers: a
group title takes the metadata role, a source block is one bordered block with `--space-4`, a key row
puts its button beside its input, an error line takes `--system-danger`, and the switch is drawn in the
control system's own material (a 26 × 15 track, `appearance: none` on the real checkbox, so the label
association, the keyboard and the accessible state stay the platform's).

**Overlay dismissal** — `Surface.onOpenChange` now refuses to act when `present === false`. `present`
is the same signal that already takes a receding surface out of the accessibility tree. Reproduced
against the pre-fix bundle by intercepting the route: Help → *Keyboard Shortcuts* → click inside the
new dialog ends at `surface: "none"` before the fix and `"shortcuts"` after it. Every legitimate
dismissal path (close button, Escape, scrim, outside click) was re-checked and none is gated.

**Motion** — `.speak-mark`'s height growth is now `scaleY`, so no transition in the product animates a
layout property; the `.field` held-recede retimed from `--motion-settle` (400 ms) to `--motion-surface`
(220 ms); the 210 ms / 240 ms delays on `context-actions` and `speak-scope` are gone.

**Convergence** — item 6's alignment, the History heading, the two singular strings, four remaining
radius literals snapped to `--radius-hair/-control/-surface`, and `.evidence-judgment` given a rule.

**Contrast** — `--system-danger` `#a35f51` → `#9d5a4b` (4.42 → **4.76:1** on `.settings-panel`,
4.20 → **4.53:1** on the Field) and `.speak-note` moved from `--ink-tertiary` to `--ink-helper`, which
is the product's own documented remedy for helper text on a surface (2.53 → **4.68:1** light; dark
already 7.9:1 through the existing override).

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | **224 passed** (26 files) |
| `npm run build` | clean |
| `npm run test:e2e` | **115 passed, 8 skipped (pre-existing platform gates), 0 failed** |
| `npm run check:offline` | **PASS** — offline suite, locale coverage (599 keys), source-size policy |
| Visual re-review | 48 stills, 2 themes × 2 window sizes across 12 surfaces, plus full-resolution element clips |

Measured after the change: composer idle `250 × 40`, focused `480 × 45`; note rect `474 × 18` at
y 859–877 with the notice at y 933–950 (no intersection); `.speak-mark` computed rect height 13.01 px
from `scaleY(.765)` on a 17 px box; zero layout-animating transitions; zero animated elements under
`prefers-reduced-motion`; `.speak-note` 4.68:1, `.settings-error` 4.76:1 (light) 6.90:1 (dark);
`.history-day` 10 px / 400 / uppercase.

**One test was changed rather than weakened.** `phase28b.spec.ts` asserted
`toContainText('still need a key')`, which is how a `1 enabled sources still need a key.` string passed
a review: it accepted the count-1 line by substring. It now asserts the exact sentence, which is
stricter than what it replaced.

**Not verified.** Tauri/WebView2 — `src-tauri` still cannot be compiled here (no `glib`/`webkit2gtk`),
so nothing in this pass is validated in a native window; no Rust change was made, so nothing was
invalidated either. Real high-DPI and OS-font rendering were not exercised. The alternative-direction
handoffs that render a `Surface` (palette → Shortcuts/Help) were reproduced, but
`src/dev/MotionLab.tsx`'s own `AnimatePresence` + `Surface` pattern was not.

**Carried, deliberately not fixed.** `CommandPalette.tsx` has the same unguarded `onOpenChange` as
item 8, but it has no exit variant and unmounts before a handoff, so the race is unreachable; adding a
guard there would be speculation, not a fix. `src/dev/MotionLab.tsx` covers the dev-only lab.
