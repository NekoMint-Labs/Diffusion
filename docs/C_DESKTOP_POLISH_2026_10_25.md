# C desktop writing and tutorial polish

Updated: October 25, 2026. Based on `59f1e28c24d9965b756b3a6988bae7635def0f9b`.
Status: draft; production-source evidence is recorded below, latest regression results are in PR #78.
Local production receipts, native acceptance and independent review remain pending.

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
The coach also leaves its current practice Thought/Ghost reachable where there is room above it;
this closes a 600-pixel-window occlusion found in the remote screenshots without moving Field objects.

Ownership remains in the existing UI modules. Canonical content, Thought positions and connections,
storage schemas, dependencies and native permissions are unchanged.

## Review and verification

Production source revision: `8df77cce2d772b8c33e9a58e5870938b8eb5ea5a`, including practice-target clearance.
Later documentation and test-readiness follow-ups do not change production code. The following
table records evidence for that named revision; see
[PR #78](https://github.com/NekoMint-Labs/Diffusion/pull/78) for the latest test/review head and checks.

| Evidence | Recorded result |
| --- | --- |
| [Remote CI](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40169588929) | Typecheck, 315 offline contracts, 73 unit-test files / 662 tests, and production build passed |
| [Full remote E2E](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40169588933) | 453 passed, 12 existing development-only skips, zero retries; all three interaction shards, real backgrounds and the gate passed |
| [Current screenshots](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40169588933/artifacts/12589394028) | Inspected 600px light practice-target/writing clearance and 900px dark notice clearance; Reduced Motion fixtures |
| Local Windows x64 candidate v4, compiled October 25 at the named revision | 481 unchanged compilation inputs; 1,013 package files audited with no source drift at that revision; previous executables and daily launcher retained |

Later test-only changes require a fresh input snapshot before local evidence sealing. The latest
candidate's revision and file audit are recorded in the local handoff. Compilation and file
integrity do not prove behavior in the installed desktop app. The daily launcher still uses the
previous local build. Generated packages, logs and recordings are not included in this contribution.

Local non-runtime checks passed: TypeScript compilation of application and test sources
(`node node_modules/typescript/lib/tsc.js --noEmit`), locale coverage, source-size policy,
`git diff --check`, and relative handoff/document links. The requester has authorized GitHub-hosted
CI while keeping desktop interaction and local runtime tests paused.

Earlier failure evidence is retained: the initial remote run exposed four incorrect test
assumptions, and intermediate screenshots exposed the narrow-window target occlusion. The final
cases use the actual response-save action and check current writing/target geometry and freed
notice space. They retain the case count, zero retries and original notice-clearance assertions.
Older local 86-case/17-case reports predate the final repairs and do not qualify candidate v4.

A documentation-only rerun at `4aa612c` exposed one reload-readiness race in the new composition
case: it reloaded after the response painted but before the asynchronous IndexedDB write completed.
The case now checks the actual stored wording and lineage before navigating, and still checks both
after reload. No save behavior, timeout, assertion strength, test count or retry setting is relaxed.

Regression coverage:

- `tests/unit/composerKeyboard.test.ts`: ordinary keys and both composition markers.
- `tests/unit/findSession.test.ts`: replacement, reopening, selection and return-state preservation.
- `tests/e2e/writingContinuity.spec.ts`: composition/drafts, Find replacement, keyboard reading and
  tutorial/notice/practice-target clearance with unchanged Thought coordinates.
- `tests/e2e/tutorialResilience.spec.ts`: text-owner input and unavailable/damaged preferences.
- `tests/e2e/tutorialCoachClearance.spec.ts`: idle, multiline and contracted writing at three sizes.

The three focused interaction files define 23 cases. Their latest results, including the added
durable-save precondition, are reported for the exact review head in PR #78.
Their separate local production-background run and the local candidate's evidence-sealing procedure
remain paused. After local runtime testing is authorized, use [TESTING.md](TESTING.md) and the
candidate's handoff; record results for the actual source and build without reusing older reports.

Before promotion, independently review the patch and separately verify real Windows Chinese
input-method candidate selection, focus return, dialogs, reopen and persistence. Remote tests and
screenshots do not complete these native acceptance items. Keep the contribution in draft until
the remaining review and acceptance work is complete.
