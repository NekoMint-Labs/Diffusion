# Diffusion — current status

Diffusion is a quiet thinking medium for ideas before commitment. This file describes the current checkout: what works, which subsystem owns it, what was freshly verified, and what remains incomplete. It is not a changelog. Historical phase reports and prior verification records remain under [`docs/history/`](docs/history/README.md).

## Issue #11 candidate — acceptance still open

The four changes form a dependent draft stack: [scope and feedback #13](https://github.com/NekoMint-Labs/Diffusion/pull/13) → [object language #14](https://github.com/NekoMint-Labs/Diffusion/pull/14) → [auxiliary surfaces #15](https://github.com/NekoMint-Labs/Diffusion/pull/15) → motion and acceptance (this branch). They start from `fd09d6b` and preserve public APIs, canonical data, database schema, export format and explicit user commitment. Issue #10 model-quality work and #12 release qualification are outside this change.

- Scope controls use rendered dimensions, with three primary actions and overflow. Running copy/Stop stay in screen space, tied to the request's original scope. A reserved bottom lane handles crowded scenes without relocating the person's Thoughts.
- Ghosts have readable open boundaries and direct Keep/Ignore; Thoughts retain stronger text; Crystals keep their stable manuscript hierarchy and landmark mark. Keeping a Ghost preserves its identity and position. New Ghosts receive one measured correction around persistent Field chrome; existing Thoughts are not rearranged.
- Settings, Find, History, Thread and Deep Dive share surface spacing, wrapping controls and a reachable return path. Long Chinese context remains available through scrolling. Configuration and recovery controls remain present.
- Shared motion tokens replace duplicate text effects. Reduced Motion removes transition delays, including the tutorial settlement pause, while keeping immediate state and running feedback. One-time coaching uses the measured feedback lane and releases it after dismissal; its observer starts after parent DOM refs are attached. Fixtures cover stop, failure and a valid late result after cancellation.

The requester accepted the first-stage direction and the distinction/Keep/Ignore flow of the three objects. The requester also reports that the final browser journey is smooth. Actual Windows/WebView2 scaling, Chinese IME and focus checks are **pending**; the browser feedback is not native acceptance. Automated checks do not complete B1–B8 human acceptance; see [`docs/ACCEPTANCE_MAP.md`](docs/ACCEPTANCE_MAP.md#issue-11-b1b8-candidate-evidence).

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

## Issue #11 verification (Windows Chrome, 2026-10-01)

The final candidate is served from a production Vite build. The local Playwright harness selects installed Chrome and an externally served preview because the repository web-server command is POSIX-specific. It retains the repository project split, one worker, zero retries and assertions. Interaction storage is bound to `http://127.0.0.1:4173`; real-background captures use the production-backgrounds project.

| Gate | Candidate evidence |
|---|---|
| Typecheck / build | Passed; existing >500 kB main-chunk warning retained |
| Offline contracts | 265 passed, with `NODE_OPTIONS=--no-experimental-global-navigator` for this Windows environment |
| Unit suite | Passed: 41 files, 309 tests |
| Full local browser suite | 199 passed, 12 skipped, 3 failed in 10.3 minutes; the two fixed-coordinate test failures were corrected and both passed separately. One unchanged background-motion baseline failure remains. |
| Visual review | Before/after scope, object and Settings captures; 4 profiles × 5 production backgrounds; 1280×720, 1440×960 and 1920×1080. Narrow 1024×576 and 853×480 content areas plus DPR 1/1.25/1.5 and 120% interface size are browser simulations, not native Windows zoom acceptance. |
| CI for prerequisite PRs | CI and complete E2E passed at #13 `039894e`, #14 `4fb3754`, #15 `f19e584` |

The final complete local run used `pnpm exec playwright test --config verification/playwright.local.ts --output verification/acceptance-results`. Two old tests clicked fixed window coordinate y=880, now outside the Field while coaching reserves the bottom lane; they now click within the measured Field, preserving the scope and causal-trace assertions, and both passed in a focused rerun. Before the final measured-chrome/coaching corrections, another complete local run was **198 passed, 12 skipped, 1 failed**. The remaining failure is the unchanged `motion.spec.ts:257` atmosphere-motion assertion (`>1px`, measured `1px`), also reproduced on the starting baseline. No baseline was replaced and no assertion, retry or skip was added to hide it. An earlier overlapping local workload caused one unit timeout; a standalone full run passed, and its failure log was retained. The short Keep effect is now observed at its commitment mutation, avoiding a test that sampled after the effect ended. First-open persistence still asserts reload recovery and now waits for the durable IndexedDB write first.

The first final-stage CI run passed all three interaction shards and 30/31 production-background checks. The remaining visual check sampled a far-edge Thought while first-use coaching reduced the viewport; its setup now dismisses the coaching before checking attention. All ink/opacity/presence assertions remain intact.

Tracked tests and CI artifacts are the portable evidence; ignored local captures/logs supplement rendered review. No native build, real-provider smoke test, installer or Windows client qualification is claimed here.

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

- **Windows/native acceptance is UNVERIFIED.** The earlier WSL2 run and the current browser-only Windows run do not validate Windows display scaling, Chinese IME in WebView2, native dialog/filesystem scope, OS credential persistence, installer behavior, or a Windows-packaged sidecar.
- **Native Linux compilation is UNVERIFIED.** Rust/Cargo are present, but required GLib/GObject development packages are not installed; no Tauri window or native package was produced.
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
