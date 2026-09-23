# v0.4 Phase 2.6 — motion reality check, composer redesign, atmosphere retune

Record of the Phase 2.6 pass. Phase 1 (structural cleanup), Phase 2 (interaction primitives + motion
foundation) and Phase 2.5 (interaction/motion/atmosphere refinement) are the accepted baseline this
starts from; none is redone. No PixiJS, no Three.js, no Rive, no second animation library, no new
runtime dependency, no Core or persistence change, no Settings redesign, no new product feature.

Companion records: [Phase 2.5](V0_4_PHASE_2_5.md), [Phase 2](V0_4_PHASE_2.md),
[architecture](../../ARCHITECTURE.md), [reference audit](../../REFERENCE_AUDIT.md).

This pass exists because a real visual review of the native build found the product did not feel
animated while the Motion Lab did. It does not exist to add motion; it exists to find out why the
product had less of it than its own code claimed.

## 1. The diagnosis that opened the pass (two real defects, both invisible from source)

### 1.1 The one-shot sequence layer had never run

`src/ui/motion/signature.ts` builds every authored one-shot — the invitation's contraction when
writing begins, the composer yielding at commit, the first Thought's flight into the Field — through
`@gsap/react`'s `contextSafe`, which is implemented as `context.add(null, fn)`. Against GSAP 3.15,
`Context.add` resolves a *falsy* name to "build the wrapper and return it, do not run it":

```js
// gsap-core.js, Context.prototype.add
return name === _isFunction ? f(self, …) : name ? self[name] = f : f;
```

`add(fn)` runs the function; `add('name', fn)` registers it; `add(null, fn)` returns a wrapper and
does nothing. GSAP's own TypeScript types do not even admit the shape `contextSafe` uses (it is
untyped JavaScript in `@gsap/react`), which is part of why nobody noticed.

Measured in the production bundle before the fix: after a commit, the new Thought's `<p>` had **no
inline style at all** for every frame of a 1.2 s trace, and `transform: none`. The first-Thought
flight, the invitation's contraction and the composer's release were never built. After the fix the
same trace shows `translate3d(0px, 100.29px, 0px) scale(0.9017)` and `letter-spacing: 1px` on the
first painted frame, resolving to rest in ~590 ms.

The one-shots now go through `context.add(fn)` (the single-argument form), and
`tests/unit/motion.test.ts` pins the difference so the code shape cannot be "simplified" back:
`context.add(null, fn)` must be recognised as a no-op, `context.add(fn)` must run.

The sequences built through `useSignature` were never affected — `useGSAP` passes the callback as
`add(fn, scope)`, which does run — which is exactly why the Field switch and Settings felt alive
while the composer did not. That asymmetry is the shape of the reported problem.

### 1.2 The first Thought was animated before it existed

`useFirstThoughtEmergence` deferred its work by exactly one animation frame ("the Field renders the
Thought from React state"). A React commit is not promised inside one frame: on a first paint (a
fresh Field, font loading, the composer leaving) the Thought arrived two to five frames later, and
the sequence then either returned `null` or animated a node that had already been painted at rest.
Measured: at the first animation frame after Enter, `document.querySelectorAll('[data-thought-id]')
.length === 0`.

It now waits for its own element, bounded to 24 frames, and applies the start state with `gsap.set`
in the frame it finds it — before that frame paints — so the words are never painted at rest and
then thrown backwards.

### 1.3 The review machine itself was in reduced-motion mode

Measured natively on this Windows host, three ways:

| Source | Result |
|---|---|
| `SystemParametersInfo(SPI_GETCLIENTAREAANIMATION)` via PowerShell P/Invoke | `0` (animation effects off) |
| `HKCU\Control Panel\Desktop\WindowMetrics\MinAnimate` | `0` |
| Real Windows Chromium engine (`msedge.exe --headless=new`, three independent launches) reading `window.matchMedia('(prefers-reduced-motion: reduce)').matches` | `true` |

So the product on this machine correctly ran with every authored sequence skipped, Motion's travel
dropped and every CSS transition/`@keyframes` disabled — while the Motion Lab, whose frames were
wrapped in `MotionConfig reducedMotion="never"`, visibly animated its (then separate) Motion
replicas. The Lab was measuring the Lab. This is the first pass in which the two modes can be
compared deliberately rather than by accident.

## 2. Reduced motion

- **Production still honours the operating system.** Nothing in the application sets the preview
  seam; `prefersReducedMotion()` resolves to the media query, and the hooks that build sequences
  read it. Browser dev mode (Linux Chromium): `false`. Native Windows (WebView2's engine): `true`.
- **One preview seam, dev-only.** `src/ui/motion/signature.ts` exports
  `setMotionPreview('system' | 'normal' | 'reduced')`, `motionPreview()` and the reactive
  `useMotionReduced()`. Every hook and sequence in that module resolves through it, so a preview
  cannot apply to some sequences and not others. The Motion Lab sets it; nothing else does.
- **The Lab shows both values.** `OS reduced-motion: true|false` (read straight from `matchMedia`,
  kept current with a `change` listener) and `Preview mode: system | force normal | force reduced`,
  as a fixed always-visible readout plus a three-way control.
- **CSS can be previewed too**, via `data-motion-preview="normal"` on the document element. The
  global reduced-motion rule in `theme.css` and the atmosphere's own rule are guarded with
  `:root:not([data-motion-preview="normal"])`. Only the dev-only Lab sets that attribute; production
  never does, so the product always honours the preference.
- **Reduced motion is not "no change".** Every signature moment now has a visible *state*
  difference as well as motion: the composer's focused material, the arrived Thought, the Field's
  held recede behind Settings. The capture run measures the still-frame delta in both modes.

## 3. Motion Lab: replicas removed

What is reviewed in the Lab is now the choreography the product executes.

| Replica deleted | Production function now executed |
|---|---|
| Empty-state invitation reveal / contraction | `invitationIdleSequence`, `invitationContractSequence` |
| Quiet Composer's yield | `firstThoughtComposerSequence` |
| First Thought | `firstThoughtComposerSequence` + `firstThoughtEmergence(id, origin, 'composer')` |
| (new) double-click path | `firstThoughtEmergence(id, origin, 'placement')` |
| Field switch | `fieldDepartureSequence` (departure) / `fieldSwitchSequence` (arrival) |
| Settings open | `settingsEnterSequence` |
| Settings close | `settingsRecedeSequence` |
| History timeline | `historyRevealSequence` |

Mechanism: `(root, tl)` sequences run through the production `useSignature`; the two that return a
timeline are called directly and the previous one is killed. Each frame renders *production-class*
fixture DOM (`.empty-invitation*`, `.speak-positioner`, `.field`/`.atmosphere`/`.identity*`/
`.field-arrival`/`.thought > p`, `.settings-nav*`/`.settings-section`, `.history-*`), so the real
`field.css` — already loaded by `main.tsx` — styles it. Every signature frame shows the production
function name, the real role(s), the real durations (`MOTION_DURATION`) and the real ease
(`cubicPoints`). No timing constant is duplicated in the Lab, and `tests/offline/v025-motion-reuse`
now asserts that the Lab consumes the production choreography instead of re-describing it. The
Motion-driven *primitives* (menu, select, dialog, close control, rename, feedback, scope, crystal)
keep their role-comparing variants: those were never replicas of an authored sequence.

## 4. The Quiet Composer

**Old structure:** transparent shell, a 9 %–91 % full-width 1 px hairline (`::after`, opacity .82
when composing), a permanent three-item hint row (`Enter Enter to think · Shift Enter Shift+Enter
for a new line · Esc Esc to leave` — the keycap *and* the label both naming the key), and a
text-only button. In a still it read as a long underlined textarea; the hairline was the loudest
thing on screen.

**New structure** (same state machine, same 250 px / 480 px / 108 px geometry, same keyboard
behaviour and draft preservation):

```text
.speak-positioner (position only)
  .empty-invitation…                              (unchanged selectors — GSAP owns them)
  form.speak[data-testid=speak][data-composing][data-state]
    .speak-shell                                  (Motion layout; owns the material)
      span.speak-light                            (CSS-only illumination, opacity 0 → 1)
      .speak-scope                                (scoped only)
      .speak-row > [.speak-mark?, textarea]
      button.speak-action > .speak-action-key (↵) + .speak-action-label
      p.speak-note[data-decoration=composer-note] (first focus of the session only)
```

- **Idle** — transparent, no shadow, no border: the caret mark plus one 20 px centred anchor tick
  (`::after`, opacity .16, .34 on hover/focus). The full-width hairline is gone.
- **Focused** — the shell *materializes*: `color-mix(--surface-1 92%)` fill, a 1 px
  `color-mix(--boundary 62%)` border, `--radius-control` radius, a two-layer soft shadow, and one
  illumination layer. Typography steps from `--type-composer-size` (15 px) to `16px × --ui-scale`,
  ink tertiary → primary, centred → left. Measured centre pixel: idle `(210,208,202)` on the Field
  vs focused `(249,248,245)` = `--surface-1` (`#f9f8f5`). The material is decided by `data-composing`, not by a
  transition, so it is present in a still frame and identical under reduced motion.
- **Action** — one compact in-surface control, `↵ 思考` / `↵ Think`; the visible label is the
  accessible name.
- **Shortcut disclosure** — the permanent legend is deleted. The keycap says the key; the first-use
  note says only what the other keys *do* (`New line` / `Leave`), appears once per browser session,
  and the test asserts its text nodes contain no key name (`Enter|Shift|Esc`) at all. The full
  contract stays in the Shortcuts and Help surfaces.

## 5. First Thought

One story, two real paths.

- **Written in the composer.** The invitation's secondary lines withdraw, the invitation lifts away
  (`y −26`, `scale .96`), the positioner recoils (`scale .958`, `y 9`) and releases, and the written
  idea separates: a **measured** flight from the composer toward its resting place, clamped to
  **36–120 px** (was 24–90), starting at `scale .88` with `letter-spacing .8px`, overshooting to
  `1.012` and resolving to exactly 1. Two tools measure it, and each is quoted with its source: the
  gate's per-write trace records **120 px of authored travel** with depth `0.88` and the last
  movement at **582 ms** (still at rest 740 ms later), while the capture run's per-frame sampler
  paints **90.2 px** of that travel and has it stopped at **702 ms**. They differ because the gate
  reads every DOM write the sequence makes and the capture only sees painted frames — which is why
  the *magnitude* claim belongs to the gate.
- **Placed by a blank double-click.** No flight is invented from a pointer the words never came
  from: the Thought establishes itself with the same depth and typography resolution over a short
  local settle (24 px, `spatial`), while the editor takes material. Measured: **24 px authored
  travel**, depth `0.94`, last movement at `253 ms`. Neither path is dead, and neither is a copy of
  the other.

## 6. Field switch

- **Departure** (`fieldDepartureSequence`): visible Thoughts' text children drift outward from the
  viewport centre by **26 px** (was 8) with `scale .985`, nearest first (a short stagger), the
  identity lifts `y −16`, the atmosphere drains to `.2`. The `DEPARTURE_BEAT_MS` bound is 260 ms and
  the timeline is reverted after, so a refused switch leaves the Field exactly as it was.
- **Arrival** (`fieldSwitchSequence`): the veil lifts, the atmosphere returns with a brief extra
  presence, then identity, then Thoughts emerge in groups of three with `y 22`, `scale .97`. The
  beat between groups shortens as the Field gets busier, so the whole arrival stays one bounded
  length instead of growing with the Field.
- Measured end to end on a duplicated demo Field, by the gate's per-write trace: authored travel
  **41.9 px / 46.4 px**, outgoing presence reaching **0**, arrival settling at 1, last movement at
  **863 ms**. The capture run's frame sampler sees **30.9 px** painted and the whole crossing
  (departure + the save a Field switch has to make + arrival) stopped at **907 ms**. Inside the
  500–900 ms the product promises, and interruptible throughout.

## 7. Settings motion

Opening is now visibly "the Field recedes, then the place owns the screen", in two owners:

- **Held recede (CSS state).** `.app[data-active-surface="settings"] > .field { opacity: .88 }` with
  an opacity-only transition. A held state cannot be owned by an animation that is not running: the
  Field stays a step back for the whole visit and returns when the place closes. Opacity only, and
  one named property only — the Field's pointer maths read its rect, so a held transform would move
  the interaction, not just the paint.
- **Arrival beat (GSAP).** `settingsRecedeSequence` owns only the *transform* dip (`scale .986`,
  200 ms) plus the atmosphere's `.55` dip, both resolving home with `clearProps`; the identity's
  presence is left to CSS for the same reason. `settingsEnterSequence` is two beats (navigation,
  then the section it points at), with the first beat now long enough to be seen.
- Measured: `minScale .986`, resolves to `1`, held opacity `.88`, and the state readout returns to
  `1` after close.

## 8. Atmosphere

`ui/atmosphere.ts` (role vocabulary) + `.tsx` (layer) + `.css` (material). No new layer, no filter,
no blur, no JS loop, no pointer work.

| | Phase 2.5 | Phase 2.6 |
|---|---|---|
| cycle | 48 s | **24 s** |
| drift | 16 px / −20 px | **56 px / −64 px** |
| grain (day / night) | 5.5 % / 5 % | 6 % / 6 % |
| Paper Day | lift #fff 42 %, warm 20 %, cool 26 %, vignette 9 % | lift #fff 46 %, warm 14 %, cool 30 %, vignette 12 % |
| Graphite Night | lift #3d372e 34 % (brown), warm 12 %, cool 24 %, vignette 30 % | lift #3e4042 35 % (graphite), warm #5f4b34 16 %, cool 26 %, vignette 33 % |

The illumination geometry is now custom properties (`--atmos-lift-x/y`, `--atmos-warm-x/y`,
`--atmos-cool-x/y`), which is what makes ATTENTION a *local* shift rather than a brighter copy:
under attention the lift and the warm accent fall elsewhere (`46%/42% → 40%/58%`, `80%/86% →
62%/66%`) with slightly stronger illumination. One repaint, no new animated layer, no pulse.

`atmosphereRole` now takes `scoped`, so a selection (which *is* this product's temporary scope)
lights the material the same way activity does: `busy || diffuse || scoped → attention`.
EMERGENCE and TRANSITION stay in the vocabulary and stay deliberately unimplemented as roles — a
Field switch is owned by the authored sequence and creation emphasis by the first-Thought sequence,
so the atmosphere never becomes a second animation owner for one moment.

Measured by the gated `tests/e2e/visual.spec.ts` (a live run; these are the numbers it prints):
Paper Day mean `R−B` **3.7** with a worst point of 5.0 (bound 10) — paper, not beige; Graphite Night
region luminance spread **11.5/255** with per-channel deltas 11.1 / 11.5 / 11.5 (bound 16, no banding
and no channel cast). The atmosphere work in this pass measured the same two quantities before the
gate landed and got 3.69 / 5.0 and 11.29 with deltas 11.14 / 11.31 / 11.45, so the claim reproduces
across runs.

The capture run measures the background a third way — eight widely separated patches, and the
illumination layer sampled over 8 s. Its figures live in `verification/v0.4.3/README.md` with the
metric named beside each one: the patch *range* is 25.2 (Paper) / 29.9 (Graphite), which is not the
same quantity as the region spread above, because it is dominated by the vignette and includes
whatever text sits at those eight points. Metrics are not interchangeable, so every number here is
quoted with its name and its source.

## 9. Evidence

`scripts/capture-motion.mjs` performs each production gesture against the production bundle, records
a short video, captures a frame sequence, samples the animated element on every animation frame, and
compares the first and last frame pixel by pixel — twice, once in each motion mode. Artefacts and
numbers: `verification/v0.4.3/` (see its README). Native Windows stills were taken by driving the
real Windows Edge/WebView2 engine over CDP.

## 10. Verification

Gates (all re-run on the final tree):

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` (vitest) | PASS — 140 unit tests |
| `npm run check:offline` | PASS — 141 offline contracts, core typecheck, locale + source-size |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS — **92 passed, 0 failed, 7 skipped** (the dev-only Motion Lab's seven, which skip when the production preview is served), including the six new measured motion contracts |
| `npm run test:e2e` (lab) | PASS — 7/7 against the dev server on port 5199 |

Deliberately changed tests, and why:

| Test | Change |
|---|---|
| `tests/unit/composer.test.ts` | `COMPOSER_HINTS` → `COMPOSER_NOTE` + the first-use contract. The state machine cases are unchanged. |
| `tests/unit/atmosphere.test.ts` | role mapping gains `scoped`; the drift constants become 24 s / 56 px / −64 px. Every structural assertion (no blur, one drift animation + one reduced-motion stop, per-theme recipe, grain, vignette) is kept and the new `:root:not([data-motion-preview="normal"])` guard is asserted. |
| `tests/unit/motion.test.ts` | One added test: the GSAP context-call contract (see §1.1). |
| `tests/e2e/field.spec.ts` | The composer test's hairline assertion (`::after` opacity > .4 while composing) described a deliberately replaced structure; it now asserts the material (non-transparent fill + shadow + the `↵ Think` action) and the idle tick. Geometry (250/480), cursor, Escape and click-to-focus are unchanged. |
| `tests/e2e/phase25.spec.ts` | The composer's hint row became the first-use note with the no-key-names assertion; the atmosphere cycle assertion moved 48 s → 24 s. |
| `tests/e2e/visual.spec.ts` | The atmosphere tests only: the declared cycle, and the measured-spread comment. No pixel bound was weakened. |
| `tests/primitives/*.py` | The composer fixtures asserted the *transparent* composing shell + hairline; four of the five now assert the material instead (`.speak-light` lit, the tick retracted, fill + depth present). Two caveats are stated rather than hidden: these fixtures are **not part of any npm gate**, and **Python Playwright is not installed in this environment**, so none of them was executed — they were syntax-checked and read against the current `field.css`. An audit also found that three of them (`v022`, `v023`, `v025`) open with a pre-existing `assert 'gradient(' not in css` guard that the stylesheet has failed since before this pass (it contains three gradients), so they abort before reaching their composer assertions; and `v025_motion_reuse.py`'s expected composing width was stale from an earlier pass (520 → **480**, corrected here). Fixing that guard and the rest of the pre-pass staleness (`v024`'s receded `.5`/`peripheral .38` and its `ink-arrive` keyframe expectations) is a task of its own, not this pass's change. |
| `tests/offline/v025-motion-reuse.test.mjs` | One added test: the Lab consumes the production sequences and never imports GSAP itself. |

New: `tests/e2e/motion.spec.ts` (six measured browser contracts), `tests/unit/motionPreview.test.ts`
(the preview seam), `scripts/capture-motion.mjs` + `scripts/lib/png.mjs` (evidence).

## 11. Review findings, fixed before this pass was called done

An adversarial review of the diff (and the gate itself) found seven real defects. Every one was
fixed rather than documented around:

| Finding | Fix |
|---|---|
| `.speak-light` was `inset: -1px`, and a negative-z-index child paints above its parent's background **and its border** — so the 1px frame the material declares never rendered | `inset: 0`: the illumination stops at the padding box and the frame ring stays visible |
| The invitation's release was retuned to `signature` (620 ms) while `RELEASE_HOLD` was still a hand-written 220 ms, so the invitation was unmounted a third of the way into its own lift | The hold is derived from the same token (`MOTION_DURATION.signature * 1000`) instead of a second copy of it |
| `.thought.editing` declared a `transition` that *replaced* the base `.thought` transition, so entering the editor snapped `opacity` and `color` | The base properties are re-declared in the editing list |
| Two Python primitive fixtures still asserted the deleted full-width hairline at `> .8` opacity in the composing state (a third had been updated, so the fixture update was half-done) | They now assert that the idle tick retracts (`visibility: hidden`) beside the material |
| `field.spec.ts`'s masking test inferred legibility from that hairline's opacity (`> .5`) — a 1px line at half opacity masks nothing | It now measures the composing surface's own fill alpha (≥ .9) and its depth, which is what actually masks the Crystal underneath |
| `field.spec.ts`'s revive test raced Playwright's protocol latency against a 140 ms exit (measured: the surface leaves ~262 ms after the click). It failed 1 run in 4 | An in-page watcher waits for the condition the assertion depends on — a scope stated *while the surface is mid-exit* — and then asserts both that state and the revived node's identity. 6/6 runs clean, and the assertion is stronger than the one it replaced |
| Three locale entries for the deleted hint row were dead | Removed |

One finding was accepted rather than fixed, and is recorded here instead: the one-shot timelines
accumulate in the GSAP context's own `data` (measured: five plays leave ten entries), because
`Context.add` retains what it collects and `kill()` is not a removal. It is bounded by the
component's lifetime — the context is reverted on unmount, which is why the retention is bounded —
and it has no user-visible effect, so it is not worth a workaround that would interfere with the
`clearProps` each sequence depends on.

A second, independent audit then audited **the evidence and the documents** rather than the code,
and found six more defects — all of them in what the pass claimed rather than in what it built, and
all fixed:

| Finding | Fix |
|---|---|
| The capture tool computed `settled` as the **first** frame at rest rather than the last moving one, so it reported a 13 ms settle for a 340 ms transition — while the README described the other definition | The tool now computes the last moving frame, exactly as the gate does; the capture was re-run and every number in the evidence README is from that run. The README also states what `settled: 0` means in each case (an opacity-only change, a sequence that was not built, or a burst the sampler missed) |
| A native frame was mislabeled in exactly the way the README warns about: `dpr125-native-empty-field.png` was really 1440 × 960 at `devicePixelRatio 1`, because Playwright's own `screenshot()` re-asserts the device metrics | Deleted. The 1 × frame remains as `dpr1-native-empty-field.png`, and the 125 % empty Field is covered by the twelve `dpr125` frames |
| Two atmosphere percentages in the evidence README were transcribed wrong | Corrected from `motion-report.json`, and the JSON itself was re-derived from the PNGs on disk (all twelve `stateChange` values reproduce exactly; every frame path exists) |
| All three documents attributed the atmosphere's live `visual.spec.ts` numbers to `motion-report.json`, which holds different metrics under a confusingly similar name | Every number is now quoted with its metric *and* its source, and the two "spread" quantities are explicitly distinguished |
| `v025_motion_reuse.py` still expected a 520 px composing width from an earlier pass, and three primitive suites abort before their composer assertions on a pre-existing anti-gradient guard | The stale width is corrected to 480; the guard and the older staleness are recorded as a separate pre-existing task instead of being left to look green |
| `STATUS.md` explained the 7 skipped e2e tests as "the Lab's five, plus two route-gated cases"; the Lab spec has seven tests and they are the seven | Corrected |

The audit also verified positively: every `frames[]`/`before` path in `motion-report.json` exists with
no orphan frames, all twelve `stateChange` values match an independently decoded pixel delta, the
`before` frames differ from the first captured frame as a real state change, `atmosphere-dark` is
genuinely dark and `atmosphere-light` light in both modes, the twelve recordings are real (88–472 kB,
2.2–5.2 s), and every native frame's dimensions match the `devicePixelRatio` recorded beside it.

## 12. Still not verified

- **Tauri itself was not run.** There is no Windows Rust build in this session and the Tauri host
  shell was not built. The native half of the pass is the *engine and the OS*: real Windows Edge
  (the Chromium/WebView2 engine family) driven over CDP at 100 %, 125 % and 150 % device scale
  factor, which is where the reduced-motion value, the composer material, the atmosphere and the
  scaling behaviour were confirmed (`verification/v0.4.3/native-windows/`). The composer measures
  250 × 44 idle and 480 × 107 focused with a 6 px radius and 16 px writing text at every scale
  factor, with an even hairline and no sub-pixel fringe at 1.25 ×. Two traps are recorded there for
  the next person: a `--force-device-scale-factor` flag is discarded the moment anything sets a
  viewport, and **every Playwright-attached read of `prefers-reduced-motion` returns
  `no-preference`** because Playwright applies its own default — so the OS value must be read from a
  bare launch, and the modes in any capture must be set deliberately. WebView2 host-specific
  behaviour (native dialogs, window chrome, IME inside WebView2) remains unverified here.
- **Reduced motion is verified for end states by eye and for the transition by the gate.** The
  native stills show both modes reaching the same end pose; that the *transition* is skipped (rather
  than merely hidden) is asserted in the browser, where the sequence writes nothing to the DOM at
  all under reduced motion (`writes === 0`).
- The Chinese IME was not exercised in this pass (the composer and shortcut-recorder guards are
  unchanged from Phase 2.5, where they were asserted).
- Motion was *measured* (travel, depth, settle, still-frame delta) and *looked at* frame by frame
  against the capture run. Whether a sequence is pleasant on the tenth repetition remains a human
  judgement the record cannot make for the reader.
- Python primitive fixtures were not executed (no Python Playwright in this environment).
