# Issue #10: Final Quality Trial

This incremental pass responds to repeated real-use feedback. It does not establish live-model acceptance by itself. PR #37 is stacked on PR #18; credentials and native acceptance remain separate work.

## Current Changes

- Question defaults to one candidate. Explicit three/five choices remain available; Continue and Angle retain their existing defaults.
- Continue, Angle and Question share six session-only prior suggestion texts for unchanged supplied context, including ignored proposals. Normalized literal repeats are filtered locally, with no replacement request and no rejected text returned as a model premise. This is not a semantic paraphrase detector.
- Explicit Angle runs rotate seven bounded lens instructions for the same scope, wording, supplied background and permissions. Clearing the presentation retains this cursor; changed context resets it. A lens is conditional on the supplied context and may yield an empty result. Rotation guides generation; it cannot certify that the model changes perspective.
- One/three/five-question requests share five conditional focuses: definition/distinction, observation, assumption, boundary and choice criterion. For unchanged context, a three-question request tries the first three focuses; the next tries the remaining two without wrapping to refill the count. Inapplicable or resolved focuses are omitted. The cursor records attempted guidance, not verified model coverage; after all five it allows only a grounded unknown outside those focuses or no result. Changed context resets it. The user's authored Ask and frozen Thread prompts remain unchanged, and earlier rejected wording is not submitted as a premise.
- The selected Question count is an upper bound. Fewer questions or an empty result are valid; no replacement model call fills the count. A maximum-length authored prompt is preserved, and guidance that cannot fit does not advance the cursor.
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

Refresh the current preview before this trial. Question defaults to one result; three/five are explicit options. For this final pass, select three twice on the same confirmed thought, ignore unwanted proposals and check whether the second request gives distinct useful unknowns or honestly returns fewer/none. Do not demand three if no useful new question remains. A Question Ghost has a question marker and italic text; record the action confirmed in the preview.

An earlier October 10 screenshot set showed appended rationales and an overconfident alternative-cost comparison; its third image did not establish the Question route. The latest three screenshots explicitly identify Angle, Question and repeated Question. Both Question sets show question markers and italic text, resolving that uncertainty for the latest set. They repeat the definition of an actual reconstruction decision and the unit of a shared budget. The operator confirmed choosing three every time; the previous single-question-only guidance did not address this path. Screenshot truncation prevents claims about unseen wording, and guidance changes still require a live-provider usefulness check.

## Closeout Boundary

A1/A2/A3/A5 still require repeated live-provider observations across all three scenario categories. Engineering fixtures validate contracts and ownership, not novelty or usefulness. The existing screenshot set used different selections across action groups and does not complete same-selection comparisons. Do not close Issue #10 or mark the PR ready solely because CI passes.

Field decision-control clearance is tracked separately in PR #38 / #11. Handoff omission of direct `derivedFrom` parents is tracked separately in PR #39. Neither is included in this semantic pass.
