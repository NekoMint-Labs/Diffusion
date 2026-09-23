# Diffusion Explorer v0.1 - implementation delivery status

## Product state

**Broad v0.1 source implementation; not a verified production release.** No completion percentage is assigned: source presence and passing isolated tests cannot establish an end-to-end product completion rate.

Strongest implemented user path: create/edit/place Thoughts -> temporary selection and Focus -> deliberate Explore/Probe -> labeled possibility -> Ghost Claim -> snapshotted Thread/Deep Dive -> user-confirmed Crystal -> contextual Markdown Handoff. The complete React path is **NOT VERIFIED** in this environment.

## Implementation and verification mode

| Item | Actual status |
| --- | --- |
| Offline Source Implementation Mode | **YES** |
| Dependency installation | **BLOCKED**: npm registry DNS failed with EAI_AGAIN; offline cache check was empty/ENOTCACHED. No repeated registry workarounds. |
| Dependency versions | **UNVERIFIED** explicit conservative semver ranges in package.json; no resolver output and no invented lockfile. |
| Source implementation | **PARTIAL overall**, with coherent implementations spanning all main capability groups below. |
| Source preservation | Multiple actual source ZIPs outside the mutable tree; each listed, CRC-checked, extracted and byte-compared; SHA-256 proofs retained. |

## Implemented in source

| Capability group | Included behavior | Verification boundary |
| --- | --- | --- |
| Foundation | React/TypeScript/Vite, one frontend, semantic Light/Dark/system preference, Dexie repository, Zustand surfaces, browser/Tauri adapter separation. | Independent architecture checks only; full dependencies/runtime not installed. |
| Thought Field | Double-click create/edit, selection/multi-select, rectangular lasso, group/direct drag, pan/zoom, keyboard/IME guards, layered Escape, Keep, semantic undo/redo, persistence queue/error handling. | Geometry/controller tests and isolated camera/CSS tests; integrated React interaction not run. |
| Focus / Relation / Probe | Scope-driven emphasis; confirmed/active relation visibility separate from persistence; glyph-first SVG; local proximity/hold cue and async semantic Probe. | Spatial/focus/core guards tested; integrated pointer path not run. |
| AI / Ghost / Recall | Strict semantic boundary; authored Demo, Off and Gateway providers; one-shot runtime, cancellation, bounded context/progressive candidates; Claim, same-ID Recall, lifecycle/Keep. | Dependency-free permission/runtime tests; live provider and Zod integration not run. |
| Thread / Deep Dive | Temporary manuscript surfaces, snapshot scope, explicit Add selection, raw transcript, rebuildable bounded capsule, Bring as Ghost and return points. | Context and canonical semantics tested; browser surface behavior not run. |
| Source / Evidence | Drop anything/best-effort states, worker text extraction, honest provenance, retained original copies, explicit normalized evidence candidates and outcomes, Hono gateway. | Extraction/import/URL/config tests passed; real worker/Dexie/Hono/provider paths not run. |
| Find / History / navigation | Distinct project search, explicit camera travel, semantic trajectories, source/thread/region hits, approximate viewport re-entry. | Canonical/index tests; rendered navigation not run. |
| Regions / Atlas | Spatial-activity neighborhoods, semantic LOD, Crystals/frontiers at distance, replaceable grid index/culling, four perf fixture sizes. | Spatial algorithm measured at 100/500/2000/5000; not UI FPS. |
| Crystal / Carry / Fork / Handoff | User confirmation, immutable-old-Crystal Continue, long-distance move, explicit Fork baseline/compare/selective Bring, Markdown and canonical JSON export. | World/validation tests; browser/native file delivery not run. |
| Diffuse | Explicit scope, 1-6 call and 10-180 second budgets, independent Source/web permissions, Pause/Stop, one optional search, progressive candidates, claim/scope-change stop. | Seven dedicated scheduler tests plus Source-permission regression; browser/live provider not run. |
| Recovery / native shell | Bounded worker validation, import as new project, interrupted Source recovery, Tauri shell/capabilities/CSP/icons/plugins with shared UI. | Recovery model tests and JSON/TOML syntax; workers/native behavior not run. |

## Partially implemented or deliberately limited

- Sources: UTF-8 text only for content extraction. PDF/image/audio/video/Office currently metadata-only **Limited**; no OCR, semantic image analysis or full-document reading. Original bytes are size-limited and omitted from project exports.
- Evidence: replaceable normalized service implemented, but no bundled Brave/Tavily/Exa/OpenAI web-search integration. A real service must implement the documented contract. Its factual grounding and upstream SSRF handling remain external verification responsibilities.
- AI reasoning: deterministic Demo is authored sample behavior. Thread capsules are bounded/rebuildable caches rather than sophisticated semantic compaction. No model quality or actual endpoint compatibility has been validated.
- Regions/lifecycle: coarse deterministic spatial/activity/time heuristics, not a full semantic geography or tuned long-session attention system. An offscreen Recall cue exists, but multiple cues can share the edge location. No camera stealing is intended.
- Persistence/undo: serialized whole-project snapshots per semantic commit; in-memory undo; linear local Find; no multi-tab conflict resolution, migration suite beyond schema version 1, or retained-original garbage collection. Large-project persistence and prolonged sessions need measurement.
- Input/accessibility: keyboard paths, labels and reduced motion are present; rectangular rather than freeform lasso. Full focus-trap/tab order, screen-reader, touch/trackpad and cross-browser acceptance are not validated.
- Diffuse: call/time budgets, not a monetary/token-accounting guarantee. Remote cancellation may not prevent provider charges for already-running work. It is not an autonomous research agent.
- Desktop: shared shell and adapters only. Native permission behavior, retained-path Open original, global shortcuts, keychain, target-platform packaging/signing/notarization are incomplete or unverified. Local original copy export is the safe fallback.
- Diagnostics: session candidate caps protect Field density, but selected unclaimed Ghost eviction at the cap and edge-cue layout are not comprehensively tuned. These need real usage checks, not more speculative scope.

## Not implemented

Full document/PDF reader, cropper, annotation editor, complete paper/RAG manager, multiplayer/sync, mobile-native client, plugin marketplace, enterprise permissions, task/coding agent, graph editor, automatic layout, hidden recommendation/personalization and automatic Fork merge. These are outside the supplied v0.1 boundary, not hidden completed features.

No release signing, public multi-tenant gateway hardening, automated deployment or account backup/sync is included.

## Verification actually performed

| Check | Result |
| --- | --- |
| Filesystem and ZIP rehearsal | **PASS**: real write/read/delete and ZIP list/CRC/extract/byte comparison. |
| JSON, local imports and TS/TSX syntax transpilation | **PASS**, 70 TS/TSX files at delivery. This is not dependency-backed typechecking. |
| Strict independent-module typecheck | **PASS**, TypeScript 5.8.3, `tsconfig.core.json`. Core/spatial/camera and independent AI/evidence/platform/repository/config boundaries only. |
| Dependency-free Node tests | **PASS**, 56 tests. Includes real reducers/controllers, lifecycle, AI permission/cancellation, spatial queries, Source extraction/import, Fork/Crystal, bounded Diffuse and recovery validation. |
| Isolated browser primitive harness | **PASS**, 8 checks with actual transpiled camera and original CSS in Chromium; no React/Vite/Dexie app. |
| Spatial-index algorithm fixture | **PASS**, 100/500/2000/5000 objects, 1000 local queries per scale. Not a UI frame-rate claim. |
| Tauri JSON/TOML syntax | **PASS** as configuration syntax only. |
| Full application TypeScript | **NOT VERIFIED**: dependency types unavailable. |
| Web dev / Vite production build | **NOT VERIFIED**: dependency installation blocked. |
| Dependency-backed Vitest tests | **NOT RUN**: 19 test cases supplied for Zod, Dexie and Hono. |
| Full application Playwright E2E | **NOT RUN**: 12 cases supplied; application build unavailable. Local URL navigation additionally reported `net::ERR_BLOCKED_BY_ADMINISTRATOR`. |
| Rust / Tauri check and build | **NOT VERIFIED**: Rust/cargo and native WebView development prerequisites absent. |
| Real AI / web search | **NOT VERIFIED**: no configured credentials/upstream services. |
| 60fps / target-device responsiveness | **NOT VERIFIED**: algorithm/isolated camera tests do not establish full UI performance. |
| Clean extracted checkpoint | **PASS**: 104 source fingerprints, all 56 offline tests and 8 isolated browser primitive checks passed again outside the original working tree. No npm install/build is implied. |
| Source ZIP integrity | **PASS** for preserved archives; final external checksum/proof identifies the exact final archive. |

Machine-readable results are under `verification/`. Full app E2E source and deterministic mock service tests must not be described as already executed. No browser security policy was disabled to bypass the local URL restriction.

## Product boundaries retained

Core rejects unauthorized AI canonical mutation. Selection sends no model request and does not invent relations or perform layout. Camera/drag transforms are imperative; canonical changes happen at gesture/semantic boundaries. Normal AI generation is one-shot, Ghosts stay session-only until Claim, relation confirmation and Crystal formation are user acts, Thread scope is explicit, Sources disclose inspection scope, and web access is permissioned. Fork Bring does not overwrite Main. Desktop is the same frontend, not a second product.

## Exact next recommended work

1. In a network-enabled development environment: `npm install`, commit the legitimately resolved lockfile, then `npm run typecheck`, `npm run test:offline`, `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e`. Fix actual compiler/integration failures before feature work.
2. Run the application and manually verify editing/IME, capture loss, lasso/Ghost behavior, multi-select Focus, Probe timing, return points, source worker failures, export/restore and local persistence across reload. Compare Light/Dark against the supplied visual specification.
3. Profile the actual 100-visible and 5000-total Field; inspect culling, frame work, persistence and semantic-zoom transitions on ordinary hardware. Do not extrapolate algorithm timings into FPS.
4. Validate the Tauri shell and dialog-granted scopes on the intended OS; then exercise one real model and one normalized evidence provider with malformed response, cancellation, timeout and permission cases. Choose a license before public distribution.
