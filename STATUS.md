# Diffusion — current status

Diffusion is a quiet thinking medium for ideas before commitment. This file describes the current checkout: what works, which subsystem owns it, what was freshly verified, and what remains incomplete. It is not a changelog. Historical phase reports and prior verification records remain under [`docs/history/`](docs/history/README.md).

## PR #18 main synchronization (2026-10-10)

This candidate merges main `feb8ac5` (including reviewed #32) into uploaded #18 `fff70f0`.
Conflict resolution retains both measured reading/response action bounds and the new connection
legend parameters, both locale additions, and revision-scoped status history. Application/core
types, static imports, 968 locale keys, source-size policy, production build, 463 unit tests and
266 offline tests passed. A first offline attempt hit this machine's Git ownership boundary;
the rerun with command-scoped trust passed without changing assertions. Production Chromium
navigation, response, continuationPlacement and proposalLocality: 38 passed, zero retries.
This is focused integration coverage, not a new full-suite or live-model acceptance result.
Keep #18 Draft and #10 open. Uncommitted local relation/Organize trials are not part of this upload.

## PR #18 integration (2026-10-09)

This candidate synchronizes merged main 2874e8f and integrates the pre-mount continuation repair from #31 (787a88f) and measured-arrival correction from #30 (52f820b). The Field conflict retains main's zoom/subtree behavior and #18's reading, response and action-measurement bindings. Final combined local validation: 57 files / 463 unit tests, 266 offline contracts, application/core types, 960 locale keys, source-size policy and production build passed. The eight-file targeted production browser suite passed 58 cases with one worker and zero retries, including the previously failing dark three-continuation viewport case. Remote CI is evaluated on the uploaded head separately. The complete 304-pass browser run recorded before the main/#30 integration belongs to that earlier candidate. The inherited reports below describe their own revisions and do not validate this candidate. Issue #10 model/operator acceptance remains open.

## Issue #10 follow-up: timeout and readable outcomes (2026-10-04)

Current #18 work is based on `350dcc8`, with real main `4191bb0` already integrated through `406e23b`; #17 was merged into main. #19 remains an older overlapping integration input and was not changed. The earlier records below describe their own candidates, not the current merge state.

AI requests now distinguish the 45-second deadline (`failed` / timeout) from explicit Stop (`cancelled`), including structured ingestion and late responses. Visible terminal feedback lasts about 1.8 seconds on completion or 4 seconds on failure/Stop. Windows E2E startup now passes the lightweight-background flag through `webServer.env` instead of POSIX-only inline assignment.

Fresh local verification: application/core typecheck and normal production build passed (existing chunk warning); 54 unit files / 416 tests passed; 266 offline tests, 960 locale keys and source-size checks passed. Both complete E2E projects ran serially: interaction 269 passed / 12 existing skips and production backgrounds 31 passed, zero failures and retries. After closing the old test server, the corrected Windows startup rebuilt/served and all 9 field-overlay cases passed. The earlier interrupted run's lasso failure is retained as an intermittent observation; it passed during the complete interaction run and was not weakened.

Normal localhost preview was restored after stale lazy assets caused credential-save failure. Session-only save and the real DeepSeek connection check then passed; the probe reported `deepseek-flash` for requested `deepseek-chat`. Five live calls on the same research selection produced visible proposals (Continue twice, Angle twice, Ask once), with four Ignore paths and unchanged original mounted card wording/positions. Mixed quality includes paraphrase, an unsupported independence/conclusion claim, verbosity and an invented device premise. [Closeout notes](docs/ISSUE10_CLOSEOUT.md) retain these limits without private transcripts. A1/A2/A3/A5 remain incomplete; no ready-for-review, merge or Issue closure is claimed. Final-candidate Windows native acceptance remains with #12.

## Issue #10 / #11 synchronized candidate (2026-10-03)

The independent integration draft [#19](https://github.com/NekoMint-Labs/Diffusion/pull/19) now includes #17 head `639818ad6c2a9123c9f92989f6f2bcba81936b98` (product `9377a95`) and #18 head `c9a3cc6dfe5091af158e6837a9544b2441e3309c`. Product integration is `fc3fd199d782c71fb5e9216d62d8cd53cc5d11c7`. Both complete input revisions are ancestors; #13–#16 are already included through #17.

Custom discovery readiness and Source-derived Atlas anchors now include #17's final review repairs. Scoped literal duplicate filtering, controlled connection verification and context-free Ask opener filtering now include #18's latest repairs. The sole new textual conflict merged the controlled connection route while retaining model/key/authentication and Configuration changed assertions. Existing visible-ID/measurement forwarding and camera/provenance/organization boundaries are preserved.

Local application/core TypeScript, production build, 54 files / 411 unit tests, 266 offline tests, 960 locale entries, source-size and diff checks passed. Exact-product-head [CI](https://github.com/NekoMint-Labs/Diffusion/actions/runs/37134333211) and [complete E2E](https://github.com/NekoMint-Labs/Diffusion/actions/runs/37134333208) passed: 297 passed, 12 existing dev-only skips, zero failures; all six jobs passed, one worker per runner and zero retries. The duplicate local full E2E was stopped after remote full-suite success; its partial log is retained and is not claimed as a completed pass.

Fixed-size visual follow-up is recorded in [the integration record](docs/ISSUE10_11_INTEGRATION_PREFLIGHT.md). No new native installer was produced. #12 owns final Windows acceptance and #10 retains real-model A2/A3/A5 closeout; #10/#11 remain open and no PR is merged.

## Earlier Issue #10 / #11 integration candidate (33bd1a7 + 38eab8a)

The independent `codex/integration-issue10-11` branch combines #17 `33bd1a7` and draft #18 `38eab8a`; #17 includes #13–#16. Fifteen textual conflicts were resolved while preserving selected-content priority, separate provenance/organization, user decisions over tentative AI results, original Thought coordinates and camera stability. The [integration record](docs/ISSUE10_11_INTEGRATION_PREFLIGHT.md) documents the seams, exact inputs and earlier failed evidence.

TypeScript/production build, 266 offline tests and 54 files / 400 unit tests passed. Initial full E2E: 273 passed, 18 failed, 12 existing dev-only skips. After repairs, all 93 affected and related focus/geometry cases passed, one worker and zero retries. Title-by-title evidence audit: 295 distinct final passing cases, 12 existing skips, no unresolved failures across 307 cases; this is full-run plus affected-suite evidence, not a claim of a final single all-green full run. Fresh 1280×720 light/dark render checks qualified AI settings copy, full-row suggestion review and Atlas aggregation. Read/respond controls retain 32 screen-pixel height and clear the Hub.

The independent #17 menu repair was separately built and checked (344 unit, 266 offline, 11 mounted-browser cases) before publication. This integration has no new native package or live-model qualification. The Windows and installer results in the next section belong to the earlier #17 repair pass at `19bbd42`, not this integration. #12 retains native acceptance; #10/#11 remain open and no PR is merged.

## PR #30 after the #29 merge (2026-10-09)

The [4cfd066 review](https://github.com/NekoMint-Labs/Diffusion/pull/30#issuecomment-6079498025) identified cross-request packing and offscreen-source remeasurement risks. Mounted correction now captures the existing pending operation ID synchronously from controller/UI lifecycle changes. It corrects only the latest arrival request, treats prior requests as fixed obstacles even when ordinary Ghosts have no `runId`, and stops scoped correction when no source is visible. Selected proposals retain their position through deselection and Keep; detached/restored/unknown proposals are not automatically repacked. Unscoped arrival collision correction remains intact. No Core, provider, storage or canonical coordinate contract was extended.

Final local validation for this review repair passed application/core types, import/locale/source-size gates, 266 offline contracts, 356 unit tests (48 files), the production build and 12 mounted locality/material cases, with one worker, zero failures, skips or retries. The browser assertions now compare the same proposal before selection and after settled selection as well as at Keep, including normal/reduced motion. New cases cover separate same-scope requests, pan/resize/zoom with an offscreen source, unknown/restored proposals and unscoped collision protection. Light/dark mounted screenshots were inspected. Node 22.22.2 was used locally; an installed pnpm launcher failed before tests, so local gate components were invoked directly through their declared Node entry points. Current-head complete CI/E2E is reported separately in the PR description after push.

The first new focused browser run recorded 10 passes and two fixture failures: an overcrowded four-proposal fixture had only two mounted cards, and a camera test's `.first()` changed identity after culling. The request fixture now uses distinct responses and enough space for four mounted cards; the camera assertion follows one fixed ID. Screenshot review also found that the old theme-only seed did not select distinct appearance profiles. Locality fixtures now explicitly seed and assert Editorial Warm / Graphite Night. The final unchanged product passed all 12 cases with those actual profiles. The initial log remains local diagnostic evidence. The previous `2817b86` installer and combined-suite evidence describe their earlier revisions; this repair has not received new native/operator or live-provider acceptance. #30 remains Draft and #32 stays separate pending the requested review order.

This focused mounted-proposal correction is now based on main `2874e8f`, the squash merge of approved #29 including its single-parent relation-probe repair. Its four original follow-up commits were replayed without product or test changes; the old #29 history is no longer part of this PR's diff. Initial placement in #18, its #31 direction follow-up, and overview navigation/line feedback in #32 remain separate.

The historical combined-preview evidence below belongs to its named revisions. Current-head CI/E2E and the new main + #30 + #32 Windows preview are reported in the PR description. A package build does not replace operator acceptance or live-provider qualification. This PR remains Draft pending that acceptance and independent review.

The first new combined E2E run at `2b6b8f6` recorded one Keep material-position failure (x 145 to 5). That test sampled immediately after selection, before the existing coalesced 100ms geometry correction necessarily settled. Three unchanged local runs passed; three instrumented runs (six normal/reduced-motion contexts, 4x CPU slowdown) showed no coordinate change at the Ghost-to-Thought commitment boundary. The original 140px failure was not locally reproduced. The material test now waits for 200ms of stable actual bounds before its Keep snapshot, matching the existing locality/disclosure tests. Its stable identity, exact position tolerance, normal/reduced-motion animation and no-circular-feedback assertions remain unchanged. No production code or retry policy changes were made. The original failing run and diagnostics remain available at https://github.com/NekoMint-Labs/Diffusion/actions/runs/37913132791; the fresh complete combined run is linked in the PR description.

## Pre-rebase mounted proposals verification (2026-10-09)

This narrow follow-up starts at PR #29 `4429ccc`. It addresses the [nearby-card feedback](https://github.com/NekoMint-Labs/Diffusion/issues/11#issuecomment-6060254148) after the initial placement patch landed in PR #18 `f3ee399`. The initial placement file and AI action pipeline remain owned by #18; this patch changes only mounted Field correction and its regressions.

Automatic arrivals prefer a clear visible slot near their currently visible sources, recheck viewport containment after their measured size changes, and reserve the Continue reading controls. When sequential correction cannot fit a small Continue group, a bounded all-or-nothing search shares the free area among up to five automatic pending cards. Canonical cards, camera, scope IDs, undo history and manually detached Ghosts are preserved. A fully occupied viewport still requires the existing farther fallback; no empty-space guarantee is made.

Application/core TypeScript, static imports, 935 locale entries, source-size policy, 266 offline contracts, 352 unit tests and production build passed locally. Windows offline execution uses `NODE_OPTIONS=--no-experimental-global-navigator`, matching the existing English assertion environment. Mounted Chromium verification passed 31 existing/final locality cases plus two final crowded cases, one worker, zero retries. An earlier crowded fixture left only one card mounted on the old initial-placement path; its failing run is retained locally. The independent mounted test now uses three distinct long responses, while #18's longer initial-placement fixture remains covered unchanged by combined verification. The [unit regressions](tests/unit/proposalLocality.test.ts) reproduce distant clear arrivals, resized edge arrivals, chrome clearance, deliberate positions and three measured long cards in a reduced viewport. [Browser regressions](tests/e2e/proposalLocality.spec.ts) cover themes, low zoom, stable identity/coordinates at Keep, reopening, and simultaneous long arrivals.

Local combination with #18 `f3ee399` preserves its exact initial-placement file and measured geometry seam plus #29's subtree and zoom-only behavior. Combined unit verification passed 448 tests and final mounted verification passed all 37 targeted cases, one worker, zero retries, including #18's three very long Continue cards and nearby blocked-corner fixture. This is local Chromium/fixture evidence, not live-model qualification or native WebView2 acceptance. The previously accepted Windows package still belongs to unchanged #29 `4429ccc`; this follow-up has no new installer acceptance. Remote CI, maintainer review and merge remain separate gates.

The follow-up at `89042a1` passed all six remote CI/E2E jobs. A broader combined run then reported 318 passed, 12 existing dev-only skips and one menu-exit test race: the node could unmount between a count and an inert-attribute assertion. The test now directly requires zero non-inert menu nodes while retaining the role, owner and focus-return assertions. All 21 standalone hardening cases passed with one worker and zero retries. This changes test synchronization only; the earlier complete run is retained as a failing diagnostic, not reported as all green. A separate nearby-Continue direction regression in #18 is addressed in its own follow-up.

Combined product snapshot `cd5db1d` includes #18 `f3ee399`, #29 `4429ccc`, this mounted correction at `5d1227e`, and the separate directional fix #31 `787a88f`. It passed 451 unit tests, 266 offline contracts, type/static/locale/source-size gates, 25 Rust tests, and the full-background Windows NSIS build. Its complete browser run recorded 318 passed, 12 existing dev-only skips and one lasso comparison made during the Hub's two-pixel entry translation. The lasso test now waits for the final transform before both measurements, retaining the strict `<2px` threshold, scope/camera and canonical-coordinate checks. Its menu helper also waits for a target or overflow entry before choosing a path; an intermediate three-run check exposed that independent mount race (two passed, one failed). All three final repeated lasso checks passed against the unchanged combined build, with one worker and zero retries. The complete failing run and intermediate diagnostic remain retained; this is complete-suite coverage plus a repaired-case rerun, not a single all-green full run. The new Windows installer is built evidence; operator acceptance and live-model qualification remain separate.

## Earlier PR #17 Windows feedback repair pass (19bbd42, 2026-10-03)

This pass implements the maintainer's twelve-item Windows review on top of `943fd8e`. The [repair and acceptance record](docs/NATIVE_UX_ACCEPTANCE.md) maps each report to its implementation, regressions, reference/reuse boundary and remaining native checks. Source identity, installer SHA-256, screenshots and complete command logs are bundled with the local acceptance delivery; PR #17 remains unmerged and Issue #11 remains open.

Visibility now has one projection shared by rendering, selection/action scope, collision and fitting. Local shows full content, Neighborhood shows excerpts, and Atlas aggregates pending suggestions without duplicate cards. Explicit session folds preserve nested choices and use the existing undo order. Camera positioning respects measured UI space without moving authored Thoughts. More uses Base UI's native submenu relationship and collision handling. Settings use a short provider/key/model/test path, and Source history is separate from searchable organization controls. Chinese runtime provider copy uses semantic keys and fixed terminology.

| Gate | Current result |
|---|---|
| TypeScript, core, static imports, locale, source size | Passed; 935 locale entries, no missing/dynamic-copy findings |
| Unit / offline / native Rust | 344 / 266 / 25 passed |
| Complete E2E with repaired-case reruns | 274 cases have final passing evidence; 0 unresolved failures, 0 skips; raw complete-run and rerun logs retained |
| Browser size/DPR/theme/motion matrix | 24 passed; browser emulation, separate from Windows system settings |
| Native WebView2 | 8 combinations passed at actual 150% system scale, 1440×880 and 1280×720, light/dark; reduced motion uses media emulation |
| Production / Windows NSIS / licenses | Passed; existing >500 kB main-chunk warning; 1000 license files, 5 MPL source records, 0 unresolved |
| Pending operator acceptance | Windows 100%/125%, real IME, system reduced-motion preference, installed-client dialogs/credentials/live providers and final user experience |

The published [2026-10-02 preview](https://github.com/NekoMint-Labs/Diffusion/releases/tag/issue11-preview-20261002) and its `05c4144` product source are an earlier baseline, not this candidate. Earlier evidence below is revision-specific. A compiled package or browser emulation does not certify native system scaling, real IME, live providers or the requester's final experience acceptance.

## Issue #11 candidate — acceptance still open

The dependent draft stack is [#13](https://github.com/NekoMint-Labs/Diffusion/pull/13) → [#14](https://github.com/NekoMint-Labs/Diffusion/pull/14) → [#15](https://github.com/NekoMint-Labs/Diffusion/pull/15) → [#16](https://github.com/NekoMint-Labs/Diffusion/pull/16) → [feedback repairs #17](https://github.com/NekoMint-Labs/Diffusion/pull/17). This follow-up starts at `b447da9` and implements the requester's collected items 4–10. The requester explicitly authorized one optional organization field while preserving original sources and older projects. Database names/versions, the portable envelope and public AI APIs are unchanged. Issue #10 model quality and #12 release qualification remain outside this work.

- At Atlas/neighborhood zoom, pending suggestions have a bounded screen-space reading and Keep/Ignore entry. Editing and Find stay discoverable; ordinary wheel steps collapse selected deeper content while excluding hidden selections from newly issued actions; completion feedback belongs to the request's frozen scope. Empty, failed, cancelled and late responses remain distinct.
- Scope overflow retains its trigger and last valid rectangle through exit into another surface. Click, hover, keyboard, Escape and existing edit actions remain available.
- Ghosts use the approved soft paper body, one fine pencil rail, explicit unaccepted wording and reserved dismiss/selection space. Accepted Thought material and in-place commitment remain intact.
- `thought.reparent` is an explicit user-only, undoable command. Optional `organizingParentId` is separate from `derivedFrom` / `generationAction`; wording, coordinates and child branches do not move. The source inspector and organization control share the existing overflow entry.
- Ordinary wheel notches zoom in/out and disclose/close exactly one current hierarchy level. Every imported depth has a reachable stable zoom band within normal 100% reading size; repeated upward notches cannot enlarge the hierarchy further. Explicit pinch/manual zoom remains continuous and camera snapshots restore the disclosed level. Secondary level/parent labels are removed in distant views; branch summaries and child counts retain navigation. Dense original roots retain world-coordinate anchors and a searchable reading entry. Cached rendered bounds feed disclosure; there is still one imperative camera and no per-frame React tree update.
- Parent arrows come only from the current effective hierarchy. Color and line pattern identify the child depth, including descendants of a reparented branch; original source IDs remain in the inspector and semantic relations retain their own layer. Device-local curve/elbow styling cannot edit project data. Boundary routing avoids visible cards, including a third card dragged across an existing trace; impossible routes are omitted while provenance stays available in the inspector.
- Slate, forest and graphite have distinct blue, green and neutral palettes across surfaces and all five backgrounds; warm paper and custom accent preferences are retained.

The earlier Windows fixes for zoomed Chinese editing, sparse Atlas visibility, Find return and Settings title alignment remain covered. A new Windows installer now contains this follow-up. Automated and rendered checks below do not substitute for the requester's final native input/focus/scale journey or human B1–B8 acceptance. No issue is closed or PR merged by this record.

## What works now

- **Spatial Field interaction:** create, edit, select, lasso, move, pan, zoom, semantic disclosure, Regions, and Crystals. Pointer-frequency camera and drag work stays outside React state.
- **Commands and ownership:** one semantic command registry feeds menus, keyboard shortcuts, the command palette, and help. The Field title owns Field/project operations; the application menu owns global/view operations.
- **Thinking workflows:** Threads, Deep Dive, explicit Crystal confirmation, Fork, Diffuse, contextual actions, and action-specific transient AI results.
- **Sources and evidence:** bounded extraction for UTF-8 text, Markdown, and common code formats; explicit candidate/read/assessment stages; passage provenance and Source validation.
- **Persistence:** local-first Dexie storage, in-place migrations, single-flight saves, bounded undo/redo, and portable project export.
- **Optional services:** manual use requires no provider. AI and discovery are independent capabilities and may be absent without breaking the Field.
- **Appearance:** independent Theme/Profile, Field Style, Accent, and Image Atmosphere axes; Field Presence; Ambient Motion; Reduced Motion; local adaptive image recommendations; and safe migration of prior device preferences. Appearance remains presentation/device state and never enters canonical `ProjectState`.
- **Field materials:** Paper Texture (default), Topography, Threads, Waves, and Silk are the complete production Field Style set. They are lazy, viewport-bounded, screen-space backgrounds that preserve the DOM Thought layer, SVG phenomenon architecture, single camera authority, and interaction grammar.
- **Thought geometry:** ordinary Thoughts use bounded content-derived compact/regular/wide widths. Width is frozen during editing, then reclassified after commit. Mounted interaction uses measured DOM geometry; bounded kind-aware estimates mirror CSS geometry before mount and during semantic disclosure.
- **Desktop architecture:** Tauri wraps the same frontend through platform adapters; secrets stay behind browser-session or native credential boundaries.

## Ownership map

| Concern | Owner | Contract |
|---|---|---|
| Canonical semantics and authority | `src/core/` | Thoughts, relations, Regions, Crystals, Threads, worlds, history, and permission gates. AI cannot commit canonical state. |
| Field and spatial hot path | `src/field/` | Camera, gesture state, pointer capture, geometry cache, culling, direct world transforms, and SVG phenomena. |
| Product shell and transient UI | `src/ui/`, especially `src/ui/workspace/` and `src/ui/surfaces/` | Commands, input ownership, settings, focus return, Threads, and presentation composition. |
| Appearance and Field presentation | `src/ui/appearance.ts`, `src/ui/fieldBackgrounds/`, `src/ui/atmosphere.*` | Device-local visual settings and pointer-inert viewport materials. No canonical project or camera ownership. |
| AI runtime | `src/ai/` | Provider registry, transport, bounded context, operation lifecycle, and validated possibilities. |
| Discovery and evidence | `src/discovery/`, `src/evidence/`, `internal/discovery-engine/` | Candidate discovery, explicit read/extract, evidence envelopes, and optional assessment. |
| Persistence | `src/storage/` | Dexie repository, migration, save queue, and recovery boundaries. |
| Gateway | `server/` | Origin/token guard, provider wire adapters, bounded requests, and normalized evidence HTTP seam. |
| Desktop | `src/platform/`, `src-tauri/` | One frontend, narrow native capabilities, OS credential access, native provider transport, and discovery launcher. |

## Issue #11 deep hierarchy reading ceiling (Windows, 2026-10-02)

The requester accepted gradual early magnification with a normal reading ceiling after reporting that deeper disclosure enlarged text until little remained on screen. This follow-up starts at `0a2b350`. Ordinary hierarchy wheel input still reveals/closes exactly one level, but deeper bands share .80–.98 and all ordinary hierarchical wheel zoom stops at 1. This limits text, card footprints and viewport spacing together; repeated upward input after full disclosure does not magnify further. Explicit Ctrl-wheel/pinch can still zoom above normal size for deliberate detail inspection. Flat Fields retain their existing range. Camera persistence restores disclosure with no new canonical field, and authored wording, coordinates, sources and parent relationships remain unchanged. Older high-zoom views return to the reading range on the next ordinary hierarchy step.

Fresh validation: dependency-backed typecheck and Vite build passed with the existing large-chunk warning; full Vitest 44 files/336 passed; offline/Core/locale/source-size 266 passed; 78 affected mounted browser cases passed (two 12-level profile cases plus 76 related regressions), one worker and zero retries. This turn does not claim a fresh run of the entire browser suite. Coverage includes strict selected-child collapse, current parent arrows, obstacle avoidance/history, Find return, editing, overlays, spatial interaction and persistence. Warm/graphite 4/8/12-level screenshots were reviewed; normal-screen fonts stay at or below the configured Thought size, repeated full-disclosure input preserves card size, an intermediate depth survives reload, deliberate detail zoom still works, and full downward collapse preserves exact canonical Thoughts. Unit checks exercise all levels and reverse input in chains up to 10,000 within the normal reading ceiling.

The initial full unit run had one unrelated real-socket failure: the existing dev-port fixture assumed the neighbor of an OS-assigned port was free. No port implementation, test assertion or timeout was changed; a subsequent complete unit run passed. Both logs are retained. The local 12-level fixture was spaced after visual review so normal-sized cards do not touch; the final mounted verification uses that same example layout.

A fresh Windows x64 NSIS package was built from the frozen verified frontend with the existing `../dist` configuration. No Rust code or native permissions changed; the earlier 25 native tests were not rerun. The pre-existing Cargo.toml change remains unstaged. User native mouse/scale acceptance is pending, and no remote write/push/merge was performed. Existing reading caps, viewport bounds and authored-layout density limitations remain.

Evidence: `verification/reading-cap-build.log`, `reading-cap-unit-full.log`, `reading-cap-unit-recheck.log`, `reading-cap-offline.log`, `reading-cap-focused-final.log`, `reading-cap-regression.log`, `reading-cap-package.log`, and `reading-cap-focused-final-results/` / `reading-cap-regression-results/`.

## Issue #11 strict wheel collapse after native P1/P2 feedback (Windows, 2026-10-02)

The requester's native screenshots rejected `b828426`: changing the caption from level three to level two removed shallow cards, retained a selected deep card and enlarged the reading footprint. The requester explicitly chose strict collapse of selected content. Ordinary wheel disclosure now owns the existing selection's depth budget without deleting its scope; reopening that level restores the selection. A new deliberate selection/Claim may open reading context, and editing/Find/pending proposals retain their existing exceptions. Hierarchy views keep all depth-eligible compact candidates within the existing 64/240 caps and viewport bounds; flat dense Fields retain collision summaries. Ordinary hierarchy cards shrink with camera zoom until a small reading floor, without the former tier-boundary enlargement. The scope toolbar anchors to visible selected items and disappears if none remain visible. Canonical wording, coordinates, sources and parent relationships are unchanged.

Fresh checks: dependency-backed typecheck/Vite build passed, with the existing chunk-size warning; full Vitest 44 files/335 passed; offline/Core/locale/source-size 266 passed; discovery source-hash check passed. Mounted warm/graphite cases verify compact multi-branch retention, collapse of all selected level-three cards, smaller survivor widths, root-only collapse, restoration of selection, exact canonical preservation and Find return. Rendered P1/P2 screenshots were reviewed. Retaining authored nearby cards does not guarantee that arbitrary dense arrangements become overlap-free; no automatic repositioning was added.

Complete browser coverage is 244 scheduled cases: 232 passed and 12 existing dev-service skips, one worker, zero configured retries. The initial run was interrupted after 150 results (136 passed, 12 skips, two failures); the exact remaining 94 cases passed on the same frozen build. The two failures were independently investigated and both passed final verification. The Settings-return case passed twice in isolation without a runtime change. The trace fixture's old equal-height midpoint assumption became invalid after parent captions gained a second row; it now checks the actual measured card-to-card boundary with the same 1px tolerance. Drag obstacle avoidance and undo assertions remain unchanged. Original failed logs, error contexts, inventory and continuation selection are retained locally; this was not an uninterrupted all-green run.

A fresh Windows x64 NSIS installer was built from the exact verified frontend with the existing `../dist` path and package overlay. Native Rust code and permissions were unchanged; the earlier 25 native tests were not rerun. The pre-existing Cargo.toml local change remains separate from this commit. The requester still owns native mouse/input/scale acceptance; the earlier candidate is not marked accepted. No push, remote issue/PR write or merge was performed.

Evidence: `verification/strict-wheel-build-final.log`, `strict-wheel-unit-full.log`, `strict-wheel-offline.log`, `strict-wheel-full.log`, `strict-wheel-resume-record.json`, `strict-wheel-remaining.log`, `strict-wheel-failure-repro.log`, `strict-wheel-failure-resolved.log`, `strict-wheel-package.log`, and `strict-wheel-full-results/` / `strict-wheel-remaining-results/`.

## Issue #11 wheel disclosure follow-up (Windows, 2026-10-02)

This follow-up starts at `d67b5cb` and implements the requester's ordinary wheel contract: from A→B, one upward notch zooms in and reveals C; one downward notch from A→B zooms out and hides B. Each notch changes exactly one current level. The existing camera snapshot restores the level without a new canonical field. Imported chains receive individually reachable bands rather than an all-depth jump. Pinch stays continuous, full notches count separately during rapid bursts, and small high-resolution packets accumulate. Protected reading exceptions and current-parent arrows remain intact.

Final validation: dependency-backed typecheck / Vite build passed; offline/Core/locale/source-size gate 266 passed; full Vitest 44 files / 334 tests passed; full Playwright 229 passed, 12 existing dev-service skips, zero failures, one worker and zero retries. Mounted cases verify single-notch disclosure, current reparented depths, temporary expansion closure, exact wording/coordinate preservation and camera-based reopening. Rendered A/B, A/B/C and root-only screenshots were reviewed. The existing four-profile / two-routing presentation cases also pass.

An initial mounted run caught compact-label collision immediately after a boundary crossing and expansion framing that opened an extra layer. Wheel targets now enter readable band interiors, and branch framing stays below the next global depth boundary. The original failed log is retained; assertions, timeouts, skips and retries were not weakened. The long-chain unit case also exposed repeated initial traversal; direct band estimation keeps 10,000-depth restoration practical.

A fresh x64 NSIS installer was built from this exact frontend using the existing `../dist` configuration and prepared dependency-license material; the discovery source-hash check passed. Native Rust code and permissions were unchanged, and the earlier 25 native tests were not rerun for this frontend-only follow-up. Native wheel/hardware experience is still pending the requester. No push, issue/PR write or merge was performed.

## Issue #11 second acceptance repairs (Windows, 2026-10-02)

The second acceptance checklist's items 4 and 5 refer to original feedback 8 and 9. This repair starts at `2e34c92`: the ordinary Field no longer overlays old source arrows on the current organizing parent. One cycle-safe hierarchy supplies arrows, depth styles and zoom disclosure. Adjacent depths use distinct theme-adapted colors and solid/dashed/dotted patterns; every connected Thought shows its current level and parent, with screen-readable branch controls. Explicit expansion frames the branch without moving Thoughts. Selected/edited/pending/Find content remains readable; Find discloses current ancestry where it fits and the parent label supplies context where it cannot.

Final validation used the fresh production build, installed Chrome, one worker and zero retries:

- Dependency-backed typecheck and Vite production build passed; the existing large-chunk warning remains.
- Offline/Core/locale/source-size gate: 266 passed. Full Vitest: 44 files / 331 tests passed; the final complete run used two workers.
- Complete Playwright: 227 passed, 12 existing dev-service skips, zero failures. The 12 new mounted cases cover branch history/persistence, four profiles with both curve/elbow routing, ordered zoom/expansion/Find, readable controls, reparented collapse order and full long wording.
- Fixed-size rendered screenshots were reviewed at normal and reduced zoom in all four profiles. Public A→B→C→D plus independent X fixtures preserve text, coordinates and frozen provenance. Current-parent edges and descendant depth styles restore together on Undo/Redo and reload; making C independent keeps C→D at its new depth.
- Windows native tests: eight unit plus 17 integration tests passed. The bundled discovery source-hash check passed and license collection has zero unresolved entries.
- A fresh x64 NSIS installer was built from the final frontend. Packaging keeps the configured `../dist` path. The local overlay skips only the redundant beforeBuild command because the exact frontend, license material and sidecar were already prepared and checked; no production config or native permission was widened.

Earlier iteration failures remain in local logs: an initial zoom fixture did not cross the hysteresis boundary; it now measures actual wheel-driven zoom. Static palette tests were matching an added selector rather than the existing palette block; palette roles now remain in their owning blocks. Transient expansion ownership moved out of Field to satisfy its existing size boundary. Rendered review also exposed small level text at 65% zoom; screen-readable metadata and buttons are now measured in the mounted tests. No retry, skip, or weakened behavioral assertion was introduced.

Implementation and packaging are complete; the requester's native experience acceptance of these two items is pending. No remote issue/PR write or merge was made for this repair. Generated logs/screenshots/installers remain local evidence.

## Initial Issue #11 follow-up verification (Windows, 2026-10-02)

The local browser harness serves the fresh Vite build at an isolated preview origin, selects installed Chrome, and retains the repository's interaction/production-background split, one worker, zero retries and assertions. Production background checks use the actual renderers. Public fixtures contain no private user material and make no live model request.

| Gate | Current follow-up evidence |
|---|---|
| Typecheck / production build | Passed; existing large-chunk warning remains visible |
| Offline, locale and source-size contracts | 266 passed; Windows Node uses `NODE_OPTIONS=--no-experimental-global-navigator` so existing English-message fixtures retain their locale |
| Unit suite | 44 files / 327 tests passed, including nine hierarchy/compatibility cases |
| Complete local browser suite | 215 passed / 12 existing skips / 0 failed; one worker, zero retries |
| Rendered review | Four palettes × five production backgrounds; 1280×720, 1440×960, 1920×1080; low/normal/near Field zoom, EN/ZH, normal/reduced motion, source/organization inspector, dense roots and result controls |
| Actual Chrome browser zoom | Nine cases passed: 100% / 125% / 150%, Chinese Han/punctuation endings and long English, enlarged text/interface; OS/device scale fixed at 1 and no pinch zoom. Rendered captures inspected. This is browser zoom, not Windows OS scaling. |
| Windows native tests | 25 passed: eight unit and 17 integration tests |
| Discovery / distribution inputs | Fresh Windows sidecar build and source-hash check passed; third-party license collection has no unresolved entries |
| New Windows installer | NSIS x64 0.3.0 built successfully from `46215fd`; subsequent commits change tests/documentation only. SHA-256: `65ab2db85d71bd4cdf48d55a3da0c03c738e516bffd91a70a4b5bc619d63014b` |

Earlier follow-up full runs recorded 208 passed / 12 skipped / 5 failed and 211 passed / 12 skipped / 4 failed. Their logs remain local evidence. Repairs distinguish obsolete approved-design expectations from measurement defects: the actual Ghost rail is measured instead of its paper shadow; original edit actions remain available beside the inspector; Field clicks use its measured viewport; dense Atlas uses the same detail cap plus explicit root access. Proposal checks retain a fixed identity when priority reorders siblings, routes wait for actual card geometry, and the reload fixture no longer overwrites saved preferences. Exit measurements account for an already-retired menu without permitting a painted menu at the origin.

A later CI run at `ad0c711` passed the main gates and three browser jobs but failed one scope-menu distance check (43.16px against a 30px limit). That check compared the trigger before hover with the menu after hover; committing the fixture can resize the Thought from 176px to 256px and recenter the trigger by 40px. The check now samples both live rectangles in the same browser evaluation, retaining the original horizontal/vertical thresholds, visibility and focus assertions. It also attaches pre-hover and live geometry for diagnosis. Twelve fresh normal/throttled Chrome diagnostic runs kept the live gap near 3.2px; the exact CI timing was not reproduced locally. The repaired click/hover/keyboard case passed locally.

The atmosphere-motion check keeps its strict `>1px` within three seconds. Removing premature two-decimal rounding fixes the old false failure without changing the threshold. No retry or skip was added. The 12 existing skips concern dev-only Motion Lab / Material Gallery services, which are not started by the production suite. Fresh CI results and portable workflow captures are linked from PR #17.

The new installer is built evidence, not proof of installation, real IME candidate selection, native dialogs, OS keychain persistence, packaged-sidecar execution or live providers. These remain a single native/operator acceptance batch. Older clients round-tripping the new optional field are not qualified; see [migration boundaries](docs/MIGRATIONS.md#optional-organization-issue-11-acceptance-follow-up).

## Previous main stabilization verification

The following earlier results were captured in Linux/WSL2 while stabilizing `main` from baseline `d4870b5`; they are not the Issue #11 candidate results:

| Gate | Result |
|---|---|
| `pnpm run typecheck` | Passed |
| `pnpm run check:offline` | Passed: 243 offline contract tests; locale and source-size checks passed |
| `pnpm test` | Passed: 41 files, 307 tests |
| `pnpm run build` | Passed; Vite retained the >500 kB main-chunk warning |
| `git diff --check` | Passed after the final documentation pass |
| `pnpm run test:e2e` | Passed twice consecutively: 148 passed, 8 skipped on each run; one worker, no retries |
| `pnpm run build:discovery` | Passed on Linux/WSL2; produced a current 10.8 MiB sidecar |
| `pnpm run check:discovery` | Passed after the sidecar build |
| `pnpm run test:discovery` | Passed: 79 tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | **UNVERIFIED**: compilation stopped because Linux `glib-2.0` / `gobject-2.0` development libraries are unavailable |
| `pnpm run smoke:providers` | **UNVERIFIED**: 0 live providers verified; all four skipped because no credentials are available |

The five previously recorded deterministic Playwright failures were resolved without retries or skips: transient Escape/focus handoff, Base UI Home semantics, Settings motion contract sampling, and exact Thread camera return now test their real ownership contracts. Full-suite runs also exposed and resolved stale Dust selectors, semantic-zoom test assumptions, and exit-timing ownership.

## Important limitations

- **Windows/native acceptance remains incomplete.** The requester tested the earlier client; this follow-up has a newly built installer and passing Windows native tests. Its real Chinese IME, focus, OS display scaling, dialogs, credential persistence, packaged-sidecar runtime and complete native journey still require operator acceptance.
- **Native Linux compilation is UNVERIFIED.** Rust/Cargo are present, but required GLib/GObject development packages are not installed; no Linux Tauri window or Linux native package was produced in that earlier run.
- **Live AI and discovery are UNVERIFIED.** No provider or search credentials are present. Fixture/contract suites passed, but no external service was contacted.
- **Unsupported rich formats remain metadata-only.** PDF, image, Office, audio, and video extraction/understanding is not implemented.
- **Multi-tab project write coordination is not implemented.** Use one editing tab per project. Actual IndexedDB disk latency remains unmeasured.
- **The production build retains a large-chunk warning.** The main bundle is deliberately not split without evidence that a stable product boundary yields a net runtime benefit.
- **Real-image Image Atmosphere coverage is bounded.** Unit/browser contracts and curated captures exist, but a broader corpus of difficult real images has not been systematically validated.

## Next meaningful work

1. Perform Windows/Tauri acceptance, including native credential, dialog, scaling, IME, packaged-sidecar, and installer flows.
2. Run operator-authorized smoke tests against at least one real model provider and one real discovery source.
3. Revisit bundle splitting only when measured startup/interaction data or a natural lazy-loaded boundary justifies the added loading and chunking complexity.
4. Expand real-image Image Atmosphere stress validation without changing canonical project semantics.

## Continuation

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before changing a shared seam. Current documentation is indexed in [`docs/README.md`](docs/README.md); [`docs/history/`](docs/history/README.md) is historical provenance only.


## Issue #10 branch candidate — October 4, 2026

This section describes `feat/issue-10-thinking-experience`; it does not replace the historical
main stabilization record above or qualify the integrated/native product. Latest product
`78d01ae` includes crowded visible placement `6bf3c55` and bounded Angle calibration.

- Final product: production build/typecheck passed; 48 unit files / 366 tests passed;
  265 offline contracts, 867 locale keys and source-size checks passed; 10 targeted mounted
  continuation/diversity cases passed. The existing bundle warning is retained.
- Full local E2E on preceding placement product `6bf3c55`: 196 passed / 12 existing skips /
  0 failed, one worker, zero retries. This is not a final-head full-suite claim.
- The first offline attempt overlapped Playwright's result-file deletion and failed with ENOENT;
  diagnostic preserved, sequential final rerun passed. No assertions were weakened or skips added.
- Real DeepSeek samples were exercised locally. Missing-card classifications and earlier
  three-category completion claims are corrected in [the acceptance map](docs/ACCEPTANCE_MAP.md).
  The contributor found two research directions worth continuing; other results were mixed,
  including overlapping Diffuse frames and one Angle that may evade the attribution question.
  A1/A2/A3/A5 remain open; fixtures do not prove semantic quality.
- #17 was reviewed and squash-merged to main `4191bb0` on October 4; its owner reported installed
  Windows acceptance. #10 and the newer #18 fixes still require synchronization with the existing
  #19 integration and revision-specific checks. No #10 PR merge or native acceptance is claimed.
- Complete uploaded-head remote CI remains to be checked. Keep #18 Draft and Issue #10 open.


## Issue #10 synchronized main candidate — October 4, 2026

This later entry supersedes the synchronization-pending status of the preceding branch entry.
The candidate merges real main `4191bb0` into `2bd2de3`. Main's tree equals #17
`639818a`; the reviewed #19 `b5b1938` seam resolutions were reused and checked, then
combined with the newer #10 placement, Angle and persisted-response changes. The local
`backup/issue10-pre-main-20261004` branch preserves the pre-merge head. #19 was not modified.

| Gate on the merged product | Local result |
|---|---|
| `pnpm run build` | Typecheck and production build passed; existing chunk warning retained |
| `pnpm test` | 54 files / 412 tests passed |
| `pnpm run check:offline` | 266 passed / 0 failed; core typecheck, 960 locale keys and source-size passed |
| `VITE_E2E_LIGHTWEIGHT_BACKGROUND=1 pnpm run build`, then `pnpm run test:e2e` | Full suite: 298 passed / 12 existing dev-only skips / 0 failed (11.9 minutes), one worker, zero retries; production-background project uses real renderers |
| Conflict markers / cached whitespace | No unresolved paths or markers; `git diff --cached --check` passed |

Windows offline fixtures retain the existing English-message environment with
`NODE_OPTIONS=--no-experimental-global-navigator`. The offline gate completed before the full browser run,
with no assertion weakening, new skip or retry. Light and dark mounted controlled-fixture
continuation captures were reviewed and saved under ignored `verification/`; these are
visibility/interaction evidence, not live-model quality proof. Full local logs remain there.

The merged placement's preferred and raw-footprint indices both reserve only currently visible
objects, while retaining measured geometry, safe areas, low-zoom read-control space and crowded
visible-slot fallback. Keep regression retains original wording, exact `derivedFrom` and
stable-ID reload assertions. Original Thoughts and camera remain outside AI mutation authority.

[The closeout trial checklist](docs/ISSUE10_CLOSEOUT.md) now gives the three real categories,
action comparison, unchanged-scope repeats, agency checks and honest output-state recording.
A1/A2/A3/A5 remain open. No new native installer or semantic-quality pass is claimed. Uploaded-head
remote checks still need separate confirmation. PR #18 stays Draft and Issue #10 stays open.


## Issue #10 repeated-thinking candidate — October 4, 2026

This candidate follows uploaded fa1169a; its exact revision is the commit containing this entry.
Continue and Angle now share up to six bounded negative avoidance excerpts for unchanged compiled
context. Ignore retains them; changed scope/background/permissions reset them. Thread and Diffuse
remain separate, and Angle retains history for all existing count settings. A superseded provider
lookup cannot erase newer history or emit a late request. The wire packet and durable state are unchanged.

Final local build/typecheck, 54 Vitest files / 421 tests, 266 offline contracts, 960 locale keys,
source-size review and whitespace checks passed. Relevant mounted E2E: 22 passed / 0 failed,
one worker, zero retries. An intermediate product passed the full suite (302 passed / 12 existing
dev-only skips / 0 failed); that preceded final prompt/history corrections and is not a final-head
full-suite claim. Uploaded-head CI must be checked separately.

Real DeepSeek repeats after prompt strengthening surfaced four visible suggestions (Continue twice,
Angle twice), all ignored; seven original mounted cards retained IDs, text and DOM positions. One
Continue gave a concrete tentative consequence; other outputs mixed strategies, assumed a usable
feedback measure, or combined ignored suggestions. The last Angle remains a semantic avoidance and
grounding failure. No secret or full private input/output is tracked. Details and remaining trials
are in docs/ISSUE10_CLOSEOUT.md. A1/A2/A3/A5 remain open; keep #18 Draft and #10 open. No native
acceptance or merge is claimed. #19 still carries an older input; coordinate the final revision
before integration rather than applying overlapping products twice.
