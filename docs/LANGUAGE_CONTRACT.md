# Diffusion Language Contract

Status: Phase 3D foundation  
Scope: product copy, authored text, AI proposals, questions, relations, explanations, evidence copy  
Implementation policy for this phase: establish ownership, contracts, examples, and audit targets before broad prompt rewriting.

## 1. Language identity: Quiet Realism / 克制现实主义

Diffusion should sound like someone listened carefully, removed unnecessary words, and stopped before over-explaining.

Priority, not a score:

- ordinary human language first;
- editorial clarity second;
- a small amount of literary residue only when it comes from an accurate observation.

The desired voice is intelligent, observant, concrete, restrained, and occasionally beautiful. It must not perform profundity.

### Practical test

A line belongs in Diffusion when a real person could plausibly say it while thinking aloud and the line does one clear job.

Prefer:

- `我担心三年有点久。`
- `兴趣和就业在拉扯。`
- `如果先不决定，你最想试哪一个方向？`

Avoid:

- `这反映了你在长期价值与个体成长之间的深层权衡。`
- `站在人生的十字路口，你需要重新聆听内在需求。`

## 2. What the reference projects teach us

Research date: 2026-09-18. These are mechanisms to learn from, not prompts to copy.

### mission-bullet-oss

Source: <https://github.com/lerugray/mission-bullet-oss>

Useful mechanism:

- raw user text remains the authority;
- AI commentary is adjacent to authored text rather than silently replacing it;
- commentary may challenge or clarify without becoming authored truth;
- tone explicitly resists sycophancy, therapy-speak, moralizing, and fake reassurance.

Borrow:

- the authority boundary between what the person wrote and what the system proposes;
- willingness to be plain and disagree when the evidence in the current context warrants it.

Reject for Diffusion:

- a single commentary voice applied everywhere. A relation token, a question, and evidence copy need different contracts.

### morning-checkin

Source: <https://github.com/paulschraven/morning-checkin>

Useful mechanism:

- user reflections are preserved verbatim;
- capture and interpretation are separate operations;
- the system avoids pretending that generated text is the user's first-person reflection.

Borrow:

- verbatim preservation as a semantic guarantee, not a cosmetic preference;
- rough or unfinished wording may carry uncertainty and should survive capture.

Reject for Diffusion:

- strict verbatim-only behavior for every derived object. Diffusion also needs clearly marked proposals, questions, and compressed relation labels.

### Humanities Writing Companion

Source: <https://github.com/tizzy916/humanities-writing-companion>

Useful mechanism:

- voice preservation has epistemic weight: generic polish can erase what the author actually knows, doubts, or emphasizes;
- style profiles/checkpoints can detect drift without forcing one universal style;
- intervention strength matters.

Borrow:

- distinguish PRESERVE, LIGHT CLEAN, and GENERATE NEW POSSIBILITY internally;
- judge drift against the role and source text rather than against generic polished prose.

Reject for this phase:

- automatic personal style modeling. Phase 3D only documents a future, local, opt-in direction.

### Muxwriter

Source: <https://github.com/ankitmukhopadhyay/Muxwriter>

Useful mechanism:

- AI acts as a brainstorming partner;
- generated edits/proposals remain proposals until accepted;
- accept/reject is an authorship boundary, not just an editing control.

Borrow:

- AI creates possibility; user action creates commitment;
- do not make a proposal look indistinguishable from committed user language.

### Are.na

Sources: <https://www.are.na/about> and <https://www.are.na/blog>

Useful tone reference:

- restrained editorial language;
- concrete verbs and nouns;
- character without decorative poetry;
- low explanatory noise.

Borrow:

- concise editorial compression;
- one concrete metaphor is acceptable when it names something real.

Reject:

- adopting Are.na's brand voice as Diffusion's global voice. It is a restraint reference, not a style template.

## 3. Text ownership map

| Text role | Owner | Purpose | Intervention | Canonical? |
| --- | --- | --- | --- | --- |
| UI button / menu label | Product/localization | name an action | deterministic | no |
| Status copy | Product template | say what is happening now | deterministic | no |
| Authored Thought | User | preserve a thought | preserve | yes |
| Extracted Thought | User-derived | split independently manipulable ideas | preserve / light clean | proposal until accepted by current flow |
| AI Thought Proposal | AI | add one useful possibility | generate new possibility | no until user commits |
| Question | AI or user | follow the current thread | generate, narrow | no |
| Relation Token | AI or user | compress a relation visible at a glance | generate / edit | candidate until confirmed |
| Explanation / insight | AI | explain one proposal or line of reasoning | generate | no |
| Source / evidence copy | source + deterministic product copy | show provenance and bounded assessment | preserve source; scoped AI judgment | source record/judgment according to evidence model |

Authority order:

1. user-authored text;
2. grounded source text;
3. explicitly committed user decisions;
4. deterministic product copy;
5. AI proposals and commentary.

Generated text must never silently move upward in that hierarchy.

## 4. Role contracts

### 4.1 Authored Thought

Owner: user.  
Purpose: retain what the person actually meant at the moment they wrote it.  
Typical length: whatever the user wrote, within product storage bounds.  
Abstraction level: user's own.  
Intervention: PRESERVE.

Preserve when meaningful:

- `好像`, `可能`, `我觉得`, `有点`, `我其实更担心`, `说不上来`;
- hesitation and uncertainty;
- first person;
- user vocabulary;
- fragments and awkwardness that carry meaning.

Never:

- silently polish it into analyst prose;
- upgrade employment concerns into identity, purpose, or self-realization;
- erase uncertainty because a smoother sentence sounds more confident.

### 4.2 Extracted Thought

Owner: user-derived.  
Purpose: split a long input into independently manipulable units without adding interpretation.  
Typical length: one independently manipulable idea.  
Intervention: PRESERVE or LIGHT CLEAN only.

Current owner:

- `src/ai/ingestion.ts` — `THOUGHT_EXTRACTION_INSTRUCTIONS` and provenance validation.

The current implementation already has the right boundary: each proposal must be grounded by exact `sourceQuotes`, preserves first-person voice, and forbids advice, facts, interpretation, labels, and analyst wording.

### 4.3 AI Thought Proposal

Owner: AI.  
Purpose: expose one independently useful unit of thought, not rewrite the user's idea more elegantly.  
Typical length: one sentence; occasionally two if the second sentence is necessary.  
Abstraction: no higher than the source context without a concrete gain.  
Intervention: GENERATE NEW POSSIBILITY.

Prefer one cognitive move:

- make a consequence concrete;
- name a missing practical constraint;
- offer a genuinely different framing;
- surface a trade-off already supported by the scope;
- suggest a bounded next possibility.

Good:

- `读研可能让我多一点时间试不同方向。`
- `也可能先工作一年，看看你到底讨厌的是写代码，还是现在这种写法。`

Bad:

- `研究生阶段能够提供更充分的职业方向探索窗口。`
- `这意味着你正在重新定义个人成长与职业价值。`

### 4.4 Question

Owner: AI or user.  
Purpose: let a perceptive person follow the thread one step further.  
Typical length: one concrete question.  
Allowed uncertainty: high.  
Literary quality: almost none; clarity wins.

Useful internal moves:

- clarify;
- contrast;
- make concrete;
- expose a trade-off;
- test an assumption;
- ask for evidence;
- ask what would change a decision.

Good:

- `你现在最卡的是哪一步？`
- `你更怕选错，还是一直选不出来？`
- `什么结果会让你觉得这三年是值得的？`

Bad:

- `三年后，你希望自己能回答出哪个现在还答不上来的问题？`
- `这背后真正触动你的是什么？`

Do not sound like a workshop facilitator, therapist, coach, or interviewer trying to manufacture depth.

### 4.5 Relation Token

Owner: AI proposal or user.  
Purpose: editorial compression directly on the Field.  
Typical length: roughly 4–12 Chinese characters where practical, or <=5 short English words.  
Intervention: generate a compact relation, then leave confirmation to the user.

Good:

- `兴趣和就业在拉扯`
- `都在担心时间成本`
- `一个想试，一个怕晚`
- `都绕不开以后做什么`

Bad:

- `两者都体现了对未来职业发展方向的不同侧面考虑`
- `兴趣偏好与现实职业约束之间形成结构性张力`

The label is not a mini-essay. Explanation, if present, may be one separate concrete sentence.

### 4.6 Explanation / insight

Owner: AI.  
Purpose: explain why a proposed relation, possibility, or interpretation exists.  
Typical length: one concrete sentence; two only when evidence boundaries require it.  
Intervention: generated but scoped.

Rules:

- explain the proposed connection, not the user's personality;
- prefer concrete nouns from the current Field;
- do not restate a short label in longer consultant language;
- uncertainty must match evidence.

### 4.7 UI copy

Owner: product/localization.  
Purpose: name controls and stable concepts.  
Length: shortest unambiguous wording.  
Intervention: deterministic.

Rules:

- name user intent, not implementation strategy;
- `Another angle` instead of `Diffuse` in ordinary action surfaces;
- `Continue thinking` instead of exposing a scheduler/run concept;
- the same semantic action appears once per context;
- implementation terms may remain in code, diagnostics, or technical docs without becoming product ontology.

### 4.8 Status copy

Owner: deterministic product template.  
Purpose: answer: what is happening, how far along, what can I do now?  
Length: one line plus a local control.

Prefer:

- `Trying another angle · 2 / 3`
- `Found 3 angles`
- `Stop`

Avoid primary status headings such as `scope`, `results`, scheduler budgets, model-call counts, or abstract system nouns.

### 4.9 Source / evidence copy

Owner: source text plus bounded product/AI assessment.  
Purpose: distinguish what was read from what was concluded.  
Abstraction: evidence-specific.  
Allowed uncertainty: explicit and high when support is incomplete.

Rules:

- never imply complete-document reading when only passages were inspected;
- cite/retain the concrete passages that ground the assessment;
- `inconclusive` is legitimate;
- evidence language may be more formal than a Thought, but it should not become courtroom theater or generic analyst prose.

## 5. Internal intervention modes

These are implementation concepts, not user-facing labels.

### PRESERVE

Use when the language itself is part of the evidence of meaning. Default for authored Thought text and verbatim source material.

### LIGHT CLEAN

Use only for obvious capture noise when removal cannot change uncertainty, emphasis, voice, or meaning. Do not automatically remove hedges.

### GENERATE NEW POSSIBILITY

Use for clearly marked AI proposals, questions, relation candidates, and explanations. Generated language can add a move, not retroactively author the user's Thought.

## 6. Artistic ceiling

"Artistic" is not "poetic".

Allowed when accurate:

- one compact contrast;
- mild rhythm;
- one concrete unexpected verb;
- deliberate omission;
- an accurate metaphor that describes a real mechanism.

Example:

- `把决定往后放一点。`

Avoid generic imagery unless the user introduced it:

- 迷雾;
- 旅程;
- 十字路口;
- 光 / 黑暗;
- 波浪;
- 回声;
- 风景;
- 丝线 / 线索之线.

Beauty should come from precision. If deleting the metaphor preserves all useful meaning and makes the sentence more ordinary, deletion usually wins.

## 7. Anti-AI catalogue

These expressions are not mechanically banned. They fail when they substitute abstraction for observation or appear as generic connective tissue.

Watch especially:

- `本质上`
- `这反映了`
- `这意味着`
- `从某种意义上说`
- `值得注意的是`
- `核心问题在于`
- `背后其实是`
- `不仅……而且……`
- `既……又……`
- `在……过程中……`
- `长期价值`
- `个体成长`
- `内在需求`
- `发展路径`
- `自我实现`

Failure patterns:

1. **Meaning upgrade** — employment becomes identity or life purpose without user support.
2. **Abstraction inflation** — `找工作` becomes `职业发展路径` with no added insight.
3. **Therapy drift** — the system asks about inner needs, fear, or self-worth when the user asked a practical question.
4. **Consulting drift** — ordinary uncertainty becomes frameworks, dimensions, strategic trade-offs, or executive-summary language.
5. **Motivational padding** — reassurance or encouragement replaces the requested thinking move.
6. **Decorative profundity** — metaphor creates atmosphere but no information.
7. **Over-explanation** — a relation token or status line explains more than its role needs.
8. **Generic interchangeability** — the sentence could be pasted into thousands of unrelated AI chats unchanged.
9. **Certainty inflation** — `可能` or `我觉得` disappears and the proposal becomes a claim.
10. **Authorship blur** — generated wording visually or semantically looks like something the user already committed to.

## 8. Concrete before abstract

Prefer the user's concrete frame:

- 找工作
- 三年
- 做什么
- 怕选错
- 想多试几个方向
- 不知道自己喜欢什么

Before reaching for:

- 职业发展路径
- 长期价值判断
- 自我实现
- 个体成长维度
- 方向探索机制

An abstraction is allowed only when it compresses several concrete observations and remains easy to unpack back into them.

## 9. Current Diffusion language audit

This audit names the current text owners before the next prompt-rewrite phase.

| Text role | Code owner | Current mechanism | Current failure risk | Phase 3D action |
| --- | --- | --- | --- | --- |
| Authored Thought capture | `src/ui/workspace/useThinkingIntents.ts`, Core Thought storage | raw submitted text is retained; no model rewrite on direct Thought creation | accidental future cleanup could erase roughness | document authority; no broad change |
| Thought extraction | `src/ai/ingestion.ts` | grounded units with exact `sourceQuotes`; preserve first-person/plain language | one generic extraction prompt still has to serve varied inputs | keep; regression corpus for next pass |
| General semantic AI output | `src/ai/prompt.ts` `JSON_INSTRUCTIONS` | one bounded instruction block for possibility/relation/question-like output | roles share one global style block; role-specific limits are incomplete | audit now; split role contracts next prompt pass |
| Relation proposal | `src/ai/prompt.ts` + `src/ai/runtime.ts` | short label plus optional explanation; candidate before confirmation | relation label and explanation still originate from same broad prompt | keep bounded structure; next pass add explicit Relation Token contract |
| Continue / ask prompts | `src/ui/workspace/useThinkingIntents.ts` | short runtime task strings for `probe` and `ask` | strings name strategy more than desired language role; question outputs rely on global prompt | next pass target task prompts + Question contract |
| Another-angle prompt | `src/ui/Workspace.tsx`, `src/ai/diffuse.ts` | fixed run prompt + bounded count | global prompt can still yield proposal text that is too polished or summary-like | interaction changed now; prompt rewrite next pass |
| Demo AI language | `src/ai/mock.ts` | authored deterministic examples | some examples are more workshop-like than Quiet Realism | target next pass so demo reflects product language |
| Evidence judgment | `server/app.ts` evidence reason endpoint | scoped claim vs supplied passages, explicit uncertainty | rationale says `scoped explanation` but has little role-specific style guidance | keep evidence rigor; next pass add Evidence contract without casualizing facts |
| UI action labels | `src/ui/commands/contextualActionModel.ts`, localization | centralized intent labels | previously duplicated / implementation-named actions | changed in Phase 3D |
| Status copy | `src/ui/surfaces/DiffuseSurface.tsx`, localization | deterministic progress/result templates | previously system/scheduler-like | simplified in Phase 3D |
| Empty state and helper copy | locale call sites across `src/ui` | deterministic strings | inconsistent age of copy; some older “system” vocabulary remains | audit in a later copy sweep, not broad AI prompt rewrite |
| Proposal labels / object-state copy | `src/ui`, `src/core`, localization | deterministic state labels | can imply more authority than candidate state if wording drifts | preserve candidate/confirmed distinction |

### Important existing strengths

`src/ai/prompt.ts` already says to use the user's language, stay plain, avoid analyst wording, keep relation labels short, avoid therapy/motivational/poetic filler, and prefer one precise possibility. `src/ai/ingestion.ts` already has the strongest ownership mechanism in the system: exact source quotes plus first-person preservation. Phase 3D does not replace these foundations.

### Main structural weakness

The broad `JSON_INSTRUCTIONS` block currently carries several language roles at once. A Thought Proposal, Question, Relation Token, Explanation, and Evidence-like response do not have identical jobs. The next prompt pass should keep one shared safety/shape contract but inject a compact role contract according to runtime purpose.

## 10. Example and regression corpora

Human-readable examples:

- `docs/language/examples.zh.md`

Machine/lightweight reusable cases:

- `docs/language/regression.zh.json`

These corpora are not style scorers. They exist so a prompt change can be inspected against the same inputs and roles.

Review outputs for:

- Thought Proposal;
- Question;
- Relation;
- Continue thinking;
- Another angle.

## 11. Lightweight review check

A sentence fails review when any of these is true:

- it introduced meaning the user never supplied;
- it became more abstract without gaining insight;
- it sounds like therapy, consulting, or motivational writing;
- it could appear unchanged in thousands of unrelated AI chats;
- it explains more than the role requires;
- its beauty comes from decorative metaphor rather than accuracy;
- it removed a meaningful hedge or first-person marker;
- it sounds committed when it is only a proposal.

Ask:

1. Could a real person reasonably say this while thinking aloud?
2. Is it more specific than the abstraction it replaced?
3. Did it preserve the uncertainty level?
4. Is it doing only one job?
5. Can every new meaning be traced to the current scope, evidence, or a clearly marked possibility?

No numeric style score is required or recommended.

## 12. Future voice adaptation: recommendation only

A small local voice profile could eventually be useful, but only from user-committed Thoughts and only as an optional presentation aid.

Potential low-risk signals:

- sentence length distribution;
- vocabulary the user repeatedly chooses;
- uncertainty markers such as `可能`, `好像`, `我觉得`;
- fragments vs complete sentences;
- concrete vs abstract wording.

Hard boundaries:

- no psychological profiling;
- no personality inference;
- no hidden trait labels;
- no semantic rewriting of authored Thoughts;
- no replacement of user-authored text;
- no use of uncommitted AI proposals as evidence of the user's voice.

Recommendation: do not implement yet. First prove that static role contracts plus regression examples substantially reduce drift. If adaptation is later tested, make it local, inspectable, resettable, and subordinate to authored text.

## 13. Exact next prompt-rewrite targets

Order matters. Do these after Phase 3D interaction foundations are stable.

1. **`src/ai/prompt.ts` — `JSON_INSTRUCTIONS`**
   - keep shared JSON/safety/provenance constraints;
   - factor role-specific clauses for Thought Proposal, Question, Relation Token, and Explanation;
   - preserve the current anti-therapy/plain-language strengths;
   - avoid a growing universal mega-prompt.

2. **`src/ui/workspace/useThinkingIntents.ts` — runtime task strings**
   - `probe`: ask only for a relation candidate, with Relation Token expectations;
   - `ask` / scoped question flow: explicitly request one useful move instead of generic outward exploration;
   - Thread entry: distinguish question-following from Field proposal generation.

3. **`src/ui/Workspace.tsx` / `src/ai/diffuse.ts` — Another angle**
   - make each returned Thought a genuinely different framing, not a paraphrase set;
   - one cognitive move per candidate;
   - preserve uncertainty.

4. **`src/ai/mock.ts` — deterministic demo language**
   - update examples so the demo teaches Quiet Realism rather than older workshop-style wording.

5. **`server/app.ts` — evidence reasoning instruction**
   - add the Evidence role contract: concise, claim-scoped, uncertainty-preserving;
   - do not make evidence copy colloquial enough to weaken provenance or factual precision.

6. **Targeted UI copy sweep**
   - audit empty states, proposal-state labels, and stale implementation vocabulary after prompt behavior is stable;
   - do not turn this into a brand-voice rewrite.

## 14. Non-goals for this contract

This document does not:

- make AI prose canonical project state;
- define a personality for the user;
- require poetic language;
- require a style score or language dashboard;
- justify rewriting authored text;
- authorize broad prompt changes in Phase 3D;
- replace evidence/provenance contracts.

The durable boundary is simple: **AI may propose language; it may not silently take authorship.**
