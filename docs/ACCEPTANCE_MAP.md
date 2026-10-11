# Current acceptance map — implementation is not verification

This map separates implemented contracts from executed evidence and physical/operator checks. Product authority lives in the current product, architecture and contract documents — see the [documentation index](README.md); historical phase reports are provenance only. Exact current command results and environment limits are in [`../STATUS.md`](../STATUS.md).

| Requirement | Current implementation | Executed evidence | Remaining acceptance |
|---|---|---|---|
| Product identity and AI authority | Core permission gates; provider output remains transient until explicit Claim/Bring/confirm | Offline/unit authority, Crystal, Claim, Fork, Diffuse, and mounted browser flows | Real-provider semantic behavior is **UNVERIFIED** |
| Camera and spatial hot path | One imperative `CameraController`; pointer-frequency work stays outside React state | Camera/interaction unit tests and complete Playwright suite | 150% native viewport checks are recorded below; 100%/125% system scale and physical trackpad behavior remain **UNVERIFIED** |
| Full-bleed Field materials | Paper Texture (default), Topography, Threads, Waves, and Silk are lazy viewport-bounded screen-space renderers; all are pointer-inert presentation outside camera ownership | Field background unit/offline contracts plus production-background and material-gallery Playwright coverage | GPU/driver matrix and extended visual dogfood |
| Adaptive Thought geometry | Bounded compact/regular/wide sizing; editing freezes width; mounted interaction uses cached DOM measurements, while kind-aware pre-mount/disclosure estimates mirror ordinary, Source, and Crystal CSS widths | Unicode/punctuation/multiline and mixed-kind placement unit cases; edit-stability, lasso, drag, Scope Hub, and semantic-disclosure E2E | Chinese IME in native WebView2 is **UNVERIFIED** |
| Selection, focus, and relations | Semantic scope without camera travel or AI call; established relations wake; context recedes without disappearing | Unit contracts and mounted interaction/visual E2E | Extended real-project perception review |
| Commands and transient ownership | One command registry; one focus coordinator; Base UI menu semantics; one Escape owner; exiting surfaces are inert | Keyboard, focus handoff, Home/End, outside-click, and surface Playwright coverage | Cross-WebView accessibility inspection |
| Thread and Deep Dive return | Frozen scope and exact camera/selection return; pending camera frame is committed before persistence | Core scope tests and exact transform-return Playwright coverage | Native window interruption/reopen behavior |
| Sources and evidence | Bounded text extraction; explicit candidate → read → assessment stages; provenance retained | Offline/unit normalization, forged-evidence rejection, discovery engine 79-test suite | Real discovery source query/read is **UNVERIFIED** |
| Provider integration | Explicit protocols, bounded payloads/timeouts, semantic validation, native secret boundary | Fixture-backed provider/gateway/unit contracts; PR #18 records approval of an earlier DeepSeek operator experience | The complete current-head live-model action/scenario matrix remains **UNVERIFIED** in #10; that earlier approval does not qualify every action/provider |
| Persistence and migration | Existing Dexie database, in-place migration, single-flight save queue, portable recovery | Migration/repository tests and mounted browser persistence flows | Multi-tab coordination and measured IndexedDB disk latency |
| Localization and accessibility | Reactive EN/ZH dictionary, IME guards, semantic roles and focus return | Locale checks and Chromium keyboard/role assertions | Native Chinese IME and screen-reader matrix are **UNVERIFIED** |
| Browser delivery | Production Vite bundle served to Chromium; full suite uses one worker and no retries | Merged PR #32 head `2575dbf`: 305 passed / 12 existing dev-only skipped locally and remotely; current follow-up results belong to its own PR head | Broader browser engine matrix |
| Desktop delivery | One shared frontend, narrow Tauri adapters, freshly rebuilt Windows discovery sidecar | PR #29 Windows package accepted October 8; combined `bfc4065` Windows preview accepted October 9; earlier native/sidecar checks retain their original revision | No per-case record for the combined preview's physical IME, 125% system scale, dialogs, credential lifecycle or extended dogfood; final integrated binary belongs to #12 |
| Performance and bundle | Grid/culling/measurement boundaries retained; main chunk warning remains visible | Spatial/storage/history benchmarks and successful production build | Main chunk splitting requires measured benefit; no speculative split selected |

## Issue #10 / #11 integration, 2026-10-03

The current independent integration uses #17 `33bd1a7` and #18 `38eab8a`. [The integration record](ISSUE10_11_INTEGRATION_PREFLIGHT.md) maps conflict seams, contextual action bounds and final verification: 400 unit / 266 offline, successful production build and 93 final affected browser cases; initial complete results and 12 existing dev-only skips remain disclosed. Current fixed-size public-fixture renders qualify settings copy, full-row review and Atlas aggregation. These claims do not qualify native IME, OS scaling, credentials, an installer or live model quality; #12 retains Windows native acceptance.

## Issue #11 closeout checkpoint, 2026-10-10

PRs [#29](https://github.com/NekoMint-Labs/Diffusion/pull/29), [#30](https://github.com/NekoMint-Labs/Diffusion/pull/30), [#32](https://github.com/NekoMint-Labs/Diffusion/pull/32) and [#33](https://github.com/NekoMint-Labs/Diffusion/pull/33) are merged into main. [#31](https://github.com/NekoMint-Labs/Diffusion/pull/31) was merged into the #18 feature branch, so its direction repair is still part of that pending integration. Main at this checkpoint is `feb8ac504aea31f0142b5400ba4b904ed45c309d`. PR #32's exact reviewed head `2575dbf` passed 356 unit tests and 266 offline contracts, plus the [CI gate](https://github.com/NekoMint-Labs/Diffusion/actions/runs/37953979307) and [complete browser gate](https://github.com/NekoMint-Labs/Diffusion/actions/runs/37953979313). Both the local and remote complete browser runs recorded 305 passed, 12 existing dev-only skips, zero failures and zero retries.

The requester accepted the delivered Windows preview `bfc4065` on October 9 with “我觉得没什么问题，你继续吧”. Its installer was `Diffusion-review-bfc4065-x64-setup.exe`, SHA-256 `041F30B427F62C7B2870B3ADB65FCBF6C21C9F8EE910B84E3F8EAC509136DC0E`. The source comparison retained #32's navigation/line behavior and #33's menu fix; the extracted proposal-arrival hook has the same function body. This is acceptance of that delivered preview, with no per-case operator matrix, and does not qualify a later final integrated binary.

| Closeout item | Status and next owner |
|---|---|
| B1–B5 visible-product / Field work | Implementation and rendered regressions are merged; previous browser and Windows preview feedback is retained at its actual scope. Dense personal-project perception and extended use remain operator judgments. |
| B6 Chinese, scaling and input | Tutorial terminology and mounted layout/motion regressions are merged. The overview IME Escape follow-up protects both `isComposing` and legacy key code 229, with light/dark browser regressions. Dispatched browser events do not prove physical Windows IME or 125% system scaling. |
| B7 auxiliary surfaces and failures | Existing surface/error/AI-off coverage remains. The later Settings credential failure is tracked by [#34](https://github.com/NekoMint-Labs/Diffusion/issues/34) / [#35](https://github.com/NekoMint-Labs/Diffusion/pull/35); it is still pending at this checkpoint. Failure/recovery qualification belongs to #12 / #27. |
| B8 engineering | Exact-head evidence above is complete for merged #32. The IME follow-up locally passed 356 unit tests, 266 offline contracts, 31 mounted overview/overlay/interaction cases, application/core types, import/localization/source-size gates and production build. Its four new cases all failed on unmodified main before the guard; no retry, skip or weakened assertion was added. Its own remote checks and independent review remain required. |
| Related feedback #20 / #21 / #23 / #24 / #28 | Digits, successor-menu positioning, Chinese tutorial labels, zoom/subtree behavior and temporary Ghost distinction are implemented in the merged Field work. These issues are still open; implementation status is not a claim of completed final-release acceptance. |
| Remaining cross-owner integration | [#18](https://github.com/NekoMint-Labs/Diffusion/pull/18) remains Draft, including further nearby-proposal placement and incomplete #10 live-model acceptance. [#12](https://github.com/NekoMint-Labs/Diffusion/issues/12#issuecomment-6050431341) owns the eventual #10 + #11 packaged smoke, real credentials/failure recovery, physical input/scaling, restart and dogfood evidence. |

Keep #11 open for the remaining follow-up review and integrated acceptance. The dated sections below preserve earlier candidate evidence; their old draft/validation statements are not the current merge state. Reuse completed checks rather than adding another full validation system.

## PR #17 Windows review, 2026-10-03

The current pass is recorded in [NATIVE_UX_ACCEPTANCE](NATIVE_UX_ACCEPTANCE.md), including the twelve-comment mapping, current display/undo/camera contract, provider and search checks, source compatibility, and precise reference versus reuse notes. Earlier evidence below describes earlier candidates. The current installer and final command results are identified in [STATUS](../STATUS.md) and its acceptance delivery manifest.

More edge coverage now includes center, all four edges and all four corners with horizontal/diagonal travel, click pinning, keyboard return and exactly-once actions. Added regressions cover nested folds, invisible selected descendants, Atlas card/summary exclusivity, full-row keyboard activation, multi-source preservation, stale requests, empty model lists, refused key storage, provider draft isolation and long-result scrolling. Windows system scaling is recorded separately from browser DPR/media emulation. The requester still owns final native acceptance; no issue close or merge is implied.

## Stabilization acceptance

The earlier main stabilization resolved five recorded deterministic browser failures at their actual ownership seams: transient focus/Escape handoff, successor-surface ownership, Base UI menu navigation semantics, Settings motion contract sampling, and queued camera-frame commit. No retry, blanket timeout, or skipped test was added. Two consecutive clean full Playwright runs promote the suite to a blocking CI workflow.

The v0.1 layered product checklist is kept as provenance at [`history/v0.1/kickoff-pack/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md`](history/v0.1/kickoff-pack/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md). Human-feel questions in that document are not auto-checked by passing tests.

## Issue #11 B1–B8 candidate evidence

Implementation is available in the dependent draft PR stack linked in [STATUS](../STATUS.md#issue-11-candidate--acceptance-still-open). The requester accepted the first scope/feedback preview and then confirmed the object types and Keep/Ignore are understandable. The requester subsequently confirmed the final browser journey is smooth. Windows feedback then exposed zoomed editing/visibility and Settings title alignment defects; the repair evidence below is separate from final native acceptance. The source criteria were rechecked against [Issue #11](https://github.com/NekoMint-Labs/Diffusion/issues/11) on 2026-10-02. The authorized feedback follow-up adds organization as an explicit user data change, not as an incidental visual migration. No row implies Issue #11 can be closed automatically.

| Criterion | Implemented / retained | Reproducible evidence | Remaining human check |
|---|---|---|---|
| B1 First impression | Quiet empty Field and onboarding; primary Thought text; tools remain contextual | `redesign.spec.ts`, `tutorial.spec.ts`, `quietJourney.spec.ts` | Start from an empty Field without instructions; assess whether it reads as a thinking space |
| B2 Core journey | Creation, single/multi scope, preview/run/stop, temporary proposals, Keep/Ignore, explicit relation/Crystal confirmation, continued thinking | `quietJourney.spec.ts` exercises the sequence and reload; `feedbackRepairs.spec.ts` covers low-zoom Keep/Ignore and anchored overflow; `hierarchy.spec.ts` covers reparent/undo/reload and source routing; `fieldOverlays.spec.ts` covers held/error/late responses; existing Field/interaction suites cover drag/lasso/keyboard/pan/zoom | Browser flow accepted by requester; native focus and input remain unverified |
| B3 Recognizable objects | Thought ink, soft Ghost paper with one fine side rail and explicit unaccepted wording, stable Crystal typography/marker, individual selected dots and relation emphasis | `objectLanguage.spec.ts`, `objectLanguage.visual.spec.ts`, existing material and visual suites; all 20 profile/background combinations captured | Hide product name and assess recognizability; object distinction already accepted in preview |
| B4 Proposal vs commitment | Direct Keep/Ignore, explicit unaccepted wording, in-place Keep and temporary disappearance | `objectLanguage.spec.ts`: identity/coordinates, undo/redo, reduced/normal motion, transient state after reload; `feedbackRepairs.spec.ts`: reserved control space; `materialState.spec.ts`: commitment-frame feedback | Final browser flow accepted; native behavior remains unverified |
| B5 Quietness | Measured contextual controls and reserved feedback lane; reduced helper text and nested Settings framing; duplicate Ghost text animation removed | `fieldOverlays.spec.ts` also checks coaching space release; `surfaceReadability.spec.ts` also verifies the four Settings title baselines; rendered before/after comparison | Check dense personal material for competing chrome |
| B6 Chinese/responsive/motion | Wrapping labels, full scrollable Chinese context, screen-space Stop, request-owned feedback, immediate reduced-motion states | Surface cases at 1280×720 / 1440×960 / 1920×1080 / 1024×576 / 853×480; overlay DPR 1/1.25/1.5; 120% interface size; `spatialTransitions.test.ts`, motion/material suites; `zoomedWriting.spec.ts` covers zoomed Chinese editing, deselection, durable reload and Find; prior isolated WebView2 rendering checked at DPR 1.5; current browser zoom evidence is in STATUS | The current acceptance plan retains the requester's earlier 100% / 150% checks only. Do not infer native 125% coverage. Repaired installer, real IME and complete native journey still need acceptance |
| B7 Entire visible product | Existing onboarding, empty/error/AI-off/recovery states preserved; coherent auxiliary surfaces and Appearance | `tutorial`, `redesign`, `noticeLayout`, `surfaceReadability`, `fieldOverlays`, `objectLanguage.visual`, existing primitives/motion E2E; EN/ZH, light/dark and reduced motion | Browser return flow accepted; broader personal-project and native review remains |
| B8 Engineering | Existing semantic authority, persistence and gesture ownership retained; UI-only measurements plus the explicitly authorized optional organization field; original source data and project coordinates are retained | Typecheck/offline/unit/build/full E2E results in STATUS; source tests and CI screenshots; no snapshot bulk replacement | Full local results and earlier failures are recorded in STATUS; final PR CI and native/operator checks remain separate gates |

Screenshots produced by the new tests are uploaded by the existing E2E workflow. `objectLanguage.visual.spec.ts` runs with real production materials, while ordinary interaction tests keep the lightweight background fixture. Before/after images and full local logs are ignored evidence, not new product or data contracts.

### Feedback 4–10 evidence within B1–B8

| Feedback | Current evidence | Acceptance boundary |
|---|---|---|
| 4: low-zoom suggestions | `feedbackRepairs.spec.ts`, `thinkingOutcomes.spec.ts`, `fieldOverlays.spec.ts`; real Atlas capture and controlled success/empty/failure/cancellation/late responses | No real-provider semantic qualification |
| 5: overflow position | Click/hover/keyboard captures and the retiring-menu check in `hierarchy.spec.ts` | Native focus and assistive-technology behavior remain operator checks |
| 6–7: Ghost paper and controls | Actual side-rail/material measurement, fixed-identity Keep, 20 production palette/background captures, browser-scale fixtures | The formal Thought style is retained; native IME and OS scaling still need the new installer |
| 9A: organization vs source | Nine unit cases including permissions, cycles, 10,000-node traversal, actual project export/import and fake-IndexedDB reopen; mounted reparent/undo/reload | Missing field preserves old-project behavior; older-client writeback is not promised |
| 8: layered disclosure | Small pointer-anchored wheel zoom independent of explicit folds and selection; unfolded subtree fit bounds and compact Atlas anchors; twelve-level mounted reading at moderate zoom, Find and nested fold restoration in `hierarchyPresentation.spec.ts`; folded/offscreen subtree movement and deduplication in `fieldConvergence.spec.ts` | Dense Fields retain bounded reading caps; native operator acceptance remains separate |
| 9B: current-parent arrows and level style | One effective-parent edge per child; whole-branch depth styles and edge removal on reparent/independence/history/reload; same-depth equality and adjacent-depth separation rendered in four profiles with curve/elbow preferences; boundary/obstacle and live drag tests | A fully obstructed path is omitted; original sources remain inspectable |
| 10: palettes | Same-content four-palette / five-background rendered review; existing appearance and custom-accent checks | Personal visual preference remains a human judgment |

The first draft-run failures are retained and explained; no full-frame snapshot update, retry or skip masks them. New screenshots use controlled fixtures only. Browser scaling, Windows compilation and source/unit tests are not promoted to complete native/operator acceptance.


The second convergence pass supersedes the one-notch-per-level behavior. A 12-level mounted chain in warm/graphite profiles remains readable at moderate zoom without enlarging configured text. Tests preserve explicit nested folds, selection, saved camera, source-only Atlas anchors, fit bounds, undo/redo and reopening. Zoom and branch disclosure now have separate owners.

### Final collected feedback and organization preview

The current installable preview and source identity are recorded at the top of [STATUS](../STATUS.md), with [Chinese experience steps and fixed-size screenshots](ISSUE11_PREVIEW.md). These latest `05c4144` checks supplement the earlier full-suite evidence above.

| Final feedback | Reproducible evidence | Remaining boundary |
|---|---|---|
| More pointer travel / viewport edges | `remainingFeedback.spec.ts`: center, bottom and right; horizontal/diagonal hover, pinned click, action executes once, keyboard/Escape and outside-close focus | Cross-WebView assistive technology and native operator focus |
| Repeated Continue / suggestion overlap | Actual generation → Keep → generation at zoom 1 / .4 / .08; DOM bounds and fixed canonical coordinates; `ghostMeasurement.test.ts` rechecks later source growth/small overlap and preserves detached proposals; existing rapid Ghost drag regression | Deterministic responses do not qualify live-model content; dense private projects need real experience |
| Region labels only in overview | Atlas/neighborhood/local transitions, selected Region, reload and unchanged data in `remainingFeedback.spec.ts` | Human visual review in personal projects |
| Strict hierarchy and reading ceiling | 19 mounted `hierarchyPresentation.spec.ts` cases plus hierarchy unit coverage; four palettes, curve/elbow, deep chains, selection/history/reload and one-level collapse | Final Windows scaling/input checks |

The 37 distinct focused browser cases and three strengthened menu action-count checks passed with no retries; the latest 338 unit and 266 offline checks passed. Packaging success is separate from native/operator acceptance.

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

### 2026-10-04 — live trial evidence correction and visibility defect

The session-held DeepSeek credential was verified through the app's connection probe; the
configured, discovered model was `deepseek-v4-pro`. This is limited DeepSeek evidence, not
qualification of all providers. Credentials, full private transcripts and screenshots stay local.

- **Research / Ask:** two live questions named concrete uncertainties. One was ignored; the
  other was kept as an ordinary Thought with its question wording retained. These observations
  exercise both agency decisions, but do not complete the six-action comparison.
- **Repeated same-scope Continue:** the app explicitly displayed its non-empty success notice,
  yet no new Ghost mounted. A crowded-field fixture reproduced this defect: the pre-mount search
  exhausted its preferred clearance and placed the result beyond viewport culling, even though
  a tighter non-overlapping visible slot existed. The fixture failed before the repair. Lack of a
  visible card is therefore **not evidence of an empty model response or successful repeat filtering**.
- **Earlier Continue/Angle and product-direction notes:** prior entries labelled these runs as
  honest empty results without capturing a zero-result notice. Those classifications are withdrawn.
  The product-direction input was also composed with an unrelated research selection; it does
  not establish a separate properly scoped scenario. The previous three-category completion
  claim is withdrawn. The previous Continue-quality claim lacks sufficient output evidence.
- **Technical trade-off / Ask:** one observed question addressed attribution between selection
  quality and reconstruction-method contribution. This limited observation does not establish
  consistently useful results across repeated trials.

A1/A2/A3/A5 remain open. Finish correctly scoped, visible action comparisons and repeated output
review across all three real categories before proposing closeout. Draft #18 and Issue #10 stay
open; the current observation supersedes the earlier unsupported empty-result classifications.


### 2026-10-04 — repaired visible trials and bounded Angle calibration

Product revisions are `6bf3c55` (crowded placement) and `78d01ae` (Angle calibration).
The same live session used DeepSeek's discovered `deepseek-v4-pro` model. Full prompts,
outputs and captures remain local. These observations are qualitative samples, not a pass-rate
estimate, semantic-deduplication proof or scientific validation.

| Actual starting scope / revision | Actions and repeat evidence | Assessment and limit |
|---|---|---|
| Contributor's broad unfamiliar research question / `6bf3c55` | Continue twice and Angle twice on unchanged owned scope, explicitly ignoring the first result of each; Ask; Relation on two suitable owned Thoughts; Organize on three suitable owned Thoughts, cancelled; Diffuse with three directions and no sources/web | Visible Continue added a prediction constraint and then a different uncertainty consequence. Angle changed the interaction frame and then the goal. Ask exposed a concrete distinction, Relation identified a missing criterion, and Organize surfaced that criterion without applying its structure. Two of the three Diffuse directions overlapped semantically. One output was more assertive than desirable. The contributor reported the two presented research directions offered new inspiration worth continuing; this positive feedback supports only those directions, not every action or category. |
| Actual Draft-versus-acceptance collaboration decision / `6bf3c55`, then `78d01ae` | A separate Field with one manually authored committed Thought; Continue and Angle before calibration; two Angle trials after calibration with the first ignored; Ask | The initial Angle largely repeated a caveat already present in the selection. Single Angle no longer always requests premise reversal, and the bounded direction review asks the model to discard already-stated distinctions. Retests named integration-boundary stability and a review-trigger question, but one result overstated when new features need no acceptance rerun. Quality is mixed; repeated Continue and the applicable multi-thought comparison remain incomplete. |
| Contributor's narrower technical comparison / `78d01ae` | Continue, Angle and Ask on the same committed scope; two further Angle requests, explicitly ignoring the second Angle before the third | Continue exposed an independent-measurement constraint; the first Angle named selection overhead; Ask probed whether a usable measurement already exists. The second Angle reframed the comparison around reaching a quality threshold. After Ignore, the third moved to comparing full workflows, which may evade the original attribution question. It is not counted as a successful scope-sensitive result. Repeated Continue and multi-thought action review remain incomplete. |

Generation did not move the observed original cards or world camera. Cancelled Organize did not
apply its structure. Earlier live Keep/Ignore paths remain limited positive agency evidence;
fixture-backed persisted-wording/provenance and crowded-visibility assertions cover those
boundaries separately. A5 now has correctly scoped observations for project direction and two
research starting scopes, but the repeated category/action review is still incomplete.
A1/A2/A3/A5 remain open. Improving a prompt does not retroactively qualify earlier outputs.

Placement first retains preferred clearance, then checks bounded visible slots against raw
footprints before permitting an offscreen fallback. The new crowded 898×804 mounted regression
failed with zero visible results before this repair and passes afterwards, including non-overlap,
unchanged original state/camera and Ignore. A genuinely full viewport can still need the explicit
suggestion review/reveal path owned by the shared #11 integration; do not move the camera or
canonical cards automatically to manufacture space.

Final product `78d01ae` passed the production build/typecheck, 366 unit tests in 48 files,
265 offline contracts, 867 locale entries/source-size checks and 10 targeted mounted tests.
The full local E2E run (196 passed / 12 existing skips / 0 failed, one worker, zero retries)
belongs to the preceding placement product `6bf3c55`. Complete remote checks must qualify the
uploaded head separately. An offline-check attempt raced Playwright's deletion of a result file;
its diagnostic is preserved, and the sequential rerun passed after the browser tests finished.

Collaboration was rechecked after #17's October 4 squash merge to `main` at `4191bb0`.
The owner reported review and installed Windows acceptance of #17; that does not qualify this
#10 candidate. A read-only merge-tree preflight found 16 text-conflict files against the new main.
Against #19's existing `b5b1938` integration, the new text conflicts are only
`src/field/spatial/placement.ts` and `tests/e2e/response.spec.ts`. Synchronization must preserve
#19's visibleIds, measured geometry/resize, safe areas, suggestion summary and camera invariants,
plus this branch's raw-footprint fallback and kept-response persistence assertions. No integration
or PR merge is claimed by this preflight. #18 stays Draft and #10 stays open.


### 2026-10-04 — main synchronization and final local regression

The later synchronized candidate combines #18 `2bd2de3` with real main `4191bb0`,
using reviewed #19 `b5b1938` common seams without changing #19. Main's tree matches
#17 `639818a`. The 16 direct-main conflicts are resolved; the two newer conflicts combine
visible-only preferred/raw-footprint placement and exact persisted-response assertions.

The merged product passed production typecheck/build, 412 unit tests in 54 files, 266 offline
contracts with core/960 locale keys/source-size, and a complete `pnpm run test:e2e` run:
**298 passed / 12 existing dev-only skips / 0 failed**, one worker, zero retries. Light/dark
mounted continuation captures were visually reviewed. No assertion, skip or retry was weakened.
Commands and bounded evidence are recorded in [STATUS](../STATUS.md). These fixtures verify
visibility, scope, persistence and agency boundaries; they do not qualify semantic originality,
scientific correctness, live-provider quality or Windows native acceptance of this candidate.

[ISSUE10_CLOSEOUT](ISSUE10_CLOSEOUT.md) gives the next real trial procedure and anonymous record
format. Correctly scoped six-action comparisons and repeated real output review remain necessary;
A1/A2/A3/A5 stay open. Prior mixed output and evidence corrections above remain applicable.
The final uploaded head's remote CI must be checked separately. Keep #18 Draft and #10 open.

## PR #18 Field review checkpoint, 2026-10-10

The Field owner independently reviewed product `aae7796ddc321c245365122200872057fb34ec50`: nearby/forward continuation placement, measured reading/response controls, repeated mounted correction, selection and hierarchy disclosure, and Keep/Ignore/reopen boundaries. Application types, production bundling and 77 relevant unit regressions passed. A production Chromium run passed 73 cases across `continuationPlacement`, `fieldOverlays`, `hierarchy`, `hierarchyPresentation`, `integrationBoundary`, `overviewNavigation`, `proposalLocality` and `response`, with one worker, zero retries, zero skips and unchanged assertions. Fixed-size light/dark and Chinese reading/continuation captures were inspected. These cases did not assert selected-control intersection after source root-height growth; the blocking follow-up below supersedes the earlier clearance conclusion.

The #18 owner then synchronized main `8c01498` into product `0b205ed88381d416c53e396d95317d67af9d0155`, resolving the acceptance-record conflict. Field placement, Thought rendering/measurement and response implementations are unchanged between these products. Independent application types, production bundling and the same 77 unit regressions passed on `0b205ed`; 18 additional production-browser cases passed for overview navigation/IME, Crystal Handoff preview/download, and reading/responding at Local, Neighborhood and Atlas zoom. All six remote checks on `0b205ed` were independently verified successful. The 73-case result above belongs to `aae7796`, not the later product or a complete browser suite.

The later [Field review requested changes](https://github.com/NekoMint-Labs/Diffusion/pull/18#pullrequestreview-5479108444) on `0b205ed`. An independent production Chromium reproduction reused the nearby-corner fixture and added a measured response-button-versus-committed-neighbor intersection assertion. After the first continuation, the source height grew from 43px to approximately 96.44px while canonical wording/coordinates and camera stayed unchanged. The response button at `(550, 583.44)`, size `80 x 32`, overlapped the neighboring card at `(550, 583)`, size `176 x 43`; the new assertion failed with one worker, zero retries and zero skips. The initial preview startup was denied dependency-junction access; the authorized rerun reached this genuine assertion failure without weakening it. Existing green checks do not cover this intersection.

The [#18 owner confirmed reproduction and is preparing the repair](https://github.com/NekoMint-Labs/Diffusion/pull/18#issuecomment-6098848423), including the separate stale provider-history documentation correction. The uploaded product remains `0b205ed` at this checkpoint. Field review remains blocked until the uploaded repair passes independent control-clearance and affected reading/response checks while preserving canonical geometry and camera. No repaired-product or acceptance-completion claim is made.

This documentation-only follow-up records the Field review and introduces no further main synchronization or production-code change. It does not qualify live-model A1/A2/A3/A5, physical Windows input/scaling or the eventual packaged release. Keep #18 Draft and #10/#11 open; live semantic acceptance remains with #10 and final native integration with #12. The already-uploaded #38 relation-control clearance follow-up remains separate.

### Verified control-clearance repair, 2026-10-11

The #18 owner uploaded `f8d98be61bf6060c0efada9973109307afd97d90`, which supersedes the unresolved Field blocker above. Read/respond controls use their measured mounted footprint, avoid neighboring committed cards and the Scope Hub, and use the existing bottom action lane when no local slot is clear. The provider contract now correctly describes previous suggestions as session-only local literal-repeat filtering rather than extra model instructions.

Independent checks on this exact product passed application typecheck, production build, 66 related unit tests, and 32 mounted production Chromium cases across `continuationPlacement`, `response`, `fieldOverlays` and `integrationBoundary`. The previously failing independent collision case also passed, including added checks against the mounted Ghost and other action controls: **33 browser cases passed, one worker, zero retries, zero skips**. In that fixture the response button now occupies `(533.5, 902)`, size `80 x 32`, while the unchanged neighboring card remains at `(550, 583)`, size `176 x 43`. Canonical wording/coordinates and camera are asserted unchanged. Fixed-size Chinese arrival and low-zoom reading captures were inspected. Initial sandbox attempts could not read the E-drive dependency junction correctly; normal-permission verification passed without changing product code or existing assertions.

All six remote checks passed on `f8d98be`: [CI](https://github.com/NekoMint-Labs/Diffusion/actions/runs/38071135549) and [complete E2E gate](https://github.com/NekoMint-Labs/Diffusion/actions/runs/38071135546). The Field reviewer submitted [Approve on this exact head](https://github.com/NekoMint-Labs/Diffusion/pull/18#pullrequestreview-5480214250), clearing the earlier request for changes. The original build-size warning remains. This record branch incorporates `f8d98be`; its patch against #18 still changes only this document, and `git diff --check` passes.

This clearance does not complete live-model A1/A2/A3/A5 or qualify a newly installed Windows package. Keep #18 Draft and #10/#11 open. #37 must synchronize the updated #18 base and qualify its integration separately; #38 remains a separate Field follow-up. Final physical-input, credential and packaged/native acceptance remains with #12.

### Operator milestone closeout, 2026-10-11

The [#10 owner's later closeout](https://github.com/NekoMint-Labs/Diffusion/issues/10#issuecomment-6100541246) records the operator's direct acceptance of the current web preview and closes #10 as complete for this delivery milestone. This supersedes the earlier instruction to keep #10 open for acceptance. The four October 10 screenshots are historical pre-upgrade feedback, not evidence for the current build. The owner retains semantic variation and incomplete same-selection matrix evidence as follow-up quality notes; this record does not claim that the complete matrix was executed.

PR #18 remains open and Draft at `f8d98be`; its current-head Field approval and six green checks are recorded above. Issue closure does not merge the PR or qualify a new Windows installer. The stacked #37 still needs the repaired #18 base; #38 remains separately reviewed. #11 and #12 remain open for their remaining Field and packaged/native acceptance.

### Joint-preview relation-clearance follow-up, 2026-10-11

The first joint candidate `733513c39fccabf84a930c09fa6ecab07b0dca5f` combined main `8c01498`, #18 `f8d98be`, #37 `96b1591`, #38 `19bfa3b` and this record at `4cd52df`. Its complete production Chromium run passed 365 cases with the 12 existing dev-only skips, but failed the unchanged relation-versus-local-controls intersection assertion in `structureReview.spec.ts:61` after applying reviewed structure. The same assertion failed again in isolation. This separate integration defect supersedes the earlier merge-readiness conclusion; the original root/card repair remains valid. The Field reviewer submitted [a new request for changes on #18](https://github.com/NekoMint-Labs/Diffusion/pull/18#pullrequestreview-5480478720).

[PR #41](https://github.com/NekoMint-Labs/Diffusion/pull/41), head `7d43bbdc77bcd20432fd255da6ee98e4ee6e8675`, adds mounted relation labels and candidate decision rows to only the local read/respond control obstacles and resize observations. Its diff against #18 changes one UI file by six insertions and two deletions. Canonical card geometry, Scope Hub placement inputs, thinking behavior and test assertions remain unchanged. Application types, production build and 32 existing production browser cases passed with zero retries/skips; all six remote checks passed. The corrected local candidate `15b26633406f68a4bc6e35727f1666dffdfd3c98` passed the original failing case, including Undo/Redo, relation reopening and unchanged Thoughts. Its full browser rerun is still pending at this checkpoint; 489 unit, 269 offline and 25 Rust tests and the fresh Windows installer build have passed. The failed candidate and its installer are retained separately and are not qualified for delivery.

Review and absorb #41 before merging #18, then synchronize #37 to the repaired base and review #38 separately. #10's operator milestone closeout remains valid. Exact installer IME/DPI, OS credentials, real-provider recovery, persistence and long-session acceptance still belong to #12. This documentation-only follow-up is not inside the already-built `15b2663` preview; its manifest retains the exact included `4cd52df` record.
