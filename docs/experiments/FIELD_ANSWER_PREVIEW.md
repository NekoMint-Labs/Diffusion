# Field answer previews

The Next notebook is a behavior-testing surface, not a replacement for the production Field design.
Requester feedback on 2026-10-25 approved key information first, a character limit, and raw context
inspection only for debugging. This change applies that presentation to the existing Field and
Thread rather than turning the notebook layout into the product.

## Scope

- Pending model candidates show at most 120 Unicode characters, including the omission marker.
- Suggestions and ordinary Thread answers disclose complete text on an explicit read action.
- Existing Field full-text reading and Deep Dive expose the complete original wording.
- The provider prompt asks for a self-contained opening with the key condition or uncertainty.
- No extra summarization request is made. The excerpt is not represented as a verified summary.
- Keep, continuation context, histories and exports retain the original answer. No migration.
- The notebook JSON inspector is compiled only in development. Notebook data is preserved.
- Exploration orchestration, branch sharing and notebook checkpoints remain experimental; this
  change does not claim that the complete notebook engine has been integrated into Field.

## Integration

The local preview integration branch starts from PR 77 (`26b6e6c`) and includes C's desktop/input
fixes through `e810321` via merge. Existing local glass-card and answer-quality branches remain
untouched. These are local integration choices, not a claim that any of the branches were merged
into remote main. The previously requested notebook reset button is retained.

The delivery branch `feat/b-field-answer-preview` is stacked directly on
`feat/next-exploration-trial` (PR 77). Only the B change was cherry-picked onto it; C's PR 78 and
PR 79 are separate and are not included in this PR's diff. The local integrated preview remains
available without changing the requester's browser data.

## Verification

`tests/unit/answerPreview.test.ts` covers compact openings, limits and Unicode boundaries.
`tests/e2e/answerPreview.spec.ts` checks mounted Field reading, Keep/reload/continuation of full
wording, and Thread disclosure without rewriting history. The notebook browser test checks scope
isolation and sharing in actual outgoing fixture requests, rather than exposing internal JSON.

Fixtures verify behavior, not live-model judgment. No live request, native package acceptance,
provider-quality comparison, role personalization or remote publication is claimed here.

Integrated preview results on 2026-10-25 (includes C's fixes through `e810321`):

- `pnpm test`: 75 files, 685 tests passed.
- `pnpm run check:offline`: syntax/import checks, core types, locale coverage, 315 offline tests
  and the source-size check passed.
- `pnpm exec playwright test tests/e2e/answerPreview.spec.ts tests/e2e/nextExploration.spec.ts
  tests/e2e/suggestionReviewKeyboard.spec.ts tests/e2e/surfaceReadability.spec.ts
  tests/e2e/proposalLocality.spec.ts tests/e2e/response.spec.ts
  tests/e2e/sourceImportLifecycle.spec.ts --project=interaction`: 47 passed. Its web-server setup
  also ran the application typecheck and production build successfully. This is a targeted run,
  not the full browser suite or remote CI. Existing large-chunk build warnings remain.
- Screenshots inspected for light/dark Field candidates, Thread and the Suggestions reader.
- The first browser run passed 18 and failed 2 new tests because they compared normal attention
  timestamps with untouched seeded timestamps. The assertion now compares source identity,
  wording, coordinates and kind; it still verifies complete saved answers and continuation input.
  Original browser artifacts are retained under ignored
  `verification/field-answer-preview/first-browser-run/`.
- The first concurrent offline check encountered a disappearing Playwright output file. Running
  it after the browser runner finished passed without changing the checker.

Standalone delivery results on 2026-10-25 (PR 77 base, without C's tests):

- `pnpm test`: 73 files, 672 tests passed.
- `pnpm run check:offline`: passed, including 315 offline tests.
- `pnpm exec playwright test tests/e2e/answerPreview.spec.ts tests/e2e/nextExploration.spec.ts
  tests/e2e/suggestionReviewKeyboard.spec.ts tests/e2e/surfaceReadability.spec.ts
  --project=interaction`: 21 passed; setup also passed typecheck and the production build.
- `git diff --check`: passed. Documentation clarification is the only subsequent change.
- Neither local browser run is a full browser-suite or live-model quality claim.
Remote CI repair on 2026-10-25:

- PR 80 head `8f589f0fa60fca74dadca372eae117debaad0d1f` passed typecheck, contracts,
  tests and build, plus Interaction 2/3, Interaction 3/3 and production backgrounds.
- Interaction 1/3 failed in eight pre-existing assertions because they treated the new
  bounded preview as the complete answer and expected Tab to skip the native disclosure
  control. The failures did not indicate data loss or a failed production build.
- The original remote diagnostics and the pre-fix local reproduction are retained under
  `verification/ci-40193195999/`.
- The repaired browser coverage checks the 120-character preview boundary, explicit full-text
  disclosure, complete wording after Keep, persisted continuation wording and the updated
  keyboard route. The focused repair run passed 19/19 tests.
- Full local `pnpm run test:e2e`: 440 passed, 12 skipped and 2 failed. Both failures were in
  unrelated, unchanged tests (`diverseExploration.spec.ts` and `fieldManagement.spec.ts`);
  rerunning those exact cases alone passed 2/2. Preserve this as a non-green full-suite result.
- PR 80 head `ea216f4d83c5ee2f54ea1b97e6e25d624eca88bd` passed all six required checks:
  typecheck/contracts/tests/build, Interaction 1/3, Interaction 2/3, Interaction 3/3,
  production backgrounds and E2E gate. Runs: `40202375928` and `40202375936`.
- This recorded result is for the code-and-test repair commit; this documentation update is a
  follow-up and will receive its own required PR checks.
