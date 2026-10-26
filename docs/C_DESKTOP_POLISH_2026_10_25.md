# C desktop writing and tutorial polish

Updated: October 25, 2026. Based on `59f1e28c24d9965b756b3a6988bae7635def0f9b`.
Status: draft for independent review. Automated evidence, isolated Windows installation/overwrite
upgrade, and four actual Windows display scales passed for production revision
`3abadd43db9c1d77c8142f6edd46c2323b2e13e5`.

## Problem and behavior

Composition Escape could exit writing while the input method still owned the key. Replacing Find
could retain its query. Tutorial hints could react to typed `f`, unavailable or damaged optional
preferences could interrupt the UI, and coaching could obstruct writing, notices or a practice target.

The patch keeps composition Escape/Enter with the input method, ends Find when its surface is
replaced, and makes the read-only full-text body keyboard scrollable. Tutorial progress is validated;
optional preference failures fall back without blocking writing or dismissal. Focus coaching follows
a Field-consumed gesture. Guidance reserves writing/notice space and leaves the practice target
reachable where room permits. Button/menu feedback uses existing presentation tokens.

Actual 200% Windows scaling exposed another writing overlap: a naturally wrapped two-line draft
animated the form's position while coaching measured its temporary projected rectangle. A resize
observer did not measure again when that transform settled. Coaching now reserves the form's
settled layout bounds relative to its parent. The regression first failed on the old measurement,
then passed with normal motion at the equivalent small work area, including contraction after editing.
The installed repair also passed the original 200% scenario with a real Chinese input-method popup.

Changes stay in existing UI owners. Canonical content, Thought positions/connections, storage
schemas, dependencies and native permissions are unchanged.

## Automated verification

The following results name production/test revision `3abadd4`; later documentation does not change
those inputs. See [PR #78](https://github.com/NekoMint-Labs/Diffusion/pull/78) for current-head checks.

| Evidence | Result |
| --- | --- |
| [Remote CI](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40177721484) | Typecheck, 315 offline contracts, 73 unit-test files / 662 tests, and production build passed |
| [Full remote E2E](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40177721467) | 454 passed: interaction shards 152 + 126 + 145, backgrounds 31; 12 existing development-only skips; zero configured retries; gate passed |
| Local frozen v6 candidate | 662 unit, 315 offline, 93 related browser cases, and a separate 24-case real-production recheck passed |
| Local report sealing | No browser skips, unexpected/flaky results, retries or global runner errors; report times, source/test/config hashes, frontend inventory and candidate hash checked |
| Windows x64 debug package | 481 stable compilation inputs; 1,013 delivery files checked; old packages and daily launcher retained |

Application/test TypeScript compilation, locale coverage, source-size policy, syntax/contracts,
discovery checks and `git diff --check` passed. Browser checks used production assets and the real
background, one worker and zero retries. A normal-motion natural-wrap case supplements the earlier
Reduced Motion clearance cases; browser viewport/device-scale emulation is not the native DPI evidence.

Five regression files cover composition ownership, Find lifetime, durable authored responses,
keyboard reading, optional preference resilience and tutorial clearance. The three focused browser
files now define 24 cases. The response-reload case observes the IndexedDB wording and lineage before
navigation, then checks the restored UI. No sleeps, retry/skip additions or assertion relaxation are used.

Earlier failed runs, old compile-only candidates and v5 reports remain separate. The v5 isolated
native smoke covered composition Escape/Enter, Space candidate selection, multiline response saving,
reader scroll/focus return, Find replacement, Settings return, native Markdown Save As and two reopen
cycles. Those historical checks are not relabeled as a new exact-binary v6 run.

## Installed Windows verification

Only synthetic content was used. Standard Tauri NSIS debug installers used a separate product name
and identifier, `app.diffusion.installcheck.20261025`, with the identifier's default WebView profile.
There was no custom NSIS template or custom WebView data-directory override. The normal application
profile was never launched or inspected.

- Installed older source `be993c27336c0425ea8d9a14dbdb418db2228659`. Its configuration declares
  **0.3.0**, even though earlier release-history notes called that revision 0.3.15.
- Created a named Field, a long Chinese original and a sourced response through the native UI;
  changed appearance to Graphite Night; exported the project before upgrading.
- Closed the app, then overwrote the same user-selected installation directory with **0.3.16**
  at `3abadd4`, selecting **Do not uninstall**. Exported again and compared the complete canonical
  `project` object: wording, IDs, positions, `derivedFrom` and relations were exactly equal.
  Dark appearance remained selected. A further close/reopen restored the Field and both Thoughts.
- Verified installed executable bytes against the compiled payload after Tauri's expected three-byte
  `UNK` to `NSS` bundle marker change. The new installed SHA-256 is
  `569380faad7a3a4b3d27572fa8c185b783ef8f84b20666df53ae28c1cc059d82`.
- Changed actual Windows display scaling through Settings to **100%, 125%, 150% and 200%** on the
  2160 x 1350 display. Read-only `GetDpiForWindow` recorded **96, 120, 144 and 192**, with per-monitor
  awareness. The same installed process retained its draft across changes. Writing/tutorial layouts,
  the settings/menu paths and the 200% Chinese candidate popup were usable. The natural two-line
  200% draft no longer overlapped coaching after the animation settled.
- Restored the original **150% recommended** system setting and confirmed DPI 144. Closed the test
  app and the Settings window. The app's separate interface-size preference stayed at 100%.

An initial test-only absolute `frontendDist` path produced a file-not-found page. Rebuilding the
fixture with native-project-relative embedded assets corrected the harness; failed fixtures remain
archived separately. This was not changed in production configuration. The tested new installer's
frontend inventory matches frozen candidate v6. Its isolated identifier changes the executable hash,
so it is not the normal-identifier portable binary.

## Remaining boundaries

Independent review, a signed release/normal-profile launch, native import/restore and live-provider
acceptance remain open. The overwrite upgrade above is verified; the uninstall-before-install route
was not run after automatic review flagged possible data loss. No uninstaller or profile cleanup was
used to bypass that restriction. These results do not establish every historic release migration,
multi-monitor behavior, physical hardware variants or long-session stability.

Local packages, synthetic exports, screenshots, receipts and build overrides remain outside the PR.
The latest local handoff keeps the frozen candidate and its evidence together. Keep the PR Draft;
the daily launcher still points to the earlier package. No merge or release promotion is implied.
