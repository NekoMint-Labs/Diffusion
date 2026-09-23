# Diffusion Explorer v0.2.4 — Signature Interaction Audit

## Inspection / runtime boundary

The inherited v0.2 authority, technical/performance contracts, `REFERENCE_AUDIT.md`, `V0_2_2_MOTION_CONTRACT.md`, `V0_2_3_IDENTITY_AUDIT.md`, `STATUS.md`, current frontend tests and current v0.2.3 source were read before edits.

The required real mounted React-app baseline was attempted first. An online `npm ci --ignore-scripts` made no meaningful download progress; the partial install was discarded. `npm ci --offline --ignore-scripts` then failed with `ENOTCACHED` for locked `zustand-5.0.15.tgz`. Therefore **REAL REACT APP verification is UNVERIFIED** in this environment. The visual checks below use actual product CSS in Chromium with authored fixture DOM and are explicitly labelled primitive/CSS verification rather than application verification.

## SPEAK

### BEFORE

v0.2.3 had already removed the filled rounded composer, but its quiet state and composing state did not yet behave strongly enough as one signature object. Runtime-derived requirements also exposed two concrete risks: the composing region needed a reliable rendered width cap and textarea overflow needed to remain usable without browser-default scrollbar chrome.

### AFTER

- Idle Speak is a compact ~250px object.
- Composing Speak expands from the same location to `min(520px, calc(100vw - 48px))`.
- The shell remains transparent and shadowless; one incomplete lower line is the only added edge cue.
- Textarea autosizing is owned by `Speak.tsx`, caps at 108px (roughly 3–4 comfortable lines), then switches to local vertical scrolling.
- Scroll wheel/trackpad/keyboard scrolling remains available while the Speak-only scrollbar track/buttons are visually suppressed.
- Narrow viewports retain the same 48px total horizontal breathing room rather than overflowing.
- No canonical/global state is added for the animation; composing/overflow are presentation-local.

### WHY

Compact -> compose -> collapse now reads as one Field-owned writing presence rather than a dock appearing. The Field remains visually dominant, and the component can grow with actual content without becoming an indefinite editor.

## FIELD / FOCUS

### BEFORE

Focus had no card/glow and already preserved coordinates, but resting and focused Thoughts could still feel somewhat uniformly foregrounded.

### AFTER

The existing authoritative visual states now have a clearer legibility ladder:

- selected: `1.00`
- direct: `.96`
- nearby: `.78`
- receded: `.50` + secondary ink
- peripheral: `.38` + secondary ink

Normal rest remains readable at `.82`. Hover can temporarily recover clarity without creating semantic state. No filter, scale, font-size change, padding, wrapping or geometry change is used.

### WHY

Focus becomes an attention field rather than an effect. Directly relevant text remains authoritative while unrelated context recedes but stays spatially visible. The hierarchy comes only from existing semantic state; there is no confidence/recommendation/engagement ranking.

## GHOST / RECALL

### BEFORE

v0.2.3 already kept these as quiet text phenomena. The remaining opportunity was to make emergence read as staged legibility rather than a generic fade.

### AFTER

- Ghost text: `.18` -> `.68` -> `1` opacity with at most `2.5px` vertical settle.
- Recall text: `.30` -> `.76` -> `1` opacity with at most `2px` settle.
- Animation remains on the single Thought text node, not words/letters.
- No blur, glow, special bright color, IntersectionObserver reveal or semantic-state change.
- Reduced motion disables the presence animation entirely.

### WHY

Ghost feels like a possibility becoming readable and Recall like an earlier Thought returning to presence, without becoming an animation demo or adding scale-sensitive work.

## MORE -> SETTINGS

### BEFORE

The v0.2.3 menu itself was sufficiently clean and already handed Settings the More button position as an origin. That preserved broad spatial relationship but the origin was one step too coarse: the actual action occurred on the Settings command row inside the menu.

### AFTER

`CommandMenu` now derives a lightweight `Point` from the activated command row's existing click event rectangle and passes it to the command callback. The Settings command uses that exact point and falls back to the More button center only if an origin is unavailable.

The inherited transient state contract is unchanged: closing More happens immediately before Settings takes ownership; there is never a stale menu beneath Settings, and no transition completion gates availability.

### WHY

The next surface now grows from where the user actually acted without introducing shared-layout coupling, typography morphing, or a second overlay lifecycle.

## SETTINGS

### BEFORE

The v0.2.3 stacked setting structure was already successful; remaining visual weight came mainly from the anchored shell shadow/border and the Thinking service value competing slightly too strongly with core preferences.

### AFTER

- Only Settings receives the `settings-surface` shell hook.
- Settings drops the generic shell shadow and uses the quieter secondary surface edge.
- Close/return affordance is tertiary until interaction.
- Thinking service current value uses secondary ink and rises to primary on interaction rather than using the accent as protagonist.
- Existing stacked structure, conditional provider fields, no-divider rule and accessibility semantics remain intact.

### WHY

Settings stays practical but secondary to the Field. This is deliberately a micro-refinement, not another Settings redesign.

## WHAT WAS TRIED / CONSIDERED AND REJECTED

- **Fixed 520px Speak width** — rejected; the final rule is responsive and keeps 24px side room on narrow viewports.
- **Visible native textarea scrollbar/arrow chrome** — rejected for Speak only; scrolling functionality is retained while the quiet surface hides platform chrome.
- **Filled/rounded composing shell** — rejected again because it immediately returns to chat/SaaS semantics.
- **TrueFocus moving frame / blur / glow** — rejected. It makes focus visible, but it makes Diffusion look like an animation component rather than a spatial thinking field.
- **BlurText per-word blur and large y-motion** — rejected as too animated and too expensive at Field scale.
- **New Focus importance algorithm** — rejected. Existing selected/direct/nearby/receded/peripheral state is sufficient and authoritative.
- **Full shared-layout More -> Settings morph** — rejected as unnecessary coupling. Exact command-row origin provides continuity while preserving transient correctness.
- **Another More menu redesign** — rejected; the v0.2.3 menu is already sufficiently clean.
- **Another Settings structural redesign** — rejected; only shell/service visual weight needed adjustment.
- **Splitting `Field.tsx` for LOC** — rejected. This pass adds no presentation machinery to it, so a cosmetic split would only fragment the hot path.
- **New visual/global state store or animation dependency** — rejected; existing semantic state + local presentation state + CSS/Motion/Floating UI are sufficient.

## Code structure / extensibility review

### Largest handwritten production files after this pass

1. `src/field/Field.tsx` — **516 LOC** — untouched by v0.2.4.
2. `src/ui/Workspace.tsx` — **331 LOC** — touched only to consume an optional Settings command origin; remains orchestration.
3. `src/core/validation.ts` — **278 LOC** — untouched.
4. `src/core/reducer.ts` — **249 LOC** — untouched.
5. `src/ui/field.css` — **217 LOC** — focused presentation stylesheet.
6. `src/core/model.ts` — **174 LOC** — untouched.
7. `server/app.ts` — **159 LOC** — untouched.
8. `src/core/controller.ts` — **156 LOC** — untouched.

`src/locales/zh.ts` remains static localization data and is not application-logic growth.

### Touched production files over 350 LOC

**None.** `Workspace.tsx` is 331 LOC. `Field.tsx` is >500 LOC but was not touched.

### Existing >500 LOC file — explicit justification

`src/field/Field.tsx` remains **516 LOC**. It is the inherited performance-sensitive camera / pointer / gesture / geometry / culling orchestration path. v0.2.4 intentionally adds no Speak, Focus-presentation algorithm, Ghost/Recall animation machinery, Settings motion or shared motion constants to it. A future split should follow a real independently testable responsibility boundary rather than a number.

### Newly created production modules

**None.** The pass uses existing focused ownership:

- `Speak.tsx` — local composing height/overflow presentation lifecycle;
- `CommandMenu.tsx` — command activation and its physical origin;
- `Workspace.tsx` — semantic command orchestration / surface ownership handoff;
- `SettingsSurface.tsx` — Settings markup/semantic grouping;
- `Surface.tsx` — shared narrow surface shell primitive;
- `field.css` — visual derivation from existing semantic/presentation data attributes.

### Responsibilities extracted / extension points

No responsibility was extracted solely to satisfy LOC guidance. One **narrow local extension point** was added: `Surface` accepts an optional `className` so Settings can micro-tune its shell without contaminating every surface or duplicating the surface primitive. This is not a plugin/design-system architecture.

`Command.run(origin?: Point)` is a nearby interaction extension: a command may consume the real activation origin when a successor surface benefits from spatial continuity. Commands that do not need it ignore it. It does not change Core or persist presentation state.

### Dependency direction / state ownership

No new dependency was added. Core/semantic modules do not import motion/UI code. No presentation-only state is persisted. Attention styling consumes authoritative Field state; it never mutates project semantics.

## Visual verification checkpoints

**PRIMITIVE / CSS FIXTURE VERIFICATION (Chromium, authored DOM, actual product CSS):**

- Speak idle / one-line composing / overflow / narrow Paper Day viewport.
- Focus selected/direct/nearby/receded/peripheral hierarchy with exact geometry comparison.
- Ghost and Recall emergence with no filters and no final geometry drift.
- Settings shell/service micro-weight.
- Reduced-motion collapse.
- Existing Paper Day / Graphite Night / zh/en / Serif/Sans fixture matrix and camera/semantic-zoom primitives.

These fixtures are intentionally labelled as not being the React application.

**REAL REACT APP VERIFICATION:** **UNVERIFIED** because the locked dependency graph cannot be installed in this environment (`zustand-5.0.15.tgz` is missing from the offline npm cache and online install did not progress).
