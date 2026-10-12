# Desktop review candidate 0.3.12

Prepared for Draft PR #63 on 2026-10-12 after the operator authorized uploading the previously local changes. This is a review candidate, not a release or acceptance of the other open PRs. The installer and raw local logs remain on the operator's machine; this upload contains source, tests and documentation.

## Completed

- Continue/request failures retain terminal feedback; connection and timeout failures receive an acknowledgement dialog. Closing it does not retry. Transient bottom notices and terminal feedback have explicit dismiss controls; running operations retain Stop.
- Verify acknowledges known offline state and in-flight offline events. The UI stops waiting even if an engine ignores cancellation, ignores late output and requires explicit recovery. Search, reading and model assessment share this bounded lifecycle.
- Explicit assessment uses the configured real model and only the current claim plus at most four read passages / 6000 total characters. Returned passage references are validated. Demo does not fabricate an assessment. Fetch/extract pairing respects redirected sources.
- Dictionary excerpts prefer a relevant original sentence over pronunciation/XP preambles where possible. Opening collapsed pipe tables receive a bounded literal preview in both search and reading. Empty cells and named related-navigation/ad sections no longer dominate the reported WordHippo example. Original excerpts/passages stay expandable and model assessment still receives the original matched passages. This presentation does not generate an answer.
- The combined source includes reviewed-by-inspection local integration inputs from A and B, listed below. Authored Ask, kept-Ask lineage, bounded ancestor context, nearby proposal placement, per-frame drag controls and dense-control avoidance are retained together with C's failure/Verify fixes. These contributions must not be attributed solely to C, and this combination does not merge or approve their PRs.

## Integration inputs

The combined candidate was built from C `c948a7997122d905f86f780ed07674f0ed32f184` plus subsequent local fixes and these exact inputs. These are recorded snapshots, not a claim about the latest remote heads at upload time.

| PR | Input commit |
| --- | --- |
| #52 | a022d403c14ba45133446e947223b1d219cc2139 |
| #53 | 593a10604d05f4442d32ba148fab60c394714796 |
| #54 | 6fd9ddd90b3e37160792427ce83917a7a39397cf |
| #55 | d97eb4be0b015d8f95f658ee5b17aa807dddfb58 |
| #56 | e9b7b4876dda0899c8e7626d59dc72ad2b929f40 |
| #57 | aa8d18f279eaf16ed00af7eb3b527f339bd3e4e8 |
| #60 | f395e95bb046a2460fc6e03640813f708a653492 |
| #61 | edc877808d06b70ddc1f1aede527b1436383f614 |

The transport uses the recorded #52 implementation. The local orphan-body AbortError assertion checks normalized provider-unreachable failure; explicit caller cancellation identity remains protected. There is one drag-preview layout path rather than duplicated implementations. Formal integration still requires reconciling overlap and respecting #52 → #53 → #54 → #55, with #56 independent.

## Verification

The final 0.3.12 source passed 576 unit tests and 315 offline tests, application/Core type checks, 1001 locale keys, source-size policy, syntax/import checks, discovery sidecar freshness, production frontend build and Windows x64 NSIS build. The local pnpm shim was unavailable; equivalent underlying Node commands were used. Existing frontend chunk-size and Rust dead-code warnings remain.

The focused browser matrix covered 23 cases. Its first run had 22 passes and one failure because the new fixture returned `insufficient`, which is not a permitted assessment outcome. After correcting that fixture to `inconclusive`, the unchanged assertion passed in a separate one-case run. This is not a single all-green run or the complete E2E suite. The new case verifies snippet/read display, raw expansion, read status and preservation of the full original passage in explicit model assessment. Responses and offline events are controlled fixtures, not installed/live-provider acceptance.

The earlier combined 0.3.10 source passed 565 unit, 315 offline and 77 focused browser cases plus a separate authored-Ask case. Those historical counts belong to their named revision, not the final 0.3.12 source.

Local NSIS version: `0.3.12-local.20261012`; SHA256: `4bc3c97c0c559d6c488f22a191bdc1cf72ba1598e08364f452b2ccbe2d5a37ee`. The repository application package version, release tags and installer publication are unchanged.

## Next

- Independent review of C's combined changes; reconcile overlap with the listed open PRs before formal integration.
- Installed Windows testing of physical Wi-Fi disconnect, timeout acknowledgement/dismissal, explicit Stop/manual retry, drag/menu layout, Keep/restart and complete live Verify.
- Compare real search output against fixed questions; evaluate the separate [web-answer proposal](WEB_ANSWER_PROPOSAL.md) before implementing a new product flow.

## Blocked / incomplete

The operator has no usable Tavily/Brave/Exa search API Key. Existing opt-in keyless search returned candidates in one packaged-engine check, but the operator reported largely unreadable and irrelevant output. The supplied examples expose page tables/navigation/ads as part of the problem. Literal preview repairs address those examples; they do not establish that all garbling, source relevance or answer quality is fixed. A transient engine-start timeout was also observed earlier; its cause remains unconfirmed. Complete installed/live search → reading → real model assessment remains unverified.

The new web-answer pipeline is a proposal only. No new provider or SearXNG deployment was added. #49/#48 production navigation and #12 final acceptance remain pending; no issue is closed by this upload.

## Needs operator/product decision

Agree whether a separate answer mode belongs in scope and choose source strategy after measuring the existing backend. #49/#48 visible navigation still requires product approval. Final #12 native acceptance belongs on reviewed integrated main, not merely on this Draft branch.
