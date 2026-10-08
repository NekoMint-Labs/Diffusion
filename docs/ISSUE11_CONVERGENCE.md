# Issue 11: second convergence pass

This pass addresses #20, #21, #23, #24 and #28 on main `4191bb02a88797a654ea49524a79896d28ece0d3`, after PR #17 merged. The agreed scope is recorded in [the Issue 11 kickoff](https://github.com/NekoMint-Labs/Diffusion/issues/11#issuecomment-6050924384). No AI prompts, context, provider/runtime semantics, public model or storage migration changed.

| Issue | Result | Reproducible coverage |
|---|---|---|
| #24 zoom and movement | Small reversible pointer-anchored zoom; explicit folds and selection are independent. Moving a parent carries all effective committed descendants, including folded and offscreen nodes, once. Atlas anchors preview that same movement and restore on cancellation. A child moves only its subtree. | `hierarchyPresentation.spec.ts`, `nativeAcceptance.spec.ts`, `fieldConvergence.spec.ts`; camera, disclosure and subtree unit cases |
| #21 menu position | Every menu invocation remounts the existing positioner at the fresh pointer/button anchor, with the existing transient epoch and focus ownership guards. | Pointer A to B to header button to viewport edge; Escape return focus; existing hardening/overflow cases |
| #23 Keep wording | Chinese tutorial instructions and the ownership explanation say 留下, consistently with the existing action. | Chinese tutorial through generation, movement, Keep and completion |
| #20 digits | Display and editing share lining/tabular numeric features and a local-only numeric face. Non-numeric editorial text and Source typography retain their existing families. Canonical content stays exact. | Long numeric lines, 0.3.0, equal-width repeated digits, edit and reload |
| #28 Ghost | Dashed outline supplements the existing provisional material and pencil rail. Text stays readable; Keep restores the normal Thought material with the same ID and position. | Unselected light/dark, 1280 by 720, Reduced Motion, normal and about 0.63 camera zoom; four profiles across five real backgrounds |

The previous zoom/depth hook and status component were removed. `hierarchyDisclosure.ts` remains the single visibility projection, the camera remains the sole transform owner, and `subtree.ts` uses the existing cycle-safe effective hierarchy. Original provenance, nested explicit folds, undo/redo and persisted geometry remain under their existing owners. Distant Atlas uses compact anchors and the existing bounded reading entry; unfolded descendants retain fit bounds without becoming full cards at every scale.

## Verification on Windows, 2026-10-08

| Layer | Command / evidence | Result |
|---|---|---|
| Dependency-backed application types | `pnpm run typecheck` (direct TypeScript entrypoint locally) | Pass |
| Unit | `vitest run --maxWorkers=1` | 47 files, 347 passed |
| Offline contracts | `run-offline-tests.mjs` with `NODE_OPTIONS=--no-experimental-global-navigator` | 266 passed, zero skips |
| Syntax/imports, core types, locales, source size | Existing offline-check, core TypeScript, check-locales and check-source-size scripts | Pass; no missing translations |
| Production bundle | Vite build with `VITE_E2E_LIGHTWEIGHT_BACKGROUND=1` | Pass; existing chunk-size warning remains |
| Mounted production E2E | `playwright test --reporter=line`; production preview at 127.0.0.1:4173; one worker, zero retries | **276 passed, 12 skipped, zero failures** |

The 12 skips are the existing dev-only Motion Lab and Material Gallery cases, whose separate dev server was not started. They are excluded from the production pass claim. Both production-backgrounds tests and the twenty profile/background object-material cases ran. Browser fixtures and the file named `nativeAcceptance.spec.ts` remain browser evidence, not actual Tauri acceptance or real-provider qualification.

The first complete E2E run reported 271 passed, five obsolete assertions failed, and 12 dev-only skips. The failures expected old wheel distances or used branch expansion instead of the Atlas anchored-reading entry. They were classified, updated to the agreed contract, run individually, and followed by the complete zero-retry run above. No assertion was weakened, skipped or retried to suppress a regression. The initial environment lacked the locked Chromium revision; the official Playwright browser was installed. A concurrent unit repeat hit the unchanged real-socket test's assumption that an adjacent OS port is free; the final complete serial unit run passed unchanged. Original diagnostics remain under local ignored `verification/issue11-convergence/initial-failures` and the run logs.

## Inspect and reproduce

Screenshots are generated test evidence and remain outside Git under `test-results/` and local `verification/issue11-convergence/`. Key outputs include `digits-editing.png`, `digits-saved.png`, `replacement-menu-edge.png`, `moved-subtree.png`, `unselected-proposal.png`, `compact-unselected-proposal.png`, `committed-proposal.png`, and `chinese-keep-tutorial.png`. They show controlled mounted fixtures; no whole-frame baseline was rewritten.

Run the standard type, unit, offline and E2E commands in [TESTING](TESTING.md). On Windows, start the Vite production preview explicitly at 127.0.0.1:4173 before Playwright, because the existing automatic webServer command uses POSIX environment assignment. Use the locked dependencies and `playwright install chromium`. The local pnpm launcher was unavailable; its installed entrypoint and direct Node CLI entrypoints were used without changing the lockfile or global package-manager settings.

## Native acceptance boundary

No new Windows installer was operated in this pass. Keep Issue 11 and the related feedback issues open and the PR in draft until the matching Windows/Tauri build is checked by an operator. That check must cover actual OS wheel input/pinch, parent and child movement with folded/offscreen descendants, cancellation and undo/redo/reopen, pointer/button menu replacement and focus return, Chinese IME and 留下, numeric reading/editing, and Ghost distinction before/after Keep at normal working zoom and OS scaling. Native compilation, CI and browser-scale fixtures each need their own evidence; none substitutes for that operator check.

## Remote CI numeric fallback follow-up

The first PR run passed the type/contracts/unit/build gate, interaction shards 2/3 and 3/3, and production backgrounds. Shard 1/3 passed 86 cases and failed the repeated-digit width assertion on Ubuntu: its local font inventory lacks Segoe UI/Arial/Helvetica, so the numeric face fell back to the editorial family. Linux local Liberation Sans, DejaVu Sans and Noto Sans fallbacks were added without a network font dependency. The width assertion now measures rendered DOM glyphs with the authored numeric features rather than a canvas font shorthand that omits those features. The corrected convergence file was rerun locally (10 passed, zero retries); the updated PR runs the complete CI gates again.