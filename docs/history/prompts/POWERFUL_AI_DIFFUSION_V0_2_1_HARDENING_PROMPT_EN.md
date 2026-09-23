Read the entire current Diffusion Explorer v0.2 source before making changes.

This is a v0.2.1 reference-first hardening pass.

Do NOT redesign the product from scratch.
Do NOT replace the existing architecture.
Do NOT perform unrelated cleanup.
Do NOT broaden product scope.

The current v0.2 implementation is the working foundation.

Primary goals:

1. fix verified frontend interaction bugs;
2. make the reference-first process real and mandatory;
3. improve selected UI areas only where reference study supports the change;
4. add a small amount of user-controlled visual preference where appropriate;
5. prevent large monolithic source files;
6. harden and verify the existing backend boundaries without rewriting them.

Proceed without waiting for further confirmation.

--------------------------------------------------
0. FIRST: AUDIT THE CURRENT TREE
--------------------------------------------------

Before editing, create:

docs/V0_2_1_HARDENING_AUDIT.md

Classify relevant existing areas as:

KEEP
FIX
REFACTOR
SPLIT
VERIFY
DEFER

Pay particular attention to:

- global overlays / menus / dialogs;
- Speak;
- Thought rendering and typography;
- Settings;
- Focus;
- semantic zoom;
- Thread / Deep Dive;
- provider adapters;
- Evidence;
- Dexie persistence / migrations;
- Tauri file flow;
- large source files.

Do not stop after the audit.
Proceed immediately.

--------------------------------------------------
1. SOURCE FILE SIZE AND MODULARITY CONTRACT
--------------------------------------------------

Keep production source files small, cohesive and easy to understand.

The goal is NOT arbitrary fragmentation.
The goal is one clear responsibility per module and a small number of reasons for each file to change.

Guidelines for handwritten production code:

- ideal: roughly 100–300 LOC;
- >350 LOC: inspect whether responsibilities should be separated;
- >500 LOC: splitting should normally be expected;
- >700 LOC: prohibited unless there is a strong documented reason;
- multi-thousand-line handwritten application files are unacceptable.

Exceptions may include:

- generated files;
- localization dictionaries;
- static schemas/data;
- generated API types;
- unusually large test fixtures.

These exceptions must not be used to hide application logic.

For React UI:

Prefer decomposition such as:

surface/
  Surface.tsx
  SurfaceActions.tsx
  useSurfaceBehavior.ts
  surface-model.ts

when those responsibilities are genuinely distinct.

Do NOT create dozens of trivial one-function files merely to satisfy a line count.

Prefer:

- cohesive components;
- small hooks;
- domain helpers;
- explicit types;
- separate hot-path controllers from normal React state;
- reusable generic primitives only when multiple callers actually benefit.

If an existing large file must be touched, split the directly related responsibilities where safe.

Do NOT perform a repository-wide decomposition merely for aesthetics.

At the end, report:

- largest handwritten production files;
- their LOC;
- any >350 LOC files intentionally retained and why.

--------------------------------------------------
2. MANDATORY REFERENCE-FIRST GATE
--------------------------------------------------

Reference-first is now a hard requirement, not an optional suggestion.

A listed subsystem MUST NOT be visually or interactionally rewritten until its required references have been inspected.

Update:

docs/REFERENCE_AUDIT.md

For every mandatory reference inspected, record:

INSPECTED
- exact project
- exact URL
- exact source file/page
- commit/tag when practical
- license

OBSERVED
- what the implementation/product actually does

BORROW
- the specific generic pattern useful to Diffusion

DO NOT BORROW
- product assumptions or visual language that violate Diffusion

DECISION
- exact consequence for the current implementation

Do not claim a reference was inspected unless it was actually opened/read.

If network access prevents inspection:
- record BLOCKED;
- do not invent observations;
- do not perform an optional visual rewrite dependent on that reference.

--------------------------------------------------
3. MANDATORY REFERENCE MATRIX
--------------------------------------------------

### Theme / surface hierarchy

Excalidraw:
https://github.com/excalidraw/excalidraw

Inspect at minimum when still present upstream:

packages/excalidraw/css/theme.scss
packages/excalidraw/components/Island.scss
packages/excalidraw/components/LayerUI.scss
packages/excalidraw/components/dropdownMenu/DropdownMenu.scss

Study:

- light/dark surface hierarchy;
- borders vs fills;
- floating islands;
- interaction-state contrast.

Do NOT inherit Excalidraw's whiteboard product ontology.

Penpot:
https://github.com/penpot/penpot

Inspect relevant current files including:

frontend/src/app/main/ui/ds/colors.scss
frontend/resources/styles/common/refactor/design-tokens.scss

Study:

- semantic color tokens;
- background/surface levels;
- theme consistency.

### Global menu / dialog / overlay ownership

Floating UI:
https://floating-ui.com/docs/react

Inspect specifically:

- FloatingPortal
- FloatingFocusManager
- useDismiss
- useRole
- interaction composition

Radix Primitives:
https://github.com/radix-ui/primitives

Study Dialog / DropdownMenu behavior for:

- focus ownership;
- Escape;
- outside interaction;
- focus restoration;
- modal vs non-modal behavior.

Do not add Radix merely because it exists.
First determine whether the existing Floating UI layer can correctly implement the behavior.

### Pointer / drag / camera

Excalidraw:

packages/excalidraw/types.ts
packages/element/src/dragElements.ts

Kinopio:
https://github.com/kinopio-club/kinopio-client

Inspect:

src/components/Panning.vue
and relevant current Space/view files.

Study only.
Kinopio licensing must be recorded before any source adaptation.

Study:

- pan ownership;
- requestAnimationFrame updates;
- momentum;
- cancellation;
- direct spatial feel.

tldraw:
https://github.com/tldraw/tldraw

Inspect only targeted architecture/mechanics, such as:

packages/editor/src/lib/editor/Editor.ts
packages/editor/src/lib/editor/overlays/OverlayUtil.ts

Treat tldraw as an architecture reference unless the exact source/license permits more.

Do NOT adopt its product ontology or SDK as Diffusion's runtime.

### Edgeless keyboard / spatial interaction

AFFiNE / BlockSuite:
https://github.com/toeverything/AFFiNE

Inspect relevant current paths such as:

blocksuite/affine/blocks/root/src/edgeless/edgeless-keyboard.ts

Study:

- keyboard ownership;
- canvas-mode interaction boundaries;
- contextual tools.

Do NOT turn Diffusion into an edgeless document or whiteboard.

### Focus

Kumu Focus:
https://docs.kumu.io/guides/focus

Kumu Showcase:
https://docs.kumu.io/guides/showcase

Study:

- foreground/background attention;
- reducing unrelated visual weight;
- preserving context.

Do NOT borrow graph ontology, node-edge visual language or automatic relation claims.

### Contextual commands

Linear contextual command menu:
https://linear.app/changelog/2019-10-07-contextual-command-menu

Also inspect current Excalidraw dropdown implementation and Floating UI.

Study:

- contextual action hierarchy;
- progressive reveal;
- keyboard behavior.

### Low-chrome editorial field

Are.na / Sander:
https://www.are.na/editorial/introducing-sander-our-new-web-client

Allume:
https://allume.com/updates/

These are visual/product references unless inspectable source is explicitly available.

Study:

- content authority;
- chrome recession;
- typography;
- negative space;
- quiet hierarchy.

Never describe these as source-code references unless actual source was inspected.

--------------------------------------------------
4. VERIFIED FRONTEND BUG: GLOBAL OVERLAY OWNERSHIP
--------------------------------------------------

There is a verified bug:

Opening Settings from the global More menu leaves the More menu open above the Settings surface.

Fix the SYSTEMIC interaction problem, not merely the screenshot.

Invariant:

Only one global transient surface may own interaction at a time.

Opening another global surface must dismiss or suspend the previous global owner BEFORE the next surface becomes interactive.

Verify at minimum:

More -> Settings
More -> Find
More -> Import / Restore
More -> Help
Escape
click outside
Tab / Shift+Tab
focus restoration after close
reopening More
opening Settings and then using its controls

A menu must not remain interactively active behind or above a dialog/surface it launched.

Avoid solving this as only a z-index patch.

Add regression tests.

--------------------------------------------------
5. THOUGHT TYPOGRAPHY PREFERENCE
--------------------------------------------------

Keep the current editorial Serif option.

Do NOT remove Serif simply because a Sans style is more conventional.

Add a small Thought typography preference in Settings.

At minimum:

- Editorial Serif
- Quiet Sans

Optional:
- System

This preference applies to CONTENT surfaces, for example:

- Thought
- Ghost
- Recall
- Crystal
- Thread body
- Deep Dive prose where appropriate

UI chrome remains Sans:

- menus;
- settings labels;
- buttons;
- shortcuts;
- dialogs;
- command UI;
- statuses.

Changing Thought typography must:

- persist;
- work in Light and Dark;
- work in Chinese and English;
- not reset camera;
- not move Thought positions;
- not recreate project state;
- not trigger AI inference.

Text measurement may naturally change line wrapping, but do not auto-layout the entire Field.

Keep the preference small.
Do not expose arbitrary font-family editors.

--------------------------------------------------
6. SPEAK: REVIEW AFTER REFERENCE STUDY
--------------------------------------------------

The current Speak focused state still risks reading as a wide bottom chat composer.

Before modifying it:

inspect the mandatory low-chrome/contextual-surface references above.

Then evaluate the current implementation against the product rule:

Surfaces should appear only when the user is doing something that needs a surface.

Speak should feel like a temporary expression surface for the current Field scope, NOT a chatbot dock.

Prefer:

- compact width;
- limited height;
- low visual mass;
- clear but quiet scope;
- contextual appearance;
- graceful keyboard behavior.

Avoid:

- full-width bottom dock;
- giant rounded chat composer;
- AI avatar/branding;
- provider status inside normal interaction;
- permanent panel appearance.

Do not redesign Speak unless the reference audit leads to a concrete improvement.

--------------------------------------------------
7. SETTINGS
--------------------------------------------------

Keep Settings intentionally small.

Current acceptable categories:

- Language
- Appearance
- Thought typography
- Thinking service
- Reduced motion, if needed

Do NOT expose implementation-tuning controls such as:

- Focus opacity levels;
- aura strength;
- relation line thickness;
- geometry constants;
- layout density;
- animation timings.

These remain product decisions.

Review Settings layout for:

- readable density;
- keyboard accessibility;
- overlay correctness;
- Light/Dark consistency;
- Chinese/English length.

--------------------------------------------------
8. BACKEND: HARDEN, DO NOT REWRITE
--------------------------------------------------

Keep the existing architecture:

Provider
-> semantic suggestions/intents
-> Diffusion Core
-> persistence / evidence / platform
-> UI

Do NOT replace this architecture.

Audit the following.

### Provider

Verify:

- Chat Completions adapter;
- Responses adapter;
- custom OpenAI-compatible endpoint support;
- timeout;
- AbortSignal;
- structured validation;
- redacted diagnostics;
- provider/model errors.

Do not expose secrets in logs.

If current adapters already satisfy this well, KEEP them.

### Evidence / SmartSearch

Preferred boundary:

Diffusion
-> Evidence adapter
-> normalized SmartSearch / evidence gateway
-> provider(s)

Do not build a second search aggregator inside Diffusion.

Keep:

Search
-> candidate source
-> read/extract passages
-> provenance
-> scoped evidence judgment

A search snippet alone must not become a final evidence judgment.

Custom evidence/search endpoint support remains important.

### Persistence

Actually verify when environment permits:

old database/project
-> migrate
-> open v0.2
-> edit
-> save
-> reload
-> reopen

Test migration idempotence and interrupted/queued writes where practical.

Do not normalize the whole Dexie model without benchmark evidence.

### Tauri

Verify the real flow when native prerequisites permit:

pick file
-> scoped permission
-> import/read
-> persist Source
-> close app
-> reopen
-> Source remains valid
-> inspect / open original where supported

Do not request broad filesystem permission for convenience.

### Limited source types

PDF/image/Office/audio/video may remain honestly Limited if proper support is not implemented.

Do not fabricate extraction or verification.

--------------------------------------------------
9. VISUAL / PRODUCT RULES THAT MUST REMAIN
--------------------------------------------------

Preserve:

- Field is a Thought Field, not a file board.
- Thoughts rest as text.
- Selection does not create a card.
- Selection does not change geometry.
- Focus preserves context.
- AI does not invent relations on selection.
- no default arrows.
- Ghost remains a possibility.
- Recall remains an earlier user Thought.
- Crystal is user commitment, not truth.
- Thread scope is frozen.
- Deep Dive is not merely a wider Thread.
- semantic zoom removes detail before adding decoration.
- Light and Dark are equal first-class themes.
- normal saving stays silent.
- no permanent developer/provider/status labels.
- no generic AI SaaS visual grammar.

Do not turn Diffusion into:

- whiteboard;
- knowledge graph;
- chatbot;
- document editor;
- file canvas;
- dashboard.

--------------------------------------------------
10. TESTING
--------------------------------------------------

Preserve every currently passing test.

Run, when available:

npm run typecheck
npm run check:locales
npm run check:offline
npm test
npm run build
npm run test:e2e

Add targeted tests for:

- More -> Settings closes More;
- only one global transient owner;
- Escape behavior;
- outside click;
- focus restoration;
- keyboard navigation;
- Thought typography persistence;
- Serif/Sans rendering class/token behavior;
- language + font preference coexistence;
- theme changes do not alter Thought positions;
- existing selection geometry invariants.

Do not weaken tests merely to obtain green output.

If environment prevents a check, mark it UNVERIFIED.

--------------------------------------------------
11. IMPLEMENTATION ORDER
--------------------------------------------------

Use this order:

A. audit current implementation
B. inspect mandatory references relevant to the next subsystem
C. update REFERENCE_AUDIT
D. fix global overlay ownership bug
E. add Thought typography preference
F. perform only evidence-backed UI polish, especially Speak/Settings if justified
G. split directly affected oversized files
H. backend hardening / verification
I. full regression verification
J. archive

Do not begin a major UI change before the corresponding reference audit entry exists.

--------------------------------------------------
12. DELIVERY
--------------------------------------------------

Modify the existing project in place.

Do not produce a replacement greenfield repository.

Create/update:

docs/V0_2_1_HARDENING_AUDIT.md
docs/REFERENCE_AUDIT.md
STATUS.md

STATUS.md must distinguish:

IMPLEMENTED
VERIFIED
UNVERIFIED
DEFERRED

At final delivery include:

1. concise change summary;
2. references actually inspected;
3. frontend bugs fixed;
4. modularity/file-size report;
5. backend changes, if any;
6. tests actually run;
7. checks blocked by environment;
8. remaining known limitations;
9. final source ZIP;
10. SHA-256.

The final ZIP must contain the real application source, not only reports.

Verify archive integrity before delivery.

--------------------------------------------------
13. STOP CONDITIONS
--------------------------------------------------

Do not stop because:

- npm registry is unavailable;
- browser dependencies are unavailable;
- Rust is unavailable;
- external API credentials are unavailable;
- a reference website is temporarily unavailable.

Degrade honestly and continue whatever source work can still be completed.

Only stop completely if:

- the source cannot be read/written; or
- a real source archive cannot be produced.

Most importantly:

Do not trade product correctness for breadth.

A smaller, deeply verified v0.2.1 is preferred over another broad rewrite.