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

The local integration branch starts from PR 77 (`26b6e6c`) and includes C's current desktop/input
fixes through `e810321` via merge. Existing local glass-card and answer-quality branches remain
untouched. These are local integration choices, not a claim that any of the branches were merged
into remote main. The previously requested notebook reset button is retained.

## Verification

`tests/unit/answerPreview.test.ts` covers compact openings, limits and Unicode boundaries.
`tests/e2e/answerPreview.spec.ts` checks mounted Field reading, Keep/reload/continuation of full
wording, and Thread disclosure without rewriting history. The notebook browser test checks scope
isolation and sharing in actual outgoing fixture requests, rather than exposing internal JSON.

Fixtures verify behavior, not live-model judgment. No live request, native package acceptance,
provider-quality comparison, role personalization or remote publication is claimed here.

Local results on 2026-10-25:

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
