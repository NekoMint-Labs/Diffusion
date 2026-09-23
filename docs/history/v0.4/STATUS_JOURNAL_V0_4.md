# STATUS journal — v0.4 (historical phase-by-phase record)

This is the append-only phase journal that used to live inside `STATUS.md`. It was moved here
during the documentation-hygiene pass so that `STATUS.md` answers only what Diffusion is *now*.
The content is reproduced in order — lines 12–478 and 585–594 of the pre-pass `STATUS.md` — with
only references to files this pass moved retargeted; the prose is otherwise unchanged. It is
provenance, not current truth — for current behaviour read `ARCHITECTURE.md`,
`README.md` and `STATUS.md`.

## Phase 2.12 (v0.4) — Quiet Material / Editorial Instrument

- **Field materiality is stateful, not permanent framing.** Rest is nearly ink-only; hover reveals a
  quiet edge; selection adds local surface presence and ScopeHub; drag lifts the selected Material.
  Geometry does not change between those states.
- **Confirmed topology no longer disappears during a selection drag.** A presentation-only geometry
  overlay repaints the visible confirmed relation endpoints against temporary drag positions; Core is
  unchanged until pointer-up, and proximity still cannot create semantic commitment.
- **Application chrome now has one ordinary control language.** Base UI-backed Button, Switch and
  Checkbox join the existing Select/Tabs/Menu behavior, while SettingRow and SurfaceGroup establish
  the Settings anatomy. General, Appearance, AI, Search & Evidence, Shortcuts and About use it.
- **The same surface hierarchy reached the rest of the current UI.** Find, Diffuse, Fork, History,
  Restore, Region, Open Field, Handoff, Crystal Preview, reference/evidence/relation detail, menus,
  palette, Thread/Deep Dive, notices/status/errors and loading/empty states now read as one desktop
  instrument rather than isolated generations of styling.
- **No Phase 3 semantics were faked.** The pass changes presentation and conventional controls only.
  Structured Material/Relation detail models remain deferred.

**The most recent pre-convergence product pass is [Phase 2.11 — the last developer vocabulary in the UI](#phase-211-v04--the-last-developer-vocabulary-in-the-ui), below.**
It is a narrow friction cleanup after Phase 2.10: the Diffuse surface stopped being the agent
scheduler's own panel, six leftover implementation phrases and empty states were replaced, and every
storage or device failure now speaks in the product's words instead of printing a thrown exception.

**Implemented and verified in the mounted React application.** [Phase 2.10 — user friction and blockers](#phase-210-v04--user-friction-and-blockers)
walked the product as a person would and fixed what stopped them: a saved API key that was silently
discarded on any build without an OS keychain, a model listing whose failure was an unhandled error,
and two surfaces that printed Diffusion's internal failure codes instead of what to do next.

**Implemented and verified in the mounted React application.** v0.4 Phase 2.9 is a *frontend
convergence* pass: it re-verified the Phase 2.7 and 2.8B-1 fixes and closed twelve findings a green
test suite did not cover, and it supersedes the Composer geometry recorded in Phase 2.7.

**Implemented and verified in the mounted React application.** v0.4 Phase 2.7 is an *interaction
precision and visual refinement* pass on top of the accepted Phase 2.6 baseline, opened because a real
Windows review found seven product-level problems. It fixed a real defect (a press that missed a
Thought's box by a few pixels became a marquee, and a marquee replaced the selection — so dragging one
or two selected Thoughts could hand back a selection of everything the accidental rectangle grazed),
made the creation response local to the Thought it answers, moved Help into the centred `window`
family that Settings already occupies, redesigned the focused Composer as one row (writing plus its
action, with the keyboard note under the material rather than inside it), recomposed the Field's
material after studying https://antfu.me/, and measured the development and runtime cost that the
review suspected. It does not start PixiJS, add a product feature, rewrite Core, redo Settings, or
change the motion architecture. Full record: [Phase 2.7 note](docs/history/v0.4/V0_4_PHASE_2_7.md).

## Phase 2.11 (v0.4) — the last developer vocabulary in the UI

- **The Diffuse surface was the runtime scheduler's own panel.** It asked a person to set a
  *Wall-clock budget* and a number of *Maximum model calls*, opened with "N owned thoughts in the
  starting scope", warned that "Unclaimed Ghosts never become autonomous input", printed its own
  phase as a raw token (`msg(state.phase)` → "running"), and offered two native `<select>`s — the
  platform's own white popup inside WebView2. Every control is now the decision it stands for:
  *Angles to try* (each angle one separate look at the same scope), *Time limit, pauses included*,
  Sources already in the Field, and one web search — with the engine's real limits stated in the
  validation sentences in `src/ai/diffuse.ts`. Both dropdowns are the product's one `Select`; the
  surface contains zero native `<select>` elements, and its defaults (3 angles, 1 minute) are usable
  as they are. A web-search switch that cannot be used now says why instead of going silently dead.
- **Six leftover phrases and two empty states.** History's subtitle no longer says "Semantic
  trajectory"; Settings → About no longer says "IndexedDB" or "archive v1" while still stating
  where the Field is saved and what an export is; a Region's subtitle no longer says "spatial
  activity" (a Region is grouped by position — within 520 px, and only after repeated work in one
  place — never by meaning); a Field with no forks says so rather than leaving a heading with
  nothing under it; an empty Thread names the next step rather than only the situation; and the Fork
  comparison no longer prints hyphenated internal tokens (`only fork`, `main changed`) but the phrase
  each one stands for. A relation's panel title is translated like every other one, and the export
  acknowledgement no longer says "unclaimed Ghosts".
- **`Explore` and `Ask` were two names for two different things.** The selection toolbar's pair read
  as synonyms: one runs a probe over the selection *immediately, with no words from the person*, the
  other opens the composer with the selection as its scope and waits for what they write. They now
  say `Find a relation` and `Ask your own question`, in the toolbar, the context menu and the command
  palette alike — one vocabulary, because it is one behaviour each.
- **Storage and device failures stopped printing exceptions.** `src/ui/workspace/notice.ts` gained
  the bounded `DeviceFailure` vocabulary — ten sentences that each say what did not succeed, whether
  the work is still safe, and what to do next — with the raw cause kept in one `console.error` line
  and never in the UI. It replaced raw `String(error)` exposure in the project actions, the thinking
  intents, the Field actions, `Workspace` (whose persistence line printed the storage exception as
  its primary text), `App`'s startup storage failure, the source importer, `ForkSurface`'s five
  status sites, `RestoreSurface`'s read path (the previous review's F3 printed `Error: Invalid
  project: unsupported schema version`; a version-mismatched export is now named as such) and
  `SourceSurface`'s open-original path. A stored extraction error and a refused Crystal show product
  sentences too, instead of a raw thrown value and an `Error:`-prefixed English `DomainError`.
  `Retry` on a provider failure is wired to the composer still holding the words the failed request
  came from, which is the contract the notice vocabulary already claimed.
- **A failed run stopped showing its failure code.** `runtime.run` returned `ThinkingError.message`
  as the result's `reason`, and that message *is* the code — so the Diffuse surface's reason line
  printed `authentication-failed` while the notice beside it said "Authentication failed. Check the
  API key…". The result now carries the same bounded sentence the notice does; the code stays in the
  classified hook and the log, where it is useful.
- **Nothing else moved.** No dependency added, no backend protocol change, no change to the Field,
  the Focus Field, the composer, AI Settings' information architecture or the overlay architecture.
  `src/locales/zh.ts` gained the new keys and lost the 43 the pass orphaned (691 → 650).

## Phase 2.10 (v0.4) — user friction and blockers

- **Two blockers on the path a person actually walks.** A saved provider key was written into a
  `SessionCredentialStore` created *per call*, so a build without an OS keychain accepted the key,
  reported no error and handed the next request an empty one — the browser build's primary
  configuration path did nothing. `src/credentials/session.ts` now owns one shared store, the
  factory and the render-time seed both resolve to it, and `tests/unit/credentials.test.ts` fails if
  it ever becomes per-call again. Pressing **Refresh models** against an endpoint that was not
  answering was an *unhandled rejection* (`provider-unreachable` in the console) with an unchanged
  status and no sentence at all; `useThinkingCapabilities` now classifies it, keeps manual entry
  working and says so.
- **The AI section became the form the audit asked for.** The model is one editable combobox
  (Base UI `Combobox`, the Select's own popup material): typing is the primary path, a fetched list
  is a suggestion, and a fetch that fails costs nothing. Removed from the normal path: the protocol
  override and the depth control where a provider has no reasoning control (both behind *Advanced*),
  a native `<select>` (now the product's one Select), and a second field/list/selection control that
  replaced manual entry with a menu. The section is 1,237 → 914 px tall at 1440 × 960.
- **A model list belongs to the endpoint that produced it.** It used to be global, so an endpoint's
  models were offered for the next provider the person selected, and committing a key discarded the
  list that had just been read.
- **One persistence model.** A preference saves as it is edited; a secret is committed by its own
  `Save`/`Remove` and never by blur, and `Test connection` / `Refresh models` commit a key that is
  still in the field first, so the check reports on the configuration on screen ("Save the key to use
  it." says so meanwhile).
- **"AI is off" stopped being a dead end.** The notice now carries the control that opens AI
  settings, on both paths: a question asked of a non-empty Field, and the first sentence of a Field
  with no provider — which used to become Field content silently while the button said *Think*.
- **Failures speak in the product's vocabulary again.** `useThinkingService` never forwarded
  `RuntimeHooks.failure`, so every provider failure was announced as its internal code
  (`authentication-failed`, `malformed-provider-response`) with no sentence and no remedy, despite
  the whole failure vocabulary existing behind it. One line now forwards it; `EvidenceSurface` and
  `SourceSurface` no longer print `discovery-unavailable` / `reader-unavailable` either, and the
  "configure a gateway" instruction is gone (the read path is built in; what a person turns on is
  external search). `Retry` is offered only while the composer still holds something to resend.
- **A status may not promise what the build cannot do.** Search & Evidence said "Available" from the
  enabled source list alone; it now requires an engine that exists here and names the way out when
  there is none.
- **An editable combobox inside the product's Escape contract.** Base UI's combobox consumed Escape
  even with its list closed, so the key that dismisses every surface did nothing while the model
  field had focus; the field hands it back when its list is not open, and the list itself opens only
  when a provider has actually offered something (`tests/e2e/friction.spec.ts` pins both orders).
- **Controls deliberately kept:** Test connection, model fetching, the API key's own Save, both
  direct providers and the gateway, the provider selector, and every compatibility override — moved,
  never removed.
- Cost: main chunk 1,073,635 → ~1,113 kB raw (+38 kB, +13 kB gzip), which is the combobox's own
  behaviour. A native `<datalist>` would have cost nothing and been unstylable inside WebView2.

## Phase 2.9 (v0.4) — frontend convergence

- **Twelve findings, none of which the suite could see.** A second full sweep of the Phase 2 frontend,
  green before and green after. Full record: [Phase 2.9 note](docs/history/v0.4/V0_4_PHASE_2_9.md).
- **The Composer stopped reading as a form panel.** Focused shell 52 → **45 px**, the whole surface
  77 → **45 px**, idle 44 → **40 px** (the minimum pointer target, still asserted). Padding came down,
  the action went 28 → 26 px with a quieter resting fill, and the placeholder — a centred 15 px *serif
  sentence*, the largest text in the lower half of an 18 px Field — is now 13 px, one role below the
  writing it invites. The writing itself moved to the single `--type-composer-size` (16 px), so the
  15 → 16 px step that used to happen on focus is gone. The keyboard note is out of flow above the
  surface and carries the shell's own `--interaction-mask`, so the surface measures an identical
  480 × 45 with and without it.
- **Five Settings controls had no CSS rule at all**, which is why the discovery switch was a raw
  browser checkbox and both key-error lines rendered as ordinary body copy. They now use the existing
  roles: the switch is drawn in the control system's own material over a real, keyboard-accessible
  checkbox.
- **An exiting overlay could close the overlay that replaced it.** `Surface.onOpenChange` compared a
  *live* store subscription, so a receding surface always matched the successor's name and its still-
  listening dismiss closed the new place on the first click inside it. It now refuses to act when the
  instance is no longer present. Reproduced against the pre-fix bundle by intercepting the route: Help
  → *Keyboard Shortcuts* → click inside the new dialog ends at `surface: "none"` before, and
  `"shortcuts"` after.
- **The keyboard note and the feedback line shared a baseline.** Both bottom-centred, 18 px apart in
  height and 3 px apart in position at 1440 × 960 — two lines of text on one line. The note moved
  above the writing; the band under the composer now belongs to feedback alone.
- **No transition animates a layout property any more.** `.speak-mark`'s growth is `scaleY`; the
  Field's held recede is `--motion-surface` (220 ms) instead of 400 ms; the 210 ms / 240 ms delays that
  made post-selection controls lag are gone.
- **Two accessibility failures and two plural bugs.** `.speak-note` measured **2.53:1** on the Field
  and `.settings-error` **4.42:1**; both now clear 4.5:1 (4.68 and 4.76) through the tokens the product
  already had for this. `1 enabled sources still need a key.` and `1 decisions` are singular now — and
  the e2e assertion that had accepted the first by substring is an exact match instead.

## Phase 2.8B-1 (v0.4) — thinking and discovery capability layer

- **A provider account is now enough.** A person with an OpenAI, Anthropic, Gemini or DeepSeek
  account, or any OpenAI-compatible endpoint, can configure Diffusion, verify it and think — with no
  gateway to run and no build-time configuration. `src/ai/providers.ts` is an inspected provider
  table, `src/ai/wire.ts` implements four genuinely different protocols by name, and
  `src/ai/registry.ts` turns a selection into a provider. Diffusion Gateway remains first-class and is
  now what it should always have been: one option, and the right one for a browser deployment or a
  team, rather than the only way to have AI at all.
- **Capability probing no longer runs per keystroke, and no longer proves the wrong thing.** Provider
  capabilities for a direct provider come from the table and make no request at all. Editing anything
  marks the configuration changed; only `Test connection` or `Refresh models` talks to a provider, and
  `Ready` is shown only after the selected provider, credential and model completed a real bounded
  request. The old `Connected`, derived from a metadata route answering, is gone.
- **The composed intent survives failure.** `submit()` used to clear the writer's sentence before the
  request was even dispatched, and the failure was a quiet line that erased itself. The words now stay
  until the request reaches a terminal state; a failure arrives as `tone: 'error'` with the one control
  that resolves it ("Authentication failed. Check the API key for Anthropic." → *Open AI settings*),
  and the notice no longer auto-dismisses while it carries an action. Retry re-sends exactly what is
  still there.
- **Failures have a vocabulary.** `src/ai/errors.ts` maps statuses and provider error types onto
  seventeen bounded failure kinds, each with an actionable sentence and a remedy. `Upstream responded
  401.` is gone; a rate limit is never reported as a network problem, and an unknown identity is
  reported as unknown rather than filled in with the requested one.
- **Search is its own section, and the discovery engine is not a search provider.** Settings gained a
  sixth section, *Search & Evidence*, because "who helps Diffusion think?" and "where may it look?" are
  two questions and burying one inside the other is what made a missing key indistinguishable from a
  missing provider. The engine is internal: users choose Exa/Tavily/Brave, never the engine itself.
- **The discovery engine ships inside the application.** Diffusion-owned source under
  `internal/discovery-engine/` is frozen by `npm run build:discovery` into one self-contained
  `diffusion-discovery` executable copied into `src-tauri/resources/discovery/` as a Tauri resource.
   End users need neither Python nor a separate install. Proven by running it with **no Python on
   `PATH`** and driving it with Diffusion's own argument builder against a closed source vocabulary:
   a real search, candidates mapped as `stage: 'candidate'` with no outcome and no passages.
- **A discovery credential never enters the webview.** The webview names the sources a person enabled
  and nothing more. `src-tauri/src/discovery_env.rs` maps each identifier to its credential slot and
  its child variable, reads the secret from the OS store through `credentials::read_secret`, and hands
  the child that environment; a disabled source is written `false` rather than omitted, because the
  engine treats `*_ENABLED` as defaulting to true. `credential_get` refuses a `search.` identity, so
  the webview cannot read a discovery key even by accident.
- **A direct AI provider request is performed natively, so the key never enters the webview.** The
  webview states the destination and the provider's own auth scheme (a header name and a prefix, from
  the same provider table the browser path uses); `src-tauri/src/native_ai.rs` and
  `src-tauri/src/ai_request.rs` resolve `ai.<provider>` from the OS store, pin the request to that
  provider's host, inject the credential, bound the body and the timeout, and return only a status and
  a body. `tests/unit/aiCredentialBoundary.test.ts` proves the desktop path never calls `reveal` and
  never touches `fetch`; the native module's own tests prove host pinning, credential-header
  allowlisting, body bounding, the timeout and cancellation, compiled against the same `reqwest` the
  shipped build resolves.
- **Degradation is measured, not claimed.** Zero sources, a source with no key and a single failing
  source each become an honest "external search is unavailable" while AI-only exploration continues;
  one failing source beside a working one yields `degraded: true` with the useful candidate preserved.
- **Desktop secrets use the OS credential store.** `src-tauri/src/credentials.rs` stores keys in the
  operating system's own mechanism under a fixed service and a closed identity vocabulary; the webview
  is told whether a key exists, never what it is, on Desktop without exception: no surface reads a
  stored secret, because a discovery key is resolved by the discovery launcher and an AI key by the
  native provider transport. A web build reports `directProviders: false` and keeps any credential
  session-only instead of silently persisting it in browser storage.

Full record, including what is CONTRACT-ONLY and what was never executed: [Phase 2.8B-1
note](docs/history/v0.4/V0_4_PHASE_2_8B_1.md). Honest limits worth repeating here: **nothing was verified against a
live provider or a live search service** (no keys in the build environment), **Windows native is NOT
verified**, and `src-tauri` could not be compiled at all in this environment because `glib`/
`webkit2gtk` are absent — so the native credential and discovery commands are written against APIs
that were compile-verified in isolation, not as part of the application.

## Phase 2.7 (v0.4) — interaction precision and visual refinement

- **A drag is a drag.** `field/spatial/gesture.ts` owns the contract: one pointer press, one owner,
decided once (`pan` / `selection` / `blank`), with the selection locked for the whole gesture and a
second press during a live gesture ignored instead of re-classified. The Scope Hub owns its own press
(`[data-scope-hub]`, its `pointer-events: none` contract untouched), so pressing the selection's own
bar drags the selection instead of starting a marquee over the Field. A marquee now has to *cover* a
Thought (`marqueeCovers`, a third of its box) rather than merely touch it, and `pointerup` no longer
re-writes the selection at all — so a plain click on one member of a multi-selection keeps the whole
scope, as the right-click path always did. Reproduced before the fix and pinned after it by nine
e2e contracts and the marquee's own unit cases.
- **Creation is answered where it happened.** `ui/emergence.ts` publishes one local illumination at
the created Thought's *own* screen position for every manual creation path (blank double-click,
blank-context New thought, the first Thought written in the composer, dropped text, continuing from a
Crystal, a reference brought back). It is one 72 px disc of `--ink-primary` at 5 %, painted under the
Thoughts, running the `spatial` role (340 ms), and it is removed by its own lifetime whether or not
an animation ran. Measured from real pixels at its peak: 6.5/255 of the paper in Paper Day and
3.5/255 in Graphite Night, with the rest of the Field unchanged. No atmosphere role was added for
creation: background atmosphere (global, slow, quiet) and event feedback (local, brief, spatially
honest) are now separated in code and in the stylesheet.
- **The scope wash is local too.** It used to be pinned to `50% 50%` of the viewport; it now falls on
the selection's own centre *and follows its extent* (`scopeWash`), so the wash that a creation leaves
behind is a halo around the Thought rather than a tint over half the plane.
- **Help is an application place.** `level="window"`, centred, `min(660px, 100vw - 56px)`, with the
window scrim, the shared close affordance, Escape, focus return, the panel spring and the same held
Field recession Settings uses (`.app[data-active-surface="help"] > .field { opacity: .88 }`).
- **The Composer is one row.** The action sits at the end of the writing's own row (`grid-area`), the
first-use keyboard note moved *outside* the material, the fill is one step above the Field with a
46 % edge and one small lift, and `.speak-light` is a 6 % highlight instead of a second opaque layer.
~46 px for one line instead of ~106; 250 / 480 / 108 and every pinned material contract unchanged.
- **The Field is clean graphite space.** The background was recomposed, not dimmed: no warm hue exists
in either theme, the illumination forms are larger than the viewport, and the radial vignette became a
straight edge falloff. Measured: Paper Day mean R−B 2.6, Graphite Night luminance spread 4.7/255 with
every channel in step, centre scanlines single-humped and off-centre (no hotspot, no ring).
- **The cost was measured, not assumed.** Development: Vite 148 ms to ready, ~0.3 % of one core idle,
`npm run build` 10.1 s of which `tsc` is 67 %, and the fan spike is a first-run Rust compile that never
recurs per frontend edit. Runtime (production bundle): idle costs 2.9 % of one core against a blank
page's 2.1 %, and **all of that difference is the ambient drift** — with the animation stopped, idle
is indistinguishable from `about:blank`, and instrumented rAF/timers record zero calls at rest.
Interactions hold ~60 fps with p95 16.7 ms and no React render on the pointer path.
- **The Motion Lab** gained real frames for the moments this pass changed (creation feedback, composer
idle/focused/multiline, Help, the atmosphere's real role derivation) and still executes production
choreography rather than replicas.


## Phase 2.6 (v0.4) — the motion reality check

- **Two defects made the product less animated than its own code claimed.** `@gsap/react`'s
  `contextSafe(fn)` is `context.add(null, fn)`, and against GSAP 3.15 a falsy name makes `add` return
  the wrapper *without running it* — so every one-shot sequence (the invitation's contraction, the
  composer yielding at commit, the first Thought's flight) was built by nothing, while the sequences
  routed through `useSignature` (Field switch, Settings, History) worked. And
  `useFirstThoughtEmergence` deferred its work by exactly one frame while the Thought it animates is
  rendered from React state and arrived several frames later: it animated an element that did not
  exist yet. Both are fixed, and both are pinned (`tests/unit/motion.test.ts`,
  `tests/e2e/motion.spec.ts`). Measured after the fix: the first Thought's text child travels
  **120 px** from the composer with depth `0.88 → 1` and `letter-spacing 0.8px → 0`, at rest after
  582 ms.
- **The review machine was itself in reduced-motion mode, and the Lab could not show it.** This
  Windows host reports animation effects off (`SPI_GETCLIENTAREAANIMATION = 0`, `MinAnimate = 0`,
  and the real Edge/WebView2 engine reads `prefers-reduced-motion: reduce → true`), so the product
  correctly ran with every sequence skipped while the Lab forced Motion to animate its replicas.
  There is now one dev-only preview seam (`setMotionPreview`, default `system`) plus a
  `data-motion-preview` CSS escape hatch, and the Lab always shows `OS reduced-motion` and
  `Preview mode: system | force normal | force reduced`. Production sets neither.
- **The Motion Lab no longer reviews replicas.** Every authored-sequence frame executes the
  production function — invitation, composer yield, both first-Thought paths, Field
  departure/arrival, Settings open/close, History reveal — against production-class fixture DOM, and
  shows the real function name, role, duration and curve. GSAP is still imported by exactly one
  module, and an offline contract asserts the Lab consumes the production choreography.
- **The Quiet Composer was redesigned.** Idle: a caret mark and one 20 px anchor tick; the
  full-width hairline is gone. Focused: the shell *materializes* into a thin surface (subtle fill,
  1 px low-contrast border, restrained radius, real depth, one illumination layer, 16 px typography,
  left-aligned) with one compact action `↵ 思考` / `↵ Think`. The permanent three-item hint row
  became a first-use note that names only the secondary keys' *meanings* — the test asserts its text
  carries no key name at all. Geometry (250 / 480 / 108), the state machine and draft preservation
  are unchanged, and the material is decided by `data-composing`, so it is visible in a still frame
  and under reduced motion.
- **First Thought has two real paths.** Written: a measured flight (clamped **36–120 px**, was
  24–90) that separates from the composer with a depth change and a typography resolution. Placed by
  a blank double-click: the Thought establishes itself with the same depth and typography over a
  short local settle (**24 px**, at rest in 253 ms) rather than a flight invented from a pointer.
  Neither path is dead, and neither copies the other.
- **Field switch is perceptible end to end.** Departure drifts the visible Thoughts' text children
  **26 px** outward, nearest first, lifts the identity and drains the atmosphere; arrival lifts the
  veil, restores the atmosphere, and emerges Thoughts in groups of three with a beat that shortens
  as the Field gets busier. Measured: 41.9 / 46.4 px authored travel, presence to 0 and back to 1,
  settled after 863 ms — inside the 500–900 ms budget, and interruptible throughout.
- **Settings motion has one owner per property.** The *held* recede is a CSS state
  (`.app[data-active-surface="settings"] > .field { opacity: .88 }`, opacity only, so the Field's
  pointer maths stay untouched); GSAP owns only the arrival transform dip (`scale .986` → home with
  `clearProps`) and the atmosphere's dip. Measured: `.986 → 1`, held at `.88`, back to `1` on close.
- **The atmosphere is richer and alive.** Static material strengthened (local warm/cool illumination,
  deeper edges, 6 % grain, a graphite rather than brown lift in Graphite Night); motion moved from a
  48 s cycle of 16/−20 px to **24 s of 56/−64 px**; ATTENTION is now a *local* shift — the
  illumination geometry itself moves — and it responds to a scope, because a selection is this
  product's temporary attention. Measured by the gated `visual.spec.ts` live run: Paper Day mean `R−B`
  3.7, worst point 5.0 (bound 10: paper, not beige); Graphite Night region luminance spread 11.5/255
  with per-channel deltas 11.1 / 11.5 / 11.5 (bound 16: no banding, no cast). The capture's own
  patch-*range* figures (25.2 / 29.9) are a different metric, named as such in
  `verification/v0.4.3/README.md`.
  Still one `transform`-only animation, no filter, no blur, no JS loop, no pointer work.
- **Evidence rather than adjectives.** `scripts/capture-motion.mjs` performs each production gesture
  against the production bundle in both motion modes, and records a short video, a frame sequence, a
  per-frame trace and a first/last-frame pixel delta; `verification/v0.4.3/` holds the artefacts and
  `motion-report.json`. Native Windows stills and the reduced-motion value were taken by driving the
  real Windows Edge/WebView2 engine over CDP.

## Phase 2.5 (v0.4) — depth without busyness

- **The Quiet Composer.** `ui/workspace/composer.ts` names the five states once (`idle`, `focused`,
  `scoped`, `writing`, `submitting`) and `Speak.tsx` renders them as `data-state`. Idle is a caret
  mark on the Field's own baseline at the unchanged 250 px; focused expands through Motion layout
  into a real writing surface with its own keyboard contract (`Enter` to think, `Shift+Enter` for a
  new line, `Esc` to leave — decoration only, never a target); scoped says *what* thinking will act
  on (“Thinking with 3 thoughts”), marked with the same dot the Scope Hub uses; submitting gives up
  presence while a request is in flight. Leaving preserves the draft.
- **Scope legibility without a sidebar.** One soft shared wash (`field[data-scope]::before`), one
  deliberately small contrast step on genuinely distant context, and one statement shared by the
  composer and the Scope Hub. `data-scope` is presentation only and lives on the Field; Core never
  learns that a selection is being shown.
- **Settings is five product questions:** General / Appearance / AI / Shortcuts / About. The AI
  section answers “how do I turn thinking on?” — the mode first, then only the disclosure that mode
  needs (off: an explanation; demo: an explanation; custom service: Connection, Model, Thinking
  depth). The accepted Phase 2 visual shell is untouched.
- **One status vocabulary** (`ui/primitives/Status.tsx`): `connected` ●, `checking` ◌,
  `unconfigured` ○, `limited` ◐, `unavailable` —, `error` ! with a retry. A gateway that did not
  answer is now reported as a failure rather than summarised as “declares no model list”.
- **Shortcut remapping.** The registry stays the source of truth; only overrides are persisted.
  `applyShortcutOverrides` is applied once in `Workspace`, so the keyboard router, menu labels and
  the Settings list cannot disagree — proven end to end. A command that was overridden carries the
  registry combination it replaced, so Settings can show what was replaced without a second table.
  Recording is capture-phase with `preventDefault`/`stopPropagation`, `Escape` cancels, `Backspace`
  clears, `compositionstart` cancels (an IME can never become a shortcut), and a combination already
  in use is refused and stated rather than silently stolen.
- **One editorial hierarchy, two size axes.** `theme.css` declares the type roles (identity,
  Thought, crystal, ghost, recall, ui title, section title, label, helper, metadata, shortcut hint,
  status) with family/size/weight/leading/tracking/presence together; both themes share it.
  **Interface size** (90/100/110/120 %) scales the chrome via `--ui-scale`; **Thought size**
  (16–24 px, default 18) scales what the person wrote via `--thought-size`/`--thought-scale`, and
  feeds the semantic-zoom rules so the chosen size survives counter-scaling. One control each — no
  separate edit/display size.
- **Atmosphere** (`ui/atmosphere.ts` + `.tsx` + `.css`): base colour + three layered radial
  illumination gradients + a 5 % fractal-noise grain + a vignette + one `transform`-only drift at
  one meaningful change per ~48 s. Paper Day is warm paper with a cool outer field, not beige;
  Graphite Night is dark graphite with warmer *local* illumination and deeper edges. No `filter`, no
  `backdrop-filter`, no blur, no JS loop, no pointer work. Roles `rest`/`attention`/`emergence`/`transition`
  are exported from transient presentation state only; REST is fully implemented, ATTENTION is a
  restrained CSS variant, and the other two are named for the Phase 3 renderer and deliberately not
  implemented. Reduced motion stops the drift and keeps the material.
- **Signature motion: five authored sequences**, each real choreography rather than opacity + a
  4–8 px translate. First Thought splits into a composer half that yields and a Thought half that
  travels a *measured* 24–90 px from the composer with a depth change and a typography resolution;
  Field switch gained a departure (outgoing Thoughts' text children spread ~8 px outward and fade,
  bounded by a 260 ms beat and reverted after, so a refused switch leaves the Field exactly as it
  was) and a grouped arrival (groups of 3); Settings gained a two-beat arrival and a Field pull-back
  that resolves home with cleared props; History is read as hierarchy (overview → structure →
  events). Reduced motion builds none of them.
- **One feedback language** (`ui/workspace/feedback.ts`, `Feedback.tsx`): named acknowledgements
  (`feedback(...)`) appear, settle and disappear after 3.2 s with no queue; anything the person must
  actually see goes through `report(...)`, which never auto-dismisses. `notice()` keeps its exact
  previous lifetime and is built on the second.
- **Nothing moved in the command model.** Field title / selection menu / `···` / palette ownership
  is unchanged; “How did this form?” and “Try a Fork…” were reviewed against product semantics and
  deliberately left where they are (History is a property of the Field, and a Fork is a file
  operation on it, not a semantic operation on selected Thoughts).
- The Motion Lab (`/dev/motion`, still dev-only and tree-shaken out of production) now carries 24
  scenarios including every redesigned moment with a Replay control, the forced reduced-motion
  toggle and the Paper Day / Graphite Night toggle.

## Phase 2 (v0.4)

- `@base-ui/react` owns ordinary menu, select and tablist behaviour; every pixel is Diffusion's.
  One menu family (element-anchored and pointer-anchored are the same implementation), one Select
  for the whole product, real Tabs for Settings. `ui/surfaces/Surface.tsx` stays Diffusion's own
  dialog-like place on purpose — its depth classes are product placement, and a second overlay
  authority is forbidden. Details and the reference study: [Phase 2 record](docs/history/v0.4/V0_4_PHASE_2.md),
  [reference audit](docs/REFERENCE_AUDIT.md).
- GSAP is an *authored-sequence* layer and is imported by exactly one module. Three sequences ship:
  Empty → First Thought, Field switch, and the History reveal. Motion stays the owner of ordinary
  component animation. One property never has two animation owners, and the invariant is asserted
  by a test that walks the source for GSAP imports.
- One motion vocabulary: duration roles (`instant`/`micro`/`control`/`surface`/`spatial`/`settle`/
  `signature`) and easing roles (`enter`/`exit`/`move`/`settle`/`attention`/`signature`), expressed
  once in `src/ui/motion/tokens.ts`, mirrored in `theme.css`, and carried into GSAP as `CustomEase`
  curves with identical control points. `tests/unit/motion.test.ts` pins the numbers and holds the
  mirrors together. Reduced motion collapses a role to zero rather than hiding a change.
- A development-only Motion Lab at `/dev/motion` compares every primitive and every signature moment
  with variants, a forced reduced-motion toggle and a theme toggle. It is guarded by
  `import.meta.env.DEV`, so it is absent from a production bundle (verified by grepping the emitted
  assets).
- Settings is a dedicated same-window workspace (General / Appearance / Thinking / Gateway /
  Shortcuts / About) that leaves the Field's camera, selection, drafts and current Field untouched.
  Model and Thinking depth are capability-aware: the gateway's own `GET /api/capabilities` decides
  what is offered, "Gateway default" is shown when nothing is declared, a custom model id only when
  the backend would accept one, and depth maps to the protocol's own output-budget parameter on the
  server — never named in the product UI.
- Shortcut visibility is derived from the same command registry as the menus and the keyboard
  router. No second table exists.
- UX repairs: the Field title renames in place (no boxed dialog, no oversized input); the close
  control has one glyph, one placement, one accessible name and a 38px target on every global
  surface; "How did this form?" leads with a human sentence, a timestamp and a day count, and never
  with an internal event id; the empty Field's invitation breathes, contracts as writing begins,
  releases on commit, and the first Thought rises into the space it left.

## Implemented (v0.3 baseline, unchanged by Phase 2)

- One command model (`src/ui/commands`) defines each semantic action once — id, localized label, aliases, platform-neutral shortcuts, contextual availability and one `run` — and is projected into the application menu, the Field menu, right-click menus, the palette, the keyboard router and shortcut help. No presentation owns business logic.
- The top-left Field title is now the stable home for Field ownership: rename, new, open stored Fields, duplicate, export archive, export as Markdown, import/restore, history, fork. The top-right `···` owns application/view actions only.
- Right-click is a mature second path: an unselected Thought is selected without entering edit, a member of a multi-selection keeps the whole scope, the blank Field offers only New thought and Find, and menus stay viewport-safe with full keyboard navigation.
- Undo/Redo are user-facing commands with shortcuts, contextual availability and honest empty-stack behavior. History stays canonical (`ProjectController`): one user dispatch is one entry, `batch()` makes a multi-Thought action one entry, Claiming a Ghost is now fully reversible, and camera/selection/focus are never history.
- `Ctrl/Cmd+K` opens a searchable palette ordered by the current scope (selection first, deterministic, no hidden recommendation), with localized and English/alias search. `Ctrl/Cmd+F` opens a non-modal Find in Field: matching Thoughts stay at full ink, other context recedes, offscreen matches expose edge cues, Enter/Shift+Enter pan to the next match while preserving zoom, and the Field is never mutated.
- `Ctrl/Cmd+,` opens Settings, and a shortcut reference derived from the registry is reachable from the application menu, the palette and Help.
- Export now has two honest formats: the lossless versioned Diffusion archive and a human-readable Markdown document that states what it does not preserve. Import stays a validating, non-destructive new-Field operation.
- The visible Field is unchanged: the resting application still exposes exactly three interactive elements (Field title, `···`, Speak).
- Restoring an unchanged camera no longer dirties the Field, so opening and closing a surface is not a write.
- Package and Tauri metadata are `0.3.0`.

## v0.3.1 refinement pass (still v0.3.0 metadata)

- One motion system (`src/ui/motion.ts`): role-based durations, a panel spring, and a recede transition. A place that owns input (Settings, palette, menus, History, Shortcuts, Help, Import, Restore, Open Field) arrives with its own transition and recedes on close; a projection anchored to a Thought or a pointer still closes at once. Reduced motion resolves every role to zero duration rather than hiding the change.
- An exiting surface or menu is a visual echo, not an owner: `role`, `aria-hidden`, `inert`, the test id and `data-global-owner` leave immediately, `pointerEvents: none` is applied instantly, and focus return treats focus still inside the dismissed owner as “not a new target”.
- Settings is a dedicated centred place with a section nav (General / Appearance / Typography / Thinking service / Shortcuts / About), a designed service panel with a live status line, an About section, and a shortcut reference rendered from the same registry as the Shortcuts surface (`src/ui/surfaces/ShortcutReference.tsx`).
- One close affordance for every surface (`SurfaceClose`): same glyph, placement, hit area and states, with a decorative `Esc` hint and the unchanged accessible name “Return to Field”.
- The Field title rests as identity (eyebrow, title, hover/focus underline while its own menu is open). Rename opens a composed surface with select-all, a focus ring and a visible “Enter to save / Escape to cancel” hint.
- The empty state is one composed invitation living with the Speak input it points at, marked `data-decoration`, `aria-hidden`, `pointer-events: none`, and `user-select: none`. A shared pointer-target guard in `Field.tsx` means passive copy is never an interaction target for blank double-click, pointer start or the blank context menu.
- “How did this form?” is a decision timeline: grouped by local day, each entry a time, marker, category chip and human summary. The internal event kind appears only as a `data-kind` attribute, and there is a real low-activity state.
- Creating or opening a Field is announced: an arrival reset fades the Field in, the title settles, and a transient arrival caption appears in the identity block.
- Depth without clutter: `--shadow-panel` and `kbd` chips, a hairline surface header, and one modal scrim in two weights (window stronger than anchored/split, no blur).


## Read next

- [v0.4 Phase 2.7 record](docs/history/v0.4/V0_4_PHASE_2_7.md)
- [v0.4 Phase 2.5 record](docs/history/v0.4/V0_4_PHASE_2_5.md)
- [v0.4 Phase 2 record](docs/history/v0.4/V0_4_PHASE_2.md)
- [v0.3.2 structural cleanup record](docs/history/v0.3/V0_3_2_STRUCTURAL_CLEANUP.md)
- [v0.3.1 refinement record](docs/history/v0.3/V0_3_1_REFINEMENT.md)
- [v0.3 interaction maturity record](docs/history/v0.3/V0_3_INTERACTION_MATURITY.md)
- [reference audit](docs/REFERENCE_AUDIT.md)
- [architecture](docs/ARCHITECTURE.md)
