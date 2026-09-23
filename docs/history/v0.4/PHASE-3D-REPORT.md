# Diffusion Phase 3D — Final Implementation Report

Date: 2026-09-18  
Phase: Interaction & Language Foundation  
Source received as ZIP: `Diffusion-source-20260918.zip`

## Executive status

The Phase 3D source implementation is complete in this working tree. The interaction model, Settings-owned thinking defaults, Scope Hub locality, More architecture, deterministic status language, and language-foundation documents/corpora are implemented.

Verification is split into two categories:

- **Passed in this environment:** locale completeness, source-size architecture gate, all offline gates (**187/187**), plus syntax transpilation of all **26 changed TS/TSX files**.
- **Blocked by the supplied environment, not reported as passing:** dependency-backed TypeScript, Vitest, Vite build, and Playwright E2E. The supplied ZIP contains no `node_modules`, and package restoration is blocked by DNS (`EAI_AGAIN registry.npmjs.org`).

The source ZIP contains no `.git` directory, so `git status`, current branch verification, and a native Git working-tree diff are unavailable. No reset, commit, or push was performed.

### Verification update — dependency-backed gates now run

The ZIP's dependency blockage does not apply to the repository this source was merged into. After
the source was applied, the missing gates were executed for real:

| Gate | Result |
| --- | --- |
| `npm run check:offline` | **PASS** (syntax/imports, `typecheck:core`, locales 723/0/0/0, offline suite, source-size) |
| `npm test` | **PASS** — 280 tests / 34 files |
| `npm run test:e2e` | **PASS** — 137 passed, 0 failed, 8 skipped (= the 137/0/8 baseline) |

Four E2E specifications still assumed the pre-3D contract and were updated to the intended one:
`phase25.spec.ts` and `visual.spec.ts` used Scope Hub's Continue as the route into a scoped
composer (Ask is that route; Continue now opens the Thread place), and `phase28b.spec.ts` and
`refinement.spec.ts` still counted six Settings sections.

One real defect surfaced by the new Run-settings test: Base UI's `Button` renders `type="button"`,
so the submit buttons in the Diffuse Run settings form, the evidence search form and the Fork form
never submitted and only worked through implicit Enter. All three now declare `type="submit"`.

---

## 1. Action model — before / after

### Before

Selection actions were assembled in multiple places. Scope Hub and More could expose semantically overlapping actions; Scope Hub's visible Continue action was wired to the Ask handler in `Field.tsx`; the More surface switched the current popup into a second page; and implementation-oriented command names leaked into visible UI.

### After

`src/ui/commands/contextualActionModel.ts` is the single selection-to-visible-action policy:

`selection -> real command availability -> primary / secondary action model -> Scope Hub / More`

The command registry remains the capability layer. The contextual model is only a visibility/presentation projection, so unsupported actions disappear instead of becoming dead controls.

Hard bounds enforced by the model:

- primary: at most 3 actions;
- plus More;
- secondary: at most 6 actions;
- primary command IDs never repeat in secondary.

## 2. Primary actions for 1 / 2 / 3+ selection

Observed with the real Phase 3D thinking command availability:

| Selection | Primary actions |
| --- | --- |
| 1 Thought | Continue thinking · Another angle · Ask |
| 2 Thoughts | Find a relation · Continue thinking · Ask |
| 3+ Thoughts | Continue thinking · Another angle · Organize |
| 1 Source | Continue thinking · Another angle · Ask |
| 1 Crystal | Continue thinking (via `continue-crystal`) · Another angle · Ask |

The spec's preferred 3+ `Find common ground` action was **not fabricated** because the current codebase has no handler whose real behavior matches that intent. The model uses supported existing behavior instead, as required by the contract.

## 3. Duplicated actions removed

Removed the old independently maintained selection menu arrays from `src/ui/commands/compose.ts`.

More is now derived from the same contextual action model and excludes primary IDs. Examples:

- one Thought: Another angle and Ask are primary, so neither is repeated in More;
- two Thoughts: Find relation / Continue / Ask stay primary; Another angle may appear as a distinct secondary intent;
- 3+ Thoughts: Organize is primary and is not repeated in More;
- a sole Source does not expose Organize/Crystallize.

The previous Scope Hub Continue -> Ask handler mismatch is removed: Scope Hub actions now dispatch by command ID through the real command registry.

## 4. More architecture and pointer behavior

`src/ui/focus/CommandMenu.tsx` now uses one coordinated popup owner for the primary column and its secondary More column.

Behavior:

- hover delay: **160 ms**;
- hover does not immediately replace the primary menu;
- secondary panel opens to the right while primary remains visible;
- pointer transfer between primary and secondary stays within the same popup ownership region;
- click / Enter / Space / ArrowRight reliably opens and pins/enters More;
- ArrowLeft or Escape from secondary returns to More;
- another Escape closes the root menu;
- leaving the combined region closes an unpinned secondary panel.

`useTransientFocus.ts` also handles the hover->click edge case: clicking the same secondary owner after hover-open no longer toggles it closed.

For Scope Hub, the secondary menu is positioned immediately to the right (`sideOffset: 3`) and uses the same transient menu owner; it remains open through the trigger-to-panel transfer instead of using the old page-replacement behavior.

## 5. More item counts by context

Measured from the actual contextual selector and real command availability:

| Context | Secondary items | Count |
| --- | --- | ---: |
| 1 Thought | Check evidence · Run settings · Organize · Copy · Delete | 5 |
| 2 Thoughts | Check evidence · Run settings · Organize · Another angle · Copy · Delete | 6 |
| 3 Thoughts | Check evidence · Run settings · Ask · Copy · Delete | 5 |
| 1 Source | View source · Check evidence · Run settings · Copy · Delete | 5 |
| 1 Crystal | Check evidence · Run settings · Handoff into action · Copy · Delete | 5 |

All contexts remain <= 6. `View source` is only available when a selected item has a real `sourceId`; `Organize` is unavailable for a sole Source or sole Crystal.

## 6. Scope Hub placement algorithm

`src/ui/scope/scopePlacement.ts` was rewritten around locality rather than empty-screen optimization.

Placement order:

1. top / above-center;
2. bottom;
3. right;
4. left.

Each candidate is viewport-clamped. Occupancy is only a tiebreaker among local placements; dense nearby content no longer justifies teleporting the Hub to a remote empty region. Multi-selection uses the union selection bounds.

Default anchor gap: **20 px**.

## 7. Maximum measured Hub-anchor distance in tests

Direct geometry probes in this environment covered:

- center Thought;
- top edge;
- left edge;
- right edge;
- dense occupied region;
- multi-selection union bounds.

Measured shortest rectangle-to-rectangle gap in every case: **20 px**.  
Maximum measured gap: **20 px**, well below the ~160 px contract limit.

Unit coverage was updated for these cases, but the Vitest runner itself cannot execute here because dependencies are unavailable. The pure placement implementation was also executed directly under Node's TypeScript stripping to obtain the measurement above.

## 8. Settings defaults added

New compact Thinking settings:

- Directions: `1 / 3 / 5`;
- Use Field sources by default;
- Allow web search by default.

Defaults:

- directions: **3**;
- Field sources: **off**;
- web: **off**.

Files:

- `src/ui/thinkingDefaults.ts`
- `src/ui/surfaces/ThinkingSettings.tsx`
- `src/ui/surfaces/SettingsSurface.tsx`

## 9. Persistence mechanism used

No second preference store was created.

Thinking defaults are part of the existing `Settings` object in `src/ui/settings.ts` and continue to use the existing localStorage key:

`diffusion-settings`

Normalization accepts only directions 1/3/5 and safely restores defaults for old or malformed settings.

## 10. Temporary-run behavior

`Run settings` is a secondary action only. It opens `DiffuseSurface` as a one-run configuration surface with at most three controls:

- directions;
- Field sources;
- web search.

It does **not** overwrite global defaults.

Normal `Another angle` skips this surface and runs immediately from the persisted Settings defaults.

Explicitly opening Run settings now clears any old run before assigning the newly selected scope, preventing an active/stale run from being mistaken for configuration of a different selection. Opening Details from the activity indicator still inspects the active run directly.

## 11. Status-copy changes

`DiffuseSurface` no longer presents scheduler-style primary UI.

Examples:

- running: `Trying another angle · 2 / 3`;
- done: `Found 3 angles`;
- singular: `Found 1 angle`;
- actions: Details / Stop / Dismiss.

Chinese deterministic copy uses the corresponding plain-language forms, such as `换了 3 个角度`.

Wall-clock budget, scheduler terminology, pause timing, and model-call count are not exposed as normal run configuration.

## 12. External language references studied

Research date: 2026-09-18.

Studied:

- mission-bullet-oss — <https://github.com/lerugray/mission-bullet-oss>
- morning-checkin — <https://github.com/paulschraven/morning-checkin>
- Humanities Writing Companion — <https://github.com/tizzy916/humanities-writing-companion>
- Muxwriter — <https://github.com/ankitmukhopadhyay/Muxwriter>
- Are.na About / Blog — <https://www.are.na/about>, <https://www.are.na/blog>

The findings are recorded in `docs/LANGUAGE_CONTRACT.md` rather than copied as prompts.

## 13. Useful principles borrowed

Borrowed mechanisms:

- raw/user-written language has higher authority than commentary;
- capture and interpretation stay separate;
- verbatim/rough language can carry semantic uncertainty;
- intervention strength should differ by role;
- AI output remains proposal until user commitment;
- restrained editorial compression can have character without decorative poetry.

## 14. Rejected principles and why

Not adopted:

- one universal commentary voice for every text role — roles have different jobs;
- verbatim-only behavior for every derived object — Diffusion still needs explicit proposals/questions/relation tokens;
- automatic personal style/voice modeling — out of scope and risks hidden profiling/semantic rewriting;
- wholesale adoption of another product's brand voice — reference projects are mechanism/tone references, not templates;
- broad AI prompt rewrite during Phase 3D — this phase establishes ownership/contracts/corpus first.

## 15. Current-language audit

`docs/LANGUAGE_CONTRACT.md` maps current text roles to concrete code owners and failure modes.

Important owners identified:

- authored/direct Thought capture: `src/ui/workspace/useThinkingIntents.ts` + core storage;
- extraction: `src/ai/ingestion.ts`;
- shared AI language: `src/ai/prompt.ts`;
- relation generation: `src/ai/prompt.ts` + `src/ai/runtime.ts`;
- Continue/Ask runtime task strings: `src/ui/workspace/useThinkingIntents.ts`;
- Another angle: `src/ui/Workspace.tsx` + `src/ai/diffuse.ts`;
- demo language: `src/ai/mock.ts`;
- evidence judgment: `server/app.ts`;
- action labels: `src/ui/commands/contextualActionModel.ts` + localization;
- deterministic status: `src/ui/surfaces/DiffuseSurface.tsx` + localization.

The audit also records existing strengths: `src/ai/ingestion.ts` already preserves exact `sourceQuotes`, while `src/ai/prompt.ts` already has useful plain-language / anti-therapy constraints. Those were preserved instead of replaced.

## 16. Text Ownership Map

The durable authority order documented in `docs/LANGUAGE_CONTRACT.md` is:

1. user-authored text;
2. grounded source text;
3. explicitly committed user decisions;
4. deterministic product copy;
5. AI proposals/commentary.

Roles defined separately include:

- Authored Thought;
- Extracted Thought;
- AI Thought Proposal;
- Question;
- Relation Token;
- Explanation / insight;
- UI copy;
- Status copy;
- Source / evidence copy.

Each role documents owner, purpose, typical length, abstraction/intervention level, uncertainty, literary ceiling, and forbidden drift.

## 17. `LANGUAGE_CONTRACT.md` summary

Created `docs/LANGUAGE_CONTRACT.md` with:

- Quiet Realism / 克制现实主义 identity;
- findings from all requested external references;
- text ownership map;
- role-by-role contracts;
- PRESERVE / LIGHT CLEAN / GENERATE NEW POSSIBILITY internal modes;
- Thought Proposal rules;
- Question rules;
- Relation Token rules;
- artistic ceiling;
- anti-AI failure catalogue;
- concrete-before-abstract guidance;
- current Diffusion language audit;
- regression workflow;
- lightweight review checks;
- future local voice adaptation recommendation only;
- exact targets for the next prompt-rewrite pass.

No automatic voice model was implemented.

## 18. Chinese example corpus summary

Created `docs/language/examples.zh.md` with **32 realistic Chinese cases**.

Coverage includes:

- graduate school uncertainty and time cost;
- career uncertainty;
- HCI interest vs employment concern;
- not wanting coding-heavy work;
- exploration vs stability;
- project/tool complexity;
- learning difficulty and AI writing too fast;
- project evidence / internship concerns;
- conflicting ideas and uncertainty without a clean answer.

Examples deliberately vary in polish and include USER LANGUAGE, BAD AI VERSION, DIFFUSION THOUGHT, DIFFUSION QUESTION, and relation tokens where relevant.

## 19. Language regression corpus

Created `docs/language/regression.zh.json`.

It contains **10 stable inputs** and explicitly asks future prompt changes to inspect:

- Thought;
- Question;
- Relation;
- Continue thinking;
- Another angle.

It is intentionally not a style score. Review checks include unsupported meaning upgrade, abstraction inflation, uncertainty loss, therapy/consulting drift, over-explanation, and authorship blur.

## 20. Tests added / updated

Added:

- `tests/unit/contextualActionModel.test.ts`.

Updated unit coverage:

- contextual command composition;
- Scope Hub placement;
- Settings normalization/persistence.

Updated E2E scenarios for:

- centralized Scope Hub actions;
- no old Continue->Ask assumption;
- More hover delay / pointer transfer / keyboard return;
- Thinking Settings persistence;
- normal Another angle run using defaults;
- temporary Run settings not overwriting defaults.

Updated offline architecture/identity gates for the Phase 3D product contract, including the newly intentional Thinking Settings section. Tests were not weakened to hide implementation defects.

## 21. Full gate results

Required verification commands were executed after the final source edit.

| Gate | Result | Detail |
| --- | --- | --- |
| `npm run typecheck` | **BLOCKED** | missing `@types/node` and `vite/client` type definitions because dependencies are not installed |
| `npm run typecheck:core` | **BLOCKED** | missing `zod` / Vite types; resulting inference errors are dependency fallout |
| `npm test` | **BLOCKED** | `vitest: not found` |
| `npm run test:offline` | **PASS** | **187 passed / 0 failed** |
| `npm run check:locales` | **PASS** | 723 dictionary keys, 0 missing, 0 unwrapped JSX, 0 unlocalized |
| `npm run check:source-size` | **PASS** | architecture/source-size gate PASS; `Field.tsx` 600 LOC, `Workspace.tsx` 313 LOC |
| `npm run build` | **BLOCKED** | stops at dependency-backed typecheck before Vite build |
| `npm run test:e2e` | **BLOCKED** | project `@playwright/test` is absent; available unrelated Playwright CLI reports `unknown command 'test'` |

Additional direct verification:

- all **26 changed TS/TSX files** transpile without syntax diagnostics using available global TypeScript;
- contextual action model was executed directly to measure real primary/secondary counts;
- Scope Hub placement was executed directly to measure distances.

Dependency restoration attempts:

- normal registry access fails with `EAI_AGAIN` for `registry.npmjs.org`;
- offline npm cache is incomplete (including missing `zustand` tarball);
- supplied source ZIP has no `node_modules`.

Therefore the original E2E baseline `137 passed / 0 failed / 8 skipped` is a **contractual baseline from the input**, not something this environment could independently re-confirm.

## 22. Manual dogfood findings

A full browser dogfood pass cannot be claimed in this container because the app cannot be built/launched without its dependencies.

What was directly inspected/exercised at source/pure-logic level:

- one / two / 3+ selection action projection;
- Source and Crystal contextual filtering;
- no primary-ID duplication in More;
- temporary vs persisted thinking settings flow;
- active-run vs explicit Run settings ownership;
- Scope Hub center/edge/dense/multi placement;
- More hover/click/keyboard state transitions in code and updated E2E contract.

Still required in a normal developer environment before merge:

- visually drag Thoughts to every viewport edge;
- pointer-transfer dogfood across primary -> More secondary panel;
- verify actual Base UI focus behavior with keyboard;
- run Another angle against the real configured provider;
- confirm Chinese/English layout at runtime;
- rerun the complete Playwright suite and compare with the 137/0/8 baseline.

## 23. Files changed

Production / docs:

- `docs/LANGUAGE_CONTRACT.md` **new**
- `docs/language/examples.zh.md` **new**
- `docs/language/regression.zh.json` **new**
- `src/field/Field.tsx`
- `src/locales/zh.ts`
- `src/ui/Workspace.tsx`
- `src/ui/commands/compose.ts`
- `src/ui/commands/contextualActionModel.ts` **new**
- `src/ui/commands/thinking.ts`
- `src/ui/field.css`
- `src/ui/focus/CommandMenu.tsx`
- `src/ui/scope/ScopeHub.tsx`
- `src/ui/scope/scopePlacement.ts`
- `src/ui/settings.ts`
- `src/ui/surfaces/DiffuseSurface.tsx`
- `src/ui/surfaces/SettingsSurface.tsx`
- `src/ui/surfaces/ThinkingSettings.tsx` **new**
- `src/ui/thinkingDefaults.ts` **new**
- `src/ui/transient.ts`
- `src/ui/workspace/useTransientFocus.ts`

Tests:

- `tests/e2e/field.spec.ts`
- `tests/e2e/friction.spec.ts`
- `tests/e2e/hardening.spec.ts`
- `tests/e2e/hotfix.spec.ts`
- `tests/e2e/interaction.spec.ts`
- `tests/e2e/redesign.spec.ts`
- `tests/offline/phase3b-legibility.test.mjs`
- `tests/offline/phase3b1-hotfix.test.mjs`
- `tests/offline/phase3c1-hygiene.test.mjs`
- `tests/offline/v023-identity.test.mjs`
- `tests/unit/commands.test.ts`
- `tests/unit/contextualActionModel.test.ts` **new**
- `tests/unit/scopePlacement.test.ts`
- `tests/unit/settings.test.ts`

This report is also added as `PHASE-3D-REPORT.md`.

## 24. Remaining risks

1. **Dependency-backed validation is outstanding.** Real TypeScript resolution, Vitest, Vite and Playwright must run after dependencies are restored.
2. **Base UI runtime typing/focus behavior.** The new More focus path uses a `Menu.Item` ref; syntax is valid, but project-level type resolution and browser behavior still need the real dependency set.
3. **Visual dogfood is outstanding.** Pure geometry is local (20 px in probes), but actual rendered Hub dimensions, fonts, zoom and pointer hit regions need browser validation.
4. **3+ Find common ground is intentionally deferred.** There is no current handler matching that semantic intent; Phase 3D does not invent one merely to satisfy the preferred label.
5. **Language behavior is not broadly rewritten yet.** The contract/corpus make the next pass auditable, but existing shared generation prompts can still produce some over-polished output until that targeted pass happens.
6. **ZIP has no Git metadata.** Branch and uncommitted-work status could not be independently verified from the artifact.

## 25. Exact AI prompts recommended for the NEXT implementation pass

In order:

1. `src/ai/prompt.ts` — factor `JSON_INSTRUCTIONS` into shared constraints + compact role-specific clauses for Thought Proposal, Question, Relation Token and Explanation. Keep current anti-therapy/plain-language strengths; do not create another mega-prompt.
2. `src/ui/workspace/useThinkingIntents.ts` — make `probe` explicitly request one Relation Token candidate; make question flow request one useful concrete move; separate Thread question-following from Field proposal generation.
3. `src/ui/Workspace.tsx` + `src/ai/diffuse.ts` — Another angle should produce genuinely different framings rather than paraphrase sets, one cognitive move per candidate, preserving uncertainty.
4. `src/ai/mock.ts` — update deterministic demo language to teach Quiet Realism rather than older workshop-style wording.
5. `server/app.ts` — add the Evidence role contract: concise, claim-scoped and uncertainty-preserving without weakening factual/provenance rigor.
6. After prompt behavior stabilizes, perform a targeted deterministic copy sweep for empty states, proposal-state labels and stale implementation vocabulary.

Do **not** use the next pass to build a personality model, language score/dashboard, autonomous agent, or a global brand-voice rewrite.

---

## Acceptance note

Phase 3D's requested interaction/language foundation is implemented in source and the runnable offline/architecture gates are green. Final merge acceptance should wait for one normal-environment run of the dependency-backed typecheck/unit/build/E2E gates plus visual dogfood. No commit or push was performed.
