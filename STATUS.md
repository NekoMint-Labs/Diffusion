# Diffusion — current status

Diffusion is a quiet thinking medium for ideas before commitment. This file describes the current checkout: what works, which subsystem owns it, what was freshly verified, and what remains incomplete. It is not a changelog. Historical phase reports and prior verification records remain under [`docs/history/`](docs/history/README.md).

## Issue #11 current organization preview (2026-10-02)

All implemented Issue #11 changes, including prerequisites #13–#16 and the latest five feedback commits, are available through [PR #17](https://github.com/NekoMint-Labs/Diffusion/pull/17). Organization members can download the [Windows x64 prerelease](https://github.com/NekoMint-Labs/Diffusion/releases/tag/issue11-preview-20261002); the [Chinese preview guide](docs/ISSUE11_PREVIEW.md) lists changes, reproducible steps and two fixed-size fixture screenshots.

The current product source is `05c4144`. The latest repairs stabilize More at viewport edges and during pointer travel, bound Ghost reading geometry, recheck actual pending-suggestion overlap before paint and after later size changes, preserve manual drag placement, and restrict Region labels to Atlas. Earlier local follow-ups supply current-parent depth styling, strict one-level wheel disclosure, shallow-parent retention during collapse and a normal-reading ceiling for deep hierarchies. Existing Thought coordinates and original sources remain intact.

| Current gate | Evidence at `05c4144` |
|---|---|
| TypeScript / production build | Passed; existing large-chunk warning retained |
| Unit suite | 45 files / 338 tests passed |
| Offline / locale / source-size | 266 contracts passed; source checks PASS |
| Focused mounted browser regression | 37 distinct cases passed: seven final feedback cases, drag ownership, light/dark/reduced motion, hierarchy/presentation, zoomed writing and Find; three menu action-count cases additionally passed |
| Windows packaging | Release executable and NSIS x64 0.3.0 installer built; bundled discovery source check passed and distribution licenses resolved |
| Installer identity | `Diffusion-05c4144-three-fixes-x64-setup.exe`, 15,305,013 bytes, SHA-256 `0c4637de19fdad5b2797519c7ddbb437b38b0dce5d675e9f85660661330412a9` |
| Current complete CI / E2E | See [PR #17 checks](https://github.com/NekoMint-Labs/Diffusion/pull/17/checks); older results below are revision-specific evidence |

Browser checks retain one worker and zero retries. The generated-response fixtures exercise the actual UI but do not qualify live providers. Source-size growth and small-area overlap have direct unit coverage; early fixed geometry alone did not reliably reproduce the requester's screenshot overlap. First-pass failures exposed pointer/focus and delayed-measurement regressions; final focused runs passed after correction. No private user files or logs are included in the published preview.

The installer includes all product changes through `05c4144`; the subsequent publication commit changes documentation/screenshots only. Earlier locally delivered installers are superseded by this preview. Final native operator acceptance remains open: real IME, focus, OS scaling, native dialogs, credentials, packaged-sidecar runtime and online services are separate checks. This publication does not merge the dependent PR stack or close #11.

## Issue #11 candidate — acceptance still open

The dependent draft stack is [#13](https://github.com/NekoMint-Labs/Diffusion/pull/13) → [#14](https://github.com/NekoMint-Labs/Diffusion/pull/14) → [#15](https://github.com/NekoMint-Labs/Diffusion/pull/15) → [#16](https://github.com/NekoMint-Labs/Diffusion/pull/16) → [feedback repairs #17](https://github.com/NekoMint-Labs/Diffusion/pull/17). This follow-up starts at `b447da9` and implements the requester's collected items 4–10. The requester explicitly authorized one optional organization field while preserving original sources and older projects. Database names/versions, the portable envelope and public AI APIs are unchanged. Issue #10 model quality and #12 release qualification remain outside this work.

- At Atlas/neighborhood zoom, pending suggestions have a bounded screen-space reading and Keep/Ignore entry. Editing and Find stay discoverable; ordinary wheel steps collapse selected deeper content while retaining the selected scope; completion feedback belongs to the request's frozen scope. Empty, failed, cancelled and late responses remain distinct.
- Scope overflow retains its trigger and last valid rectangle through exit into another surface. Click, hover, keyboard, Escape and existing edit actions remain available.
- Ghosts use the approved soft paper body, one fine pencil rail, explicit unaccepted wording and reserved dismiss/selection space. Accepted Thought material and in-place commitment remain intact.
- `thought.reparent` is an explicit user-only, undoable command. Optional `organizingParentId` is separate from `derivedFrom` / `generationAction`; wording, coordinates and child branches do not move. The source inspector and organization control share the existing overflow entry.
- Ordinary wheel notches zoom in/out and disclose/close exactly one current hierarchy level. Every imported depth has a reachable stable zoom band within normal 100% reading size; repeated upward notches cannot enlarge the hierarchy further. Explicit pinch/manual zoom remains continuous and camera snapshots restore the disclosed level. Level and current-parent labels plus branch counts remain readable below 100% zoom. Dense original roots retain world-coordinate anchors and a searchable reading entry. Cached rendered bounds feed disclosure; there is still one imperative camera and no per-frame React tree update.
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
