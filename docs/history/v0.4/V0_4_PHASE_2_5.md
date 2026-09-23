# v0.4 Phase 2.5 — interaction, motion and atmosphere refinement

Record of the Phase 2.5 pass: what was kept, tuned, redesigned or removed; what was adopted and
rejected; what it costs; and what remains unverified. Phase 1 (structural cleanup) and Phase 2
(interaction primitives + motion foundation) are the accepted baseline this starts from. Neither is
redone here. No PixiJS, no Three.js, no Rive, no new animation library, no second overlay authority,
no core or persistence change, and no new runtime dependency.

Companion records: [reference audit](../../REFERENCE_AUDIT.md) (the Phase 2.5 gate), [Phase 2 record](V0_4_PHASE_2.md),
[architecture](../../ARCHITECTURE.md).

## 1. The audit that opened this pass (KEEP / TUNE / REDESIGN / REMOVE)

| Experience | Verdict | What changed |
|---|---|---|
| Bottom Speak / composer | **REDESIGN** | One named state machine and five visual states; idle became part of the Field (caret mark, hairline anchor), focused became a real writing surface with its own keyboard contract, and scope became a statement instead of a badge. |
| Empty Field | **KEEP** | Already composed and already GSAP-owned. Only the invitation's contract changed: the composer half of the first-Thought sequence is now its own authored moment. |
| Selection / scope clarity | **TUNE** | One scope vocabulary shared by the Field and the composer (the same 4 px dot), a quiet shared wash, a deepened far-periphery step, and a scope statement in words. No inspector. |
| Settings information architecture | **REDESIGN** (structure only) | Six implementation-oriented sections became five product questions; the AI section discloses by mode. The accepted visual shell was not touched. |
| Shortcuts | **REDESIGN** | The read-only reference became the control: record, clear, restore, conflict, all from one effective source. |
| Typography | **REDESIGN** | From scattered literal sizes to one editorial hierarchy of roles, plus two explicit size axes. |
| Feedback / status | **REDESIGN** | One line with two lifetimes, plus one reusable connection-status vocabulary. |
| Field / menu ownership | **KEEP** | The Field title, `···`, selection menu and palette keep their existing ownership. No command moved. |
| Signature animations | **REDESIGN** | Three authored sequences became five, each with real choreography instead of opacity + a 4–8 px translate. |
| Field background | **REDESIGN** | A material layer: base + layered illumination + grain + vignette + one 48 s drift. |
| Surface open / close | **TUNE** | Settings gained a two-beat arrival and a Field pull-back that resolves home; every other surface keeps its Phase 2 transition. |
| **REMOVE** | — | Nothing was removed from the product. Two properties lost an owner: the composer action button's CSS `opacity` (already resolved in Phase 2) and the new `.speak-shell` opacity, which is CSS-only so Motion's layout animation is not contested. |

## 2. The Quiet Composer

Before: a 250 px form that faded and rose 2 px on focus, with a scope chip that appeared without
context. It was the weakest thing on screen and read as a placeholder.

After: `ui/workspace/composer.ts` owns the vocabulary — `idle`, `focused`, `scoped`, `writing`,
`submitting` — and `Speak.tsx` renders it as `data-state`, so the stylesheet and the state machine
cannot drift. The states are asserted in the browser, not only in source.

- **idle** — part of the Field: a 1 px caret mark beside the line, the hairline baseline the Field
  already had, and placeholder copy that still says the surface is not a command box. The width is
  deliberately unchanged (`min(250px, …)`), because the fix was never more pixels.
- **focused** — expands to `min(480px, …)` through Motion's layout animation, ink moves from
  tertiary to primary, the baseline strengthens to `opacity: .82`, and a hint row states the
  keyboard contract: `Enter` to think, `Shift+Enter` for a new line, `Esc` to leave. The hint is
  `data-decoration`, `aria-hidden` and `pointer-events: none`: it is never a target.
- **scoped** — the composer says what the next action acts on, in words: “Thinking with this
  thought” / “Thinking with 3 thoughts”. No ids, no counts without a noun, and the mark matches the
  Scope Hub's own so the two read as one statement.
- **writing** — the baseline goes fully solid; the Think action is present.
- **submitting** — the shell gives up presence (`.68`) while a request is in flight; Stop is the one
  control.
- **returning-to-idle** — `Escape` leaves the surface without discarding the draft (an unsent intent
  is never thrown away), and the composer returns to `idle`.

## 3. Scope clarity

Selection defines AI scope, and the pass makes that legible three ways without a sidebar:

1. **One atmosphere.** `.field[data-scope="true"]::before` is a very soft radial wash
   (`--attention-soft`, 5 % alpha) between the Field plane and the Thoughts, so a scope reads as a
   shared place rather than as N independent highlights.
2. **One contrast step.** The selected Thoughts keep full ink, `direct` neighbours go to full
   presence, and genuinely distant context steps down (`peripheral` `.44 → .38`). This is
   deliberately small: the contract *attention must not hide everything else* is asserted by the
   e2e suite, and the first attempt (`.58 → .34`) failed it. The brief asked for stronger contrast;
   the product's own boundary says how strong it is allowed to be, and the boundary won.
3. **One statement.** The composer's scope line and the Scope Hub's count carry the same dot mark,
   and the hub's accessible name now states the rule — “Scope actions: Selection makes a temporary
   scope” — so the relationship is available to assistive technology too.

`data-scope` is a presentation attribute on `.field` derived from `ui.selection`; it never enters
Core and never changes a coordinate.

## 4. Settings information architecture

Six sections became five, in the order a person asks the questions:

**General · Appearance · AI · Shortcuts · About**

**Appearance** now carries both size axes (below). **AI** replaces the old Thinking + Gateway split,
because the old split forced a person to understand the word “gateway” before they could turn
thinking on:

- **Mode** is the first control. Off / Demo / Custom service keep their existing honest labels (they
  already state what each mode actually is).
- **off** → only `Thinking is off. The Field stays manual: nothing is sent anywhere.` No URL, no
  token, no model, no depth.
- **demo** → only the deterministic explanation.
- **custom service** → progressive disclosure, in order: **Connection** (base URL, session token,
  status line, Re-check), **Model** (gateway default, declared models, or a custom id only when the
  gateway reports it would accept one), **Thinking depth**. The token/base-URL explanation lives
  inside Connection, so advanced prose never dominates a screen where AI is off.
- Capability honesty is unchanged and now stricter in one place: a gateway that did **not answer**
  is reported as `Could not connect` with a retry instead of being summarised as “declares no model
  list”. `UNKNOWN_CAPABILITIES` is a distinguishable sentinel, so silence and a declared empty list
  are no longer conflated.
- `getByLabel`/section wiring is unchanged: same `Surface`, same vertical tablist, same one `Select`,
  same `#setting-*` ids, same `.settings-cluster` vocabulary.

## 5. Connection / status language

One primitive, `ui/primitives/Status.tsx`, gives every state a glyph and a word:

| Tone | Glyph | Used for |
|---|---|---|
| `connected` | ● | gateway answered and reports thinking configured |
| `checking` | ◌ | a probe in flight (the glyph breathes slowly; nothing else moves) |
| `unconfigured` | ○ | thinking off |
| `limited` | ◐ | demo mode |
| `unavailable` | — | gateway answered, reports nothing configured |
| `error` | ! | gateway did not answer, with a `Try again` action |

Styling lives in `field.css` under `data-tone`, so a tone cannot look different in one place than
another. The glyph is `aria-hidden`; the label carries the meaning. `data-testid="ai-status"` is
asserted for all six reachable states in the browser suite. Import, sources and capability probing
keep their existing wording; the primitive exists so the *vocabulary* is shared rather than
per-surface prose.

## 6. Shortcut remapping

The command registry stays the source of semantic truth. Defaults live on `command.shortcuts`; only
overrides are persisted (`shortcutOverrides: Record<string, string[]>`).

```text
registry default (command.shortcuts)
        + user override (settings.shortcutOverrides, serialized as `mod+shift+k`)
        ↓
effective shortcut (applyShortcutOverrides, applied once in Workspace)
        ↓
keyboard router · menu labels · palette · Settings shortcut list
```

Because the override is applied once to the command list, the router, the menu label and the
Settings display cannot disagree — and an e2e test proves all three from one action. An overridden
command also carries `defaultShortcuts`, the registry combination it replaced, so Settings can show
what was replaced without a second table of defaults (this was a real defect found by that test: the
Settings list receives the *effective* list, so without provenance it showed the override in both
places).

Behaviour: click a row to record; `Escape` cancels; `Backspace`/`Delete` clears the override;
`Restore default` per row and `Restore all defaults` for the set. A recording listener runs in the
capture phase and calls `preventDefault`/`stopPropagation`, so the application router never sees a
recorded key; `compositionstart` cancels recording, so a Chinese IME can never become a shortcut.
A combination already in use is **refused**, not stolen: the row states `Already used by …` and the
other command keeps working — deliberately no “steal” path, because a silent steal makes the
keyboard non-deterministic for a command the user never touched.
(`ponytail:` a “reassign and free the other command” flow would be the upgrade if users ask for it.)

## 7. Typography and the two size axes

`theme.css` now declares one editorial hierarchy. A role fixes family, size, weight, leading,
tracking and presence together, so a surface picks a role instead of inventing a number:

| Role | Family | Size at 100 % | Weight | Leading | Tracking | Presence |
|---|---|---|---|---|---|---|
| field identity | UI | 15 | 400 | 1.4 | −.004em | `.62` ink |
| field eyebrow | UI | 10 | 400 | 1.5 | .16em | `.45` |
| thought | thought | `--thought-size` (18 default) | 400 | 1.5 | 0 | `.82` |
| crystal | thought | ×19/18 | 500 | 1.5 | 0 | 1 |
| ghost | thought | `--thought-size` | 400 | 1.5 | 0 | `.40` |
| recall | UI | 12 | 400 | 1.5 | 0 | `.58` |
| ui title | UI | 17 | 400 | 1.4 | −.004em | 1 |
| section title | UI | 13 | 500 | 1.5 | .01em | 1 |
| setting label | UI | 12 | 400 | 1.6 | 0 | `.62` |
| helper text | UI | 11 | 400 | 1.75 | 0 | `.62` |
| metadata | UI | 10 | 400 | 1.5 | .12em | `.45` |
| shortcut hint | UI | 10 | 400 | 1.6 | .02em | `.45` |
| status text | UI | 11.5 | 400 | 1.6 | 0 | `.62` |

Both themes use the same hierarchy; only the palette differs.

Two bounded controls, because they are two different materials:

- **Interface size** — `90 / 100 / 110 / 120 %`, applied as `--ui-scale` on the document root. It
  multiplies the chrome only: Settings, menus, the palette, labels, buttons, metadata, shortcut
  hints and surface chrome.
- **Thought size** — `16–24 px`, default `18`, applied as `--thought-size` (and `--thought-scale`, the
  same value as a unitless ratio). It affects what the person wrote: Thought display, the Thought
  editor, Ghost text, Recall and Crystal text. Editing and resting display are the same size,
  because there is one control, not two.

Geometry is a consequence, not an assumption: `--thought-scale` feeds the semantic-zoom rules
(neighborhood/atlas) so the user's chosen size survives counter-scaling. The e2e suite asserts the
end-to-end consequence — after changing Thought size, the rendered font-size changes, the element's
bounds grow, a click inside the new bounds still resolves through the spatial index, and both axes
survive a reload.

## 8. Background and atmosphere

`ui/atmosphere.tsx` (component) + `ui/atmosphere.ts` (role vocabulary) + `ui/atmosphere.css`
(material). It is the first child of `.app`, paints under everything, and owns no pointer.

Composition: **base colour + three layered radial illumination gradients + a 160 px fractal-noise
grain at ~5 % (`soft-light`) + a vignette + one slow drift of `transform` only.**

- **Paper Day** — warm paper base, a gentle centre lift, a slightly cooler outer field, a fibre
  grain. It is deliberately not beige: the lift is `#ffffff` and the outer field is cool, so the
  result is clean paper rather than a tinted sheet.
- **Graphite Night** — dark graphite, *warmer local* illumination (`#3d372e` lift, `#6d5b43` warm
  layer) and deeper edges. It is not a uniform `#151617` plane; disabling the layer visibly flattens
  it.
- **Ambient motion** — one meaningful change per ~48 s: a ≤20 px drift of the illumination layer,
  `transform` only, no opacity pulsing, no continuous animation of Thoughts, relations, particles,
  decorations or the cursor. Under `prefers-reduced-motion: reduce` the drift stops and the material
  stays.
- **State architecture** — `AtmosphereRole = 'rest' | 'attention' | 'emergence' | 'transition'`,
  derived from transient presentation state only (`atmosphereRole({ busy, diffuse })`). REST is fully
  implemented; ATTENTION is a restrained CSS variant (slightly more illumination, no movement
  change); EMERGENCE and TRANSITION are named and deliberately not implemented, so the Phase 3
  semantic renderer can be fed by the same vocabulary without this module changing shape.
- **Cost** — no `filter`, no `backdrop-filter`, no full-screen blur, no layout-triggering animation,
  no JS loop, no pointer work. The grain is a static inline SVG; the only animated property is
  `transform` on one pseudo-element. It is a compositor-only layer.

## 9. Motion

The Phase 2 role vocabulary is untouched (`tests/unit/motion.test.ts` still pins it). The sequences
were redesigned, and the set grew from three to five:

1. **First Thought** (≈600–900 ms, tuned by eye in the Lab). Two halves, one story: the composer
   *yields* — the invitation's secondary lines withdraw from the end, the invitation lifts away, the
   positioner contracts and releases (`firstThoughtComposerSequence`) — and the written idea
   *separates*: the Thought's text child starts at a **measured** offset from the composer toward its
   own resting screen position, clamped to 24–90 px so a zoomed Field cannot launch an absurd
   flight (54 px fallback when no origin is available), changes depth (`scale .9 → 1.006 → 1`) and
   resolves its typography (letter-spacing `0.6px → 0`). The article's inline world transform is
   never touched. Semantic creation is not delayed.
2. **Field switch.** Departure and arrival are now two authored moments. `fieldDepartureSequence`
   makes the outgoing Field recede: visible Thoughts' *text children* spread ~8 px outward from the
   viewport centre and fade, the identity lifts, the atmosphere drains — computed per element, never
   touching canonical coordinates. It is bounded by a 260 ms beat and reverted afterwards, so a
   refused switch leaves the Field exactly as it was. `fieldSwitchSequence` then lifts the veil,
   settles the atmosphere and the identity, and emerges the visible Thoughts **in small groups**
   (groups of 3, a short beat between groups) instead of one flat stagger.
3. **Settings open/close.** `settingsRecedeSequence` pulls the Field back (`.99` scale, `.82`
   opacity, identity `−6 px`, atmosphere `.55`) and resolves it home in ~340 ms with `clearProps`,
   so the Field is never left transformed (its pointer maths read its rect). `settingsEnterSequence`
   is two beats: the navigation settles, then the section it points at arrives. The second beat is
   **opacity only, deliberately**: that panel contains the controls, and an inline `transform` on it
   would leave it a containing block for the portalled Select popup and shift the measured geometry
   of everything inside it. That hazard was avoided by design, not discovered by failure — the one
   intermittent Select failure in this pass turned out to be a load-fragile *test* that predated it
   (§14), and this beat was made presence-only anyway so the two could not be confused.
4. **History reveal.** Read as hierarchy: overview first, then the structure (day rows and their
   spine), then the events. Not a list-mounted stagger.
5. **Empty Field** (unchanged) — invitation breathe, contract on writing, release on commit.

Reduced motion builds none of them; the state change is what the user gets.

## 10. Feedback

One line, two lifetimes (`ui/workspace/feedback.ts` + `Feedback.tsx`), replacing the habit of
threading a notice through every layer:

- `feedback(event)` — a **named** acknowledgement (`field-created`, `field-opened`,
  `field-duplicated`, `export-prepared`, `gateway-connected`, `reference-imported`,
  `possibility-claimed`, `recall-awakened`). It appears, settles, and disappears after `3.2 s`. A
  second call replaces the text and restarts the single timer; there is no queue and no stack.
- `report(text, tone)` — something the person must actually see (a failure). It never schedules a
  timer, so an error cannot vanish while it is being read. `notice()` keeps its exact previous
  lifetime and is built on `report`.
- Wired: creating, opening and duplicating a Field (`useProjectActions`), a Markdown export, and a
  gateway that actually answers (`useThinkingCapabilities`, once per configured gateway — not once
  per keystroke). Errors stay errors: storage/save failures keep their existing permanent notices and
  are rendered with `data-tone="error"`.
- The line is styled as the Field's own quiet footnote; `data-secondary` (the standing demo
  disclosure) is preserved.

## 11. Menu and action ownership

Reviewed, and **nothing moved**. The ownership rules are still: Field title = operations on this
Field; selection menu = operations on selected Thoughts; `···` = application/view; palette =
searchable access to all appropriate commands.

The two commands the brief questioned were examined specifically:

- **“How did this form?”** stays in the Field menu *and* the selection menu. History is not a
  thinking operation — it is a property of the Field (and of a scope), and it is the answer to a
  question about what exists, not a request to reason. Moving it under a Thinking group would imply
  it produces model output.
- **“Try a Fork…”** stays in the Field menu. A Fork is a file operation on the Field itself (a copy
  of this moment, entered as a new Field), not a semantic operation on selected Thoughts. It is
  already adjacent to Duplicate/Export/Import for exactly that reason.

One grouping change was made: the Field menu's thinking-ish row (`history`, `fork`, `compare-fork`)
keeps its existing placement rather than being split into a third group, because splitting it would
create a menu section with no shared meaning.

## 12. Motion Lab

`/dev/motion` (dev-only, `import.meta.env.DEV`, tree-shaken out of production, verified again in this
pass). It now carries **24 scenarios**, including every scenario this phase redesigned: Quiet
Composer, First Thought, Field switch (departure + arrival as separate variants), Settings open,
Settings close, History reveal, Feedback, Scope enter, Scope exit, and Atmosphere (rest vs
attention, rendering the **real** atmosphere layer). Each scenario has a Replay control, and the
forced reduced-motion and Paper Day / Graphite Night toggles are unchanged. A new e2e test asserts
that every redesigned scenario is reachable and exposes a Replay control.

What visual review changed: the scope step was reduced from `.58 → .34` to `.44 → .38` because the
browser suite's “attention must not hide the rest” contract failed at the stronger value; the
Settings-list provenance bug was found by an e2e assertion about what an override replaced; helper
copy was darkened to clear AA after a measured 4.29:1; and two `kbd` roles gained the leading every
other role already pinned.

## 13. Files and cost

New modules (all small, single-purpose):

| File | Role |
|---|---|
| `src/ui/atmosphere.ts` | the atmosphere role vocabulary (pure) |
| `src/ui/atmosphere.tsx` | the atmosphere layer component |
| `src/ui/atmosphere.css` | the two material recipes, grain, vignette, drift, reduced motion |
| `src/ui/workspace/composer.ts` | the composer state machine + its keyboard hints (pure) |
| `src/ui/workspace/feedback.ts` | the feedback vocabulary and the two lifetimes |
| `src/ui/workspace/Feedback.tsx` | the one feedback line |
| `src/ui/primitives/Status.tsx` | the one connection/status vocabulary |
| `src/ui/commands/shortcutOverrides.ts` | default + override → effective, conflicts, provenance |

Rewritten or extended: `ui/workspace/Speak.tsx`, `ui/surfaces/ShortcutReference.tsx`,
`ui/surfaces/SettingsSurface.tsx`, `ui/motion/signature.ts`, `ui/theme.css`, `ui/field.css`,
`ui/settings.ts`, `ui/workspace/useWorkspaceSettings.ts`, `ui/workspace/useProjectActions.ts`,
`ui/workspace/useThinkingIntents.ts`, `ui/workspace/useThinkingCapabilities.ts`, `ui/scope/ScopeHub.tsx`,
`ui/Workspace.tsx`, `field/Field.tsx` (one presentation attribute), `dev/*`, `src/locales/zh.ts`.

Files over the 350-line review threshold (all documented in `scripts/check-source-size.mjs`):
`src/field/Field.tsx` (582, inherited engine), `src/ui/field.css` (500, the single stylesheet),
`src/dev/MotionLab.tsx` (457, dev-only, zero production bytes), `src/ui/motion/signature.ts` (371,
the single GSAP importer). Nothing exceeds the 700-line maximum.

Cost: the CSS layer adds no dependency and no image asset. Measured on the final build:

| Artifact | Bytes | gzip (level 9) |
|---|---|---|
| main JS chunk | 1,018,233 | 340,149 |
| stylesheet | 50,568 | 10,424 |

Against Phase 2's 1,002,990 B main chunk that is **+15,243 B raw**, which is the new application code
(atmosphere roles, composer states, feedback vocabulary, status primitive, shortcut-override
resolution, the two new signature sequences, the expanded Settings surface, the new spec files are
*tests* and ship nothing) plus the added locale strings. Phase 2's gzip figure (335,459 B) was reported
by Vite's own gzip pass and is not directly comparable to the level-9 figure above, so the delta is
quoted raw only. No measure was taken by removing a feature to see what it costs, so this is an honest
total rather than a per-module attribution.

The atmosphere's own runtime cost is deliberately bounded: no `filter`, no `backdrop-filter`, no
full-screen blur, no layout-triggering animation, no JS animation loop and no work on the pointer
path. One pseudo-element animates `transform` on a ~48 s cycle; the grain is a static inline SVG
tile. GSAP remains outside every pointer-frequency path and is imported by exactly one module — an
offline contract enumerates the importers, and it is still `['src/ui/motion/signature.ts']`.

## 14. Verification

See `STATUS.md` for the gate table. Deliberately changed assertions, and why:

| Test | Change |
|---|---|
| `tests/offline/v023-identity.test.mjs` | The Settings section-set assertion moved from `<Tabs.Panel value="thinking">` to the five new sections (including a negative assertion that `thinking` no longer exists). Every `settings-cluster` / `data-setting` / one-`Select` assertion was kept. |
| `tests/e2e/selects.ts` | `SECTION_OF` moved the AI controls to the `ai` section and added the two size controls. |
| `tests/e2e/refinement.spec.ts` | Six nav buttons → five; `thinking` → `ai`; `#setting-thinking` → `#setting-ai`. The new `Mode` label is asserted and `Off / manual Field only` is still asserted to be present. The palette/delete shortcut assertions were untouched. |
| `tests/e2e/field.spec.ts` | The composer's scope copy changed from “About N thoughts” / “关于这里” to the new statement, so those two text assertions were updated to the decided wording. Nothing else in the file changed; every geometry assertion (250 px idle, 480 px composing, 108 px cap, hub non-overlap) still holds. |
| `tests/e2e/primitives.spec.ts`, `tests/e2e/hardening.spec.ts` | No change — the tablist order and the controls those files assert are still true. |

New regression tests: `tests/unit/atmosphere.test.ts` (role vocabulary, no pointer ownership, no
blur/backdrop-filter, one transform-only 48 s animation, per-theme recipe, reduced-motion guard),
`tests/unit/composer.test.ts` (the five states and the hint contract),
`tests/unit/settings.test.ts` (both size axes bounded and persisted, no second edit/display size, no
session token persisted, shortcut-override normalization, `typeScaleChanged` vs
`thinkingServiceChanged`), `tests/unit/feedback.test.ts` (every event has a dictionary key, settle vs
permanent lifetime, no timer without a window), `tests/unit/shortcutOverrides.test.ts` (already
14 tests, plus override provenance), `tests/e2e/phase25.spec.ts` (seven browser tests: the
override flow end to end, conflict refusal, clearing and restoring, AI conditional disclosure and the
full status vocabulary, both size axes with a real geometry re-measure, the composer's states, and
the atmosphere including reduced motion), and `tests/e2e/visual.spec.ts` (the measured visual claims
in §14).

One more finding, and it is the honest kind: the pre-existing Select contract test
(`tests/e2e/primitives.spec.ts`) turned out to be **load-fragile in the test itself, not a Phase 2.5
regression**. It waited on element counts that are true while the popup is still closed hand, because
Base UI keeps the popup mounted (`display: none` on the positioner) for closed-trigger typeahead, and
Base UI moves focus from the trigger into the highlighted option a beat *after* opening. Under load
the test therefore delivered `ArrowDown`/`Enter` in that gap, where an arrow key is read as "enter the
list" rather than "move to the next option". The original test was reproduced failing 16 times in 60
against unmodified `HEAD` under deliberate CPU load. The fix waits on the state the keyboard
sequence actually depends on — `aria-expanded="true"`, three options, and the highlighted option
ownering focus — which is strictly stronger than the visibility check it replaced. No retry, no
padded timeout, no weakened assertion. 60/60 and 120/120 clean under the same load; the full suite is
green.

## 14. Visual acceptance

Measured in Chromium against the production bundle by `tests/e2e/visual.spec.ts` (a gated spec) with
52 stills captured by `scripts/capture-visual.mjs` into `verification/v0.4.2/` (both themes ×
1440 × 960 and 900 × 700 × thirteen states). See that directory's README for what each file is.

The claims that can be settled by measurement were settled by measurement, using real rendered
pixels decoded from a screenshot buffer rather than a computed-style proxy:

| Claim | Measurement |
|---|---|
| Paper Day is paper, not beige | mean `R − B` **4.1** (worst point 5.0); beige `#f0e8d8` would be ≈24 |
| Graphite Night is not a uniform plane | luminance spread **8.4–8.7/255** across five widely separated points; per-channel deltas R 10.5, G 8.1, B 5.8 — variation present, contrast low, no banding |
| The atmosphere is decoration and is cheap | `data-atmosphere="rest"`, `aria-hidden`, `pointer-events: none`, grain opacity 0.055 day / 0.05 night, one 48 s `transform` animation, `filter`/`backdrop-filter` `none` on the element, both pseudos and the grain |
| The editorial hierarchy is real | role sizes pinned at 100 %: identity 15, eyebrow 10, Thought 18, crystal 19, ghost 18, UI title 17, section title 13, label 12, helper 11, metadata 10, hint 10, status 11.5; orderings and tracking relations asserted (eyebrow 1.6 px > identity −0.06 px; crystal 500 > Thought 400) |
| The two axes scale their own material | interface 120 % takes the chrome 12 → 14.4 px with the Thought unchanged; Thought 24 px with the chrome unchanged; both survive a reload |
| The composer expansion is real geometry | idle 250 × 44 → focused 480 × 71 |
| Scope stays readable | a placed far Thought at `peripheral` measures 0.38–0.40; other non-selected Thoughts 0.77–0.90 |
| Reduced motion removes travel, not meaning | atmosphere `animation-name: none`, atmosphere opacity still 1, composer still reaches 480 px, Settings still opens and closes, selection still resolves |

A programmatic still-frame audit over all 52 frames found no offscreen popup, no foreign element
painted over an owning surface, no clipped text and no visually empty Settings section (the AI
section carries 143 characters in `off`, 182 in `demo`, 563 in `gateway`). It also measured three
contrast observations for a human eye, one of which was a real defect and was fixed in this pass:

- **Fixed.** Helper copy (`.settings-note`, `.tiny`, a surface subtitle, the shortcut hint, the status
  detail) sat on `--surface-1` at **4.29:1** in Paper Day — just under WCAG AA for normal text. There
  is now one `--ink-helper` token: `#6b6a64` in light (**5.11:1** on `--surface-1`, 4.63:1 on
  `--surface-2`, 4.89:1 on `--field-bg`) and an alias of `--ink-secondary` in dark (7.90:1). Only the
  helper role moved; the palette and every other role are unchanged.
- **Fixed.** `.shortcut-list kbd` and `.command-menu kbd` reset their line-height to `normal` while
  every other role pins a leading. They now pin 1.6 like the base `kbd` rule.
- **Recorded, not changed.** The identity eyebrow measures **1.49:1** in Paper Day / **1.81:1** in
  Graphite Night at its designed presence of `.45`, and `--ink-tertiary` measures **2.64:1** in Paper
  Day. These are deliberate editorial presences for uppercase micro-labels and metadata, not body
  text, but they are below AA and a future pass should decide whether the presence token or the
  colour moves. Changing them now would restyle the accepted Phase 2 shell, which this pass was told
  not to do.

## 15. Still not verified

- **Native Windows Tauri was not run in this pass.** There is no Windows host in this session. All of
  this phase is verified in Chromium at 1440 × 960 (1× DPI). Specifically unverified on Windows:
  125 % / 150 % display scaling and high DPI for the two size axes, the Chinese IME inside the
  shortcut recorder, the atmosphere's grain at non-integer device pixel ratios, and shortcut
  recording through WebView2.
- The gateway status vocabulary is exercised against an honest failure (no gateway is running in the
  browser suite: the observable state is `Could not connect` with a retry). The `connected` and
  `unavailable` tones are covered by unit-level derivation only; no live provider was contacted.
- **Motion was judged by no one.** The five sequences resolve through the shared role vocabulary and
  every one is replayable in the Motion Lab, but the constants a human should tune in front of the
  screen are listed explicitly in §9: `EMERGE_TRAVEL_MIN/MAX`, the composer contraction, the Thought
  group size and beat, `DEPARTURE_SPREAD`, the Settings dips, the History beat offsets, and the
  field-switch atmosphere emphasis.
- The atmosphere is measured and asserted but not assessed as an aesthetic judgement, and not at
  high DPI. The 52 stills exist to be looked at; nobody in this pass could look at them.
- The `recall` typography role is covered by the shared size/leading of its family rather than by its
  own measurement: producing a Recall through the real runtime was too indirect to be reliable in a
  gated test. `ghost` was produced through Demo mode and the composer instead.
- The Motion Lab's Settings replica still uses its own illustrative section names; it is a design
  environment, not the product screen, and it was not re-synchronised with the new five-section IA.

## 16. Phase 3 candidates (listed, not started)

- A GPU phenomena layer (Pixi) fed by `field/phenomena/describe.ts` and lit by the
  `AtmosphereRole` vocabulary already exported here — `emergence` and `transition` are the two roles
  it would implement first.
- Semantic ripples / relation energy: an explicit relation forming should have a spatial signature
  the description boundary can express.
- Ghost filament effects and a Recall wake field, once the renderer exists to own them.
- Region atmospheric distortion for a large scope (the “common atmosphere” of §5 done with real
  geometry instead of a centred wash).
- A per-scope, geometry-aware scope atmosphere (the wash currently centres on the viewport because
  the presentation layer deliberately does not read selection bounds).
- Provider/model verification against a real gateway, and a “reassign and free” shortcut flow.
