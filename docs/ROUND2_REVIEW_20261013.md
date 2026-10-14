# Round 2 independent review and C integration — October 13, 2026

## Plan and inputs

The operator requested a fresh GitHub audit, an actionable plan and execution. Priority is A's independent review and the shared #27/#42 transport contract, then independent #56 documentation review, current-main/B integration, #49 shared behavior and the version-identifiable Windows candidate. The web-answer proposal remains separate and unimplemented.

| Input | Exact reviewed head | Disposition |
| --- | --- | --- |
| #52 | cf89b6beea66aaecf217f61b860d1c05de12cafc | Independent Approval; shared transport confirmed |
| #53 | b8bf5611c70cd678166f1cf49fcf7811b44a9c41 | Independent Approval; Ask stays direct |
| #54 | d0d2180c2df85485a3f626819e79650972b11e03 | Independent Approval; Keep/Ask lineage preserved |
| #55 | 9e72e910535052af8907f447eae7f3c854eaf621 | Independent Approval; bounded ancestors and stale-result invalidation |
| #56 | 7eb175cc84c9b620cd057d94f938a7a17b0e2aad | Independent documentation Approval; 87 relative links checked |
| main | 337fcc46932fea3018a348118246e39e8a8e8f32 | Already contains operator-merged #57 and #64 |
| #65 | 94db15aa6b4c670955964fb53e447660f991b4be | Request Changes: Keep receipt missing for newly arriving suggestions |
| #66 | 858215acb39bb2cb0e032396dbd4913bd37abb2a | Independent Approval; wait for complete arrival batch before drag assertions |

These are exact snapshots. Latest distinct CI/E2E checks for each input were read back as successful before review; superseded/cancelled attempts and the #56 failed-first/rerun evidence remain historical. This does not establish success of the subsequently combined C head, which requires its own checks.

## Shared transport decision

The accepted #52 contract normalizes fetch/body/native deadlines to `timeout`; only an aborted caller signal establishes explicit cancellation and preserves its cancellation reason. Independent AbortError and broken streams become `provider-unreachable`; fully received invalid JSON remains `malformed-provider-response`. No automatic retry or private upstream prose is introduced. Ordinary/structured outputs and connection probes reject declared truncation/refusal. Gemini accepts semantic completion only with STOP; unsupported, unknown and missing finish reasons reject even parseable JSON without treating every abnormal reason as refusal.

C's transport file matches A exactly. C's runtime retains the stronger deadline/late-response handling and popup/terminal/manual-recovery UX. Its normalization assertions are preserved; explicit caller cancellation identity remains tested. The structured `evidence-assessment` purpose is retained when bringing in A's schemas.

## Integration performed in the C branch

The preceding C head `7ff0e09` remains recoverable as `local/backup-0312-20261013` and the published 0.3.12 tag. Main was merged first, then #52 → #53 → #54 → #55 in sequence, followed by independent #56, #65 and #66. No published A/B history was rewritten and no PR was merged into main by this work.

Conflicts arose because earlier A/B snapshots had already been copied into C. The wire/probe regression uses the latest A correction; Ask and bounded-continuation prompt content is retained. Schema/runtime merges preserve C's assessment and recovery. The four #56 documents are reconciled against actual current main while preserving dated C records. No historical directory was rewritten. #65 merges cleanly alongside C's dismissible feedback; #66 changes only its test precondition and keeps all exact drag/canonical assertions.

## Independent #65 finding and repair

Opening SuggestionReview snapshots its initial suggestions. A later suggestion is rendered from the live list, but is absent from that snapshot. Keeping the late arrival removes it from pending suggestions and also removes the displayed entry, losing the approved session-local Kept receipt.

A deterministic deferred-response browser regression was added: open with one suggestion, release a second response while the panel stays open, verify no focus theft, Keep that new item, then require its original text/Kept receipt and canonical save. The original implementation fails because the entry disappears. Commit `53403ad` snapshots the currently displayed entries immediately before the existing Keep action; it neither changes canonical authority nor retains a receipt after closing/reopening. The unchanged new assertion plus existing compact/IME cases passed together: 13/13, one worker, zero retries/skips.

The Request Changes review is anchored to B's current #65 head; C carries the repair in its combined candidate. B can incorporate that commit and request a new-head review. Approval of C's overall combined work still requires another developer.

## Verification boundaries

The combined source passed 623 unit tests, 315 offline checks, application/Core types, 1007 locale keys, syntax/import checks, source-size policy and production frontend build. Sidecar freshness passed. After the receipt correction, application types, frontend build and all 623 unit tests were checked again. The affected local browser matrix and final Windows NSIS build are recorded separately in the delivery/PR evidence.

An initial full local interaction run was deliberately interrupted when the independent receipt defect was found. It is incomplete evidence, not a full-suite pass. The final combined head must obtain its own complete GitHub CI/E2E qualification. Original defect/failure logs remain local; no assertion, timeout, retry or skip policy was weakened. Existing frontend chunk-size and native dead-code warnings remain.

Browser fixtures, synthesized IME events and offline events do not establish installed Windows/live-provider behavior. #22 still lacks complete readable real-source → read → real-model acceptance; the operator has no usable paid search Key, and keyless relevance/answer quality remains unresolved. #27 physical Wi-Fi/timeout/Stop and duplicate-free recovery still needs installed testing. #11/#12 remain open.

## #49 and next gates

The [navigation proposal and shared behavior confirmation](ISSUE49_NAVIGATION_PROPOSAL.md) align C with #65's compact shared placement, mutual exclusion, writing priority and IME/focus/ordinary-close boundaries. #48's direction is approved; #49's single return point and explicit reveal/return behavior remain proposed and require separate product confirmation. No unapproved production navigation or new search provider was added.

Next: publish current C source for independent review and complete its CI/E2E gate; give A/B exact review outcomes and the receipt repair; obtain #49 visible-navigation decision; then qualify the same identifiable Windows candidate with real-provider and physical input/network tests. Formal main integration must preserve A's order and recheck successors after any upstream squash. This record does not authorize self-approval of #63 or claim a reviewed-main release.
