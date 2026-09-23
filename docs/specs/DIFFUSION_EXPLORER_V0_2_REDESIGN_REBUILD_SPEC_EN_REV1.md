# Diffusion Explorer v0.2 - Redesign and Rebuild Specification

> Status: current product and interaction authority for the semantics defined below. The v0.2
> rebuild pass is complete and this document still governs the behaviour it describes.
> Date: 2026-09-13 (written for the v0.2 rebuild pass)
> Scope: preserve the frozen product core, redesign the visible product experience, harden the existing implementation, and reuse mature frontend/backend code where appropriate.
>
> **What still governs current Diffusion in this file.** The durable product, interaction, visual and
> backend semantics are §1–§20, §22–§31, §33, §36 and §38.
>
> **What is historical execution context**, kept as provenance for the completed v0.2 pass:
>
> | Section | Why it is historical |
> |---|---|
> | §0 Why v0.2 exists, §0.1 Historical failures | Motivation and non-regression cases for that pass. |
> | §21 Frontend reuse map | The study and selection map used for that pass. Several listed primitives were not adopted (for example Radix, cmdk, Lucide); current dependencies are [`../../package.json`](../../package.json), and the adopted primitives are in [`ARCHITECTURE.md`](../ARCHITECTURE.md#ui-primitives). |
> | §32 Testing requirements | The pass's test plan. Current verification is [`TESTING.md`](../TESTING.md). |
> | §34 Implementation strategy, §35 Reference-first workflow | How that build window was run. |
> | §37 Acceptance goals for v0.2, §39 Rebuild mantra | Goals and framing for the completed pass. |
>
> Where a historical section names a dependency, path or phase that no longer exists, the current
> authority is [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`CONVENTIONS.md`](../CONVENTIONS.md) and
> [`../../package.json`](../../package.json).

---

## 0. Why v0.2 exists

The current v0.1 implementation proved that the product can be built as a real React/TypeScript/Tauri project and that many core interactions can be wired and browser-tested. However, the visible product currently feels like a sparse developer prototype rather than a finished thinking medium.

Observed problems include:

- Dark mode is visually muddy and brown rather than deep, calm, and editorial.
- Thoughts often look like debug labels scattered across an infinite canvas.
- Selection turns text into an oversized rounded pill/card, breaking object identity.
- Focus often behaves like global opacity reduction rather than a nuanced attention field.
- Speak expands into a chatbot-like composer and becomes too visually dominant.
- The global More menu exposes too many internal capabilities at once.
- Permanent instructional/debug text leaks implementation state into the product surface.
- Demo content is spatially distributed like fixture data instead of being intentionally composed.
- Several reference products were named in planning, but their implementation patterns were not deeply studied before writing UI code.
- Some backend/provider layers are architecturally correct but still implementation-thin.

v0.2 is therefore not a product redefinition. It is a **design-system rewrite, interaction refinement, code-reuse pass, and backend hardening pass** over the existing foundation.

---


# 0.1 Historical failures that v0.2 must explicitly prevent

The rebuild prompt and implementation must treat the following prior failures as concrete non-regression cases, not vague lessons:

1. **Recovery archive failure**: a previous run delivered a recovery ZIP containing reports/specs but no real application source. A checkpoint is valid only when an actual source snapshot exists outside the mutable project tree and the archive is integrity-checked for expected project files such as `package.json`, `src/`, README, configs, and tests.
2. **Dependency-preflight stop failure**: a previous run stopped before source implementation because npm/network/cache access failed. Network, registry, browser-runtime, Rust/Tauri, API-key, and external-service failures are degradation conditions, not implementation stop conditions. Only inability to read/write source or inability to create/deliver a source ZIP is a hard stop.
3. **Reference-name-without-reference-use failure**: the earlier build named Excalidraw/tldraw/Kumu/etc. in planning, but the implementation did not materially inspect their frontend source/patterns. v0.2 requires targeted source/doc inspection and `docs/REFERENCE_AUDIT.md` evidence before claiming a reference was used.
4. **Visual prototype failure**: muddy brown Dark mode, oversized selected pills, a feature-dump global menu, dominant chat-like Speak surface, permanent `Saved locally` / `Demo / not a live model` labels, and fixture-like random demo placement are explicit regressions.
5. **Deep Dive collapse**: the current Deep Dive is too close to a wider Thread surface. v0.2 must restore distinct Field -> Thread -> Deep Dive semantics.
6. **Lifecycle wall-clock failure**: ordinary Thoughts must not mass-decay merely because the app stayed closed for a long time.
7. **Evidence-prematurity failure**: search snippets/candidates must not be treated as already-read evidence or directly classified as support/challenge without fetch/extract/provenance/reasoning.
8. **Known E2E history**: a prior real browser run reported 10/12 passing tests, with one failure around unsupported-file Source inspection and one around an ambiguous `Lighting` locator. Re-run the current suite; if they persist, fix the real user path and/or use stable role/test-id selectors rather than brittle ambiguous labels. Do not assume either failure still exists.

These historical failures explain the guardrails in this document. Do not delete a guardrail merely because the current run has not reproduced the original failure yet.

# 1. Authority and precedence

The frozen product architecture remains authoritative.

When sources conflict, use this order:

1. Frozen Diffusion Explorer Product Architecture v0.1 for product identity, AI authority, semantics, and boundaries.
2. This v0.2 document for visual language, interaction behavior, implementation hardening, and reuse decisions.
3. Existing verified v0.1 behavior and tests, unless this document explicitly changes the intended behavior.
4. External reference projects only as local implementation/design references.

A reference project must never redefine Diffusion into a whiteboard, knowledge graph, document editor, file desk, chat app, or project-management tool.

Core rule:

> **Reuse mechanics. Design semantics ourselves.**

---

# 2. Product identity that must not change

Diffusion Explorer is a responsive thinking medium for ideas that are not fully formed yet.

The Field is primarily made of:

- thoughts;
- questions;
- hypotheses;
- doubts;
- judgments;
- possibilities;
- phenomena between thoughts.

It is not primarily made of files, cards, graph nodes, tasks, documents, or chat messages.

Keep these rules visible during implementation:

1. **Diffusion handles uncertainty. Execution starts after commitment.**
2. **Field is state; messages are history.**
3. **Selection defines scope.**
4. **Gesture creates relation; language creates intent.**
5. **AI creates possibility; user creates commitment.**
6. **AI never sits on the critical interaction path.**
7. **Normal mode: Human -> AI -> STOP.**
8. **Diffuse is autonomous only inside explicit scope and budget.**
9. **Silence is a valid AI response.**
10. **Indexed is not the same as read.**
11. **Evidence must preserve provenance.**
12. **Crystal is the exit into action.**

AI may never silently:

- move user Thoughts;
- rewrite user Thoughts;
- delete user Thoughts;
- create permanent relations;
- create or modify a Crystal;
- steal the camera;
- reorganize spatial memory behind the user's back.

---

# 3. v0.2 design direction: Quiet Editorial Field

Internal design name:

> **Quiet Editorial Field**

This is not a marketing name. It is the visual/interaction direction.

The target feeling combines:

- a spatial field with genuine negative space;
- editorial typography rather than UI-label typography;
- content authority over chrome;
- interface elements that appear only when needed;
- deep, neutral dark surfaces rather than warm brown UI;
- structure revealed through attention rather than permanent decoration;
- a living field whose meaning changes visually without objects constantly moving.

The product should feel quiet, precise, unfinished, and alive.

It must not feel like:

- an AI SaaS dashboard;
- a colorful brainstorming board;
- a graph editor;
- a card canvas;
- a futuristic neon knowledge map;
- a chatbot with a canvas attached;
- a dead black screen with random labels.

---

# 4. One new visual law

> **Surfaces should appear only when the user is doing something that needs a surface.**

Not surfaces at rest:

- Thought;
- Ghost;
- Recall;
- Crystal;
- relation phenomenon;
- Region label.

Surfaces when needed:

- Editing;
- contextual menu;
- Speak while actively composing;
- Thread;
- Deep Dive;
- Source inspection;
- settings;
- Find;
- confirmation/draft surfaces.

This rule exists specifically to prevent the common AI-generated pattern of turning every concept into a rounded rectangle.

---

# 5. Light and Dark themes

Both themes remain first-class from v0.2.

## 5.1 Light: Paper Day

Direction:

- warm gray-white field;
- not pure white;
- deep warm-gray ink;
- subtle elevation;
- quiet borders;
- content feels editorial, not office-software white.

The existing light direction is closer to the target than the current dark theme, but it still needs typography, spacing, chrome reduction, and interaction cleanup.

## 5.2 Dark: Graphite Night

The existing brown/charcoal direction is rejected.

New direction:

- neutral or very slightly cool graphite base;
- slightly warm off-white ink;
- distinct but close surface levels;
- borders do more elevation work than large fills/shadows;
- no purple AI glow;
- no neon;
- no brown-on-brown layering;
- one muted accent family only for active attention.

Prototype starting point only, not final locked HEX values:

```css
--field-bg:      #151617;
--surface-1:     #1b1c1e;
--surface-2:     #222326;
--border-subtle: #303237;
--ink-primary:   #e7e3dc;
--ink-secondary: #b4b0aa;
--ink-tertiary:  #74716d;
```

Accent may be muted clay/rust, but it must never become a large filled selection background.

Light and Dark must preserve the same geometry and hierarchy. They should feel like the same place in different lighting.

---

# 6. Typography and spatial composition

## 6.1 Thought typography

Starting range:

- normal Thought: about 18px, weight 400;
- current/selected Thought: same geometry, slightly stronger clarity/weight;
- Crystal: about 19-20px, around 500;
- line-height: about 1.45-1.55;
- preferred width: 180-280px;
- max width: roughly 320px;
- metadata/actions: 11-13px and clearly subordinate.

Peripheral thoughts should not become tiny. Distance is expressed mainly through contrast/presence, not font-size collapse.

## 6.2 Composition rule

Do not spread all Thoughts evenly across the viewport.

The active thinking area should usually form a local neighborhood occupying roughly 40-55% of the visible field, surrounded by meaningful negative space.

The user should feel:

> "I am thinking here."

not:

> "Six strings were assigned random coordinates."

Demo/seed layouts must be intentionally composed and deterministic.

---

# 7. First-open experience

A new Field should be nearly empty.

Example visual structure:

```text
Untitled                                                ...



                      What is still unclear?



                           Write a little...
```

For a Chinese locale, equivalent product copy should be localized rather than hardcoded English.

Do not permanently show:

- double-click instructions;
- pan instructions;
- Saved locally;
- Demo / not a live model;
- provider state;
- implementation warnings.

Normal saving should be silent. Errors or degraded provider capability may surface only when relevant.

The first user input should settle into the Field. AI should not answer with a polished brainstorming list. It should open the space with a few weak nearby possibilities.

Example:

```text
        Is there simply too much information?

  I keep feeling that the way we read code is wrong.

                       Or is navigation the problem?
```

Only a few weak possibilities should be visible. Generate broadly internally; reveal slowly externally.

---

# 8. Shell

At rest, almost the whole screen is Field.

Persistent chrome should be reduced to approximately:

- current Field identity at top-left;
- a very small global More entry at top-right when needed;
- Speak at bottom-center in a resting, non-chat-composer form.

Do not show a permanent brand header inside every Field.

Instead of:

```text
Diffusion
Before it has a name
```

prefer the actual current Field title:

```text
Untitled
```

The global More menu should be limited to true global operations such as:

- Find;
- Import/Restore;
- Export;
- Settings;
- Help.

Do not expose Thread, Evidence, Crystal, Carry, Fork, Diffuse, Atlas, and other contextual capabilities as one long global feature inventory.

---

# 9. Core interaction states

## 9.1 Rest

A Thought is text in space.

No permanent card, border, chip, or status badge.

## 9.2 Hover

Hover means only "this is touchable."

Allowed:

- small clarity increase;
- extremely weak local presence/haze;
- cursor/hit-area response.

Hover must not:

- trigger Focus;
- wake relations;
- invoke AI;
- change Speak scope;
- move anything.

## 9.3 Selected

Selection is **aura-only**, not a pill/card.

The same Thought text remains in exactly the same place and line-wrap.

Changes may include:

- clarity increase;
- slight weight increase;
- borderless soft attention aura;
- contextual actions appearing in nearby negative space.

Selection must not cause text reflow.

For one Thought, first-level actions should usually be only:

```text
Ask     ...
```

Lifecycle/advanced actions belong under contextual More.

## 9.4 Editing

Editing is the one Thought state that may become a real surface.

Use:

- subtle surface separation;
- thin border;
- modest padding;
- moderate radius;
- stable text geometry.

Do not use an oversized pill.

---

# 10. The 500ms Focus response

Focus should become a signature interaction.

Target sequence after clicking a Thought:

```text
0-80ms
Selected Thought immediately becomes clearer.

80-180ms
Attention aura appears and surrounding Field begins to redistribute visual weight.

180-300ms
Confirmed relation phenomena wake where relevant.

250-400ms
Context actions appear in nearby negative space.

300-500ms
Speak quietly reflects the selected scope.
```

Rules:

- background does not change;
- no modal overlay;
- no automatic camera movement;
- no object movement;
- no global opacity cut to 20-30%;
- relation visibility and emphasis change, geometry does not.

Suggested attention hierarchy:

- selected: 100%;
- directly related: 90-100%;
- nearby/relevant: 75-85%;
- unrelated: about 55-65%;
- peripheral: about 40-50%.

These are prototypes, not hard semantic values.

On Focus release (blank click), actions disappear first, relation labels/glyphs fade, unrelated content regains presence, and aura releases last over roughly 180-250ms.

---

# 11. Relations and phenomena

Relations must not turn the Field into a graph.

No arrows by default.

Primary phenomenon glyphs:

- resonance: `~=` or equivalent quiet glyph;
- tension: lightning-like mark;
- gap/unresolved: `?`;
- support/evidence: check-like mark.

In Rest, many confirmed relations may be invisible.

In Focus, wake the glyph first. A label such as `resonance` appears only on hover/linger or inspection.

Prefer:

```text
A        ~=        B
```

rather than a permanent full edge with a label.

If a trace is useful, it should be short, faint, incomplete, and secondary to the phenomenon itself.

Pairwise only in v0.2 unless the frozen architecture is deliberately revised later.

---

# 12. Speak

Speak must not visually become the product's center.

Rest:

```text
                       Say something...
```

Hover/focus may introduce a quiet underline or extremely small surface hint.

Only after actual input focus should it become a compact input surface.

Target:

- approximately 420-560px wide on desktop;
- starts at one line;
- grows naturally to about 3-4 lines;
- no large chat composer;
- no provider label;
- no AI icon requirement;
- no permanent send-button emphasis.

When selection exists, scope should be expressed subtly. Avoid large context chips repeating the full selected Thought text.

Potential language:

```text
About here
Continue thinking...
```

or an equally quiet localized equivalent.

---

# 13. Contextual commands

Separate global and object-level commands.

## Thought menu

Example:

```text
Keep
Explore relation...
How did this form?
--------------------
Carry...
Crystallize...
--------------------
Let fade
```

## Two Thoughts

First-level actions may be:

```text
Explore     Ask     ...
```

Do not automatically create a permanent relation.

## Source

Contextual actions may include:

- Inspect source;
- Ask with source;
- Open original;
- More.

Actions should be positioned near the trigger using anchored positioning/collision logic, not fixed mechanically beneath every item.

---

# 14. Ghost

Ghost is an AI possibility that the user has not claimed.

It must not look like an AI suggestion card.

At rest:

- same nominal type scale as a Thought;
- lower clarity/presence;
- possibly slightly lighter weight;
- no purple;
- no sparkle;
- no badge;
- no glow;
- no continuous animation.

Ghost emergence:

- empty -> faint outline/ink -> final weak clarity;
- approximately 100-200ms;
- one-time only;
- stable position.

Hover may explain, very lightly:

```text
AI possibility
```

Click Ghost:

```text
Ghost -> Claim -> same object becomes Thought
```

Do not delete/recreate the object visually. The same object firms up in place.

Drag Ghost:

```text
Claim + Move
```

Lasso alone does not claim a Ghost.

Ignored Ghosts may fade under attention pressure. Do not show countdown timers.

Ghost appearance should be distinguished primarily by **presence strength**, not decorative AI styling.

---

# 15. Recall

Recall is not a recommendation. It is an earlier user Thought resurfacing.

Visual difference from Ghost:

- content is clear enough to read;
- weight may remain normal;
- presence/contrast indicates distance rather than uncertainty;
- never use a recommendation badge.

Prefer original settled position when possible.

If offscreen, use a subtle edge direction cue rather than stealing the camera.

Hover may say:

```text
Earlier thought
Because you are exploring attention again
```

Click Recall:

```text
Recall -> Wake -> same object becomes normal Thought -> Selected
```

Drag Recall:

```text
Wake + Move
```

Ignore does not mean reject; it returns to memory.

---

# 16. Crystal

Crystal means the user has decided a thought is sufficiently formed to act on.

It is not "truth," "final answer," or AI approval.

Visual direction:

- approximately 19-20px;
- around 500 weight;
- strongest stable ink in the local area;
- slightly more breathing room;
- small diamond landmark;
- no gold;
- no glow;
- no gradient;
- no celebration animation.

Formation must remain explicit:

```text
Thought/Region
-> Crystallize
-> compact draft/preview surface
-> user edits/confirms
-> settle
-> diamond landmark appears
```

Formation motion should feel like **settling**, not success/confetti.

Crystals should resist fading more than ordinary unrelated Thoughts during Focus because they act as landmarks.

---

# 17. Region and Atlas

Region is an emergent neighborhood, not a container.

Never draw a group box around it by default.

Region identity emerges from:

- Thought density;
- negative space;
- repeated activity;
- a label at appropriate zoom levels.

## Local

Thoughts are primary. Region label is absent or nearly absent.

## Neighborhood

Thoughts simplify and Region label begins to appear.

## Atlas

Regions, Crystals, unresolved frontiers, and a few landmarks become primary.

Atlas must not become a star field or glowing graph.

Dark Atlas still uses Graphite Night and typography, not purple/blue nebula aesthetics.

Key rule:

> **Zoom should remove detail before it adds decoration.**

Semantic zoom should switch representations rather than geometrically shrinking every piece of text into unreadable dots.

An active unresolved frontier may use a subtle diamond-like marker. Clicking it may return to the local area and restore attention.

---

# 18. Thread and Deep Dive

The existing product semantics remain:

- one semantic response can stay in Field;
- sustained context-dependent discourse forms a Thread;
- long, structured reasoning becomes Deep Dive.

Implementation correction:

> **Deep Dive must not merely be ThreadSurface rendered wider.**

They may share primitives, but must have distinct information architecture.

## Thread

- split surface;
- Field remains visible and manipulable;
- approximately one-third of screen by default, adjustable only if justified;
- manuscript/notebook feeling, not chat bubbles;
- scope snapshot frozen at creation;
- user explicitly adds current selection;
- responses are history, not canonical Field state.

## Deep Dive

- focus surface for long reasoning;
- shows only relevant current context, not a tiny full canvas;
- supports structured explanation, comparison, evidence, citations, compact tables, longer reasoning;
- preserves exact return point to Field;
- is not a full writing editor.

Field -> Thread -> Deep Dive is the maximum normal depth. Avoid surface nesting explosions.

---

# 19. Find, History, Source and Evidence

## Find

Cmd/Ctrl+K searches local project state:

- Thoughts;
- Crystals;
- Sources;
- Regions;
- Threads.

Preview/highlight must not move the camera. Explicit travel does.

## History

History is semantic trajectory, not a raw operation log UI.

Preserve important evolution, rejection, Probe, source/evidence, and Crystal formation.

## Source

User-facing principle remains:

> **Drop anything, best effort.**

Source is subordinate to Thought.

Unsupported formats must remain honest:

- Processing;
- Ready;
- Limited;
- Unavailable.

Never imply a PDF/image/document was fully read when only metadata or a bounded extraction exists.

## Evidence

Search results are not evidence judgments.

Required pipeline:

```text
Search
-> Candidate Source
-> Fetch / Extract
-> Evidence Passage + provenance
-> Reason against the current claim/scope
-> support / challenge / partial / prior-art / inconclusive / conflict
```

Do not classify support/challenge from a search snippet alone.

"No sufficient evidence" is a valid result.

---

# 20. Localization

v0.2 must stop hardcoding English UI copy.

Requirements:

- Chinese and English are first-class UI locales;
- default may follow browser/system locale;
- all user-facing UI strings go through one localization layer;
- demo/sample content may be localized;
- internal enum names and developer diagnostics may remain English;
- tests should target stable roles/test ids or localized-aware selectors rather than brittle English-only text when practical.

Do not build a large translation platform. Use a small mature i18n layer or a disciplined dictionary abstraction.

---

# 21. Frontend reuse map

The implementation must distinguish direct dependencies, source-level references, and study-only references.

## 21.1 Preferred direct dependencies/primitives

Use only when they reduce real code and preserve Diffusion's visual identity:

- `@floating-ui/react` - anchored actions/reference surfaces and collision-aware positioning;
- Radix Primitives - accessible unstyled popover/dropdown/tooltip/dialog primitives;
- `cmdk` - local command/find interaction if it fits cleanly;
- `react-hotkeys-hook` - scoped keyboard shortcuts if useful;
- `react-resizable-panels` - only if Thread/Deep Dive split resizing is actually desired;
- Motion for React - one-time emergence/focus/surface transitions, never pointer hot paths;
- Lucide - sparse utility icons only, not decorative icon soup.

Do not adopt shadcn/ui default visual styling. Radix behavior primitives are acceptable; generic AI-SaaS visual defaults are not.

## 21.2 Source-level implementation references

### Excalidraw - permissive source-level reference

Study before rewriting relevant mechanics:

```text
packages/excalidraw/css/theme.scss
packages/excalidraw/components/Island.scss
packages/excalidraw/components/LayerUI.scss
packages/excalidraw/components/dropdownMenu/DropdownMenu.scss
packages/excalidraw/types.ts
packages/element/src/dragElements.ts
```

Study:

- theme/surface token separation;
- dark elevation hierarchy;
- pointer-down state;
- drag hot paths;
- layer UI behavior;
- dropdown mechanics;
- selection/pointer architecture.

Do not embed Excalidraw or inherit shape/arrow/whiteboard ontology.

### Optional permissive utilities

- Selecto - optional DOM lasso selection if the existing custom implementation is inferior;
- RBush - optional spatial index if benchmarks justify replacing current grid buckets;
- d3-zoom - optional camera input primitive if it solves a concrete deficiency.

Do not replace working custom code merely because a library exists.

## 21.3 Study-only references

These may inform behavior/architecture but code must not be copied unless a specific path has a compatible license and attribution is handled:

- Kinopio - direct manipulation, panning, viewport behavior; current client license is noncommercial, so study only;
- Penpot - mature workspace/dark hierarchy, selection and token systems; treat as study/reference unless a specific reusable component/license strategy is explicitly reviewed;
- BlockSuite/AFFiNE - pointer ownership, edgeless/document architecture lessons; do not import their product model;
- tldraw - architecture textbook; do not add the SDK as a production runtime dependency without explicit licensing decision;
- Allume - low chrome, interface recession, Field dominance, show/hide behavior;
- Are.na/Sander - editorial restraint, content authority, responsiveness, Light/Dark consistency;
- Kumu - foreground/background Focus behavior only;
- Linear - contextual command hierarchy and actions near their trigger;
- Notion/Arc - progressive surface allocation and split/focus transitions.

## 21.4 Mandatory reference audit

Before rewriting a subsystem, record which reference source files/docs were actually inspected.

Create or update:

```text
docs/REFERENCE_AUDIT.md
```

For each borrowed pattern, record:

- subsystem;
- reference project;
- exact file/page inspected;
- license status;
- what pattern was borrowed;
- whether code was copied, adapted, or only studied;
- attribution requirement.

Do not claim a project was "used as reference" merely because its name appeared in this specification.

---


## 21.5 Concrete reference links

Use the official/project-primary links below. When a specific source path is listed, inspect that path (or its current equivalent if the repository moved it) and record the actual inspected revision/path in `docs/REFERENCE_AUDIT.md`.

### Direct dependencies / generic primitives

- Floating UI React docs: https://floating-ui.com/docs/react
- Radix Primitives docs: https://www.radix-ui.com/primitives/docs/overview/introduction
- Radix Primitives source: https://github.com/radix-ui/primitives
- cmdk source: https://github.com/pacocoursey/cmdk
- react-hotkeys-hook source: https://github.com/JohannesKlauss/react-hotkeys-hook
- react-resizable-panels source: https://github.com/bvaughn/react-resizable-panels
- Motion for React docs: https://motion.dev/docs/react
- Lucide source: https://github.com/lucide-icons/lucide

### Source-level mechanics references

- Excalidraw repository: https://github.com/excalidraw/excalidraw
- Excalidraw theme tokens: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss
- Excalidraw Island styling: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/Island.scss
- Excalidraw Layer UI styling: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/LayerUI.scss
- Excalidraw dropdown styling: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/dropdownMenu/DropdownMenu.scss
- Excalidraw pointer state types: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/types.ts
- Excalidraw drag implementation: https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/dragElements.ts
- Selecto: https://github.com/daybrush/selecto
- RBush: https://github.com/mourner/rbush
- d3-zoom: https://d3js.org/d3-zoom

### Study-only product/architecture references

- Kinopio client: https://github.com/kinopio-club/kinopio-client
- Kinopio `Space.vue`: https://github.com/kinopio-club/kinopio-client/blob/main/src/views/Space.vue
- Kinopio `Panning.vue`: https://github.com/kinopio-club/kinopio-client/blob/main/src/components/Panning.vue
- Penpot: https://github.com/penpot/penpot
- BlockSuite: https://github.com/toeverything/blocksuite
- AFFiNE: https://github.com/toeverything/AFFiNE
- tldraw repository: https://github.com/tldraw/tldraw
- tldraw examples: https://tldraw.dev/examples
- tldraw current license: https://tldraw.dev/community/license
- Allume: https://allume.com/
- Allume updates/design notes: https://allume.com/updates/
- Are.na: https://www.are.na/
- Are.na Sander redesign: https://www.are.na/editorial/introducing-sander-our-new-web-client
- Kumu Focus: https://docs.kumu.io/guides/focus
- Kumu Showcase: https://docs.kumu.io/guides/showcase
- Linear contextual command menu: https://linear.app/changelog/2019-10-07-contextual-command-menu
- Linear command menu: https://linear.app/changelog/2019-12-18-new-command-menu
- Notion views/peek-related product docs: https://www.notion.com/help/views-filters-and-sorts

### Backend / evidence / storage references

- Vercel AI SDK docs: https://ai-sdk.dev/docs
- Vercel AI SDK source: https://github.com/vercel/ai
- SmartSearch (preferred existing normalized search/evidence gateway candidate): https://github.com/onedotmint/smartsearch

> **Ownership decision (2026-09-15):** Diffusion now owns its discovery engine. The intent above was satisfied by extracting the engine Diffusion already depended on rather than by keeping an external dependency; `internal/discovery-engine/PROVENANCE.md` is the authoritative provenance, and the external project is no longer a candidate or a dependency.

- PDF.js: https://github.com/mozilla/pdf.js
- MiniSearch: https://github.com/lucaong/minisearch
- Dexie React tutorial: https://dexie.org/docs/Tutorial/React
- Dexie version upgrades/migrations: https://dexie.org/docs/Version/Version.upgrade()
- Hono docs: https://hono.dev/docs
- Hono RPC: https://hono.dev/docs/guides/rpc
- Tauri 2 frontend/Vite: https://v2.tauri.app/start/frontend/vite/
- Tauri file-system plugin/scopes: https://v2.tauri.app/plugin/file-system/
- Tauri dialog plugin: https://v2.tauri.app/plugin/dialog/
- Zod: https://zod.dev/

License notes in this document remain authoritative: verify the current license at implementation time before copying/adapting code. A link is an inspection target, not automatic permission to copy.

# 22. Performance contract retained

The existing hard rule remains:

> **React manages what happened; the realtime interaction layer manages how this frame moves.**

Camera hot path:

```text
pointer/wheel
-> camera controller
-> requestAnimationFrame
-> world DOM transform
```

Do not run pointer-frequency camera updates through global React/Zustand rerenders.

Drag hot path:

```text
pointerdown
-> pointer capture
-> transient CSS transform
-> pointerup
-> one canonical commit
```

Do not write Dexie/history every frame.

Continue:

- DOM Thought Layer;
- SVG Phenomenon Layer;
- viewport + margin culling;
- cached geometry;
- controlled ResizeObserver remeasurement;
- relevant visible relations only;
- semantic representation switching for zoom.

Performance fixtures should cover 100 / 500 / 2000 / 5000 Thoughts.

A passing spatial-index microbenchmark does not prove 60fps rendering. Record both separately.

---

# 23. Backend architecture: preserve the layering

Do not rewrite the backend architecture simply for novelty.

Retain the separation:

```text
Provider
-> semantic suggestions/evidence candidates
-> Diffusion Core
-> state / permissions / lifecycle
-> Spatial Engine
-> UI
```

Retain:

- Hono gateway;
- Zod validation;
- provider-agnostic interfaces;
- ProjectRepository abstraction;
- platform adapter;
- Dexie/IndexedDB local-first storage;
- Tauri shell around the same frontend.

The goal is implementation hardening, not backend reinvention.

---

# 24. AI provider hardening

The current provider layer should be audited for assumptions such as direct dependence on OpenAI-style `/chat/completions`, `choices[0].message.content`, or provider-specific structured-output behavior.

Do a small implementation spike before replacing anything:

```text
Existing thin adapters
vs
Vercel AI SDK or another mature provider abstraction
```

Compare:

- OpenAI-compatible custom endpoints;
- OpenAI Responses/API evolution;
- Anthropic/Google portability;
- structured output reliability;
- timeout/abort support;
- streaming requirements;
- server bundle complexity;
- dependency weight;
- testability.

Do not adopt a larger SDK unless it clearly removes provider-specific glue without compromising custom endpoints.

AI output must remain semantic intent, not direct UI mutation.

Prefer Zod/discriminated-union validation for semantic intents.

---

# 25. Evidence backend hardening

The Web Evidence abstraction is correct and must stay replaceable.

Preferred direction:

```text
Diffusion
-> Evidence Adapter
-> SmartSearch / normalized evidence gateway
-> Brave / Exa / Tavily / custom providers
```

Diffusion should not maintain a second full search aggregation/reranking stack if SmartSearch or another normalized gateway already solves it.

> **Ownership decision (2026-09-15):** Diffusion now owns its discovery engine. The intent above was satisfied by extracting the engine Diffusion already depended on rather than by keeping an external dependency; `internal/discovery-engine/PROVENANCE.md` is the authoritative provenance, and the external project is no longer a candidate or a dependency.

The provider returns normalized candidates. Diffusion Core decides what becomes visible.

Keep custom endpoint support, but make endpoint trust/configuration explicit and avoid leaking secret keys to the browser when a server-side gateway is available.

---

# 26. Source processing hardening

Recommended v0.2 capability boundary:

```text
TXT / Markdown / source code
-> current bounded UTF-8 worker/path

PDF
-> PDF.js-based extraction/metadata/page locator

Image
-> metadata + optional multimodal-provider analysis when explicitly requested/available

URL
-> Evidence provider fetch/extract path

Unsupported Office/audio/video/other
-> Limited / metadata-only unless a real parser/provider exists
```

Do not build a PDF reader or image editor.

Preserve provenance:

- source name;
- page/section/range actually read;
- retrieved time;
- provider where relevant;
- original URL/path reference when safe.

---

# 27. Local Find and Recall

Project Find and Recall remain distinct.

## Project Find

A mature in-memory text index such as MiniSearch is a reasonable candidate for local project Find if benchmarks justify it.

Search across:

- Thought text;
- Crystal text;
- Region name;
- Source title/metadata/excerpt;
- Thread title/working memory.

## Recall

Do not reduce Recall to Find ranking.

Recall may use a custom deterministic hybrid score across:

- current scope;
- confirmed relations;
- Region/trajectory links;
- interaction recency;
- lexical overlap;
- user decisions/rejections;
- explicit Keep/Crystal relevance.

Do not silently learn user taste or become a recommendation engine.

---

# 28. Lifecycle correction

The current implementation must not age the entire Field purely by wall-clock time while the application is closed.

Lifecycle should follow the existing product principle:

> Cooling depends on attention pressure, interaction, crowding, and non-participation - not pure elapsed time.

v0.2 requirements:

- reopening after days must not mass-transition ordinary Thoughts into Memory solely because wall time passed;
- Keep protects persistence but does not force foreground prominence;
- Crystal is exempt from ordinary fading;
- lifecycle transitions should occur under active project/session context;
- offline time may influence eligibility gently, but must be capped and cannot be the sole trigger;
- re-entry should preserve the user's cognitive landscape.

Add explicit lifecycle tests for close/reopen after simulated long downtime.

---

# 29. Persistence and migrations

Do not normalize the entire IndexedDB schema prematurely.

First benchmark the current snapshot-style Project storage at:

- 500 Thoughts;
- 2000 Thoughts;
- 5000 Thoughts.

Measure:

- save latency;
- queued writes/backlog;
- serialized size;
- reload time;
- edit/drag commit behavior;
- Thread append;
- Source updates;
- lifecycle update cost.

Only split into more tables if real measurements justify it.

However, schema migration support is mandatory now.

Use Dexie versioned migrations for future changes. Add migration tests.

Never silently discard old local projects during v0.2 upgrade.

---

# 30. Desktop/Tauri hardening

Keep one frontend codebase.

Audit the full real desktop path:

```text
pick local file
-> permission/scope granted
-> import/read
-> save project
-> close app
-> reopen project
-> inspect Source
-> open original
```

Verify behavior across Tauri dialog/file-system capability scopes.

Do not request broad filesystem access merely for convenience.

Desktop should add native file value, not create a second UI architecture.

---

# 31. Diagnostics without surveillance

Add developer-visible/request-visible diagnostics useful for integration failures:

- request id;
- provider id/type;
- elapsed time;
- timeout/abort reason;
- HTTP/provider error code;
- evidence stage (search/fetch/extract/reason);
- degraded capability state.

Do not log secrets.

Do not persist full private prompts/responses merely for telemetry.

User-facing product UI should remain quiet; diagnostics belong in development logs or explicit inspect/settings surfaces.

---

# 32. Testing requirements

Preserve working tests and expand where v0.2 changes behavior.

Minimum groups:

## Core behavior

- create/edit/cancel;
- IME composition;
- selection/multi-select;
- drag/pan/zoom;
- Focus geometry stability;
- Ghost Claim;
- Recall Wake;
- Crystal confirmation;
- Fork selective bring;
- Diffuse authority limits.

## UI v0.2

- Selected Thought does not become a large filled card;
- selection causes no text reflow;
- Light/Dark preserve geometry;
- reduced motion preserves usable state;
- global More does not expose the full internal capability inventory;
- Speak remains compact until actual composition;
- first-open UI contains no permanent developer/debug instructions.

## Source/Evidence

- unsupported file remains honestly Limited;
- PDF extraction preserves page provenance;
- search snippet alone cannot produce a final evidence judgment;
- missing evidence remains a valid result.

## Backend contracts

- AI provider adapter contract;
- Evidence provider adapter contract;
- timeout/abort/degraded behavior;
- custom endpoint validation;
- no provider directly mutates Field state.

## Persistence

- Dexie migration tests;
- reopen after long simulated downtime does not mass-decay Thoughts;
- archive/export round trip;
- desktop original reference path where environment permits.

## Performance

- spatial index benchmark;
- render/culling scenario;
- 100/500/2000/5000 fixture;
- do not equate index query speed with frame-rate validation.

Historical browser baseline from the prior implementation included 10/12 passing E2E tests, with failures around unsupported Source inspection and an ambiguous Lighting test locator. Treat this as historical context only: rerun the current tree before assuming either failure still exists.

---

# 33. Demo scene

Demo data must be intentionally composed, not random fixture layout.

Recommended structure:

```text
                    Attention may not mean
                    hiding everything else

        Why do digital spaces
        feel so noisy?

                         Maybe structure should
                         appear only when needed

                ~=

       diamond  A good interface does not reduce information;
                it lets information recede.

                              Are clarity and quiet
                              the same thing?

                   Can a space remember
                   where I was thinking?
```

The Crystal acts as a visual anchor.

The current neighborhood is locally dense with large outer negative space.

One weak Ghost may be included as an interaction invitation.

The initial viewport does not need to frame every Thought perfectly; a small hint of world beyond the viewport is desirable.

---

# 34. Implementation strategy: modify, do not restart blindly

The next build should begin by auditing the existing source tree.

Do not start a blank replacement project unless the existing source is genuinely unusable.

Classify modules:

```text
KEEP
REFACTOR
REWRITE UI
HARDEN BACKEND
REMOVE
```

Likely KEEP/HARDEN:

- core permissions/authority;
- canonical model/events;
- repository abstraction;
- spatial index if benchmarks remain good;
- camera/drag hot path if real behavior is good;
- Hono gateway structure;
- platform adapter;
- existing passing behavior tests.

Likely REWRITE/REFACTOR:

- theme tokens;
- Thought visual states;
- Shell;
- Speak UI;
- contextual actions;
- More menu information architecture;
- first-open/demo composition;
- Focus visual implementation;
- Deep Dive presentation if currently just a wider Thread;
- lifecycle algorithm if wall-clock dominated.

---

# 35. Reference-first implementation workflow

For every major subsystem:

1. identify the concrete Diffusion problem;
2. inspect the listed mature reference implementation when network/source access permits;
3. record the exact inspected source in `docs/REFERENCE_AUDIT.md`;
4. decide whether to reuse a dependency, adapt permissive code, or implement custom semantics;
5. implement the smallest Diffusion-specific layer on top;
6. verify product boundary did not drift.

Do not spend the build window broadly browsing references with no implementation consequence.

Research must be targeted and converted into a concrete decision.

---

# 36. Dependency policy

A new dependency is justified only when it:

- solves a generic problem better than our custom code;
- has a compatible license;
- does not impose another product ontology;
- reduces maintenance or accessibility risk;
- does not sit on pointer-frequency hot paths unless designed for it;
- is actively maintained enough for the use case;
- has a clear removal/replacement boundary.

Do not add a full component design system merely for styling.

Do not use default component-library aesthetics as the visual design.

---

# 37. Acceptance goals for v0.2

The rebuild is successful when all of these are substantially true:

1. Opening the app no longer looks like a sparse developer canvas.
2. Light and Dark both feel intentional; Dark is Graphite Night, not muddy brown.
3. Thought remains text-like through Rest/Hover/Selected; only Editing becomes a full surface.
4. Focus redistributes attention without moving geometry or simply blacking out the rest of the Field.
5. Speak does not read as a dominant chatbot composer.
6. Global More exposes only true global operations.
7. Contextual capabilities appear near their scope.
8. Ghost Claim and Recall Wake are visually continuous same-object transitions.
9. Crystal settles rather than celebrates.
10. Region/Atlas emerge through density/semantic zoom, not containers/graph soup.
11. Chinese and English UI are both first-class.
12. External reference code was actually inspected and recorded where claimed.
13. Mature generic primitives are reused where beneficial.
14. Evidence separates search candidate from read passage from semantic judgment.
15. PDF support is at least honestly useful with page provenance, or remains explicitly Limited if blocked.
16. Lifecycle does not mass-decay the project based only on time spent closed.
17. Dexie migrations exist before v0.2 schema evolution.
18. Existing working core interactions remain passing after the UI rewrite.
19. Backend/provider integration failures are diagnosable without leaking secrets/private content.
20. The final source archive is verified, continuation-ready, and truthful about implemented vs verified status.

---

# 38. Explicit non-goals

Do not expand v0.2 into:

- multiplayer/realtime collaboration;
- mobile-first native app;
- plugin marketplace;
- enterprise permissions;
- a full RAG platform;
- coding agent;
- task manager;
- full paper manager;
- complete research suite;
- full writing editor;
- project management suite;
- automatic layout system;
- hidden preference-learning recommendation engine;
- graph editor;
- material/file desk.

The purpose of v0.2 is to make the already-designed Diffusion **feel real, look intentional, reuse mature mechanics, and harden the underlying implementation**.

---

# 39. Compact implementation mantra

Keep these visible during the rebuild:

> **Content first. Chrome recedes.**
>
> **Surfaces only when an action needs a surface.**
>
> **World does not move; meaning appears.**
>
> **Reuse mechanics. Design semantics ourselves.**
>
> **AI creates possibility. User creates commitment.**
>
> **Implemented is not the same as verified.**

