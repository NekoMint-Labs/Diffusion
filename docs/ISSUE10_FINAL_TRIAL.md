# Issue #10: Final Quality Trial

This incremental pass responds to repeated real-use feedback. It does not establish live-model acceptance by itself. PR #37 is stacked on PR #18; credentials and native acceptance remain separate work.

## Current Changes

- Question defaults to one candidate. Explicit three/five choices remain available; Continue and Angle retain their existing defaults.
- Continue, Angle and Question share six session-only prior suggestion texts for unchanged supplied context, including ignored proposals. Normalized literal repeats are filtered locally, with no replacement request and no rejected text returned as a model premise. This is not a semantic paraphrase detector.
- Explicit Angle runs rotate seven bounded lens instructions for the same scope, wording, supplied background and permissions. Clearing the presentation retains this cursor; changed context resets it. A lens is conditional on the supplied context and may yield an empty result. Rotation guides generation; it cannot certify that the model changes perspective.
- Single-question requests rotate five conditional focuses: definition/distinction, observation, assumption, boundary and choice criterion. Multiple-question requests keep their independent-unknown contract; the user's authored Ask and frozen Thread prompts remain unchanged. This guides novelty without submitting earlier rejected wording.
- Proposal wording requests one short, concrete thinking point. Each Question targets one answerable unknown rather than bundling a definition, threshold and implementation plan. Existing schema and the 480-character ceiling remain intact; outputs are never silently truncated.
- The final screenshot follow-up asks Question for just one standalone interrogative sentence, without an appended rationale, consequence or answer. Angle comparisons distinguish conditional trade-offs from established effects; a policy alone does not establish resource distribution or exclude other costs. These are generation instructions, not a linguistic or causal truth classifier.
- Selection ownership, typed action gates, Ghosts, Keep/Ignore, cancellation and timeout behavior remain in force. No extra model round-trip, automatic retry, autonomous commitment or new persistent preference was added.

## Short Operator Trial

Use the same selected, confirmed thought for action comparisons. Run Continue, Another Angle and Question twice each. For a relation use exactly two appropriate confirmed thoughts; Organize needs at least three. Generic Diffuse remains available through its existing run-settings entry.

1. Use an actual project-direction problem: does Continue add an implication while Angle changes the basis of judgment?
2. Use the contributor's actual technical trade-off: do repeated suggestions add distinct material, stay tentative and fit on a card?
3. Use an unfamiliar complex decision: does Question expose a useful unknown, with one independently answerable point per card?
4. Ignore a proposal, then request again. Keep one useful proposal, reopen the project, and continue from it. Check that Ignore leaves canonical thoughts unchanged and Keep preserves source lineage.
5. Review a relation explanation, and exclude a relation in Organize before Apply. Check that no structure becomes canonical before explicit confirmation.

Record each action's selection, the provider/model shown by the app, whether its result was useful, any repeated concept, the Keep/Ignore decision and reopened state. Keep private transcripts/screenshots local. An empty result is valid, but frequent empty results still need quality review.

Refresh the current preview before this trial. Question defaults to one result; three/five are explicit options. A Question Ghost has a question marker and italic text. A screenshot of ordinary possibility Ghosts cannot establish that Question produced statements; record the action actually confirmed in the preview. The October 10 screenshot follow-up shows useful time-horizon material and three distinct unknowns, but also appended rationales and an overconfident alternative-cost comparison. Its third screenshot has ordinary possibility markers, so its claimed Question route is unverified.

## Closeout Boundary

A1/A2/A3/A5 still require repeated live-provider observations across all three scenario categories. Engineering fixtures validate contracts and ownership, not novelty or usefulness. The existing screenshot set used different selections across action groups and does not complete same-selection comparisons. Do not close Issue #10 or mark the PR ready solely because CI passes.

The observed Field overlap needs reproducible #11 evidence. The confirmed Handoff omission of direct `derivedFrom` parents needs a separate, bounded export fix. Neither is claimed fixed by this semantic pass.
