# Next exploration trial

Status: an opt-in experiment for developer B and requester trials, based on main `59f1e28c`.
This is not an adopted replacement for Field, Thread, Diffuse, or their current contracts.
The requester explicitly authorized submitting this experiment as a PR on 2026-10-24,
after the original trial-first plan. Actual requester trial, real-model evaluation and any
feedback repairs remain acceptance work; opening the PR does not authorize merging it.

## Try it

From source: install the declared dependencies, run `pnpm run dev`, then open
`http://127.0.0.1:40000/next/explore?locale=zh` (or `locale=en`).
For a prebuilt preview, run `scripts/preview-next.bat` on Windows with Python 3,
or `python3 scripts/preview-next.py` on another platform. It opens a loopback-only
server at `http://127.0.0.1:4175/next/explore?locale=zh`. No Node installation is needed
for the prebuilt preview. Keep the terminal open while trying it.

1. Fill in an overall question, priorities, and the current branch question, or use the example.
2. In the default authored demo, try one step or a maximum of three steps. These are fixed
   workflow examples, not model-generated discoveries or evidence of semantic quality.
3. Add a correction, create another branch, and inspect the actual next-step context. Other
   branch questions and notes are excluded until the person shares a kept note explicitly.
4. Paste source text (12–6000 characters) and select it for this branch. The exact quote must
   match a selected body. A successful text match is not verification that the assessment is true.
5. Change the goal, priorities, or branch question. Existing notes remain, but are marked for review.
6. Pause, reload, and decide whether to continue. Reload never launches a request.
7. For real inference, open Thinking connection and configure a provider/model. Each explicit
   run sends only the displayed bounded context to that provider, with at most three calls.
   Browser CORS/network restrictions still apply. A gateway must accept the preview origin.
   The gateway must run this branch's `exploration-step` purpose allowlist.

Observe whether useful ideas appear, whether stated priorities survive corrections and branch
switches, whether citations actually justify claims, and whether decisions to continue/stop make
sense. Record the input, selected provider/model, expected behavior, and actual outcome. Never
include credentials in feedback. Real-model trial and installed Windows acceptance are still needed.

## Ownership and behavior

- `src/next/state.ts`: independent, strict versioned notebook; four-layer context compilation.
- `src/next/decision.ts`: five allowed next actions and the authored demo; new structured task
  purpose through existing `AIProvider.structured`, provider registry and credential/transport seams.
- `src/next/session.ts`: bounded execution, pre-request checkpoints, cancellation and late-result
  rejection, timeout, quotation and scope validation, repeat termination and explicit user edits.
- The trial UI owns its notebook only. No Core controller, canonical Field ID, Dexie migration,
  Field object mutation, camera change, or automatic search is added.
- One notebook is saved under `diffusion-next-exploration-v1`, separate from normal Field storage.
  Goal/priorities and active branch question stay verbatim. Up to eight shared notes, eight recent
  notes, three recalled older notes, an archive index and three selected texts form model input.
  Excerpts are marked; full notes and quotes remain in the notebook. Recalled note text is complete.
- Model output is provisional. Keep means retained for consideration; sharing is a separate user
  action. Demo provenance remains visible. A matching quote does not authorize a factual claim.
- A running request is cancelled by a relevant notebook edit or branch/connection change. Previously
  generated notes retain their identities; goal/question revision changes mark them for review.
- Every invocation is bounded to one or three attempts; waiting, finish and repeated results stop
  the loop. A source-read failure or malformed output never creates a pretend source record.
- Browser credentials remain in the existing in-memory store. Desktop uses the existing OS-backed
  credential store. Connection settings and secrets are not part of this notebook or its export.
- On storage errors, the pending change is not accepted and another request is not launched.
  Invalid saved data is preserved and can be downloaded for recovery.

## Limits and future experiments

This trial starts outside the existing Field interaction while A/B/C semantics remain under study.
It has no automatic search/fetch, multi-agent orchestration, model-generated global summary,
cross-Field access, background execution, notebook-import UI or multi-tab synchronization.
Use one editing tab, export valuable work, and use the same browser/origin for reload recovery.
There are at most 12 branches, 80 notes per branch, 12 texts and 8 explicitly shared notes.
Exact normalized duplicate wording is stopped; semantic paraphrase repetition is not solved.
Model grounding and prioritization still require real examples; deterministic tests cannot prove them.
The prototype preserves raw earlier notes; this first retrieval step is limited to one branch.
It is not a Windows installer. No native-package or live-provider validation is claimed.

## Open-source method references

These are design references, not copied/vendored implementations; no runtime dependency was added:

- [AI SDK loop control](https://ai-sdk.dev/docs/agents/loop-control): per-step decisions and hard stops.
- [Thinking in LangGraph](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph):
  explicit state transitions and formatting raw state for each step.
- [Context engineering](https://docs.langchain.com/oss/javascript/langchain/context-engineering):
  distinguish stored state from the context supplied to one call.
- [Open Deep Research prompts](https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/prompts.py):
  revisit evidence gaps and preserve sources. This upstream repository is archived.

## Verification

Tracked checks: `tests/unit/nextExploration.test.ts` and `tests/e2e/nextExploration.spec.ts`.
Unit cases cover scoped context, stale-note flags, worst-case UTF-8 request budget, strict restore,
pre-request persistence, bounded execution, source matching, late-result rejection, timeout,
historical recall, duplicate output, and direct/gateway structured-task integration.
Mounted browser cases cover source display, explicit provenance, branch sharing, goal edits,
checkpoint reload, cancellation, rejected citations, secret-free export, and narrow dark layouts.
Network responses in these tests are injected fixtures, not live-provider evidence.
Generated logs/screenshots stay under ignored `verification/` and `test-results/`.

Passing new checks does not imply a full existing-suite/native/real-model acceptance pass.
See the accompanying trial report for actual commands, results and known unverified layers.
