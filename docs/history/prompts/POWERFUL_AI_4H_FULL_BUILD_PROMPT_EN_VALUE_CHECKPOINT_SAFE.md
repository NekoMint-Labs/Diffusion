# Diffusion Explorer — 4-Hour Full Build Prompt

You are responsible for implementing as much of the currently designed **Diffusion Explorer v0.1** as possible within a **hard maximum of 4 hours**, and delivering a real, continuation-ready **source-code ZIP archive** at the end. Build/run verification is required wherever the environment permits, but an inability to download dependencies must **not** prevent source implementation.

This is **not** a “Milestone 0 only” task.

Your goal is:

> **Establish a reliable runnable foundation quickly, then keep implementing the complete designed product path as far as time allows. Do not stop voluntarily after the first vertical slice.**

You are not required to falsely claim that 100% of the product is finished within four hours. If time runs out, unfinished items are acceptable. What is not acceptable is losing the deliverable or refusing to create source code merely because dependency installation is blocked. At every stage, protect a result that is **real, coherent, packageable, and easy for the next developer or AI to continue**. When the environment allows it, also keep it buildable and runnable; when the environment does not, separate implementation status from verification status truthfully.

---

# 0. Highest-Priority Rules

1. **The total execution time limit is 4 hours.**
2. **Do not reduce the task to Milestone 0.** The first runnable vertical slice is only the first checkpoint, not the final target.
3. Once the basic loop is stable, continue implementing the already-designed product capabilities until a delivery-preservation condition is reached.
4. **If estimated remaining time drops below 45 minutes, immediately enter Delivery Preservation Mode.**
5. **At approximately 3 hours 20 minutes elapsed, enter final stabilization and packaging regardless of current scope.**
6. **After 3 hours 40 minutes, adding new features is forbidden.** Only fix build/test/runtime/package blockers.
7. The final deliverable must include a verifiable `.zip` source-code archive.
8. If, before coding, you confirm that the current environment **cannot create and deliver a ZIP archive by any viable method**, stop immediately and do not modify the project.
9. Do not say “I will continue later,” “I will finish in the background,” or promise work after this execution window. Produce real files before the run ends.
10. **Every checkpoint should be as close as practical to a buildable, runnable state when build tooling is available. If build tooling is unavailable, the checkpoint must still contain coherent real source code and a truthful verification status.**
11. If an advanced capability cannot be completed safely in the remaining time, leave a clear interface, safe degradation path, and truthful status note rather than a half-built feature that destabilizes the project.
12. **There are only two environment-level hard-stop conditions before source implementation:**
    - the workspace cannot reliably read/write source files; or
    - no viable path exists to create and deliver a source-code ZIP archive.
13. **Network failure, npm-registry failure, missing dependency cache, missing Rust/Tauri prerequisites, missing browser runtime, missing API keys, or unavailable external services are degradation conditions, not source-implementation stop conditions.**
14. Always distinguish **IMPLEMENTED** from **VERIFIED**. Code may be implemented but unverified because the current environment cannot install or execute its dependencies. Never collapse these states.
15. If essential frontend dependencies cannot be installed, enter **Offline Source Implementation Mode** and continue writing the intended React/TypeScript/Vite/Tauri source architecture instead of stopping.
16. **Checkpoint on value, not on schedule.** As soon as a coherent, meaningful, continuation-ready subsystem or user path exists, preserve it immediately as a verified source snapshot before expanding into the next capability group. Do not wait for a timer if valuable work already exists.

If system time is available, record at the start:

```text
START_TIME=<timestamp>
SOURCE_IMPLEMENTATION_START_TIME=<timestamp when meaningful source implementation begins>
PACKAGE_CUTOFF=START_TIME + 3h20m
HARD_STOP=START_TIME + 4h
```

If system time cannot be read reliably, control time conservatively by phase and check remaining time frequently.

---


# 0.1 Source-Preservation Invariant — Mandatory

The most important failure mode to prevent is this:

> **A large amount of code is written in an ephemeral workspace, a later tool/filesystem failure occurs, and the final “recovery bundle” contains only specifications or reports while the implementation itself is lost.**

Therefore, source preservation is not merely a final packaging task. It is a continuous execution invariant.

## Mandatory preservation rules

1. **Checkpoint on value, not on schedule.** Whenever the implementation reaches a coherent, meaningful, continuation-ready state, preserve it immediately as a verified source snapshot before expanding further. A checkpoint does **not** need to represent a full milestone. If one substantial subsystem or user path has become internally coherent and worth preserving, checkpoint it.
2. **Once meaningful source code exists, do not leave valuable work unpreserved.** Create the first verified source snapshot as soon as the first meaningful source tree or coherent implementation slice exists, and in all cases **no later than 30 minutes after `SOURCE_IMPLEMENTATION_START_TIME`**.
3. The time rule is only a disaster-safety fallback. Even if no clean milestone appears, do not allow more than **45 minutes of unarchived implementation work** after the previous verified source snapshot.
4. Create another verified source snapshot after every major coherent capability group or valuable stable slice, whichever occurs first. Typical examples include:
   - project foundation + Field Shell + theme/storage architecture;
   - Thought create/edit/select/drag/pan/zoom loop;
   - Focus Field + relations + Probe;
   - Ghost/Recall/lifecycle;
   - Thread/Deep Dive/context;
   - Source/Evidence/Web Verify;
   - Crystal/Carry/Fork/Diffuse;
   - any other substantial user path that is coherent enough that losing it would be costly.
5. Keep at least the **latest two verified source snapshots** when storage permits, so a bad latest snapshot does not destroy the previous recovery point.
6. A checkpoint note, Git commit, status report, recovery script, or list of changed files **does not count as preserved delivery by itself**. The checkpoint must have an actual archive containing the source.
7. Each preservation archive must be created from a **known absolute project path**, not from a late broad filesystem search.
8. Each archive must be integrity-checked immediately after creation and must be confirmed to contain, when applicable:
   - `package.json`;
   - lockfile if legitimately present/generated, plus configuration;
   - `src/`;
   - `src-tauri/` if present;
   - server/backend code if present;
   - tests;
   - README;
   - `STATUS.md` or the latest checkpoint status;
   - any required sample/demo data.
9. Store snapshot ZIPs in a **delivery-safe location outside the mutable project tree** whenever the environment provides one (for example an artifact/output directory or a sibling delivery directory). Do not create recursive ZIP-inside-ZIP packaging inside the project source tree.
10. If the environment supports exposing/downloading files before the final response, **surface the first meaningful source checkpoint and the latest preserved archive as soon as they are created**. Do not rely exclusively on the ability to package at the very end.
11. **Risk-triggered checkpointing is mandatory.** Before a risky refactor, dependency migration, core state-model change, large file move, broad architectural rewrite, or any change that could destabilize a good working slice, verify that the current valuable state already has a recoverable source snapshot.
12. Do not postpone checkpointing merely because build/runtime verification is blocked. In Offline Source Implementation Mode, a coherent source slice is still worth preserving; archive verification and runtime/build verification remain separate statuses.

## Preservation proof

For every preserved checkpoint, record in `_checkpoints/`:

```text
SOURCE_SNAPSHOT=<absolute or artifact path>
SOURCE_SNAPSHOT_SHA256=<sha256>
SOURCE_SNAPSHOT_VERIFIED=PASS|FAIL
SOURCE_ROOT=<known absolute project path>
CONTENTS_CHECK=package.json/src/README/...
```

Never write `SOURCE_SNAPSHOT_VERIFIED=PASS` unless the archive was actually listed or extracted successfully.

`SOURCE_SNAPSHOT_VERIFIED=PASS` means the **archive itself** was integrity/content checked. It does **not** imply that npm install, Web build, tests, or Tauri build passed. Runtime/build verification is tracked separately in `STATUS.md`.

## Recovery-bundle truth rule

A file may be called a **recovery bundle containing the implementation** only if it contains either:

- the actual recovered project source tree; or
- a previously verified source-code checkpoint ZIP.

A bundle containing only specifications, reports, logs, or recovery metadata is **not** an implementation recovery bundle. If source recovery fails, say explicitly:

> `SOURCE RECOVERY FAILED — no implementation source was recovered.`

Do not say that the implementation was preserved when the archive does not actually contain it.

---

# 1. Preflight: Verify Environment and Tools Before Coding

Complete this **before extensive code reading or major project edits**.

Create `PRE_FLIGHT.md` and record the real results. Never fabricate tool availability.

## 1.1 Filesystem

Verify that you can:

- list directories;
- create directories;
- write a text file;
- read it back;
- delete the test file.

If workspace read/write is unreliable: **STOP**.

## 1.2 Shell / command execution

Record:

- OS / platform;
- shell;
- working directory.

Verify that at least one reliable command-execution path exists.

If shell execution is unavailable but the environment still provides reliable file editing and ZIP-delivery mechanisms, continue in a source-only verification mode and record that command-based build/test validation is unavailable. Lack of a shell by itself is **not** a hard stop.

## 1.3 ZIP packaging — hard gate

Before coding, perform a real packaging rehearsal:

1. create `_preflight_zip_test/test.txt`;
2. create `_preflight_zip_test.zip`;
3. verify the archive can be listed / extracted / integrity-checked;
4. confirm that the resulting ZIP can actually be delivered as a file;
5. delete the test artifacts.

Possible tools include:

- `zip`;
- `7z`;
- PowerShell `Compress-Archive`;
- Python `zipfile`;
- another standard ZIP implementation.

**If every ZIP path is unavailable, or the environment cannot deliver the resulting ZIP to the user, STOP BEFORE CODING.**

Do not silently substitute `.tar.gz` for ZIP.

## 1.4 Node / package manager

Check and record:

```text
node --version
npm --version
pnpm --version   # if available
yarn --version   # if available
```

If a lockfile already exists, follow the repository's existing package manager. Do not migrate package managers for personal preference.

## 1.5 Git

Check:

```text
git --version
```

If available, use **local commits** to support checkpoints.

Do not push, open remote PRs, or perform remote write operations that require user authorization.

## 1.6 Rust / Tauri

Check:

```text
rustc --version
cargo --version
```

Determine whether the current system has the native dependencies required for a Tauri 2 build.

Important:

- inability to build native Tauri is **not** a failure of the entire task;
- continue with the Web/shared frontend;
- it is acceptable to correctly scaffold `src-tauri/`, implement the platform adapter, and record the native-build limitation in `STATUS.md`;
- do not waste excessive time trying to install unavailable GUI/WebView system dependencies in a restricted container;
- never claim `tauri build PASS` unless you actually ran and passed it.

## 1.7 Browser / E2E

Verify whether Playwright or equivalent browser testing can run.

If the browser runtime is unavailable:

- keep E2E tests in source;
- run available unit/integration tests;
- record the limitation in `STATUS.md`.

Do not spend excessive time downloading large browser runtimes if that threatens the build window.

## 1.8 Network / dependency installation

Confirm whether the package registry is reachable and whether required dependencies are already installed or cached. Do not spend excessive time retrying a clearly broken registry or DNS path. One informative retry plus one cache/offline check is normally enough.

If network access is unavailable but dependencies are already installed/cached, continue normally.

If this is a fresh project and essential dependencies cannot be installed or resolved from cache, **DO NOT STOP SOURCE IMPLEMENTATION**. Enter **Offline Source Implementation Mode**.

### 1.8.1 Offline Source Implementation Mode — mandatory fallback

Dependency unavailability lowers verification confidence; it does not erase the value of architecture and source implementation. In this mode:

1. Continue creating the real intended project source tree, including as applicable:
   - `package.json`;
   - TypeScript/React source;
   - Vite configuration;
   - Zustand stores;
   - Dexie repository/storage code;
   - Hono/provider adapters;
   - Motion/Floating UI integration points;
   - DOM Thought Layer / SVG Phenomenon Layer;
   - `src-tauri/` scaffold and platform adapters;
   - tests;
   - `.env.example`;
   - README;
   - `STATUS.md`;
   - checkpoints and source ZIP snapshots.
2. Preserve the specified architecture. **Do not replace the actual React/TypeScript design with a throwaway vanilla-JS product merely to obtain a local runtime screenshot.** A tiny dependency-free smoke harness is allowed only if it is clearly labeled, cheap, and does not replace or distort the intended implementation.
3. If exact dependency versions cannot be verified online, prefer, in order:
   - versions already present in an existing lockfile/package manifest;
   - versions exposed by local cache/metadata;
   - otherwise conservative explicit semver constraints based on the model's best-known compatible major versions, marked in `STATUS.md` as `DEPENDENCY_VERSIONS_UNVERIFIED`.
4. **Do not fabricate a lockfile.** If dependency resolution never succeeded, omit a new lockfile and say exactly why. Preserve an existing lockfile unchanged unless a justified source change requires otherwise.
5. Write build/test scripts and test source even when they cannot currently execute.
6. Perform every static check available without dependency installation: JSON validity, source-tree completeness, import-path review, configuration consistency, grep/TODO audit, archive integrity, and any compiler/linter already present locally.
7. Mark unavailable validation honestly:
   - dependency install: `BLOCKED`;
   - Web build: `NOT VERIFIED`;
   - browser/E2E: `NOT VERIFIED` if app runtime cannot be produced;
   - Tauri build: `NOT VERIFIED` if native prerequisites are absent.
8. Do not repeatedly spend the four-hour window attempting the same failed registry/network operation. After the failure mode is established, implement source.
9. Continue checkpointing and producing real source ZIPs exactly as in normal mode. A source snapshot does **not** require a successful npm install to be valuable or deliverable.
10. In README/STATUS, give the next developer the exact first verification sequence to run in a network-enabled environment, for example `npm install` / `npm ci` as appropriate, then typecheck/test/build, then Tauri validation.

Core principle:

> **Buildability is the goal; verified buildability is environment-dependent. Lack of dependency access reduces verification status, not implementation scope.**

## 1.9 Optional capability checks

If the implementation intends to use these capabilities, verify them before depending on them:

- AI provider configuration through environment variables;
- Web/search provider access;
- native file picker / filesystem access;
- image/PDF processing dependencies;
- performance fixture execution.

**A missing API key must not block engineering progress.**

Instead:

- provide provider abstractions;
- provide `.env.example`;
- use clearly labeled deterministic mock providers for tests/demo behavior;
- never present mock output as a real model or real network result.

---

# 2. Input Materials and Priority

Locate the Diffusion Explorer kickoff materials provided by the user.

Read in this order:

1. `00_START_HERE.md`
2. `01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md`
3. `02_TECH_STACK_AND_IMPLEMENTATION.md`
4. `03_UI_VISUAL_SYSTEM.md`
5. `04_PERFORMANCE_CONTRACT.md`
6. `05_REFERENCE_PROJECTS_AND_LINKS.md`
7. `06_FULL_BUILD_PROMPT.md` if present
8. `07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md` if present

If older names still exist:

```text
06_MILESTONE_0_BUILD_PROMPT.md
07_ACCEPTANCE_CHECKLIST.md
```

use their **product boundaries, technical constraints, and early acceptance criteria** as reference, but ignore any old scope restriction that says to stop after Milestone 0. This prompt has higher priority for execution scope.

If the original **Diffusion Explorer — Product Architecture v0.1** is also supplied, treat it as the frozen product-architecture source. Later UI/runtime/performance material refines implementation without casually changing that architecture.

**Reference products are implementation and visual references only. They are not the product definition.**

---

# 3. Prove Product Understanding Before Coding

In `_checkpoints/00_preflight_and_context.md`, restate in your own words that you understand and will preserve these boundaries:

- **Diffusion handles uncertainty; execution starts after commitment.**
- **The Field is state; messages are history.**
- **The Field is a Thought Field, not a material board.**
- The primary things in the Field are the user's thoughts, questions, judgments, doubts, hypotheses, viewpoints, and relations currently forming between them.
- A Source is an external reference/evidence layer. It must not compete with Thought as the primary visual object.
- Selection defines scope.
- Gesture creates relation.
- Language creates intent.
- AI creates possibility; the user creates commitment.
- AI never sits on the critical interaction path.
- AI may not move, delete, or rewrite user-owned Thoughts without explicit user authority.
- AI may not silently create permanent relations.
- AI may not directly create or modify Crystals.
- Selection itself does not trigger AI and does not change geometry.
- Relations do not use arrows by default.
- Relation persistence is separate from relation visibility.
- Regions are not folders or group boxes; they are neighborhoods that emerge from spatial activity.
- Conversation must not become a permanent AI chat pane; the Field remains the state-bearing surface.
- Web and Desktop use the same React frontend; Desktop extends it through a Tauri shell/platform capability layer.
- Light and Dark themes are first-class from v0.1.
- tldraw, Excalidraw, Kumu, Fabric, Allume, Notion, Linear, and other references must never overwrite Diffusion's product model.

If materials genuinely conflict:

1. prefer the frozen Product Architecture;
2. then prefer later explicitly confirmed boundaries;
3. do not invent a third product model;
4. record the decision in `STATUS.md`.

---

# 4. Overall Execution Strategy: Complete v0.1, Not a Fixed Milestone

Use this strategy:

> **Stable base → complete vertical behavior → progressively cover the full designed system → package the strongest stable checkpoint.**

Do not spend three hours polishing Field Shell while leaving out the product's core behaviors.

Do not open ten half-finished modules merely to increase feature count.

Correct operating pattern:

1. establish a stable foundation quickly;
2. finish one coherent capability group;
3. verify build/key tests;
4. save a checkpoint;
5. continue to the next group;
6. keep moving until the 3h20m delivery-preservation cutoff.

**The first runnable vertical slice is only Checkpoint 01/02. It is not the completion condition.**

---

# 5. Recommended Technical Direction

Unless the existing repository already has a sound alternative, prefer:

```text
TypeScript
React
Vite
Zustand
Motion / motion-react
Dexie / IndexedDB
Hono
Zod
Vitest
Playwright
Tauri 2
DOM Thought Layer
SVG Phenomenon Layer
independent Camera / realtime interaction layer
```

Allowed / recommended low-level additions:

- `d3-zoom`, or a very thin custom camera controller;
- Floating UI for contextual/anchored surfaces.

Do not introduce by default:

- React Flow;
- tldraw SDK runtime;
- embedded Excalidraw runtime;
- Three.js;
- PixiJS;
- a graph database;
- a heavyweight rich-text editor;
- multiplayer/realtime synchronization infrastructure.

Only keep such dependencies if the existing project already relies on them and removing them would be riskier.

## Core layering

```text
Provider
↓ semantic output / candidates

Diffusion Core
↓ permissions / state / lifecycle / events

Spatial Engine
↓ camera / geometry / selection / probe / semantic zoom

UI
↓ visual expression
```

React is only the UI renderer. **Diffusion Core must not depend on React.**

---

# 6. Full v0.1 Scope and Implementation Order

The sections below are **dependency order**, not milestones where you should stop.

Once one layer is stable, continue downward until time is insufficient.

## Phase A — Foundation / Field / shared Web-Desktop base

Complete quickly:

- React + TypeScript + Vite;
- Web dev and production build;
- Tauri 2 shell / platform adapter;
- clear `core / field / ui / ai / evidence / storage / platform` modules;
- semantic theme tokens;
- Light / Dark + system preference + explicit override;
- fullscreen Field Shell;
- Field identity;
- lightweight bottom Speak surface;
- no permanent toolbar/sidebar/inspector;
- Dexie/project repository;
- baseline README commands;
- deterministic sample/demo project.

As soon as this builds reliably, save a checkpoint and **continue immediately**.

## Phase B — Thought Field core interactions

Implement the complete basic grammar:

- double-click blank Field → create Thought + begin editing;
- click → select;
- Shift+click → multi-select;
- lasso → multi-select;
- click blank Field → clear selection;
- layered Esc behavior;
- double-click / Enter → edit;
- direct drag;
- Space+drag → pan;
- wheel/trackpad → zoom;
- content-driven Thought sizing;
- compact 3–5 line rest view;
- no resize handles;
- Hybrid Thought visual: at rest it reads like a thought, while editing gains a fuller surface;
- Selection Halo / attention aura;
- contextual actions near selection;
- Speak scope representation;
- persistence;
- basic semantic undo event plumbing.

## Phase C — Focus Field / Relations / Probe

Implement:

- selection creates semantic scope and visual focus simultaneously;
- confirmed/active relations connected to the selection wake visually;
- unrelated Field content gently recedes but never disappears and is never covered by a dark modal veil;
- selection does not trigger new AI inference;
- multi-selection prioritizes relations among selected objects and only limited shared context;
- relation persistence is separate from visibility;
- SVG Phenomenon Layer;
- glyph-first relations: `≈ / ↯ / ? / ✓ / ∼`;
- no arrows by default;
- visually distinguish tentative phenomenon vs confirmed relation;
- relation hover/focus behavior;
- Probe proximity gesture: far → local cue → `?` → semantic Probe event;
- Select A+B → Explore and natural-language relation queries map to the same Probe intent;
- all immediate Probe feedback is local/deterministic and never waits for AI.

## Phase D — AI semantic intents / Ghost / Recall / lifecycle

Implement a replaceable AI provider and semantic-intent boundary.

AI must not directly manipulate UI components. It may return semantic requests such as:

```text
respond_in_field
surface_possibility
surface_relation
surface_evidence
request_thread
request_deep_dive
request_recall
request_crystal_preview
```

Diffusion Core decides permissions and state transitions.

Implement:

- Ghost: faint/tentative with progressive reveal;
- click Ghost = Claim + Select;
- drag Ghost = Claim + Move;
- lasso must not Claim Ghosts;
- ignored Ghosts may fade;
- Recall resurfaces the original past Thought rather than creating a duplicate;
- click Recall = Wake + Select;
- offscreen Recall uses only an edge cue and never steals the Camera;
- lifecycle: Active → Cooling → Peripheral → Dormant/Memory;
- meaningful interaction reactivates immediately;
- Keep protects persistence but is not Crystal;
- attention budget / progressive reveal so Ghosts, Recalls, Evidence, and relations do not all explode onto the Field simultaneously.

If no real AI key exists, use a clearly labeled mock provider to validate the state machine. Never present mock output as real AI.

## Phase E — Conversation surfaces / Context Compiler

Implement:

- no selection = whole Field scope;
- one short semantic response → Field;
- sustained/context-dependent discourse → Thread split surface;
- Thread does not use chat bubbles;
- `Thinking with` scope display;
- Thread scope is snapshotted at creation;
- current selection must not silently mutate Thread scope;
- explicit `Add current selection`;
- one active Thread, while historical Threads remain available;
- Thread output returns to Field as Ghost unless the user explicitly commands direct placement;
- `request_deep_dive` or explicit user expansion → Deep Dive focus surface;
- closing a surface restores the Field return point.

Context Compiler boundary:

- Core Contract;
- Current Scope;
- Local Field;
- Thread Working Memory;
- Retrieved Context;
- available tools;
- Thread Capsule / compaction plumbing;
- raw transcript remains canonical history;
- summaries/capsules are rebuildable context caches, not sources of truth.

## Phase F — Source / Evidence / Web Verify

Preserve the boundary: **Sources support Thought; they do not turn the Field into a material manager.**

Implement as much as possible:

- “Drop anything” UX boundary;
- Source visible states: Processing / Ready / Limited / Unavailable;
- select Source + Speak;
- Source provenance;
- Source reference anchored surface;
- Open original;
- no full PDF Reader, cropper, or annotation workbench;
- evidence may become Ghost / phenomenon / relation;
- provenance precision must never exceed what is actually known;
- `WebEvidenceProvider` abstraction;
- custom endpoint / OpenAI-compatible / Diffusion-compatible adapter boundary;
- user-triggered Web Verify;
- no surprise autonomous search;
- search results must not directly flood the Field;
- normalized evidence candidates;
- support / contradiction / partial support / prior art / inconclusive / conflicting evidence instead of fake `Verified ✓` certainty.

## Phase G — Find / History / semantic trajectory

Implement:

- Cmd/Ctrl+K Project Find;
- search across Materials/Thoughts, Crystals, Sources, Regions, Threads;
- previewing a target must not steal the Camera;
- Camera travels only after explicit `Take me there`;
- Find remains separate from Recall and Web Search;
- semantic History, not raw click logs;
- `How did this form?` trajectory;
- History is readable;
- semantic Undo changes state;
- do not build a full time-travel editor in v0.1.

## Phase H — Regions / Semantic Zoom / Atlas / Re-entry

Implement:

- continuous Local → Neighborhood → Atlas zoom;
- semantic zoom, not mere geometric scaling;
- Thought: full → shortened → disappears;
- relations disappear earlier than Thoughts;
- Ghost/Recall disappear earlier still;
- Crystal persists longer and becomes a landmark;
- Region: weak/absent locally → label in Neighborhood → primary Atlas object;
- Region must not use hard box/container visuals;
- Atlas retains Regions / Crystals / active frontiers;
- never render node-edge soup in Atlas;
- re-entry restores the prior Field and approximate viewport;
- unresolved frontier may show subtle `continue here`;
- active Thread must not forcibly reopen;
- unclaimed Ghosts do not need long-term visual persistence across sessions.

## Phase I — Crystal / Carry / Fork / Diffuse / Handoff

Implement as completely as practical.

### Crystal

- selected Thought/Region → Crystallize;
- AI may only produce Crystal Draft/Preview;
- Crystal becomes `◆ Crystal` only after user edit/confirmation;
- AI may not directly create or modify Crystal;
- Crystal is a stable landmark;
- Continue grows new thought from Crystal without modifying the Crystal itself.

### Carry

- long-distance move / Atlas carry;
- Carry is move, not duplicate;
- carried object remains viewport-attached until dropped.

### Fork

- explicit Fork;
- alternate thought world;
- provenance back to Main;
- no black-box Merge in v0.1;
- selective `Bring to Main` / Carry;
- compare may expose Shared / Only Main / Only Fork / Conflicts.

### Diffuse

- explicit special mode;
- selected scope / Region;
- bounded autonomous exploration;
- optional `Use project sources` / `Use the web` permissions;
- bottom mode indicator;
- Pause / Stop;
- progressive result reveal;
- user touch claims territory;
- even in Diffuse, AI may not move/delete/rewrite user Thoughts, create permanent relations, or create/modify Crystals.

### Handoff / Export

- Crystal is the exit into action;
- produce a clear artifact that can be handed to another AI or execution tool;
- preserve relevant provenance and context.

## Phase J — Product hardening

Only if time remains before delivery preservation:

- keyboard accessibility;
- `prefers-reduced-motion`;
- error states;
- Source capability degradation;
- large-project culling;
- performance fixtures;
- broader tests;
- Desktop native affordances;
- install/build polish.

---

# 7. Explicitly Out of Scope for v0.1

Even if time remains, do not expand the product into:

- multiplayer collaboration;
- realtime co-editing;
- mobile-first native app;
- plugin marketplace;
- deep GitHub-integration product;
- enterprise permission system;
- full RAG platform;
- task manager;
- coding agent;
- full paper manager;
- complete research suite;
- full writing editor;
- project management suite;
- graph editor;
- automatic layout system;
- hidden AI preference-learning/recommendation engine.

Finishing the already-designed Diffusion is more important than inventing a new product.

---

# 8. Performance Is a Hard Constraint

Core rule:

> **React manages what happened; the Realtime Interaction Layer manages how this frame moves.**

## Camera hot path

Use:

```text
pointer/wheel
→ camera controller
→ requestAnimationFrame
→ world DOM transform
```

Do not use:

```text
pointermove
→ Zustand
→ rerender every Thought
→ DOM remeasure
```

## Drag hot path

Use:

```text
pointerdown
→ pointer capture
→ transient transform
→ pointerup
→ canonical commit
```

Do not write to Dexie or History every frame.

## Geometry

- cache bounds;
- use `ResizeObserver` or controlled remeasurement;
- do not scan the whole Field with repeated `getBoundingClientRect()` calls inside the frame loop.

## Culling

Total project object count must not equal mounted DOM object count.

- viewport + margin culling;
- simple spatial buckets/grid are sufficient initially;
- leave a replaceable interface for RBush/R-tree or another spatial index later.

## Rendering

- DOM Thought Layer;
- SVG Phenomenon Layer;
- render only visible + relevant relations;
- Atlas uses semantic representation switching.

## Motion

Prefer:

- `transform`;
- `opacity`.

Use carefully:

- filter blur;
- huge shadows;
- layout-heavy animation;
- permanent shimmer/glow.

## Performance targets

Use at least these engineering targets:

- Pan / Zoom: 60fps baseline target;
- Thought drag: visually 1:1 with pointer;
- Selection: immediate;
- Focus Field: no obvious long frames;
- 100 visible Thoughts: comfortably interactive;
- large projects: avoid linear degradation with total Thought count via culling;
- AI request: never blocks Field interaction;
- Light/Dark switch: no obvious long frame;
- semantic zoom: continuous.

Create a dev-only performance fixture for:

```text
100
500
2000
5000 Thoughts
```

At minimum validate 100 within the timebox; cover larger sizes when practical.

---

# 9. Checkpoint Mechanism — Mandatory

Goal: if the run stops at any point, there is still a recoverable, packageable result.

Create:

```text
_checkpoints/
```

Every checkpoint should record:

```text
- timestamp / elapsed time
- completed scope
- current build status
- current test status
- verified vs unverified
- important decisions
- known breakages
- exact next step
- useful commands
```

If Git is available, a local commit may accompany each major checkpoint.

## Checkpoint 00 — Preflight + Context

Save immediately after environment verification and product understanding.

## Checkpoint 01 — Stable Foundation

Save once Web scaffold / Field Shell / themes / storage / base architecture form a coherent continuation-ready slice. If dependencies are executable, prefer a passing build; if they are blocked, preserve the coherent source slice with truthful `NOT VERIFIED` runtime status.

**This is not the finish line. Continue immediately.**

## Checkpoint 02 — Core Thought Interaction

Save when create/edit/select/multi-select/drag/pan/zoom/persistence form a coherent basic loop in implementation, whether runtime-verified or explicitly unverified due to environment limits.

**This is not the finish line. Continue immediately.**

## Checkpoint 03 — Thought Dynamics

Save once a stable subset of Focus Field / relations / Probe / Ghost exists.

If only part is complete, record the real state and continue.

## Checkpoint 04 — Reasoning Surfaces

Save once Thread / Deep Dive / context / semantic AI intents reach a stable state.

## Checkpoint 05 — Evidence + Memory + Navigation

Save a stable set of Source / Evidence / Web Verify / Recall / Find / History capabilities.

## Checkpoint 06 — World Model

Save a stable set of Regions / semantic zoom / Atlas / re-entry / Crystal / Fork / Diffuse capabilities.

## Checkpoint FINAL — Packaging

At finalization, record:

- final implemented features;
- commands run;
- pass/fail results;
- unverified areas;
- incomplete but scaffolded areas;
- intentionally deferred Post-v0.1 work.

### Checkpoint rules

- **Checkpoint on value, not on schedule.** The moment a coherent subsystem or user path becomes worth preserving, save it before expanding further.
- A checkpoint does not need to represent a full numbered milestone. A substantial internally coherent slice is enough.
- Do not force all checkpoint numbers merely for completeness.
- If time skips a phase, name checkpoints according to actual stable state.
- A checkpoint is a **recovery point**, not documentation theater.
- **Source snapshot ZIPs are mandatory, not optional.** Create the first meaningful source snapshot as soon as valuable code exists and no later than 30 minutes after source implementation begins; thereafter checkpoint after valuable coherent slices, before risky work, and at least every 45 minutes as a fallback. Keep the latest two verified snapshots when practical.
- Do not wait for a timer when a good stopping point already exists. Conversely, do not wait forever for a perfect milestone; the 45-minute fallback exists to cap potential loss.

---

# 10. Time Strategy

Recommended but not rigid pacing:

```text
0:00–0:20  preflight + materials + plan
0:20–1:00  stable foundation
1:00–2:00  core Field + Focus/Probe/Ghost
2:00–3:00  reasoning/evidence/navigation/world features
3:00–3:20  highest-value remaining integrated work + hardening
3:20–4:00  Delivery Preservation Mode
```

If the repository already has a strong foundation, move through early phases faster and spend more time on advanced capabilities.

If one phase becomes blocked:

> Do not fight it indefinitely. Preserve the stable work, choose a safe degradation, and move to the next path that can create real product value.

**Optimize total product completion at the end of four hours, not perfection of one isolated subsystem.**

---

# 11. Tool Failure and Degradation Strategy

Rules:

1. distinguish “tool unavailable” from “wrong invocation”;
2. retry only when the retry adds information;
3. switch to an alternative tool when reasonable;
4. degrade non-critical capabilities and record the limitation;
5. ZIP-delivery capability is a hard pre-coding gate;
6. failure of one native/AI/search/dependency-install tool must not cancel source implementation;
7. dependency-registry failure is an **Offline Source Implementation Mode** trigger, not an Emergency Preservation trigger and not a reason to stop writing source.

## Emergency Preservation Mode — tool/filesystem output failure

If filesystem, shell, validation, or tool calls begin returning empty, unreadable, malformed, contradictory, or otherwise unreliable results:

1. **Stop feature work immediately. Do not continue editing blind.**
2. Attempt at most one small, known-safe verification using a previously working command/path. Do not spend the remaining window repeatedly probing a broken tool surface.
3. If reliability is not restored, enter Emergency Preservation Mode.
4. Prefer the **latest already verified source snapshot** as the recovery base. Never depend on a broad late-stage filesystem scan if a verified snapshot already exists.
5. If writes still work and the known project root is available, create a fresh archive from that exact known path using the packaging mechanism proven during preflight.
6. If archive verification is no longer possible, preserve and deliver the actual source archive anyway, but label it `UNVERIFIED AFTER TOOL FAILURE`. Do not replace it with a specifications-only bundle.
7. If neither the live source tree nor any verified checkpoint archive can be accessed, report source recovery failure truthfully. Do not claim preservation merely because specifications or reports were packaged.
8. Do not keep adding features after tool reliability has degraded. From that point forward, the only goal is to preserve the strongest actual source artifact already created.

A recovery scan is a **last resort**, not the primary delivery mechanism. Continuous verified source snapshots are the primary mechanism.

Examples:

- npm registry/DNS/cache cannot provide React or other essential packages → enter **Offline Source Implementation Mode**, write the intended source/config/tests, do not fabricate a lockfile, and mark builds as unverified;
- Playwright browser unavailable → run unit/integration tests if possible, keep E2E source, record limitation;
- Rust/Tauri prerequisite unavailable → complete Web source + Tauri scaffold/platform adapter, record limitation;
- AI key unavailable → provider interface + deterministic mock + truthful status note;
- search endpoint unavailable → adapter + mock/integration tests, never fake live search;
- PDF parsing unavailable → Source state=`Limited`, never pretend it was read;
- image generation unavailable → irrelevant, continue;
- no viable ZIP-delivery path → **STOP BEFORE CODING**;
- dependency installation unavailable → **DO NOT STOP**; implement source offline and preserve it.

---

# 12. Delivery Preservation Mode

Trigger this mode if **any** of the following occurs:

- elapsed time >= 3h20m;
- estimated remaining time < 45 minutes;
- environment becomes unstable;
- new work begins threatening existing build/package stability;
- the project is already strong and stable enough that additional scope is disproportionately risky.

After entering:

0. **First confirm that a verified source snapshot already exists outside the mutable project tree. If it does not, create and verify one immediately before doing anything else.**
1. **stop adding new feature scope;**
2. finish the smallest safe ending of current work, or roll back the unstable partial feature;
3. fix build/runtime/test blockers **that are actually solvable in the current environment**; do not burn final-delivery time retrying a known-unreachable package registry;
4. run formatter/lint if available and reasonably fast;
5. run unit/integration tests if executable; otherwise mark them unverified;
6. run Web production build if dependencies are available; otherwise preserve source and mark build `NOT VERIFIED`;
7. run E2E if possible, otherwise record why not;
8. validate Tauri if possible, otherwise record why not;
9. verify Light / Dark themes;
10. verify key Field interactions;
11. update README;
12. write `STATUS.md`;
13. write FINAL checkpoint;
14. remove ZIP-excluded artifacts;
15. create ZIP;
16. verify ZIP integrity;
17. if time remains, extract into a temporary directory and perform a clean install/build smoke test.

After 3h40m:

> **No new features. Protect delivery only.**

---

# 13. `STATUS.md` Must Be Truthful and Continuation-Ready

Recommended structure:

```markdown
# Diffusion Explorer Status

## Product state
- Overall completion estimate: ...
- Strongest working path: ...

## Completed
...

## Partially implemented
...

## Not yet implemented
...

## Implementation / verification mode
- Offline Source Implementation Mode: YES/NO
- Dependency install: PASS/FAIL/BLOCKED + reason
- Dependency versions verified: YES/NO/PARTIAL
- Source implementation: COMPLETE/PARTIAL

## Verified
- Web dev: PASS/FAIL/NOT RUN/NOT VERIFIED
- Web build: PASS/FAIL/NOT RUN/NOT VERIFIED
- Unit tests: PASS/FAIL/NOT RUN/NOT VERIFIED
- Integration tests: PASS/FAIL/NOT RUN/NOT VERIFIED
- E2E: PASS/FAIL/NOT RUN/NOT VERIFIED + reason
- Tauri check/build: PASS/FAIL/NOT VERIFIED + reason
- Performance fixture: PASS/NOT RUN/NOT VERIFIED + scale
- ZIP integrity: PASS/FAIL

## Environment limitations
...

## Known bugs / risks
...

## Product-boundary decisions preserved
...

## Exact next recommended work
1. ...
2. ...
3. ...
```

Forbidden reporting behavior:

- writing PASS for something you did not run;
- presenting a mock provider as real;
- calling a scaffold a completed feature;
- equating “code exists” with “user path verified.”

---

# 14. Final ZIP Contents

The final ZIP should include:

- complete source code;
- `package.json`;
- lockfile **if legitimately present/generated**; never fabricate one;
- configs;
- `src/`;
- `src-tauri/` if present;
- `server/` / backend adapters if present;
- tests;
- README;
- `STATUS.md`;
- `_checkpoints/`;
- `.env.example`;
- required demo/sample data;
- license / attribution notes for borrowed code when required by its license.

Exclude by default:

- `node_modules/`;
- `.git/`;
- build caches;
- Rust `target/`;
- browser downloads;
- logs;
- temporary preflight artifacts;
- secrets;
- real `.env`;
- API keys/tokens;
- OS junk.

Recommended final archive name:

```text
diffusion-explorer-v0.1-build.zip
```

Do not name the final archive `milestone-0`.

---

# 15. Final ZIP Verification — Mandatory

After creating the archive, verify:

1. the archive can be listed;
2. it is not corrupted;
3. the root directory is not accidentally nested multiple times;
4. `package.json`, README, and source directories are present;
5. no secrets, `.git`, or `node_modules` are included;
6. README contains enough commands for the next developer to continue;
7. if time allows: extract to a clean temporary directory → install → build smoke test;
8. generate SHA-256.

Example:

```text
SHA256(diffusion-explorer-v0.1-build.zip)=...
```

If not every feature is complete but the ZIP is stable:

> **Deliver the stable result and describe the remaining work precisely in `STATUS.md`. Never sacrifice the ZIP merely to squeeze in one more feature.**

---

# 16. Final Delivery Response

Your final response should be concise and factual. It must include:

- a link/path to the final ZIP;
- SHA-256;
- the strongest working user path;
- major completed capability groups;
- major incomplete capability groups;
- exact implementation status **separate from** verification status;
- dependency-install status and whether Offline Source Implementation Mode was used;
- exact verification status;
- any environment limitation that prevented validation;
- confirmation that the ZIP was integrity-checked.
- the path/link and SHA-256 of the most recent preserved checkpoint archive if it is separate from the final ZIP;
- a truthful statement that the delivered archive actually contains implementation source, not only specifications/recovery metadata.

Do not write a long retrospective instead of delivering the artifact.

The project is successful if, at the end of the four-hour window, the user receives the **strongest stable, truthful, continuation-ready implementation you could produce without violating Diffusion's product boundaries**.
