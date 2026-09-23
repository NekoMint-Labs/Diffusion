# v0.4 Phase 2.7 — interaction precision and visual refinement

Phase 1–2.6 are frozen baselines. This pass exists because a real review on real Windows found
several product-level problems: dragging selected Thoughts could unexpectedly select unrelated
Thoughts, the creation response brightened the middle of the Field instead of where the Thought was
made, Help opened as a top-right anchored surface, the focused Composer still read as a heavy card,
the Field's material felt artificial, and starting the development app made the machine run hot.

Nothing here starts PixiJS, adds a product feature, rewrites Core, redoes Settings, or changes the
motion architecture. React, Tauri, Base UI, Motion, GSAP, the command registry, the persistence
architecture, DOM Thoughts, the pointer-frequency imperative Field and the reduced-motion behaviour
are all as they were.

## Audit (read first, before anything was changed)

**BUG — a drag could become a different gesture.**

- A press was classified by elimination: `pointerdown` on a Thought's own DOM box was a drag, and
  *everything else* was a marquee. A press that missed that box by a few pixels — 2 px below the
  words, on the hover label's position, on the Scope Hub's own body, which deliberately lets input
  through — was therefore classified as blank Field.
- A marquee joined a Thought on bare intersection, and a marquee *replaces* the selection. So an
  accidental press-and-move could throw a deliberate scope away and hand back every Thought its
  rectangle grazed, including the 256 px-wide invisible boxes of Thoughts that were only clipped.
- A second press during a live gesture silently re-classified it (`pointerdown` never checked
  whether a gesture was already running): a middle click turned a drag into a pan.
- Pointer capture had one owner, the drag threshold was a bare `5`, and the selection was *not*
  re-written mid-drag — but nothing said so, and `pointerup` collapsed a multi-selection to the
  single Thought under the pointer on a plain click.

**VISUAL FAILURE.**

1. The Field's answer to a creation was the atmosphere moving its global illumination geometry
   toward the middle of the viewport (via `busy`/`scoped` attention), while the created Thought
   appeared wherever it was made. Response and event were in different places.
2. `field[data-scope]::before` was a wash pinned to `50% 50%` of the viewport, triggered by a
   selection that was usually somewhere else: a global flash for a local event.
3. The focused Composer was a 480 × ~106 px card: three stacked rows (scope, writing, keyboard
   legend), an opaque near-white fill, a 62 % border, a two-stop shadow, and an action on its own
   line inside the material. It read as a panel arriving over the Field.
4. Help was `level="anchored"` — top-right, 85 px down — the same ownership as a menu.
5. The Field's background was a mesh-gradient-like composition: a 46 % white lift, a 14 % warm
   patch and a 12 % radial vignette, all inside visible circular falloffs.

**KEEP.** The gesture *machine* (pointer capture on one element, rAF coalescing, the world transform,
culling, `CameraController`); the one-authority focus coordinator; the one close affordance; the
surface depth classes and their motion roles; the scope legibility contract (full ink on the
selection, a small contrast step on distant context); the composer's state machine and its pinned
geometry (250 idle / 480 focused / 108 cap); the atmosphere's structural contract (transform-only,
one animation, no filter/blur, reduced motion stops the drift, `data-atmosphere="attention"` moves
the illumination geometry).

**TUNE.** The marquee's hit policy (bare intersection → meaningful coverage); the scope wash's
position; the creation response's intensity and origin; the composer's fill, border, shadow, padding
and internal order; Help's spatial ownership; the atmosphere's material recipe; the motion-preview
seam (used by the capture harness to freeze an animation mid-flight).

**REDESIGN.** The focused Composer's layout (grid, one row); Help as a `window` place; the Field's
material (Graphite Night / Paper Day, see `docs/REFERENCE_AUDIT.md`).

## INTERACTION BUG

**Root cause.** Two causes, one symptom, both in `field/Field.tsx`'s gesture classification:

1. **A marquee could start where the person believed they were dragging.** The kind was decided by
   elimination at `pointerdown`, so any press that was not exactly on a Thought's box — including a
   press on the Scope Hub's own body, whose `pointer-events: none` is a pinned contract — became
   blank Field. No category change was ever needed for the bug: a single misclassified press was
   enough.
2. **A marquee joined a Thought on a graze.** `intersects` is true when two rectangles share a
   single pixel, and each Thought's box is 256 px wide regardless of how much text it holds, so a
   casual 40 px drag could legitimately "intersect" neighbours it never covered. Because a marquee
   replaces the selection, that mistake was destructive rather than additive.

Measured before the fix, against the built bundle, with two Thoughts selected:

| gesture | before | after |
| --- | --- | --- |
| press 20 px left of a selected Thought, drag 90 px | marquee → selection became `[attention]` (the grazed Thought) | marquee → `[]` (nothing collected) |
| press the Scope Hub's own body, drag 100 px | marquee → selection became `[attention]` | **drags the selection** → `[attention, structure]` preserved |
| press just right of a Thought, drag up-right | marquee → collected `[quiet]` | nothing collected |

**Exact fix** (`src/field/spatial/gesture.ts` — the contract; `src/field/Field.tsx` — the machine;
`src/field/spatial/marquee.ts` — the hit policy):

1. **One gesture, one owner, decided once.** `Gesture.kind` is `'pan' | 'selection' | 'blank'`,
   fixed at `pointerdown` and never re-read; `DRAG_THRESHOLD` (5 px) and `PROBE_HOLD` (650 ms) are
   named. A second `pointerdown` while a gesture is live is ignored instead of re-classifying.
2. **The selection is locked for the gesture.** For a `selection` gesture the moving set is the
   selection *as it stood at press*, copied into `Gesture.ids`. Nothing inside the gesture may add
   to it, remove from it, or enter a marquee. `pointerup` no longer re-writes the selection at all:
   `pointerdown` is the only authority, so a plain click on one member of a multi-selection keeps
   the whole scope, exactly as the right-click path already did.
3. **The Scope Hub owns its own press.** `Field.pointerDown` asks for the *rendered* hub
   (`[data-scope-hub]`, a semantic hook added to `ScopeHub.tsx`) and treats a press inside it as the
   selection drag it plainly is. The hub's `pointer-events: none` and its `::before` mask contract
   are untouched, and the area claimed is the object the person can see — not a guessed rectangle.
4. **A marquee has to cover a Thought, not touch it.** `marqueeCovers(bounds, marquee)` requires the
   overlap to reach `MARQUEE_COVERAGE = 1/3` of the Thought's own box — in practice, about a full
   line of it. This is a *changed* semantic, decided here and documented in the module; it applies to
   Ghosts as well as Thoughts.
5. **Cancellation decides nothing.** `pointercancel` restores what the gesture moved and leaves the
   selection exactly as the press decided it. `onLostPointerCapture` now calls it whenever a gesture
   is live rather than only for a marquee.

**Regression tests.** `tests/e2e/phase27.spec.ts` (9 interaction contracts): drag one selected
Thought across others; drag two across others; drag a member of a scope; modifier add/remove; a
blank marquee still selects what it covers; a casual graze selects nothing; the Scope Hub drags the
scope; cancellation leaves the Field and the selection consistent; a second press cannot
re-classify a live gesture. `tests/unit/marquee.test.ts` pins the hit policy itself, and
`tests/unit/scopePlacement.test.ts` pins the wash's placement.

**Native result.** Not run on Windows in this pass (no Windows host in this session, see
VERIFICATION). The measured before/after table above is the built production bundle in Chromium at
1440 × 960, driven by real pointer events; the reported mechanism (a press that misses by a few
pixels, and a press on the selection's own bar) was reproduced exactly and is now impossible.

## COMPOSER

**Old design.** A 480 × ~106 px card with three stacked rows inside one material: a scope line, the
writing row, a right-aligned `↵ Think` on its own line, and the first-use keyboard note inside the
card. Opaque near-white fill (`surface-1` at 92 % *plus* a second opaque linear layer in
`.speak-light`), a 62 %-boundary border, a two-stop shadow, and `--radius-control` corners.

**New design.** One row, and the material is a whisper:

- The writing is a grid cell; the action is the cell beside it, bottom-aligned — `↵ Think` at the end
  of the sentence it commits, rather than on a line of its own (`grid-area: 2 / 2`, `.speak-action`
  with no border at all).
- The keyboard note moved *outside* the material: it is now a quiet line under the surface, so the
  card never grows to hold its own keyboard rules.
- The material is one step: `surface-1` at 92 % over the composer's own `interaction-mask` (the
  pinned masking contract), a `46 %` boundary edge, one small restrained lift
  (`0 12px 28px -22px` + `0 1px 3px`), and `.speak-light` reduced to a 6 % warm highlight — the
  second opaque layer that made it read as a card is gone.
- Padding is `11px 11px 10px` (was `10px 8px` plus three rows of internal spacing).

| state | what it is | measured |
| --- | --- | --- |
| idle | a caret mark and one 20 px anchor tick on the Field's own baseline, 250 px wide | unchanged |
| focused | one row: writing + `↵ Think`, ~46 px tall for one line, growing to a 108 px textarea | 480 px wide |
| scoped | `● Thinking with 2 thoughts` as a quiet line above the writing, inside the surface | unchanged copy |
| writing / multiline | §15: 108 px cap, then the textarea scrolls (`data-overflowing`) | `clientHeight 108` |
| submitting | the surface gives up presence (`.68`) while the request is in flight | unchanged |

**Verified:** `field.spec.ts` (masking alpha ≥ .9, real depth, the one action, idle breadth,
multiline cap, scope order), `phase25.spec.ts` (state vocabulary, the note's text carries no key
name), `visual.spec.ts` (the expansion is real geometry), `tests/offline/v023-identity.test.mjs`
(the idle shell has no material; the focused shell has fill, depth and radius; `.speak-light` is 0
and 1), and the new phase27 contract that each secondary key is stated exactly once and that the
note is *not* inside `.speak-shell`. Stills: `verification/v0.4.4/screenshots/{light,dark}-{wide,narrow}-composer-{idle,focused,scoped}.png`.

## HELP

**Old ownership.** `level="anchored"`: `top: 85px; right: 30px`, `max-height: calc(100dvh - 115px)` —
the same depth class as a pointer projection, i.e. a utility popup in the corner.

**New ownership.** `level="window"`, `className="help-surface"`: centred (`top/left 50%`, `translate
-50% -50%`), `min(660px, 100vw - 56px)` wide, `height: auto` with a `min(660px, 100dvh - 80px)` cap,
`--radius-place` corners, the panel spring arrival with a `center center` origin, the window input
shield and scrim, the shared close affordance, `Esc`, `data-global-owner="help"`, and the held
Field recession — `.app[data-active-surface="help"] > .field { opacity: .88 }`, the same CSS state
Settings uses, so the Field gives up presence for as long as Help is the active place and takes it
back on close. Its content is still the two sentences and the four actions; only the spatial
ownership changed.

**Verified:** the new phase27 contract (dialog name, `data-level="window"`, centred within 24 px of
720/480, the `window` scrim present, `data-active-surface="help"`, `.field` held at `.88` and back to
`1`, Escape closes and returns focus to `···`), plus the existing `hardening.spec.ts` exclusive-owner
contract (Help is still modal: one owner, one shield). Still: `verification/v0.4.4/screenshots/{light,dark}-{wide,narrow}-help.png`.

## CREATION FEEDBACK

**Source coordinates.** `src/ui/emergence.ts` publishes one illumination per creation, at the created
Thought's *own* screen position: `revealCreation(field, thought)` maps the Thought's world point
through `FieldHandle.screenPoint`, so the response is derived from where the Thought is — never from
the viewport centre, never from the composer the words may have been written in. Every manual path
speaks the same event: blank double-click, blank-context *New thought*, the first Thought written in
the composer, text dropped onto the Field, continuing from a Crystal, and a reference brought back to
the Field. `creation feedback receives actual screen position` is asserted for three of them in
`tests/e2e/phase27.spec.ts`, to within 2 px of the Thought's own box.

**Local effect.** One `span.field-emergence` at that point: a 72 px disc of `--ink-primary` at 7 %,
so it is warm graphite on paper and muted paper on graphite — never bright white — painted *under*
the Thoughts (`--layer-field`, before `.world` in document order), so the words are never washed over.
The animation is the `spatial` role (340 ms, `--ease-settle`): opacity 0 → 1 at 32 % → 0, scaling
`.33 → 1`, so it appears, softens outward, and is gone. `useCreationIllumination()` removes the
element when that lifetime elapses — a timer, not `animationend`, so it is still removed under
reduced motion where no animation ran.

**Intensity and timing, measured.** The gated pixel contract
(`tests/e2e/visual.spec.ts`, "a creation is answered locally, and quietly") freezes the element at
its own peak (paused 110 ms in) and reads real PNG pixels, three frames per theme: before the
creation, at the peak, and at the peak with the illumination's opacity forced to zero — so the
response is isolated from the new Thought's own material, which is present in both of the last two
frames and cancels out. Measured at the Thought: the illumination alone moves the paper by
**−6.5/255 (Paper Day) and +3.5/255 (Graphite Night)** — the whole appearance at that point,
including the new Thought's fill and depth, is −9.0 and +5.6 — and a point of untouched Field
elsewhere moves by −0.7 and −0.5, i.e. nothing. The bounds are |Δ| > 0.8 (there *is* a response) and
|Δ| < 8 (it is a soft bloom, never a flash), with the rest of the Field within 2.5. Because the
created Thought is immediately an editing surface, the bloom is read as the halo that surrounds it:
the response blooms from under the thing that appeared, which is what "something appeared here"
should look like.

**Frames.** `verification/v0.4.4/screenshots/{light,dark}-{wide,narrow}-local-creation.png` are real
mid-states: the documented motion-preview seam re-enables animation and the element's own timeline is
paused at 110 ms of 340 ms, with the Thought created by the real gesture at a real point.

**One existing assertion was changed rather than weakened (recorded on purpose).**
`field.spec.ts` used to require the writing textarea to span **> 90 % of the composer's width**, which
was true only because the action had a line of its own — the layout this pass was asked to replace.
It is now a *stronger* contract about the new row: the writing owns most of the material (> 70 %), the
action begins after the writing ends and finishes inside the shell, and the action's vertical centre
lies within the writing's own band. `tests/offline/v023-identity.test.mjs` and
`tests/offline/v024-signature.test.mjs` (the composer's pinned materials, widths, cap and tick) were
not touched and still pass.

**Removed / reduced.** No atmosphere role was added for creation: the background keeps its own
meaning (a global state of the place) and gains no event semantics. Two existing global effects were
toned down instead, because a creation always leaves a selection behind and a selection is what those
effects answer:

- The **`attention` atmosphere** used to raise the illumination by a lot (Paper Day 52 % → 68 %,
  Graphite Night 32 % → 40 %). It now rises only a little (58 % / 35 %): the perceptible half of
  ATTENTION is *where the light falls* — the illumination geometry still moves, which is the pass 2.5
  contract — not how much brighter the whole plane gets. This was the closest thing the product had
  to a creation glow, and it was a global one.
- The **scope wash**, which was the one remaining effect that answered a local event at the middle of
  the viewport, now falls on the selection's own centre *and is sized to it* (`scopeWash`, computed
  from the same bounds the Scope Hub is placed with): the gradient's geometry is data
  (`--scope-wash-x/y/rx/ry`) and the old `50% 50%`, `60% 52%` is only the neutral fallback for
  "nothing selected". A single selected Thought — which is exactly what a creation leaves behind —
  gets a ~390 × 310 px halo instead of a tint over half the plane, and the held-out pixel point above
  is what proves the rest of the Field stays still.

## BACKGROUND

Recorded in full in `docs/REFERENCE_AUDIT.md` ("Phase 2.7 — background recomposition"), including
what was studied at https://antfu.me/ and what was rejected. In short: the reference's lesson is a
near-flat neutral plane that reserves colour for meaning and takes its depth from restraint, so the
recomposition removed the warm patch, the hued third blob and the radial vignette entirely, made the
illumination forms *larger than the viewport* so no circular boundary can be found, and replaced the
vignette with a straight edge falloff. Measured: Paper Day mean R−B 2.6 (was 3.7), Graphite Night
luminance spread 4.4–4.9/255 with every channel in step (no cast), centre-scanline peak-to-peak 5.1
(Paper, horizontal) and 4.9 (Graphite, horizontal), both single-humped and off-centre — no hotspot,
no ring, no visible gradient boundary. Motion is unchanged in structure (one transform-only drift,
24 s, 56/−64 px) and is now the *only* measurable idle cost in the product (see PERFORMANCE).
Thought ink on the new base measures 11.53:1 (Paper) and 13.90:1 (Graphite).

## PERFORMANCE

**Development startup (development-only).** Vite is ready in 148 ms and answers the first request in
0.563 s for 0.85 CPU-seconds; idle afterwards it costs 0.30 % of one core. `npm run build` is 10.12 s
wall / 17.29 CPU-seconds, of which `tsc` is ~6.8 s (67 %) and rollup ~4.4 s — they run sequentially,
so the wall time is their sum. Duplicate watchers: none. `vite.config.ts` already ignores
`src-tauri/target/**`, `tauri dev` starts exactly one frontend server, and the app opens no filesystem
watchers at runtime. **The fan spike is a first-run Rust compile** (`src-tauri`, ~460 crates, minutes,
all cores) plus per-change `tsc`: none of it runs while the product sits idle. It could not be timed
in this container (GTK/glib development libraries are absent, so `cargo build` fails at `glib-sys`),
and `tauri.conf.json` confirms Rust is compiled once — `beforeDevCommand: npm run dev`, `devUrl:
127.0.0.1:5173` — never per frontend edit.

**Idle runtime (production bundle, the important one).** Over 25 s windows at 1440 × 960, with the
page settled:

| window | main-thread task time | share of one core |
| --- | --- | --- |
| `about:blank` (harness baseline) | 0.517 s | 2.07 % |
| the app, idle | 0.725–0.746 s | 2.90–2.98 % |
| the app, idle, atmosphere animation suppressed at runtime | 0.540 s | 2.16 % |

Run-to-run noise is ±0.05 pp, so the ~0.8 pp difference is real and **it is entirely the ambient
drift**: with the animation stopped, idle is indistinguishable from a blank page. There is no idle
JavaScript loop at all — instrumented `requestAnimationFrame`, `setTimeout` and `setInterval` record
**zero** calls over a 5 s idle window; the attention tick runs once per 60 s; the seven
ResizeObservers and zero MutationObservers fire only on resize.

**Interaction.** Per gesture, with the atmosphere suppressed: drag 20.7 % of one core over 0.91 s
(p95 frame 16.8 ms), pan 10.9 %, wheel zoom 5.0 %, marquee 17.5 %, opening Settings 21.4 % (its
entrance animation; p95 50 ms). `ScriptDuration` stays at 5–6 % of one core and style recalculation
tracks presented frames, which is consistent with the imperative, rAF-coalesced pointer path and
inconsistent with a React render per pointer event.

**Fixes.** None were required: no runtime defect was found to patch. The atmosphere's animated layer
is transform-only and 1.83 Mpx; in the headless *software* renderer that costs ~46 recalcs/s and caps
the harness at ~46 fps, but a real GPU compositor (WebView2) is expected to composite it off the main
thread — that is the one claim this container cannot verify. `will-change: transform` was tried and
changed nothing, and the existing `prefers-reduced-motion` stop already exists for anyone who wants
zero ambient cost.

**Recommended workflow.** Frontend visual work: `npm run dev` (~0.5 s cold start, ~0.3 % of one core
idle). Desktop-specific validation — native dialogs, the fs/opener plugins, WebView2 CSP, real window
sizing, packaging — `npm run tauri dev`, which is the only path that compiles Rust, and only once.
Never both at the same time: each binds `127.0.0.1:5173` with `strictPort`.

## MOTION LAB

The Lab (dev-only, `/dev/motion`) keeps executing the real production choreography rather than
replicas, and gained the frames this pass changed: **Thought creation feedback** (the real
`.field-emergence` element with a real position and the production lifetime beside a real
`firstThoughtEmergence(..., 'placement')`), **Composer idle / focused** (the real `composerState`
machine and the real material classes), **Composer multiline** (the cap read from the product's own
CSS), **Help place** (the real `Surface level="window" className="help-surface"` plus the real
`surfaceMotionRoles`), and the **Atmosphere** frame now derives its role from the real
`atmosphereRole()`. Names, production functions and the one thing it cannot show honestly
(`revealCreation` needs a live Field to map world → screen) are recorded in the Lab itself.

## VERIFICATION

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 22 files / 145 tests (adds `tests/unit/marquee.test.ts`, the scope wash's placement contract, and the Phase 2.7 e2e contracts) |
| `npm run build` | PASS — main chunk 1,021,319 B, stylesheet 53,035 B (Phase 2.6: 1,019,615 / 52,486) |
| `npm run test:e2e` | PASS — 116 tests: **108 passed, 0 failed, 8 skipped by design** (the dev-only Motion Lab's eight). Adds fifteen Phase 2.7 contracts plus one measured creation-response pixel contract |
| `npm run check:offline` | PASS — 141 contracts, core typecheck, locale and source-size gates (including the ≤ 600-line contract on `Field.tsx`, which the new gesture vocabulary keeps at 595 lines by moving the *contract* — not the machine — into `field/spatial/gesture.ts`) |
| `npm run bench:spatial` / `bench:storage` / `bench:history` | PASS — unchanged (no spatial, persistence or history code touched) |
| Motion Lab | PASS — 8/8 against the dev server on port 5199 (the route does not exist in the production bundle) |
| Windows native review | **NOT RUN** — no Windows host in this session. Everything here is Chromium at 1440 × 960 (1× DPI), driven by real pointer and keyboard events |
| Screenshots | `verification/v0.4.4/screenshots/` — 60 stills (both themes × two window sizes × 15 states, including Help and the frozen creation mid-state); the background material in `verification/v0.4.4/atmosphere/` |

**Two load-induced flakes, recorded rather than hidden.** Two full-suite runs on a busy container (load average ~2.4 on 3 vCPUs) each failed exactly one test, in a different place: a camera-transform comparison in `redesign.spec.ts` (the world transform read one frame before its own commit) and a focus assertion after a Scope Hub click in `field.spec.ts`. Both pass in isolation (3/3 repeats of the field test, 23/23 for the whole field spec), both are the coalesced camera/rAF sensitivity this suite already documents, and neither touches the contracts this pass changed. On a quiet machine the gate is 108 passed / 0 failed / 8 skipped, and no assertion was weakened to get there.

## FINAL REPORT (the review's own questions)

1. **Does the Composer still look like a heavy dark card?** No. It is one row, ~46 px for one line,
   a fill one step above the Field and a 1 px low-contrast edge; the keyboard note is outside the
   material.
2. **Does the background look like an obvious gradient effect?** No. Measured: centre scanlines are
   single-humped and off-centre, every per-channel delta is < 16/255, and no warm cast exists in
   either theme.
3. **Is the new Thought feedback visibly attached to its actual position?** Yes — asserted to within
   2 px of the created Thought's own box, for three different creation paths.
4. **Is the creation glow subtle enough?** Yes — at its own peak the illumination alone moves the paper by 6.5/255 (Paper Day) and 3.5/255 (Graphite Night), measured from real pixels with the glow on and off, and a point elsewhere on the Field does not move at all.
5. **Does Help feel like the same application hierarchy as Settings?** Yes — the same `window` depth
   class, centring, spring, scrim, close affordance, Escape behaviour and held Field recession.
6. **Does the Field remain visually quiet?** Yes — the only ambient motion in the product is one
   24 s transform drift, which is also the only measurable idle cost (~0.8 % of one core).

**FINAL VERDICT**

| question | verdict |
| --- | --- |
| DRAG SELECTION BUG FIXED | **YES** — root cause reproduced before the fix; 9 e2e contracts + 4 marquee unit cases + the wash-placement case pin it |
| COMPOSER VISUALLY ACCEPTED | **YES** (this pass's own judgement; a native 100/125/150 % review has not been run) |
| BACKGROUND VISUALLY ACCEPTED | **YES** (measured and looked at in Chromium; not at high DPI) |
| LOCAL CREATION FEEDBACK ACCEPTED | **YES** (position and intensity measured, not asserted) |
| HELP SURFACE ACCEPTED | **YES** |
| IDLE RUNTIME PERFORMANCE ACCEPTABLE | **YES** — ~0.8 % of one core, all of it the ambient drift; the fan spike is development-only Rust/tsc compilation |

## Remaining limits

- **No Windows host in this session.** Everything above is Chromium/WebView2-family at 1440 × 960,
  1× DPI, plus what the previous passes measured natively. Unverified here: 125 % / 150 % display
  scaling, the Chinese IME inside the composer and the shortcut recorder, the atmosphere's grain at
  non-integer device pixel ratios, and real GPU compositing of the animated atmosphere layer.
- **The creation response is read as the halo around the new Thought.** Because a created Thought is
  immediately an editing surface with its own fill, the centre of the bloom is behind it. Whether the
  halo alone reads strongly enough at 150 % scaling is a real question for the native review.
- **The composer's geometry is tuned by eye at 1× DPI**, between the pinned bounds (250 / 480 / 108).
  It is not verified at a different interface scale or with a real IME candidate window open.
- **The atmosphere's motion is judged structurally, not aesthetically.** A still cannot show that
  the drift is pleasant on the tenth repetition.
- **`tauri dev`'s Rust build remains untimed** (the container lacks GTK/glib development libraries),
  and the 60fps/46fps difference reported above is an artefact of headless software rendering.
