# Diffusion Explorer v0.2.3 — Identity Audit

## Inspection boundary before edits

The v0.2.2 source, authority documents, existing reference audit, motion contract, and the v0.2.2 CSS/primitive screenshots were inspected before implementation.

A real mounted React-app pre-edit pass was attempted first. `npm ci` could not complete in this environment and left an incomplete install; `npm run typecheck` then failed because the project `node` and `vite/client` type definitions were unavailable. Therefore the pre-edit visual diagnosis below is grounded in source + the existing v0.2.2 authored fixtures, **not** claimed as real React-app verification. Real-app verification remains a delivery gate if dependencies become available later in the run.

## FIELD

### KEEP
- User-owned canonical coordinates, direct drag/camera/lasso mechanics, semantic zoom mechanics, and text-only Thoughts.
- Existing Focus semantic derivation: selected/direct/nearby/peripheral/receded states already come from legitimate current state rather than AI importance ranking.
- Lifecycle/type distinctions for Crystal, Ghost and Recall.

### REMOVE
- The selected/hover text-shadow aura if runtime/fixture inspection reads as glow rather than clearer ink.
- Any temptation to add background decoration, grid, forced grouping or automatic composition.

### REFINE
- Make attention hierarchy rely on legibility/contrast more than glow.
- Increase the distinction between selected/direct/nearby/receded through restrained opacity and tone only; no movement or text reflow.
- Preserve life/type-derived variation at rest instead of inventing permanent importance.

### NEW IDENTITY RULE
- **Ink + attention field:** state changes should primarily change how legible a Thought feels. Focus is stronger than selection; unrelated content recedes but remains readable and spatially present.

## SPEAK

### KEEP
- Idle Speak: quiet centered expression prompt, scope semantics, draft ownership, keyboard behavior, submit/dismiss behavior, and workspace-owned intent.

### REMOVE
- The composing state's filled rounded rectangle, broad shadow and chat-composer silhouette.

### REFINE
- Keep composing width in the 480–560px range but make the active writing area line-led rather than box-led.
- Let content height grow naturally without turning into a bottom dock.
- Keep scope indication visually secondary.

### NEW IDENTITY RULE
- **The Field makes temporary room for writing.** Composing may expose a restrained incomplete edge/line and clearer text, but not a full chat shell.

## MENU

### KEEP
- Information architecture, Floating UI anchoring, keyboard navigation/typeahead, rapid interruption and More -> Settings origin handoff.

### REMOVE
- Conventional vertical active/focus border as the menu's selection ornament.
- Unnecessary visible outer border if surface/background separation is already sufficient.

### REFINE
- Use text, spacing and a quiet hover/focus wash; keep the shell compact and visibly attached to `···` through origin-aware motion.
- Reduce rounding and generic component-library framing.

### NEW IDENTITY RULE
- **Context, not command palette:** the menu should feel like nearby options briefly becoming legible around an action point.

## SETTINGS

### KEEP
- Small fixed preference set, anchored temporary-surface behavior, bilingual labels, native/select accessibility and provider-specific fields.

### REMOVE
- Repeated divider/table rhythm across every preference.
- Strong label-left/value-right table emphasis as the dominant visual structure.

### REFINE
- Group related preferences through spacing rather than lines.
- Let typography and whitespace carry hierarchy; make controls visually subordinate to the labels/content.
- Keep provider configuration practical and compact when revealed.

### NEW IDENTITY RULE
- **Preferences read as a small editorial note, not a settings table.** The surface remains a temporary extension of the Field.

## THOUGHT / FOCUS

### KEEP
- No card, no selected background, no geometry change, no scale-based reflow.

### REMOVE
- Any glow-like aura that makes selection feel like an effect layer.

### REFINE
- Selection = clearer ink. Focus = clearer ink + relation wake + contextual action timing + gentle recession around it.

### NEW IDENTITY RULE
- Selection changes presence, not object shape.

## Structure / maintainability review before edits

- `src/field/Field.tsx`: 516 LOC, >500. It owns the performance-sensitive spatial interaction engine, camera lifecycle, geometry/culling, pointer gestures, relation hit geometry and orchestration. This pass will **not** add identity presentation logic to it and will not split its hot path for cosmetic LOC reasons.
- `src/ui/Workspace.tsx`: 331 LOC. Large but below the explicit >350 review gate. It owns workspace/runtime orchestration and should not receive new visual implementation logic.
- `src/ui/field.css`: 205 LOC. Broad but still small enough to remain a single stylesheet for the current pass. New rules should reuse existing semantic selectors rather than add presentation state to Core.
- Existing focused modules already provide useful extension points: `Speak.tsx`, `CommandMenu.tsx`, `SettingsSurface.tsx`, `ThoughtView.tsx`, `Surface.tsx`, and shared `motion.ts`.

### Structural decision

Do not create a new architecture layer merely for this identity pass. Prefer targeted edits inside the already-focused modules and CSS selectors. Introduce a new production file only if a new responsibility cannot remain clear inside those existing ownership boundaries.

## Implementation priority

1. Speak identity.
2. Menu identity.
3. Settings identity.
4. Thought / Focus legibility hierarchy.
5. Ghost / Recall tuning only if the above remains quiet.
6. Verification across dark/light, zh/en, serif/sans and reduced motion.

---

# Final identity audit

## FIELD — BEFORE / AFTER / WHY

**BEFORE** — The Field was already quiet, but selected and nearby Thoughts relied partly on a text-shadow aura and the local hierarchy still read as a set of similarly foregrounded sentences.

**AFTER** — Selection is now only clearer ink: no background, box shadow, text shadow, geometry change or reflow. Existing semantic emphasis states carry a stronger but still bounded legibility ladder (`selected` / `direct` / `nearby` / `receded` / `peripheral`). Ghost and Recall remain quieter lifecycle variants with restrained legibility arrival. No coordinates, ranking, camera behavior, relation semantics, or pointer mechanics changed.

**WHY** — This makes attention perceptible without inventing decoration or permanent importance. The Field gains depth from legitimate state rather than from visual objects added behind the text.

## SPEAK — BEFORE / AFTER / WHY

**BEFORE** — Idle Speak was appropriately quiet, but composing introduced a filled rounded shell with a broad shadow. In the authored v0.2.2 fixture this read like a familiar AI/chat composer.

**AFTER** — Speak is capped at 520px in the current CSS, remains transparent in both idle and composing states, and composing is indicated by a short one-pixel lower line plus a two-pixel settle. The textarea still grows within its existing bounded behavior and the action remains secondary.

**WHY** — The Field appears to make temporary room for writing instead of opening a new chat surface. Draft, submit, dismissal and scope semantics are unchanged.

## MENU — BEFORE / AFTER / WHY

**BEFORE** — The menu had a conventional active/focus ornament and a more visibly componentized shell.

**AFTER** — The vertical active indicator is gone. The outer border is removed, rounding is reduced, and hierarchy comes from text, spacing, a restrained hover/focus wash and the inherited origin-aware Motion/Floating UI behavior. The small semantic separator before Settings remains as a quiet grouping cue.

**WHY** — The menu remains immediately scannable and keyboard-correct while feeling more like nearby contextual options than a generic command component.

## SETTINGS — BEFORE / AFTER / WHY

**BEFORE** — Even after v0.2.2, Settings still read as a familiar preference table: label on the left, value on the right, repeated alignment and row rhythm.

**AFTER** — Related preferences are grouped structurally in `SettingsSurface.tsx`. Each preference now reads vertically as a quiet label followed by its current value; repeated dividers and right-aligned table rhythm are absent. Thinking service is its own semantic group with explanatory copy and the existing provider-only fields remain conditional.

**WHY** — Scanability is preserved, but typography and whitespace now carry more of the hierarchy. Settings feels like a compact editorial note that happens to be interactive rather than a miniature settings dashboard.

## THOUGHT / FOCUS — BEFORE / AFTER / WHY

**BEFORE** — v0.2.2 had correctly removed the gradient/card aura but still used a neutral text-shadow aura for selection.

**AFTER** — The aura is removed entirely. Selection changes presence only; Focus is the stronger combination of clearer selected/direct content, relation wake/context actions and gentle recession of unrelated content. Reduced-motion mode still communicates the same hierarchy without depending on movement.

**WHY** — A Thought remains text at every attention level. The difference between selection and Focus is now semantic/perceptual rather than an effect being switched on.

## WHAT WAS TRIED AND REJECTED

- **Selected Thought shadow/aura** — rejected because even a neutral text shadow read as an effect layer rather than “ink becoming present.” Final state uses legibility only.
- **Keeping the Settings left/right row layout after removing dividers** — inspected in Chromium and rejected because it still looked like a polished generic preference table. Final state stacks label/value within semantic groups.
- **A filled Speak composing shell** — inherited from v0.2.2 and explicitly rejected because the silhouette remained too close to an AI chat composer. Final state stays transparent and uses an incomplete lower edge.
- **Additional Field material/texture** — deliberately not pursued. The attention hierarchy was sufficient to add perceptual depth; texture would have been decoration rather than product identity.
- **New identity architecture / Field split** — rejected. The current focused presentation modules already provide the needed ownership boundaries, while splitting the 516-line hot-path Field solely for LOC would increase indirection and risk.

## Final structure / extensibility review

### Largest handwritten production files

1. `src/field/Field.tsx` — **516 LOC**.
2. `src/ui/Workspace.tsx` — **331 LOC**.
3. `src/core/validation.ts` — **278 LOC**.
4. `src/core/reducer.ts` — **249 LOC**.
5. `src/ui/field.css` — **208 LOC**.
6. `src/core/model.ts` — **174 LOC**.
7. `server/app.ts` — **159 LOC**.
8. `src/core/controller.ts` — **156 LOC**.

`src/locales/zh.ts` is 339 LOC but is static localization data and remains an explicit source-size exception.

### New production files

**None.** This pass did not create a new design-system layer, motion framework, visual state store, or plugin architecture.

New non-production/support files are the v0.2.3 authority/audit/verification material plus targeted offline/Chromium identity tests.

### Responsibilities extracted

No production responsibility was extracted purely for file-size compliance. Instead, new identity behavior stayed inside the already-focused presentation ownership boundaries:

- `SettingsSurface.tsx` owns Settings grouping/markup;
- `field.css` owns presentation of existing semantic visual states;
- existing `Speak.tsx`, `CommandMenu.tsx`, `ThoughtView.tsx`, `Surface.tsx`, and `motion.ts` remain the nearby extension points;
- `Field.tsx` remains the spatial interaction engine and received **no v0.2.3 changes**;
- `Workspace.tsx` remains orchestration and received **no v0.2.3 changes**.

### Touched files over 350 LOC

**None.** No touched handwritten production TS/TSX/CSS/Rust file exceeds 350 LOC.

### Existing file over 500 LOC — explicit justification

`src/field/Field.tsx` remains at **516 LOC** and was not touched in this pass. It is the inherited performance-sensitive spatial interaction engine: camera lifecycle, geometry/culling, pointer gestures, relation-hit geometry and Field orchestration are tightly coupled along the hot path. A cosmetic split would scatter gesture/camera ownership and make debugging harder. A future split is reasonable only when a concrete independent responsibility emerges and dependency-backed application tests can protect the mechanics boundary.

### Architectural extension points introduced

**No new architectural extension point was introduced.** The pass intentionally reused the focused extension points that already existed. `data-setting` attributes and Settings clusters are local presentation structure, not a new global/plugin API.

### Dependency direction / state ownership

No new canonical/global state was added. Presentation consumes existing semantic state; animation/presentation state does not mutate Core semantics and is not persisted. The dependency direction remains Core/semantic state -> presentation derivation -> UI/motion.
