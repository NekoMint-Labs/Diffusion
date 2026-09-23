# Diffusion v0.4 — Visual Identity, Interaction & First-Use Redesign

Final delivery report — 2026-09-19

This report covers the complete Stage A → G redesign pass.

## 1. What was wrong in the previous experience

The previous product already had valuable local-first semantics and a warm atmosphere, but its perceptual and interaction layers did not reliably communicate those semantics.

The main problems were:

- the Field read too flat and sometimes too close to floating text/chat;
- Ghost was visually close to “Thought with lower opacity” instead of a distinct proposal object;
- blank-space drag used an expert-style marquee default rather than the expected pan behavior;
- dragging a Ghost could cross the proposal → ownership boundary;
- generated proposals did not consistently behave like one temporary local neighborhood around their anchor;
- Continue / Another Angle / Ask did not have enough spatial or explanatory differentiation;
- `Ask` mixed two different intents: AI generates a question vs. the person writes their own question;
- AI operations could feel unresponsive because acknowledgement was too weak;
- first use lacked an integrated learning path for movement, scope, proposals and Keep;
- result placement was mostly collision avoidance rather than semantic composition;
- the final hierarchy needed stronger selection, Field identity, relation sleep/wake behavior and light/dark consistency.

The redesign preserved Core authority rules rather than fixing these problems by rewriting product semantics.

## 2. Reference implementations inspected

The updated `docs/REFERENCE_AUDIT.md` records the Stage A study. The redesign used references only for narrowly scoped interaction and presentation principles:

- Kinopio — direct manipulation, blank-space navigation, group movement, forgiving hit areas;
- tldraw — separation of canonical content and interaction overlays, pointer ownership, selection foreground;
- AFFiNE / BlockSuite Edgeless — selected-rect and edgeless interaction layering;
- Allume / Muse — spatial thinking, organized unfinishedness, varied local visual weight, sample-space onboarding;
- Milanote — spacing and side-by-side composition;
- Are.na — restrained hover/context feedback and quiet polish;
- Linear — local contextual actions, hit targets, immediate feedback and proposal/review clarity.

No third-party source, asset, ontology or architecture was copied.

## 3. What was borrowed and explicitly rejected

### Borrowed as principles

- direct manipulation should be discoverable by feel;
- canonical objects and transient interaction overlays should remain conceptually distinct;
- selection should foreground attention without permanently framing every object;
- generated material should form a readable local composition;
- actions should explain themselves at hover/focus before commitment;
- first use should teach by doing inside the real product;
- activity feedback should appear locally and immediately.

### Explicitly rejected

- colorful knowledge-graph ontology;
- whiteboard tool-palette architecture;
- permanent card treatment for every Thought;
- Miro/Heptabase/Notion-style object-model migration;
- issue-tracker language;
- AI-purple, glow, shimmer, particles or loading orbs;
- minimap and separate navigation mode;
- auto-layout of canonical user-authored content;
- geometry as semantic truth;
- tutorial wizard/video patterns;
- a new canvas/UI framework.

## 4. Visual system changes

The Field now follows the Spatial Editorial / Living Paper direction across its primary object classes.

- **Thought** — quiet material fragment rather than either a card or bare floating text; stronger hover/selection without text reflow.
- **Ghost** — a readable pencil/proposal identity with a stable editorial proposal mark; no AI badge, glow or purple ontology.
- **Question** — unresolved posture and restrained question vocabulary instead of a differently colored card.
- **Source** — subordinate editorial reference / footnote language.
- **Crystal** — rare, settled landmark language with firmer typography and restrained `◆`, without gold/green celebration semantics.
- **Relations** — sleeping editorial traces that wake near attention rather than graph edges that dominate the Field.
- **Field identity** — stronger `FIELD` + project-name hierarchy while remaining part of the page rather than an application header.
- **Accent** — remains owned by human attention, selection, explicit control and confirmation.
- **Final polish** — consistent selection depth, typography, local density, drag immediacy and dark-mode counterparts.

## 5. Interaction grammar changes

The direct-manipulation grammar is now explicit and regression-covered:

- click Thought → select;
- Shift+click → add/remove selection;
- drag Thought → move;
- drag a Thought in an existing multi-selection → move the selection;
- drag Ghost → move proposal without claiming it;
- double-click Thought / Enter → edit;
- double-click blank Field → create Thought;
- blank left-drag → pan;
- Shift + blank left-drag → marquee selection;
- Space + drag / middle drag → retained pan shortcuts;
- wheel/pinch path preserves the attended world point;
- `F` → frame current selection;
- `0` → fit meaningful Field content;
- Esc continues to cancel the topmost transient interaction first.

Help and interaction tests were updated to match the new default mental model.

## 6. Ghost ownership / drag changes

This was the critical authority fix.

Previously, the drag path could claim a Ghost as dragging began. The redesigned path keeps geometry and ownership separate:

- Ghost drag changes transient/session coordinates;
- Ghost drag does **not** Keep;
- Ghost drag does **not** Claim;
- Keep remains the explicit ownership transition;
- explicit ownership/edit behavior remains separate from ordinary movement;
- regression coverage prevents a moved Ghost from entering canonical Thought state.

The rule is now encoded in behavior and tests: changing proposal geometry cannot silently cross the AI → user commitment boundary.

## 7. Proposal constellation behavior

Generated proposals now behave like a temporary local constellation around their anchor before the person rearranges them.

- moving the anchor keeps attached transient proposals in the same relative local arrangement;
- following happens during the move rather than as a post-drop jump;
- undoing the anchor move restores the transient composition correspondingly;
- manually dragging a Ghost detaches that proposal from automatic following;
- the detached object remains a Ghost;
- keeping it later preserves its current spatial position as the accepted position;
- no explicit grouping concept was added for the user to learn.

This affects transient generated presentation only and does not auto-arrange unrelated canonical content.

## 8. AI operation feedback changes

AI activity now acknowledges user intent immediately and locally around the affected scope.

- operation mark appears immediately;
- persistent copy is delayed about 190 ms so very fast operations do not flash;
- Continue / Angle / Question / Relation / Verify / Organize have distinct human-language status copy;
- Stop appears only for operations that can actually be cancelled;
- live runtime requests use request-scoped operation cancellation;
- Verify/evidence work is routed into the same cancellation presentation instead of having a fake visual-only Stop;
- completion settles rather than leaving a permanent AI object;
- no private chain-of-thought, fake percentages, token counters or model internals are exposed.

## 9. Tutorial flow

A real First Field Tutorial now teaches the core contract inside the working Field rather than in a modal slideshow.

Core path:

1. write one unfinished Thought;
2. drag it;
3. drag blank space to pan;
4. select it and reveal the local action strip;
5. invoke Continue / Another Angle / Ask;
6. receive an explicitly disclosed deterministic tutorial Ghost;
7. drag the Ghost and see that movement does not accept it;
8. Keep it and see the proposal visually settle.

Important boundaries:

- tutorial generation does not need an API key;
- the tutorial path does not pretend deterministic output is live model reasoning;
- tutorial generated content does not enter canonical ProjectState/history;
- the person's own practice Thought remains theirs;
- completion/skip/resume state is UI/device state;
- Skip is supported;
- Help can restart the tutorial;
- Relation, Verify, Crystal, multi-selection and Focus receive one-time later coaching instead of bloating the first lesson.

## 10. Files changed

Across Stage A → G, production changes are concentrated in the existing field, controller, presentation and workspace layers.

### Documentation

- `docs/REFERENCE_AUDIT.md`
- `docs/history/v0.4/V0_4_STAGE_AB_SPATIAL_EDITORIAL.md`
- `docs/history/v0.4/V0_4_STAGE_CD_DIRECT_MANIPULATION.md`
- `docs/history/v0.4/V0_4_STAGE_EF_ACTIVITY_TUTORIAL.md`
- `docs/history/v0.4/V0_4_STAGE_G_POLISH.md`
- `docs/history/v0.4/V0_4_FINAL_REDESIGN.md`

### Production

- `src/ai/operationControl.ts` (new)
- `src/ai/runtime.ts`
- `src/core/controller.ts`
- `src/core/model.ts`
- `src/field/Field.tsx`
- `src/field/interactionHygiene.ts`
- `src/field/spatial/geometry.ts`
- `src/field/spatial/gesture.ts`
- `src/field/spatial/placement.ts`
- `src/field/spatial/pointerTarget.ts`
- `src/locales/zh.ts`
- `src/ui/Workspace.tsx`
- `src/ui/commands/compose.ts`
- `src/ui/commands/contextualActionModel.ts`
- `src/ui/field.css`
- `src/ui/focus/CommandMenu.tsx`
- `src/ui/materials.css`
- `src/ui/motion/SpatialActivityLayer.tsx`
- `src/ui/motion/spatialActivity.css`
- `src/ui/polish.css` (new)
- `src/ui/reference/EvidenceSurface.tsx`
- `src/ui/resultSemantics.css`
- `src/ui/scope/ScopeHub.tsx`
- `src/ui/surfaces/ActionPreviewSurface.tsx`
- `src/ui/theme.css`
- `src/ui/tutorial/FirstFieldTutorial.tsx` (new)
- `src/ui/tutorial/firstFieldTutorial.css` (new)
- `src/ui/workspace/useFieldActions.ts`
- `src/ui/workspace/useThinkingIntents.ts`

### Tests

- `tests/e2e/field.spec.ts`
- `tests/e2e/phase25.spec.ts`
- `tests/e2e/phase27.spec.ts`
- `tests/e2e/phase3d1.spec.ts`
- `tests/e2e/tutorial.spec.ts` (new)
- `tests/offline/v023-identity.test.mjs`
- `tests/offline/v024-signature.test.mjs`
- `tests/offline/v025-motion-reuse.test.mjs`
- `tests/offline/v04-stage-ab-visual.test.mjs` (new)
- `tests/offline/v04-stage-cd-interaction.test.mjs` (new)
- `tests/offline/v04-stage-ef-feedback-tutorial.test.mjs` (new)
- `tests/offline/v04-stage-g-polish.test.mjs` (new)
- `tests/unit/contextualActionModel.test.ts`

## 11. Tests added / updated

The redesign adds or updates coverage for the important contracts rather than only snapshotting CSS.

Covered offline contracts include:

- Spatial Editorial object identity;
- blank drag pan vs Shift-marquee;
- Thought and selected-group movement;
- Ghost transient movement without claim;
- anchor/proposal constellation follow and detach;
- pointer-centered zoom and Focus/Fit math;
- ScopeHub intent vocabulary and AI-question vs own-question split;
- operation acknowledgement and cancellation plumbing;
- deterministic non-canonical tutorial behavior;
- EN/ZH copy coverage;
- semantic placement grammar;
- final polish/no-gradient/immediate-drag contracts.

E2E specifications were also updated/added for the new interaction and tutorial paths. They were not
executable in the environment this report was written in; they were run afterwards against the
production bundle (see *Run afterwards* in §12).

## 12. Verification results

### Passed in this environment

- `npm run test:offline` — **209 / 209 PASS**
- `node scripts/offline-check.mjs` — **PASS**
  - 225 TS/TSX files syntax-transpiled
  - JSON valid
  - local imports resolve
- `npm run check:locales` — **PASS**
  - missing: 0
  - unwrappedJSX: 0
  - unlocalized: 0
- `npm run check:source-size` — **PASS**
  - `Field.tsx`: 632 lines
  - configured source-size gate satisfied

### Run afterwards, in a checkout with the dependency tree installed

The gates this report recorded as unrun were executed on the same source in a normal install
(`pnpm install`), and the first Playwright run is what closed the remaining gaps:

- `npm run typecheck` — **PASS**
- `npm test` — **PASS** (34 files)
- `npm run build` + `npm run test:e2e` — **PASS** (144 passed, 0 failed, 8 skipped by design) against
the production bundle
- `npm run check:offline` — **PASS** (offline suite, locales, source-size)

The first execution found seven failures, and each was resolved rather than muted:

- two product defects the offline contracts could not see: the tutorial's `select` step was satisfied
  before it was shown (the move step's own press had already selected the Thought), and an active
  tutorial swallowed the *AI is off* sentence and its *Open AI settings* control in a Field with no
  provider;
- one flaky specification that named a proposal by DOM order — `Field` renders visible items in the
  spatial index's own order — instead of by its identity;
- four expectations the redesign had outgrown: the Field identity's deliberate 15 → 18 px rise, and
  the Scope Hub's third action changing from the person's own question to a generated one.

Still unrun and still not claimed: a Tauri/native build (`cargo` is absent), mounted screenshot
acceptance, and anything against a live provider or search service.

### Attempted and incomplete because dependencies are absent

- `npm run typecheck`
  - stops before meaningful project checking because `@types/node` / `vite/client` are not installed
- `npm run typecheck:core`
  - stops on missing installed modules such as `zod` and missing environment types
- dependency installation was attempted but registry access repeatedly stalled / returned `EAI_AGAIN`; no partial dependency tree is included in the final archive

### Not claimed as passed

- dependency-backed full Vitest suite;
- Vite production build;
- Playwright execution;
- mounted web/Tauri manual dogfood;
- visual screenshot comparison;
- Tauri build (`cargo` is unavailable in this environment).

No incomplete gate is hidden or converted into a source-only “pass”.

## 13. Screenshots / visual review results

No representative application screenshots are included because the dependency-backed app could not be mounted in this environment.

Therefore visual acceptance remains an explicit external gate. Source inspection and regression tests support the intended hierarchy, but they are not treated as proof that the finished mounted UI looks correct.

The next mounted review should capture:

- empty first-run Field;
- single Thought;
- selected Thought;
- Thought being dragged;
- Continue result;
- Another Angle result;
- Question proposal;
- Ghost before Keep;
- Ghost after Keep;
- Source;
- Crystal;
- multi-Thought neighborhood;
- zoomed-out Field;
- light mode;
- dark mode;
- tutorial annotations.

## 14. Known remaining issues

These are verification/fit-and-finish risks, not intentionally deferred new product features:

1. full dependency-backed typechecking, production build, Vitest and Playwright were run afterwards in a
   checkout with the dependency tree installed, and pass — see *Run afterwards* in §12; what is still
   outstanding is what the items below name;
2. mounted visual review may reveal spacing, text-width, popup positioning or dark-mode contrast issues that source inspection cannot reliably expose;
3. trackpad/pinch behavior should be checked on real Windows/macOS hardware because synthetic pointer/wheel tests cannot fully reproduce device gesture characteristics;
4. the tutorial should be fresh-install dogfooded with and without a configured provider to verify there is no accidental live request;
5. Tauri packaging should be re-run on a machine with Rust/Cargo and the project's normal sidecar/toolchain setup.

No known authority-boundary regression is left open by the offline suite.

## 15. What the next external alpha user should test

The next alpha session should focus on comprehension rather than feature discovery by explanation.

Ask the participant to start with no coaching and observe whether they naturally discover:

- they can write in the Field;
- a Thought can be grabbed and moved;
- blank-space dragging moves the Field;
- Shift-drag selects an area;
- Continue and Another Angle feel different before reading documentation;
- “让 AI 提问 / Ask” clearly means the AI generates a question, while “ask your own question” is a separate intent;
- a Ghost looks provisional;
- moving a Ghost does not feel like accepting it;
- Keep clearly feels like ownership/commitment;
- generated proposals feel attached to one local thinking neighborhood until manually rearranged;
- an AI action visibly acknowledges the click and can be stopped;
- Source is visually subordinate and Crystal feels settled without celebration styling;
- `F` and `0` restore orientation when the Field grows;
- the First Field Tutorial teaches these ideas without feeling like a wizard or fake live AI.

Record where the participant hesitates, retries an AI action, mistakes a proposal for their own writing, or describes the interface as a whiteboard/chat/graph. Those observations should determine any next refinement; no further broad redesign is justified from source inspection alone.

---

## Final status

**Implementation status:** Stage A → G source work complete.

**Offline regression status:** 209 / 209 PASS.

**Authority boundary status:** preserved by regression tests; Ghost movement remains transient and Keep remains explicit ownership.

**Dependency-backed application verification:** incomplete because dependencies could not be installed in this environment.

**Mounted visual acceptance:** not yet claimed; requires the explicit screenshot/dogfood gate above.
