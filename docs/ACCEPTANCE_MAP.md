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


## Issue #10 — thinking material acceptance

These incremental changes are scoped to Issue #10, not completion of release/native acceptance.
A useful local interaction and passing fixture-backed gates do not establish repeated live-model quality.

| Issue criterion | Implemented / exercised | Remaining before closeout |
|---|---|---|
| A1 — distinct action semantics | Dedicated Continue, Angle, Question, Relation, Organize and Diffuse contracts; typed output permissions; scoped continuation background | Compare the applicable actions on the same real problem/selection with the live provider. Prompt wording alone is insufficient. |
| A2 — no paraphrase regression | Run-local bounded avoidance wording and conservative literal-repeat exclusion; ignored proposals remain excluded within that run | Repeated live outputs must be reviewed for synonym rewrites, generic prompts, filler and premature conclusions. The lexical filter is not a semantic-paraphrase detector. |
| A3 — possibility quality | One proposal per exploration step, explicit direction/time budgets, honest empty-result feedback | Record whether each real result is relevant, concrete, non-trivial, concise and uncertain enough; a positive general usability report does not replace this review. |
| A4 — user agency | Core permission gates; Keep/Ignore and reopen paths; canonical source/camera invariants in mounted regression tests | Include both decisions in the real-scenario trial; never treat a selected Ghost or successful request as commitment. |
| A5 — three real scenario categories | Product direction and the contributor's technical research are available as candidate scenarios | Complete product/project, technical trade-off and unfamiliar complex-judgment trials, using actual problems rather than authored toy examples. |
| A6 — engineering quality | Unit/offline/build and complete mounted gates; AI-off/tutorial/Stop paths retained; no new retries, skips or weakened assertions | Validate the uploaded head's remote CI and review. Native/release qualification owned by Issue #12 remains separate. |

Portable regression coverage includes [bounded diversity](../tests/unit/diffuseDiversity.test.ts),
[empty-result feedback](../tests/unit/emptyThinkingFeedback.test.ts),
[continuation context](../tests/unit/continuationContext.test.ts),
[mounted exploration](../tests/e2e/diverseExploration.spec.ts),
[persisted responses](../tests/e2e/response.spec.ts) and
[visible continuation placement](../tests/e2e/continuationPlacement.spec.ts).

The current live trial on 2026-10-03 stopped on DeepSeek authentication failure before returning a
usable result. A2/A3/A5 remain unverified. No credentials or private scenario transcripts are tracked.
Further changes should address observed failures in this matrix rather than add unrelated features.
Keep Issue #10 open until its acceptance is supported and the owner explicitly requests closure.
