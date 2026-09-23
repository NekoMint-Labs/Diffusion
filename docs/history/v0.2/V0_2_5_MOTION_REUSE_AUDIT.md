# Diffusion Explorer v0.2.5 — Motion Reuse Audit

Status: **implementation complete; offline/source/primitive verification complete; real mounted React verification remains blocked by unavailable npm dependencies.**

## Scope

v0.2.5 changes the implementation strategy for a narrow set of motion concerns. It does **not** redesign the Field, Settings layout, More menu layout, backend, Provider/Evidence/Dexie, Ghost Claim/Recall semantics, Thread/Deep Dive, or camera/pointer/lasso mechanics.

## Diagnosis — why v0.2.4 motion was barely perceptible

### Real React runtime gate

The real application could not be mounted in this environment before or after the pass because the locked dependency graph is not locally available and registry installation does not complete here.

- baseline/current `npm run check:offline`: PASS;
- online `npm ci --ignore-scripts`: bounded attempt produced no meaningful completed install and was discarded;
- second bounded install using `registry.npmmirror.com`: same incomplete ~828 KB partial `node_modules`, discarded;
- `npm ci --offline --ignore-scripts`: FAIL `ENOTCACHED` for `zustand-5.0.15.tgz` because the npm cache is empty.

Therefore this document separates **source diagnosis** from **real-app runtime diagnosis**. No CSS fixture is called a React-app verification.

### Reduced motion

v0.2.4 did not force reduced motion:

- no app `MotionConfig` existed;
- no local Reduced Motion setting existed;
- `CommandMenu` and `Surface` already used `useReducedMotion()`;
- `theme.css` already respected `@media (prefers-reduced-motion: reduce)` for CSS animation/transition;
- the available primitive Chromium process reports `matchMedia('(prefers-reduced-motion: reduce)').matches === false`.

That last observation applies only to the fixture browser, not the unavailable real app/browser session. v0.2.5 now also wraps the app in `MotionConfig reducedMotion="user"`, so Motion layout/shared-layout follows the user's system preference rather than relying on per-component discipline alone.

### Implementation cause

| Target | v0.2.4 mechanism | Why it was weak | v0.2.5 repair |
| --- | --- | --- | --- |
| Speak | `180ms` CSS width transition + tiny shell shift | Major state geometry was a short one-off CSS transition; height and action changes were separately approximated | One persistent `motion.form layout` shell; nested layout children; Motion owns width/height continuity; secondary action uses `AnimatePresence` |
| More -> Settings | menu unmount + click-origin point + independent Settings enter | Correct spatial origin, but no shared visual identity | `LayoutGroup` + shared `layoutId` on a **non-interactive visual shell**; content/focus remain independently owned |
| Ghost / Recall | `220ms` CSS keyframes with ~2px settle | So small/short that it often read as insertion | Small local Motion presence primitive for transient Ghost/Recall only |
| Focus | cheap opacity/color hierarchy | Already appropriate | Kept; no TrueFocus/glow/blur/card machinery added |

## Reuse table

| Source | Component / technique | Classification | Local file | Local modification | License |
| --- | --- | --- | --- | --- | --- |
| Motion for React | `motion`, `layout`, `layoutId`, `LayoutGroup`, `AnimatePresence`, `MotionConfig`, `useReducedMotion` | **DIRECTLY REUSED** | `src/ui/App.tsx`, `Workspace.tsx`, `workspace/Speak.tsx`, `focus/CommandMenu.tsx`, `surfaces/Surface.tsx`, `motion.ts` | Uses existing dependency; adds shared layout roles/ID and user-preference reduced-motion wiring | Existing package license (MIT) |
| React Bits `BlurText.tsx` @ `3a1c7f2f9f94ed833934ab5c2635760b9e644583` | text-presence interaction reference | **REFERENCE ONLY** | none | No source or component API copied; independently authored local Motion primitive preserves Ghost/Recall container-level presence | MIT + Commons Clause License Condition v1.0; reference inspection only |
| React Bits `TrueFocus.tsx` same revision | legibility as focus channel | **REFERENCE ONLY** | none | No source copied; existing cheap semantic opacity hierarchy retained | same project license |
| Detail.design Morphing Button to Input / Interruptible Animation / Cursor While Morphing | persistent object + immediate interruption/ownership | **ADAPTED technique** | Speak/shared surface implementation | Applied through Motion and existing focus/transient ownership; no Detail source copied | reference only |
| Detail.design Prevent Layout Shift from Font Weight Change | heavier-weight width reservation | **REJECTED** | none | No new weight-changing state exists, so this would add dead complexity | reference only |
| Detail.design Animated State-Based Icons / Lucide Animated suggestion | state icon motion | **REJECTED** | none | Would add noise and a second icon language to a text-first product | reference only |
| 60fps Monogram / Family interactions | visible object continuity and event ordering | **REFERENCE ONLY** | none | Used only as visual acceptance references; SwiftUI/mobile implementation not ported | reference only |

## Implementation decisions

### Speak

- A static full-width `.speak-positioner` owns centering with flex layout, so it has no changing centering transform for Motion layout to fight.
- The persistent form is `motion.form layout`; composing width remains the existing quiet 250px -> 520px product shape.
- Nested layout elements let Motion correct layout scaling rather than stretching text as one flat transformed layer.
- The textarea is the same focusable node throughout the transition. Focus state changes immediately; layout motion is presentation only.
- Textarea auto-height remains local and capped at 108px. Overflow remains keyboard/wheel/trackpad/touch scrollable while native scrollbar chrome stays hidden only for Speak.
- The send/stop affordance uses `AnimatePresence mode="popLayout"`; it does not control focus or submission lifecycle.

### More -> Settings

- The global More menu and Settings live in one `LayoutGroup` namespace.
- A constant shared layout ID identifies only the **visual shell**.
- Floating UI continues to own real positioning, focus, dismissal and semantic surface ownership.
- The shell is `pointer-events:none`; menu commands and Settings controls remain normal interactive descendants outside that visual layer.
- The menu still closes logically before the Settings command opens Settings. The shared visual shell may continue its layout animation, but no stale interactive menu is retained.
- `AnimatePresence` was deliberately **not** used to keep the old menu content alive. Retaining an exiting interactive menu would complicate the already-hardened exclusive-transient contract. Motion `layoutId` handles the shell relationship without delaying ownership.

### Ghost / Recall

- Removed CSS `ink-arrive` / `recall-arrive` keyframes.
- `src/ui/motion/TransientTextPresence.tsx` is a 24-line independently authored local Motion primitive.
- The local primitive animates one `<motion.p>` container. No split text, per-word spans, observer, filter blur or Field-wide wrapper exists.
- Reduced motion resolves immediately to the final state.

### Focus

No new motion engine or component was added. Focus remains existing selected/direct/nearby/receded/peripheral semantic state -> cheap CSS opacity/color interpolation. `Field.tsx` is byte-for-byte inherited in responsibility and remains 516 LOC.

## Hand-written custom motion removed

- Speak CSS `transition: width ...`;
- Speak shell `translateY(-2px)` geometry transition;
- Speak textarea CSS `height` transition;
- Ghost `ink-arrive` CSS keyframe;
- Recall `recall-arrive` CSS keyframe;
- redundant Settings `settings-content-arrive` CSS keyframe, because shared-surface content now uses the existing Motion content transition.

Small CSS feedback that is still semantically local (hover color, grounding-line opacity, relation/context micro feedback) remains CSS rather than being pointlessly migrated to Motion.

## Rejected during implementation

- React Bits `BlurText` unchanged: too much splitting/blur/displacement/observer work.
- React Bits `TrueFocus`: wrong semantics and rendering cost.
- GSAP / React Bits package dependency: existing Motion already solves the required lifecycle.
- Animated icon adoption: no current state benefits enough to justify extra visual language.
- Keeping an exiting interactive More menu under Settings via `AnimatePresence`.
- Motion layout directly on an element that also owns CSS centering. The final design uses a stable full-width flex `.speak-positioner`, leaving Motion geometry to the inner Speak object only.
- Running the repository-wide mutating formatter as part of delivery: it reformatted 36 unrelated `src/**` files and expanded `Field.tsx` from 516 to 579 physical lines. Those unrelated changes were fully reverted; only narrow intended files remain modified.

## Code structure / extensibility

No production dependency was added.

New production module:

- `src/ui/motion/TransientTextPresence.tsx` — 24 LOC; one responsibility: Diffusion-owned transient Ghost/Recall text presence.

Existing extension points expanded rather than creating a framework:

- `src/ui/motion.ts` — shared motion roles and one shared shell layout ID;
- `Speak.tsx` — owns only Speak lifecycle/presentation;
- `CommandMenu.tsx` / `Surface.tsx` — own transient-surface visual shell continuity;
- `ThoughtView.tsx` — composes transient text presentation from existing semantic state.

Largest handwritten production files after the pass:

1. `src/field/Field.tsx` — 516 LOC — **untouched**, >500 explicit justification below;
2. `src/ui/Workspace.tsx` — 335 LOC — touched only to add one Motion `LayoutGroup` around existing global menu/Settings ownership; remains <350;
3. `src/core/validation.ts` — 278 LOC — untouched;
4. `src/core/reducer.ts` — 249 LOC — untouched;
5. `src/ui/field.css` — 219 LOC;
6. `src/core/model.ts` — 174 LOC — untouched;
7. `server/app.ts` — 159 LOC — untouched;
8. `src/core/controller.ts` — 156 LOC — untouched.

Touched production files >350 LOC: **none**.

`Field.tsx` is the inherited >500 LOC exception. It remains the tightly coupled camera/pointer/gesture/geometry/culling orchestration hot path. v0.2.5 adds no Motion, shared-layout, Ghost/Recall-presentation or Speak machinery to it. A cosmetic split would spread performance-sensitive ownership; a future split should wait for a real independently testable responsibility boundary.

## Verification outcome

### VERIFIED

- `npm run check:offline`: **139 / 139 PASS**;
- dependency-free Core typecheck, locale gate and source-size gate: PASS;
- touched TS/TSX syntax transpilation using locally available TypeScript: PASS for all 9 touched modules;
- v0.2.5 CSS/primitive fixture: **7 / 7 PASS** (explicitly not Motion lifecycle);
- inherited camera/CSS Chromium primitive: **17 / 17 PASS**;
- typography/theme/locale Chromium fixture: **11 / 11 PASS**;
- browser performance primitive: PASS at 100 / 500 / 2,000 / 5,000 Thoughts;
- `npm run bench:spatial`: PASS;
- `npm run bench:storage`: PASS.

The new offline tests specifically protect Motion/reduced-motion wiring, Speak layout ownership, non-interactive shared shell, exclusive transient semantics, local transient-presence boundaries, unchanged Claim/Wake semantics, Focus geometry and the untouched Field hot path.

### UNVERIFIED

Because dependencies cannot be installed here:

- REAL REACT APP mount and actual layout/shared-layout transition observation;
- normal-motion vs reduced-motion React runtime comparison;
- `npm run typecheck` (missing `node` and `vite/client` types);
- `npm test` (Vitest binary unavailable);
- `npm run build` (stops at the same full typecheck boundary);
- `npm run test:e2e` (available `playwright` executable is not the project Playwright Test runner);
- native Tauri runtime/build.

This matters more in v0.2.5 than in prior CSS-led passes: the central improvement is Motion runtime lifecycle. The source implementation follows the inspected Motion primitives, but **the success criterion “visible in the REAL application” cannot be claimed in this environment**.
