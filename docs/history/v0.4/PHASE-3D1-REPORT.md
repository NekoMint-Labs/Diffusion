# Diffusion — Phase 3D.1 Implementation Report

## 1. Files changed

- `src/ui/Workspace.tsx`
- `src/ui/commands/thinking.ts`
- `src/ui/commands/contextualActionModel.ts`
- `src/ui/transient.ts`
- `src/ui/surfaces/ActionPreviewSurface.tsx` (new)
- `src/ui/surfaces/OrganizeSurface.tsx` (new)
- `src/ui/surfaces/surfaces.css`
- `src/locales/zh.ts`
- `tests/unit/contextualActionModel.test.ts`
- `tests/unit/commands.test.ts`
- `tests/e2e/phase3d1.spec.ts` (new)
- `tests/e2e/field.spec.ts`, `tests/e2e/friction.spec.ts`, `tests/e2e/hardening.spec.ts`, `tests/e2e/redesign.spec.ts`
- `PHASE-3D1-REPORT.md` (new)

## 2. Interaction model — before vs after

Before, Continue / Another angle / Ask could immediately enter different execution paths, while Run settings lived as a generic contextual action. Multi-selection used the old `crystallize` action under the user-facing Organize label.

After, Continue / Another angle / Ask first open a small local execution preview. The preview states what the action means, shows 1 / 3 / 5 with the device default preselected, and keeps optional source controls secondary. For 3+ Thoughts, the primary semantic organizing action is now `organize` / 理一理 and is separate from Crystal formation.

Ask and the Thread place keep explicit entries of their own, so the preview is additive rather than a
replacement for writing your own question or for a place to continue in. `ask` stays the composer and
`thread` is the Thread place; both live in the same More column as before.

## 3. What happened to 本次设置

The `run-settings` command was removed from the thinking command registry and from contextual More. There is no generic contextual “本次设置” action anymore.

The existing `DiffuseSurface` remains available as the details/review surface for an already-running Another angle session; it is no longer the generic entry point for configuring an arbitrary selection.

## 4. Action Preview implementation

Added `ActionPreviewSurface.tsx`, rendered as an anchored local surface beside the selected scope. It supports three explicit intents:

- Continue thinking — “沿着这条思路往前。”
- Another angle — “从另一个方向重新看。”
- Ask — “围绕这个想法提出问题。”

First click opens the preview; execution happens only after Start.

## 5. How 1 / 3 / 5 defaults work

The preview reads `settings.thinkingDefaults.directions`; the current Settings value is preselected. A local choice exists only in component state and is passed to that execution. It does not call the Settings updater and therefore does not mutate the global default.

Field-source defaults are handled the same way. Web is only exposed for Another angle, where the existing DiffuseSession already supports the web evidence path.

## 6. Continue behavior

Continue now opens Action Preview instead of immediately opening a Thread. Starting it runs bounded, one-result-at-a-time AI requests over the original selected scope. The prompt explicitly asks for a concrete next thought on the same semantic trajectory, not a question or reframing.

The Thread place did not disappear with it. `thread` / “Open a Thought Thread” is its own command in the
same More column, so a place to keep thinking in is one explicit click away and is no longer something
Continue does by accident; `deep-dive` / “Go deeper” still opens Deep Dive directly.

A Crystal keeps its existing explicit “continue from Crystal” local behavior rather than inventing an AI action for symmetry.

## 7. Another Angle behavior

Another angle now opens Action Preview first. Starting it uses the existing `DiffuseSession`, with the selected 1 / 3 / 5 count and per-run Field/Web choices. Its prompt explicitly asks for genuinely different directions rather than continuation/restatement.

## 8. Ask behavior

Ask keeps the composer. `ask` / “Ask your own question” answers the primary Ask control and hands the
scope to the writing surface, which is what that control always meant; asking AI for questions is a
different action with its own command (`questions` / “Ask a question”)
in More, and it runs bounded one-result requests whose contract is question-only: a concrete question
that interrogates or opens the selected Thought, not an answer, continuation, or summary.

Neither run reaches into the composer: writing your own question and asking for one are separate
intents, and a preview run never takes focus away from a sent or unsent question.

## 9. What happened to the old 整理

The old contextual `Organize` label no longer points to `crystallize`, and the registry follows: `crystallize` is now labelled `Crystallize / 结晶` everywhere, so the Thought menu no longer offers two different things called Organize.

## 10. Group behavior

The inspected codebase does not contain a user-invoked “put these selected Thoughts in a box” grouping command. Existing Regions are spatial observations maintained by `RegionObserver`, not a manual Group command. Therefore this pass does not invent a fake Group action merely to satisfy the label.

## 11. Semantic 理一理 behavior

For 3+ selected Thoughts, `organize` / 理一理 is now a real command. It opens `OrganizeSurface` and asks the existing semantic runtime to reveal grounded relations among the supplied Thoughts: shared themes, contrasts, tensions, sequence, dependencies, or repeated concerns.

It explicitly asks not to summarize the selection into a new Thought and prefers existing `surface_relation` primitives.

## 12. Proposal / commit flow

`OrganizeSurface` runs proposal-first:

1. Analyze the selected scope.
2. Collect transient relation phenomena emitted by the runtime.
3. Discard emitted text Ghosts because this action is about structure among existing Thoughts.
4. Show the relation proposals locally.
5. Apply confirms only the proposed existing relation primitives.
6. Try another removes the current transient proposal and reruns.
7. Cancel removes transient proposals and leaves canonical project content untouched.

## 13. Contextual action mapping changes

- 1 Thought: Continue / Another angle / Ask (composer).
- 2 Thoughts: Find relation / Continue / Ask (composer).
- 3+ Thoughts: Continue / Another angle / 理一理.
- More: View source / Check evidence / Crystallize / Ask a question / Open a Thought Thread / Handoff / Copy / Delete.
- Primary remains capped at three, and More stays capped at six rows.
- Secondary actions exclude anything already shown as primary.
- `run-settings` is gone.
- `crystallize` is no longer mislabeled as Organize.

`Ask` is the person's own question and `Ask a question` is the AI one, so neither has to guess what the
other means. For a 3+ selection the primary column is full, so the composer appears in More; that is
the only case where More's six rows outnumber the actions, and Delete keeps its keyboard shortcut and
its palette entry there.

## 14. More changes

More no longer includes 本次设置. It holds the composer, the Thread place and the AI question preview
alongside the real supported secondary operations such as source, evidence, Crystal, handoff, copy,
or delete depending on the selected scope. No filler action was added.

## 15. Placement implications

Action Preview and 理一理 use the centroid of the selected Thoughts, converted through the existing Field screen-coordinate API, then rely on the existing anchored `Surface` floating/flip/shift behavior. The selected Thoughts are not moved to make space.

## 16. Tests added / updated

`tests/unit/contextualActionModel.test.ts` was updated for the new `organize` dependency, the 3+
selection mapping and the restored secondary entries. It also asserts that `run-settings` does not
reappear in secondary actions, and the primary bounds stay pinned at three.

`tests/e2e/phase3d1.spec.ts` (new) holds the interaction contracts in a real browser: Continue states
its run before it starts and does not open a Thread, the Thread place keeps its own entry, Ask hands
the scope to the focused composer while the AI question preview is its own command, and a 3-Thought
理一理 opens a proposal surface whose Cancel leaves canonical relations untouched.

`tests/e2e/field.spec.ts`, `friction.spec.ts`, `hardening.spec.ts` and `redesign.spec.ts` were
re-pointed at the flow that changed: the ordinary thinking path now goes through the action's own
preview, the Thread place is reached through More, and the one-run override lives in the preview
instead of a generic Run settings command.

## 17. Dogfood scenarios

The intended focused scenarios are represented by the interaction contracts and by the new browser
specification:

- A — one Thought: Continue / Another angle each show a prediction panel before execution, while Ask
  still hands the scope to the composer.
- B — two Thoughts: Find relation keeps the existing real relation path.
- C — several Thoughts: 理一理 opens a proposal surface; Apply / Try another / Cancel are explicit.

## 18. Dogfood findings

The comprehension failure this pass addresses was structural rather than a lack of capability: Run
settings was detached from the action that needed it, and Organize was mapped to Crystal formation.
The new flow moves execution choices into the action and separates semantic organization from
commitment.

Running the browser gate then exposed a second, larger failure the static inspection had missed: with
`ask` and `continue-thinking` re-pointed at the previews, nothing in the product opened the composer or
the Thread place any more. Both are explicit entries again, and the browser gate holds them.

## 19. Commands run

- `npm test`
- `npm run typecheck`
- `npm run check:offline`
- `npm run build` (through the Playwright gate's own web server)
- `npm run test:e2e`

## 20. Passed / failed / blocked gates

PASS:

- `npm test` — 280 unit tests, 34 files
- `npm run typecheck`
- `npm run check:offline` (static imports, Core independence, strict Core typecheck, EN/ZH coverage, offline suite, source-size / cohesion gate)
- `npm run test:e2e` in installed Chromium against the production bundle: 139 passed / 8 skipped in the
  full serial suite, with every specification this pass touched re-run green on its own (field.spec 25
  passed; the touched set 43 passed). The one remaining full-suite failure was an unrelated page-load
  timeout in `phase28b.spec.ts`, which is green on its own re-run.

A first release of this pass shipped without the composer and the Thread place wired to anything, and
the browser gate said so: 16 of the existing specifications failed because `Ask` no longer reached the
composer and `Continue thinking` no longer reached the Thread place. Both entries are restored above,
the specifications that encode the changed path were re-pointed at it, and the gate is green with the
new contracts covered.

BLOCKED: none.

## 21. Remaining known issues

- For a 3+ Thought selection the primary column is full, so the composer sits in More and More's six
  rows drop Delete from the menu (its keyboard shortcut and palette entry still work).
- Another angle continues to use the existing DiffuseSession step grammar internally; the new top-level prompt makes the action distinction explicit, but a future small cleanup could give DiffuseSession action-specific step prompts if dogfooding shows the generic angle-step hints fighting the contract.
- No manual Group command was introduced because the current architecture has no honest explicit grouping primitive; this matches the “do not invent capabilities for symmetry” constraint.
- Interactive dogfooding of the preview's placement against a real selection was only covered by the
  automated contracts above, not by a person watching it.

## 22. AI prompts changed and why

Yes, narrowly:

- Continue gets a prompt that requires forward continuation and rejects question/reframe output.
- The AI question preview gets a prompt that requires question-oriented output.
- Another angle gets a prompt that rejects continuation/restatement.
- 理一理 gets a prompt that asks only for grounded structure among supplied Thoughts and prefers relation proposals.

The composer's own question is not an AI prompt and was not touched.

These changes are limited to enforcing behavioral distinctions introduced by Phase 3D.1.

## 23. Broad language rewrite

No broad AI language rewrite was performed. `LANGUAGE_CONTRACT.md`, Quiet Realism, the text ownership work, anti-AI catalogue, examples, and regression corpus were not redesigned or removed.

## 24. Commit / push

Committed and pushed on `phase2-ui-motion` together with the entry-point restoration, the updated
specifications and the new browser contracts. No destructive git operation was used.
