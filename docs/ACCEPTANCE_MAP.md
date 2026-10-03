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
| A2 — no paraphrase regression | Run-local bounded avoidance wording; Continue, Angle and Question discard echoes of request-supplied thoughts and pending Ghosts attached to the selected scope, plus same-response literal repeats, after conservative Unicode/whitespace/punctuation normalization. Repeated explicit Angle requests remember at most six prior frames for unchanged selected context, including ignored proposals, as negative data only; Ask rejects a small exact set of context-free Chinese/English opener questions after Unicode and punctuation normalization | Repeated live outputs must be reviewed for synonym rewrites, generic prompts, filler and premature conclusions. These literal filters do not detect semantic paraphrases. |
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

The 2026-10-03 trial initially stopped on DeepSeek authentication failure. After the contributor
configured the session, limited real outputs were captured and reviewed. Repeated Angle frames and
an Organize proposal that treated compatible approaches as alternatives motivated focused repairs.
Organize now asks for a supported unresolved premise or evidence gap, preserving conditional concerns
and allowing no note rather than inventing one. Growing anchored surfaces recompute their position so
controls remain within the viewport. These samples do not establish A2/A3/A5 across three real
scenario categories; the complete repeated matrix and uploaded-head CI remain outstanding.
No credentials or private scenario transcripts are tracked. Public tests use authored fixtures and
prove boundaries, geometry and lifecycle, not semantic originality or scientific correctness.
Keep Issue #10 open until its acceptance is supported and the owner explicitly requests closure.


### Remaining Issue #10 closeout trial

For each of the three real scenario categories, retain the person's actual starting selection and
compare applicable actions on that same scope: Continue should add a consequence or constraint;
Angle should change the frame; Question should expose an assumption or missing distinction;
Relation needs multiple suitable thoughts; Organize should reveal existing structure; Diffuse
should stay within its explicit budget. Repeat Continue and Angle with unchanged owned scope,
including an ignored suggestion, to check whether a different wording still repeats the same frame.

Record provider/model, candidate revision, action, repeat index and a brief assessment of relevance,
novelty, specificity, concision and preserved uncertainty. Include both Ignore and Keep/Claim,
checking original wording, stored positions and camera before and after. A useful empty result is
allowed; do not count it as a novel possibility. Keep private prompts, outputs and screenshots
local; publish only contributor-approved anonymized observations. A deterministic fixture verifies
filtering and lifecycle, never the semantic scores in this trial. A2/A3/A5 remain unverified until
the repeated live results support them.

### 2026-10-03 — one local real-model observation

One bounded Angle run on the contributor's technical-research scenario completed and displayed a single temporary proposal; the browser reported no console errors. DeepSeek had been configured in the app previously, but its model identifier was not rechecked during this run. The proposal offered a potentially useful distinction between two task framings: relevant, concise, and appropriately tentative, but still high-level rather than operational. This is one promising observation only: it does not establish repeated novelty or A2/A3/A5 acceptance. Ignore/Keep was not exercised, and the proposal was left temporary; no canonical state was changed. The prompt, full output, and screenshots remain private and are not recorded here.

### 2026-10-03 — DeepSeek live acceptance pass

The session-held DeepSeek credential was verified through the app's real connection probe. Model discovery returned two provider-supplied IDs; the trial used the configured `deepseek-v4-pro` model after rechecking the discovered list. No credential value, private screenshot, or full provider transcript is recorded here.

- **Technical / unfamiliar judgment — Ask:** on the sparse-view reconstruction and agent-view-selection problem, two live question proposals were surfaced. Both named a concrete uncertainty rather than using a generic opener. One question was ignored and disappeared without changing the selected source; the other was kept and became an ordinary Thought in place, with its question wording retained. This exercises both A4 paths.
- **Technical / unfamiliar judgment — Continue:** a completed run surfaced bounded continuation material near the selected scope. The run did not mutate canonical authored thoughts; repeated-output review remains open because one pass is not enough to establish A2.
- **Technical / unfamiliar judgment — Another Angle:** a repeated run completed with no new proposal after the scoped avoidance checks. This is recorded as an honest empty result, not counted as novelty; the UI still needs a human-visible capture of the empty-result notice during a live run.

This pass supports provider connectivity, concrete Ask semantics, agency, and empty-result handling. Product-direction and separate technical-trade-off scenarios, plus repeated Continue/Angle review, remain before A2/A3/A5 can be marked complete.
- **Product / project direction:** I tried the real current decision about whether to keep iterating locally or upload the Draft before all Issue #10 scenarios are complete. This run returned no new field proposal, so it is recorded as an honest empty result rather than a quality success.
- **Technical trade-off:** on the actual “same number of views vs same information amount” trade-off, one live question surfaced the confound between the agent's selection quality and the reconstruction method's contribution. It was specific to the decision and preserved the unresolved comparison.

The three scenario categories are now exercised at least once, but the product-direction run did not produce a useful possibility and the repeated Continue/Angle matrix is still incomplete. A2/A3 therefore remain open.
- **Repeated same-scope Continue after agency decisions:** with the same selected research thought and after one proposal had been ignored and another kept, a one-result Continue completed without surfacing a new card. No console error or canonical mutation appeared. This is useful negative evidence for A2, but the transient empty-result notice was not captured in the page after the run.
