# Diffusion Explorer v0.2 - 4-Hour Redesign + Rebuild Prompt

You are responsible for performing a serious **v0.2 redesign and hardening pass** on an existing Diffusion Explorer v0.1 source tree within a **hard maximum of 4 hours**, then delivering a real, continuation-ready, integrity-checked **source-code ZIP**.

This is **not a greenfield rewrite unless the existing source is genuinely unusable**.

Your mission is:

> **Preserve the working Diffusion product core, replace the weak visual/interaction implementation with the Quiet Editorial Field v0.2 design, reuse mature generic frontend/backend mechanics where appropriate, harden thin provider/storage/source paths, verify as much as the environment permits, and deliver the strongest stable truthful source archive before the time limit.**

The authoritative redesign specification is:

```text
DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN.md
```

Read it completely before implementation.

If the user also provides the earlier kickoff/specification files, the frozen product architecture remains authoritative for product identity and AI authority. The v0.2 document overrides older visual/interaction implementation details where it explicitly changes them.

---

# 0. Highest-priority rules

1. **Hard maximum execution time: 4 hours.**
2. **Do not restart from scratch by default.** Audit the current repository first.
3. Preserve working product semantics and verified tests unless v0.2 explicitly changes intended behavior.
4. Product boundary beats implementation convenience.
5. Do not turn Diffusion into a whiteboard, graph editor, file desk, document editor, project manager, or chatbot + canvas.
6. **AI creates possibility; user creates commitment.**
7. **AI never sits on the critical interaction path.**
8. **Reuse mechanics. Design Diffusion semantics ourselves.**
9. Do not use shadcn/default AI-SaaS visual styling as the product design.
10. A named reference does not count as "used" unless you actually inspected the relevant source/docs and recorded it.
11. **Always distinguish IMPLEMENTED from VERIFIED.**
12. Network/npm/Rust/browser/API-key failures are degradation conditions, not reasons to stop source work.
13. The only pre-implementation hard stops are:
    - source files cannot be read/written reliably; or
    - no viable path exists to create and deliver a source ZIP.
14. Protect delivery continuously with value-triggered source checkpoints.
15. At roughly **3h20m**, enter Delivery Preservation Mode.
16. After roughly **3h40m**, add no new feature scope. Only stabilize, verify, document, and package.

---


## 0.1 Prior failure guardrails - do not weaken these

This rebuild exists after concrete failures. Treat these as non-regression requirements:

- Never deliver a recovery/report ZIP without real application source. Every meaningful checkpoint must have a verified source archive outside the mutable tree, and the final ZIP must be checked for real project contents.
- npm/network/cache/Rust/browser/API-key/search-provider failure must not stop source implementation. Enter Offline Source Implementation Mode instead. Only inability to read/write source or inability to create/deliver a source ZIP is a hard stop.
- Do not merely name reference projects. Inspect the concrete links/source paths in the v0.2 spec when relevant and record what was actually inspected in `docs/REFERENCE_AUDIT.md`.
- Explicitly prevent the prior visual failures: muddy brown Dark mode, selected pill/card morph, feature-inventory global menu, giant chat-like Speak, permanent developer labels, and random fixture-like demo layout.
- Correct Deep Dive if it is just a wider Thread.
- Correct lifecycle if it is dominated by pure elapsed wall-clock time while the app is closed.
- Do not turn search snippets into evidence judgments before fetch/extract/provenance/reasoning.
- Historical E2E baseline was 10/12, with failures around unsupported Source inspection and an ambiguous `Lighting` locator. Re-run first; if they persist, fix them without overfitting to brittle English text selectors.

# 1. Preflight - do this before making product changes

## 1.1 Establish the real repository state

Record:

- repository/project root;
- current branch/commit if Git exists;
- dirty working tree status;
- Node/npm versions;
- Rust/Tauri availability;
- browser/Playwright availability;
- package manager and lockfile status;
- current source archive/delivery path.

Do not reset, clean, stash, rebase, or discard user changes unless explicitly required and safe.

## 1.2 Read inputs

Read in this order:

1. `DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN.md`
2. existing `README.md`
3. existing `STATUS.md`
4. existing `package.json`
5. current source architecture under `src/`, `server/`, `src-tauri/`, `tests/`
6. older product/kickoff specs if supplied
7. existing attribution/license/reference docs

## 1.3 Run the current baseline before redesign

When dependencies are available, run the repository's existing equivalents of:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Also run any current offline/performance checks.

If some commands do not exist, inspect scripts rather than inventing status.

Record exact baseline pass/fail counts.

Historical context: an earlier real browser run reported 10/12 E2E passing, with failures around unsupported Source inspection and a Lighting locator ambiguity. This is historical only. Re-run the current tree before assuming those failures still exist.

## 1.4 Verify archive capability early

Prove that you can:

- create an archive outside the mutable project tree;
- list it;
- test integrity;
- extract and read it back.

Do not postpone this proof until the end.

---

# 2. Audit before rewrite

Before changing code, classify existing modules into:

```text
KEEP
REFACTOR
REWRITE UI
HARDEN BACKEND
REMOVE
```

Create:

```text
docs/V0_2_AUDIT.md
```

At minimum assess:

- core model/events/permissions;
- camera and drag hot path;
- selection/lasso;
- Focus implementation;
- theme tokens;
- Thought UI states;
- Speak;
- command menus;
- Thread/Deep Dive;
- Ghost/Recall/Crystal;
- Region/Atlas;
- lifecycle;
- AI provider;
- Evidence provider;
- Source parser;
- Project Find/Recall retrieval;
- Dexie schema/migrations;
- Tauri platform adapter;
- tests.

Do not rewrite working core logic merely because the UI looks bad.

---

# 3. Reference-first requirement

Create or update:

```text
docs/REFERENCE_AUDIT.md
```

For each reference actually used, record:

- subsystem;
- project;
- exact file/page inspected;
- license status;
- borrowed pattern;
- copied/adapted/studied-only;
- attribution requirement.

If network access exists, inspect targeted references before implementing the related subsystem.

## 3.1 Excalidraw source to inspect when relevant

Prefer inspecting these real source files before rewriting theme/layer/drag mechanics:

```text
packages/excalidraw/css/theme.scss
packages/excalidraw/components/Island.scss
packages/excalidraw/components/LayerUI.scss
packages/excalidraw/components/dropdownMenu/DropdownMenu.scss
packages/excalidraw/types.ts
packages/element/src/dragElements.ts
```

Study implementation patterns; do not import Excalidraw as the product runtime.

## 3.2 Study-only references

Do not copy code from a study-only source unless a specific path/license explicitly permits it and attribution is handled.

Study-only by default:

- Kinopio client;
- Penpot;
- BlockSuite/AFFiNE;
- tldraw SDK/runtime;
- Allume;
- Are.na/Sander;
- Kumu;
- Linear;
- Notion/Arc.

If network is blocked, **do not claim these were inspected**. Continue implementation using the provided v0.2 decisions and mark reference inspection as blocked.

---


## 3.3 Concrete inspection targets

The authoritative v0.2 spec contains a `Concrete reference links` section. Use those URLs rather than relying on memory or vague product-name searches.

Highest-priority targets when their subsystem is being changed:

- Excalidraw repo: https://github.com/excalidraw/excalidraw
- Excalidraw theme tokens: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss
- Excalidraw pointer state: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts
- Excalidraw drag mechanics: https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/dragElements.ts
- Floating UI: https://floating-ui.com/docs/react
- Radix Primitives: https://github.com/radix-ui/primitives
- cmdk: https://github.com/pacocoursey/cmdk
- Kinopio client (study only): https://github.com/kinopio-club/kinopio-client
- Penpot (study/reference): https://github.com/penpot/penpot
- tldraw license/architecture boundary: https://tldraw.dev/community/license
- Kumu Focus: https://docs.kumu.io/guides/focus
- Kumu Showcase: https://docs.kumu.io/guides/showcase
- Linear contextual commands: https://linear.app/changelog/2019-10-07-contextual-command-menu
- Are.na Sander: https://www.are.na/editorial/introducing-sander-our-new-web-client
- Allume updates: https://allume.com/updates/
- Vercel AI SDK: https://github.com/vercel/ai
- SmartSearch: https://github.com/onedotmint/smartsearch
- PDF.js: https://github.com/mozilla/pdf.js
- MiniSearch: https://github.com/lucaong/minisearch
- Dexie migrations: https://dexie.org/docs/Version/Version.upgrade()
- Hono RPC: https://hono.dev/docs/guides/rpc
- Tauri file-system scopes: https://v2.tauri.app/plugin/file-system/

Do not browse all of these indiscriminately. Inspect only the references relevant to the subsystem you are about to implement, then convert the inspection into an implementation decision.

# 4. Dependency/reuse policy

Prefer mature primitives for generic behavior, not for Diffusion semantics.

Reasonable candidates when they clearly improve the current code:

```text
@floating-ui/react
Radix Primitives
cmdk
react-hotkeys-hook
react-resizable-panels
motion/react
lucide-react
```

Optional only when benchmarked/justified:

```text
Selecto
RBush
d3-zoom
MiniSearch
PDF.js
```

Do not add every candidate automatically.

Before adding a dependency, answer:

1. Which current custom code/problem does it replace?
2. Is the license compatible?
3. Does it impose the wrong product ontology?
4. Does it reduce maintenance/accessibility risk?
5. Is it outside pointer-frequency hot paths, or designed for them?
6. Can it be removed later behind a thin adapter?

Do not adopt a full component design system for styling.

---

# 5. v0.2 implementation order

Use this order unless the real repository strongly suggests a safer dependency order.

## Phase A - Preserve and establish visual foundation

Target first coherent visual slice:

- new semantic theme tokens;
- Paper Day + Graphite Night;
- Shell cleanup;
- localization layer;
- deterministic demo/seed scene;
- remove permanent developer/tutorial/provider text from Field;
- preserve camera/drag/persistence behavior.

Create a verified source checkpoint as soon as this forms a coherent continuation-ready slice.

## Phase B - Thought states

Implement exactly:

- Rest = text, no card;
- Hover = tiny clarity/presence change only;
- Selected = aura-only, no filled pill;
- Editing = the only full Thought surface;
- selection must not change text geometry/reflow.

Add/adjust tests for geometry stability.

## Phase C - Focus + contextual commands

Implement the staged attention response:

- immediate selected response;
- nuanced attention hierarchy;
- related phenomena wake;
- unrelated context recedes without disappearing;
- no camera/object movement;
- no full-screen overlay;
- Ask / More near selected scope;
- global More reduced to true global operations.

Use Floating UI/Radix or equivalent mature primitives where useful.

## Phase D - Speak

Make Speak rest as a quiet language entrance, not a chatbot composer.

Requirements:

- compact at rest;
- small surface only when composing;
- selected scope expressed subtly;
- no provider/demo label in main UI;
- no large persistent chat UI.

## Phase E - Ghost / Recall / Crystal

Implement same-object visual continuity:

```text
Ghost -> Claim -> Thought
Recall -> Wake -> Thought
Thought -> confirm -> settle -> Crystal
```

No purple AI styling, glow, sparkle, countdown, gold Crystal, or success celebration.

## Phase F - Region / semantic zoom / Atlas / re-entry

Implement representation switching rather than geometric miniaturization.

Atlas must not become graph soup or a star map.

Region is not a group box.

If re-entry currently lacks a quiet unresolved frontier, implement the designed lightweight frontier without adding a resume dashboard.

## Phase G - Thread / Deep Dive correction

Preserve Field -> Thread -> Deep Dive semantics.

If Deep Dive currently reuses the same Thread surface with only a larger width, correct this.

- Thread = split, sustained discourse, Field visible;
- Deep Dive = focus surface, long structured reasoning/evidence, exact return point;
- no chat bubbles;
- no full writing editor.

## Phase H - backend hardening

Do not rewrite the whole backend. Focus on real thin spots.

### H1. AI provider audit

Detect provider-specific assumptions.

If justified, perform a small spike comparing current adapters with Vercel AI SDK or another mature abstraction.

Do not switch unless it clearly improves portability/structured output/abort handling while preserving custom endpoints.

### H2. Evidence pipeline

Enforce:

```text
Search
-> Candidate Source
-> Fetch/Extract
-> Evidence Passage + provenance
-> semantic judgment
```

Do not infer final support/challenge from search snippets alone.

Prefer reusing a normalized SmartSearch/evidence gateway instead of rebuilding search aggregation inside Diffusion.

### H3. Source processing

Preserve truthful degradation.

If practical, add PDF.js-based PDF extraction with page provenance.

Do not pretend unsupported formats were read.

### H4. Find/Recall

If existing Project Find is a naive full scan and project scale justifies it, evaluate MiniSearch or another small local index.

Recall remains custom and semantic; do not turn it into recommendations.

### H5. lifecycle

Fix any pure wall-clock decay behavior.

Reopening after long downtime must not mass-send the Field into Memory.

Add regression tests.

### H6. persistence

Add Dexie migration/versioning before schema evolution.

Benchmark snapshot storage before normalizing the database.

### H7. desktop

Verify native file path:

```text
pick -> read -> persist -> reopen -> inspect -> open original
```

Respect Tauri capability scopes.

---

# 6. Visual prohibitions

These are hard constraints for v0.2.

Do not create:

- large selected rounded pills;
- permanent Thought cards;
- brown-on-brown Dark UI;
- purple/blue AI glow;
- star-map Atlas;
- giant chat composer;
- permanent debug/provider labels;
- feature-inventory global menu;
- colorful semantic type coding;
- permanent graph edges;
- arrow-first relation language;
- shadcn-like generic AI SaaS styling;
- excessive glass/blur;
- grid/snap visual feel;
- random demo layout.

---

# 7. Product behavior that must remain protected

Do not regress:

- create/edit/cancel;
- IME composition safety;
- direct drag;
- pan/zoom;
- multi-select/lasso;
- Thread frozen scope + explicit Add current selection;
- Crystal preview/explicit confirmation;
- Find preview not moving camera;
- manual Field interaction while AI request is pending;
- viewport culling;
- semantic zoom;
- AI authority gate;
- provenance honesty;
- Ghost Claim semantics;
- Recall Wake semantics;
- Fork selective bring;
- Diffuse scope/budget/authority restrictions.

If an existing verified behavior must change because of v0.2 design, update both implementation and test intentionally and document why.

---

# 8. Performance contract

Hard rule:

> **React manages what happened; realtime interaction code manages this frame.**

Camera:

```text
pointer/wheel -> controller -> rAF -> direct world transform
```

Drag:

```text
pointerdown -> capture -> transient transform -> pointerup -> canonical commit once
```

Do not write canonical storage/history each frame.

Keep culling, geometry caching, and semantic representation switching.

Run/maintain fixtures at:

```text
100
500
2000
5000 Thoughts
```

Do not report an index microbenchmark as proof of 60fps UI.

---

# 9. Checkpoint mechanism - checkpoint on value, not schedule

Create:

```text
_checkpoints/
```

A checkpoint is required whenever a coherent, meaningful, continuation-ready slice exists.

Examples:

- theme + shell + demo scene now coherent;
- Thought Rest/Hover/Selected/Editing complete;
- Focus + relation + contextual actions coherent;
- Ghost/Recall/Crystal state language coherent;
- Thread/Deep Dive separation corrected;
- Evidence pipeline hardened;
- PDF/source path coherent;
- lifecycle + migration fixes coherent.

Also checkpoint before risky refactors.

Time trigger is only a fallback:

- first meaningful source snapshot as soon as a useful slice exists, no later than about 30 minutes after implementation begins;
- do not allow roughly 45 minutes of meaningful source work without another verified external source snapshot.

A checkpoint note or Git commit **does not replace a verified source archive**.

For source snapshots:

- archive from a known absolute project root;
- store outside the mutable tree;
- integrity-check immediately;
- verify expected files exist after listing/extraction;
- keep at least the latest two verified snapshots when practical.

---

# 10. Offline Source Implementation Mode

If dependencies/network are unavailable:

**DO NOT STOP.**

Continue writing the intended real source tree.

Rules:

- preserve React/TypeScript/Vite/Tauri architecture;
- do not replace it with throwaway vanilla JS to get a screenshot;
- do not fabricate a lockfile;
- preserve an existing lockfile unless justified changes require a real regenerated one;
- write tests even if not executable;
- run every static/local check available;
- mark dependency install/build/E2E/Tauri truthfully as BLOCKED/NOT VERIFIED;
- do not repeatedly waste the four-hour window retrying the same unreachable registry/service.

Missing AI/search keys do not block source work. Use explicitly labeled mocks only for tests/dev fixtures, never as fake live capability.

---

# 11. Verification requirements

When the environment permits, run at least:

```text
format/lint if configured
full TypeScript typecheck
unit/integration tests
production Web build
full Playwright E2E
performance fixtures
Tauri check/build if native prerequisites exist
```

Add targeted v0.2 tests for:

- selected Thought has no large filled card;
- selection does not reflow text;
- theme switch preserves geometry;
- reduced motion remains usable;
- first-open has no permanent debug/tutorial labels;
- global More is reduced;
- Source Limited state is inspectable and honest;
- evidence judgment is not derived solely from search snippet;
- lifecycle reopening after long simulated downtime does not mass-decay Thoughts;
- Dexie migrations preserve prior data.

Do not claim PASS for anything you did not run.

---

# 12. Delivery Preservation Mode

Enter if:

- elapsed time >= about 3h20m;
- estimated remaining time < 45 minutes;
- environment becomes unstable;
- new work threatens the stable archive;
- the current result is already valuable enough that more scope is disproportionate risk.

First action:

> Confirm a verified external source snapshot exists. If not, create and verify one immediately.

Then:

1. stop new feature scope;
2. finish or safely roll back unstable partial work;
3. fix solvable build/test/runtime blockers;
4. run available checks;
5. update `README.md`;
6. update `STATUS.md`;
7. update `docs/V0_2_AUDIT.md`;
8. update `docs/REFERENCE_AUDIT.md`;
9. create FINAL checkpoint;
10. create final source ZIP;
11. verify ZIP integrity/content;
12. extract to a temporary directory and smoke-test if time/environment permits;
13. generate SHA-256.

After roughly 3h40m:

> **No new features. Protect delivery only.**

---

# 13. STATUS.md must be truthful

Use a structure like:

```markdown
# Diffusion Explorer v0.2 Status

## Product state
- Overall completion estimate: ...
- Strongest verified user path: ...

## UI redesign
- Completed: ...
- Partial: ...
- Not started: ...

## Backend hardening
- Completed: ...
- Partial: ...
- Not started: ...

## Reuse/reference audit
- Dependencies adopted: ...
- Reference source actually inspected: ...
- Study blocked by network: ...

## Verification
- typecheck: PASS/FAIL/NOT VERIFIED
- unit/integration: PASS/FAIL/NOT VERIFIED
- Web build: PASS/FAIL/NOT VERIFIED
- E2E: PASS x/y or FAIL with exact failing cases
- performance: PASS/PARTIAL/NOT VERIFIED + exact scale
- Tauri: PASS/FAIL/NOT VERIFIED
- migrations: PASS/FAIL/NOT VERIFIED
- ZIP integrity: PASS/FAIL

## Known defects
...

## Product-boundary checks
...

## Exact next work
1. ...
2. ...
3. ...
```

Forbidden reporting:

- calling source presence runtime verification;
- saying a reference was inspected when it was not;
- calling a mock provider live;
- calling metadata-only Source parsing full document reading;
- calling a spatial-index benchmark UI 60fps;
- claiming visual redesign success without inspecting real rendered states.

---

# 14. Final ZIP contents

Include:

- complete source code;
- `package.json`;
- legitimate lockfile if present/generated through real dependency resolution;
- configs;
- `src/`;
- `server/`;
- `src-tauri/` if present;
- tests;
- migrations;
- demo/sample data;
- localization resources;
- `README.md`;
- `STATUS.md`;
- `docs/V0_2_AUDIT.md`;
- `docs/REFERENCE_AUDIT.md`;
- attribution/license notices required by reused/adapted code;
- `_checkpoints/`;
- `.env.example`;
- this v0.2 specification if practical.

Exclude:

- `node_modules/`;
- `.git/`;
- build caches;
- Rust `target/`;
- browser downloads;
- logs;
- secrets;
- real `.env`;
- API keys/tokens;
- temporary preflight files;
- OS junk.

Recommended archive name:

```text
diffusion-explorer-v0.2-rebuild.zip
```

---

# 15. Final archive verification

Mandatory:

1. list the ZIP;
2. integrity-test the ZIP;
3. confirm expected root structure;
4. confirm source, package manifest, README, STATUS, tests, audit docs are present;
5. confirm secrets/node_modules/.git are absent;
6. compare source count or source manifest against the project tree;
7. extract and read back representative files;
8. generate SHA-256;
9. if time/environment permits, run install/build/test smoke checks from the extracted copy.

A stable partial v0.2 is better than a broken "complete" v0.2.

---

# 16. Final response

Keep the final response concise and factual.

It must include:

- final ZIP path/link;
- SHA-256;
- strongest verified user path;
- major UI redesign completed;
- major backend hardening completed;
- dependencies/references actually used;
- exact verification results;
- known remaining defects;
- environment limitations;
- confirmation that the ZIP was integrity-checked.

Do not end with a retrospective essay instead of the deliverable.

---

# 17. The standard to optimize for

The rebuild succeeds if the result is visibly and structurally more mature, not merely feature-complete.

The final app should communicate these ideas without explanation:

> **Content first. Chrome recedes.**
>
> **Surfaces only when an action needs a surface.**
>
> **World does not move; meaning appears.**
>
> **Reuse mechanics. Design semantics ourselves.**
>
> **AI creates possibility. User creates commitment.**

