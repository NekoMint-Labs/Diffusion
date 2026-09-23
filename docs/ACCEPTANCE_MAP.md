# Current acceptance map — implementation is not verification

This map separates implemented contracts from executed evidence and physical/operator checks. Product authority lives in the current product, architecture and contract documents — see the [documentation index](README.md); historical phase reports are provenance only. Exact current command results and environment limits are in [`../STATUS.md`](../STATUS.md).

| Requirement | Current implementation | Executed evidence | Remaining acceptance |
|---|---|---|---|
| Product identity and AI authority | Core permission gates; provider output remains transient until explicit Claim/Bring/confirm | Offline/unit authority, Crystal, Claim, Fork, Diffuse, and mounted browser flows | Real-provider semantic behavior is **UNVERIFIED** |
| Camera and spatial hot path | One imperative `CameraController`; pointer-frequency work stays outside React state | Camera/interaction unit tests and complete Playwright suite | Native high-DPI/trackpad behavior on Windows is **UNVERIFIED** |
| Full-bleed Field materials | Paper Texture (default), Topography, Threads, Waves, and Silk are lazy viewport-bounded screen-space renderers; all are pointer-inert presentation outside camera ownership | Field background unit/offline contracts plus production-background and material-gallery Playwright coverage | GPU/driver matrix and extended visual dogfood |
| Adaptive Thought geometry | Bounded compact/regular/wide sizing; editing freezes width; mounted interaction uses cached DOM measurements, while kind-aware pre-mount/disclosure estimates mirror ordinary, Source, and Crystal CSS widths | Unicode/punctuation/multiline and mixed-kind placement unit cases; edit-stability, lasso, drag, Scope Hub, and semantic-disclosure E2E | Chinese IME in native WebView2 is **UNVERIFIED** |
| Selection, focus, and relations | Semantic scope without camera travel or AI call; established relations wake; context recedes without disappearing | Unit contracts and mounted interaction/visual E2E | Extended real-project perception review |
| Commands and transient ownership | One command registry; one focus coordinator; Base UI menu semantics; one Escape owner; exiting surfaces are inert | Keyboard, focus handoff, Home/End, outside-click, and surface Playwright coverage | Cross-WebView accessibility inspection |
| Thread and Deep Dive return | Frozen scope and exact camera/selection return; pending camera frame is committed before persistence | Core scope tests and exact transform-return Playwright coverage | Native window interruption/reopen behavior |
| Sources and evidence | Bounded text extraction; explicit candidate → read → assessment stages; provenance retained | Offline/unit normalization, forged-evidence rejection, discovery engine 79-test suite | Real discovery source query/read is **UNVERIFIED** |
| Provider integration | Explicit protocols, bounded payloads/timeouts, semantic validation, native secret boundary | Fixture-backed provider/gateway/unit contracts | All live providers are **UNVERIFIED**: no credentials were available |
| Persistence and migration | Existing Dexie database, in-place migration, single-flight save queue, portable recovery | Migration/repository tests and mounted browser persistence flows | Multi-tab coordination and measured IndexedDB disk latency |
| Localization and accessibility | Reactive EN/ZH dictionary, IME guards, semantic roles and focus return | Locale checks and Chromium keyboard/role assertions | Native Chinese IME and screen-reader matrix are **UNVERIFIED** |
| Browser delivery | Production Vite bundle served to Chromium; full suite uses one worker and no retries | Two consecutive complete Playwright runs: 148 passed, 8 skipped each | Broader browser engine matrix |
| Desktop delivery | One shared frontend, narrow Tauri adapters, current Linux discovery sidecar | Sidecar build/check and native source/unit contract coverage | Cargo/Tauri runtime, Windows dialogs/scaling/credentials/packaging are **UNVERIFIED** |
| Performance and bundle | Grid/culling/measurement boundaries retained; main chunk warning remains visible | Spatial/storage/history benchmarks and successful production build | Main chunk splitting requires measured benefit; no speculative split selected |

## Stabilization acceptance

The five recorded deterministic browser failures were resolved at their actual ownership seams: transient focus/Escape handoff, successor-surface ownership, Base UI menu navigation semantics, Settings motion contract sampling, and queued camera-frame commit. No retry, blanket timeout, or skipped test was added. Two consecutive clean full Playwright runs promote the suite to a blocking CI workflow.

The v0.1 layered product checklist is kept as provenance at [`history/v0.1/kickoff-pack/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md`](history/v0.1/kickoff-pack/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md). Human-feel questions in that document are not auto-checked by passing tests.
