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
