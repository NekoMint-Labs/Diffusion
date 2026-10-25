# C desktop writing and tutorial polish

Updated: October 25, 2026. Based on `59f1e28c24d9965b756b3a6988bae7635def0f9b`.
Status: review candidate; final interaction and native acceptance remain pending.

## Problem and behavior

Composition Escape could exit the writing surface while the input method still owned the key.
Find cleared its query on explicit dismissal, but retained it when another surface or menu replaced
it. Tutorial hints could react to typed `f`, optional preference failures could interrupt the UI,
and guidance could cover writing or an actionable notice.

The patch keeps composition Escape/Enter with the input method, ends a Find session whenever its
surface is replaced, and gives the read-only full-text body keyboard scrolling. Tutorial progress
is checked before use; failed optional reads/writes fall back without blocking writing or dismissal.
Focus coaching follows a Field-consumed gesture. Guidance measures writing clearance and shares
the notice reservation. Button/menu feedback and shortcut labels use existing presentation tokens.

Ownership remains in the existing UI modules. Canonical content, Thought positions and connections,
storage schemas, dependencies and native permissions are unchanged.

## Review and verification

The latest local Windows x64 candidate was compiled on October 23. A file-only audit on October 25
verified its 1,013 package files, found no source-input drift, and confirmed that four earlier
executables and the previous daily launcher were retained. This is compilation and file-integrity
evidence, not evidence of correct behavior in a running app.

Current non-runtime checks on October 25 passed: TypeScript compilation of application and test
sources (`node node_modules/typescript/lib/tsc.js --noEmit`), locale coverage, source-size policy,
`git diff --cached --check`, and 55 relative links across five repository/local handoff documents.
These checks did not invoke a test runner, browser, preview server or desktop application.

The requester has paused desktop interaction and runtime tests. The current source has not received
its final regression run. Earlier passing results precede the final tutorial layout/read repairs
and must not be reported as a pass for this candidate. Generated local packages, logs and recordings
are not included in the source contribution.

Prepared regression coverage:

- `tests/unit/composerKeyboard.test.ts`: ordinary keys and both composition markers.
- `tests/unit/findSession.test.ts`: replacement, reopening, selection and return-state preservation.
- `tests/e2e/writingContinuity.spec.ts`: composition/drafts, Find replacement, keyboard reading and
  tutorial/notice clearance.
- `tests/e2e/tutorialResilience.spec.ts`: text-owner input and unavailable/damaged preferences.
- `tests/e2e/tutorialCoachClearance.spec.ts`: idle, multiline and contracted writing at three sizes.

After runtime testing is authorized, run the repository gates in [TESTING.md](TESTING.md) and the
three interaction files above. Record results for the actual commit and build being reviewed;
keep failures, zero retries and the existing assertions. The three focused interaction files
currently define 23 cases; that is a planned count, not a recorded result.

Before promotion, collect current light/dark and reduced-motion screenshots, then separately verify
real Windows Chinese input-method candidate selection, focus return, dialogs, reopen and persistence.
Automatic checks do not complete these native acceptance items. Keep the contribution in draft
until its final automated and visual review evidence is available.
