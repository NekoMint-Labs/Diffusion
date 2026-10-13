# C follow-up: reviews, search preview and navigation

## GitHub input and executed actions

The operator approved [#49 navigation](https://github.com/NekoMint-Labs/Diffusion/issues/49#issuecomment-6139794827), additionally requiring a discoverable keyboard return after dismissal. A requested #63 changes because a noisy search preview dropped sentence prefixes. B incorporated C's receipt fix and requested refreshed reviews.

C re-reviewed actual current-head source/test differences and read back each exact head's CI and full Playwright workflow success, then submitted:

- [#60 Approval](https://github.com/NekoMint-Labs/Diffusion/pull/60#pullrequestreview-5499961078), `2aabff62d3a692c9814286f2cb3804766ea69507`: pointer-frame control layout and cancel positioning.
- [#61 Approval](https://github.com/NekoMint-Labs/Diffusion/pull/61#pullrequestreview-5499961357), `46b30c0210217f375a529c70580c7ed354cd8997`: relation controls in the existing obstacle list.
- [#65 Approval](https://github.com/NekoMint-Labs/Diffusion/pull/65#pullrequestreview-5499961595), `4c15485d4a77883963201a088f0255ed5918823d`: adopted C receipt correction and unchanged regression, replacing C's old Request Changes. A independently approved the adopted repair too.

These reviews used current source and remote checks, not a claimed fresh local execution of each independent head. No main merges or Draft/Ready transitions were performed by C. Main is now `5a47bff` (operator merged #53 after #66/#52); remaining stacked A integration starts with #54. A/B own their current restack/document review follow-ups.

## Changed

`208d20a` improved the initial negative-sentence case but was incomplete: A/B reproduced dropped qualifiers around `e.g.`, `0.05` and `1.2`, and the mounted dictionary test failed. All three additional semantic cases failed locally before `a238b44`. That correction rejects numeric/dotted/short-abbreviation period boundaries and ambiguous continuations; it never jumps directly to a query occurrence. The reported dictionary uses its entire explicit heading after the pronunciation/XP table, retaining its source wording. The existing mounted dictionary acceptance remains unchanged. If a safe body boundary is unavailable, navigation wording can remain. This changes presentation only, not raw source, provider behavior or read evidence. No new search backend or generated answer mode is included.

`9e826fa` implements #49 using existing FieldHandle/CameraController authority. A separate ephemeral return point captures exact camera and selection before the first explicit reveal; subsequent Find/Overview reveals share it. Ordinary close/Escape preserves view, selection, drafts and requests. Explicit return restores surviving selected IDs, clears the excursion and focuses the Field. Field switch/reload ends its lifetime. A visible native button in the compact entry row survives panel dismissal; Find also offers it. Both support keyboard operation.

Explicitly collapsed branches resolve to their visible ancestor without changing disclosure. Overview Enter respects IME; missing targets and zero matches do not navigate. Existing bounded panels, composer/ReadWindow priority and explicit AI authority remain. Find is excluded from the older surface-close camera/cancel behavior. The main merge `6eb4e72` changes ancestry only; its source tree is identical to the preceding navigation commit.

`efd2ec3` repairs diagonal travel from More into a tall submenu. The expanded 59-case run had 57 passes and two pointer-travel failures. A diagnostic run independently reproduced both, showing trigger-hover close when travel crossed the trigger's bottom edge on its way into the taller popup. A bounded geometry corridor now retains that travel; leaving the corridor still closes using the original 400ms delay, and click pinning/Escape/outside dismissal retain their separate paths. Diagnostic console statements were removed. Existing mounted assertions/timeouts are unchanged.

The C combination now includes main `5a47bff`, current #54 `3c6f771` and B-approved #55 `378a91e` through `ef88eb5`, `3f4044d` and `aff07b1`. Main conflicts retained the stronger bounded Continue instruction and added the new authored-Ask recall regression. #55 conflicts retained C failure recovery and selected A's refreshed bounded-excerpt comparison plus its six new stale-goal/budget tests. The runtime recompiles with original request options, rejecting newly appended supplied goals without rejecting unchanged truncated context or unsupplied suffixes. These are local integration merges, not main delivery.

## Verification and honest limits

- 642 unit tests across 71 files and 315 offline contracts passed; application/Core types, syntax/imports, 1008 locale keys, source-size and frontend build passed.
- The combined 68-case browser run passed 65 and failed three newly authored fixtures only at an unconditional original-expander click: the entire raw text was already displayed, so the existing product correctly omitted that redundant control. `575bcea` corrects these fixtures to assert exact full raw text, retained qualification, no redundant expander, candidate-only status and no assessment. The complete six-case snippet suite then passed, including the unchanged dictionary and raw-model-passage tests. The existing Find navigation case also passed. Together these cover 69 distinct cases on the same production source, with one worker and zero retries/skips. This is a recorded split qualification, not a claim that the original 68-case invocation passed. Raw logs remain local on D:.
- Retained initial failures: first 44-case run had six low-zoom reveal failures caused by setting selection after refresh (fixed by setting it first), one Chromium screenshot-capture error, and one queued focus restoration failure (fixed by invalidating the former owner's epoch). Later tests exposed fixture mistakes: selected state temporarily hides the unscoped composer, and selecting a Thought updates attention metadata. Tests now reopen the composer and compare against the post-selection baseline, preserving exact camera/selection and full stored-content assertions. No retry/skip/timeout increases.
- Two existing folded-Find expectations were updated to the expressly approved #49 ancestor behavior; hidden children remain hidden, and explicit return still restores exact camera. The original assertions were incompatible with the new product contract, not weakened to hide a failure.
- CI/E2E for a new published head must be read separately; old-head success is historical evidence only.
- Installed Windows IME/DPI/trackpad/reopen, real network/AI/Verify and long-session acceptance remain unverified. #11/#12 stay open. The 0.3.14 installer remains `2c82f50` and does not include this follow-up; no new installer or stable release is claimed.

## Next owners

A re-reviews the search-prefix fix; B re-reviews #49 panel/focus/IME/return compatibility. C keeps #63 Draft until combined changes receive independent review and their checks finish, then prepares a corresponding desktop candidate for operator acceptance. Remaining real-source Verify quality/configuration and Windows scenarios must be recorded honestly with the operator.
