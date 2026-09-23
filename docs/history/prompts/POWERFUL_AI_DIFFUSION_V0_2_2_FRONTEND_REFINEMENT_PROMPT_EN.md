IMPORTANT: INHERITED AUTHORITY AND READ ORDER

The uploaded current Diffusion Explorer v0.2.1 source ZIP is the implementation foundation for this run.

It also contains the authoritative product architecture, v0.2 redesign specification, technical contracts, performance rules, reference audits, test suites, verification records, and delivery rules.

This v0.2.2 prompt EXTENDS those contracts.
It does not replace, weaken, or reinterpret them.

Before changing code, read the relevant project documentation.

At minimum, read:

1. docs/specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md
2. docs/specs/POWERFUL_AI_DIFFUSION_V0_2_REBUILD_PROMPT_EN_REV1.md
3. docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md
4. docs/specs/02_TECH_STACK_AND_IMPLEMENTATION.md
5. docs/specs/03_UI_VISUAL_SYSTEM.md
6. docs/specs/04_PERFORMANCE_CONTRACT.md
7. docs/specs/05_REFERENCE_PROJECTS_AND_LINKS.md
8. docs/specs/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md
9. docs/REFERENCE_AUDIT.md
10. docs/V0_2_AUDIT.md
11. STATUS.md
12. any v0.2.1 hardening audit / brief present in the archive

Also preserve the checkpoint/archive/delivery rules inherited from the existing project specifications.

Authority order:

1. this v0.2.2 prompt for the specific frontend-refinement scope introduced here;
2. the v0.2 REV1 product and visual specification;
3. the frozen product architecture and technical/performance contracts;
4. the current v0.2.1 implementation where it does not conflict with the above.

If this prompt is silent on an existing product rule, preserve the existing rule.

Do not interpret silence as permission to redesign product semantics.

==================================================
DIFFUSION EXPLORER v0.2.2
REFERENCE-DRIVEN FRONTEND REFINEMENT + MOTION POLISH
==================================================

This is NOT a product rewrite.

This is NOT another broad redesign.

The current v0.2.1 implementation is already functionally hardened and is the baseline.

Current verified baseline includes:

- full application typecheck passing;
- unit tests passing;
- production build passing;
- offline regression suite passing;
- full React Playwright E2E passing;
- the previously flaky lasso/Ghost test stabilized by identity-correct test logic;
- overlay ownership hardened;
- Editorial Serif / Quiet Sans preferences implemented;
- Light/Dark and localization working;
- backend architecture already hardened enough for this phase.

Do not reopen solved backend, storage, provider, evidence, lasso, Ghost Claim, lifecycle, or persistence work unless a regression caused directly by this frontend pass requires it.

PRIMARY GOAL:

Make Diffusion Explorer feel like a mature, intentional, quiet spatial thinking environment.

The target is not:

“more animation”
or
“more visual effects”.

The target is:

- more coherent;
- more tactile;
- more spatial;
- more continuous;
- more polished;
- less prototype-like;
- less generic component-library-like;
- less AI-SaaS-like.

Core motion idea:

THE WORLD DOES NOT MOVE FOR DECORATION.
MEANING MOVES WHEN STATE CHANGES.

==================================================
0. FIRST: REAL UI AUDIT
==================================================

Before modifying code, inspect the actual current application.

If dependencies are available:

npm ci
npm run dev

Inspect the real mounted React application, not only static CSS fixtures.

Review at minimum:

- Graphite Night / rest;
- Paper Day / rest;
- Thought hover;
- Thought selected;
- Focus enter / release;
- relation awakening;
- Ghost emergence;
- Recall wake;
- Speak idle / composing / submit;
- More menu;
- More -> Settings;
- Settings controls;
- Find;
- Thread;
- Deep Dive;
- semantic zoom transitions;
- Chinese;
- English;
- Editorial Serif;
- Quiet Sans.

Create:

docs/V0_2_2_FRONTEND_AUDIT.md

Classify visible frontend areas into:

KEEP
TUNE
REFINE
REDESIGN
REMOVE

Do not start coding before this audit and the relevant reference study.

Do not stop after the audit.
Continue implementation afterward.

==================================================
1. REFERENCE-FIRST IS A HARD GATE
==================================================

Do NOT visually or motion-redesign a subsystem before its mandatory references are inspected.

Update:

docs/REFERENCE_AUDIT.md

For every actually inspected reference record:

INSPECTED
- project/site;
- exact URL;
- exact source file/page where applicable;
- commit/tag/revision where available;
- license or reuse status.

OBSERVED
- what the implementation or interaction actually does.

BORROW
- the generic mechanic/principle useful to Diffusion.

DO NOT BORROW
- visual/product assumptions incompatible with Diffusion.

DIFFUSION DECISION
- exact consequence for our implementation.

Do not claim inspection from project names alone.

If a source/page cannot be accessed:

mark BLOCKED.

Do not invent observations.

==================================================
2. REFERENCE HIERARCHY
==================================================

Use references in four separate roles.

A. FEEL / MOTION REFERENCES
What should interaction feel like?

B. MOTION IMPLEMENTATION REFERENCES
How can similar continuity be implemented?

C. OVERLAY / CONTROL REFERENCES
How do mature UI primitives preserve correct focus, origin and lifecycle?

D. SPATIAL FIELD REFERENCES
How do direct manipulation, bare text, viewport and selection coexist?

Never collapse these roles into one.

==================================================
3. FEEL / MOTION REFERENCES
==================================================

### Gionatan Nese

https://www.gionatannese.com/

CATEGORY:
motion language / spatial continuity / interaction feel

Study:

- soft immediate response;
- continuity between states;
- restraint;
- perceived physical coherence;
- subtle depth;
- typography staying calm while interaction moves;
- movement serving hierarchy.

BORROW:

- continuity;
- softness;
- spatial origin;
- subtle inertia where appropriate;
- responsive feel.

DO NOT BORROW:

- portfolio navigation model;
- decorative WebGL;
- gratuitous 3D;
- spectacle;
- cursor gimmicks;
- motion that competes with reading or editing.

IMPORTANT:

Do NOT convert Diffusion to WebGL.

Prefer:

DOM
SVG
CSS transforms
Motion
requestAnimationFrame

Use WebGL only if a future concrete requirement proves it necessary.

### Emil Kowalski

Study interaction/motion examples from:

https://emilkowal.ski/

Focus on:

- restrained microinteraction;
- pointer immediacy;
- exit behavior;
- press / hover hierarchy;
- interaction clarity.

### Allume

https://allume.com/updates/

Study:

- low chrome;
- quiet hierarchy;
- negative space;
- calm product surfaces.

Visual/product reference unless inspectable source is actually available.

### Are.na / Sander

https://www.are.na/editorial/introducing-sander-our-new-web-client

Study:

- editorial composition;
- typography;
- content authority;
- layout calmness;
- negative space.

Visual/product reference unless actual source is inspected.

### Kumu Focus / Showcase

https://docs.kumu.io/guides/focus
https://docs.kumu.io/guides/showcase

Study:

- attention recession;
- foreground/background relationship;
- context preserved while emphasis changes.

Do NOT borrow:

- graph ontology;
- nodes/edges as Diffusion's visual language;
- automatic relationship claims.

### Linear contextual interaction

https://linear.app/changelog/2019-10-07-contextual-command-menu

Study:

- contextual reveal;
- command timing;
- low-chrome hierarchy.

==================================================
4. MOTION IMPLEMENTATION REFERENCES
==================================================

### Motion

https://github.com/motiondivision/motion

Inspect relevant current examples and implementation around:

- AnimatePresence;
- layout;
- layoutId;
- LayoutGroup;
- shared layout transitions;
- interruption behavior.

Do not blindly apply layout animation to all elements.

Motion must remain interruptible.

Rapid user interaction must take precedence over animation completion.

### Motion Primitives

https://github.com/ibelick/motion-primitives

Mandatory targeted files:

components/core/morphing-popover.tsx
components/core/morphing-dialog.tsx
components/core/transition-panel.tsx

Also inspect relevant example files where useful.

Study:

- shared `layoutId`;
- trigger -> popup spatial continuity;
- trigger -> dialog continuity;
- AnimatePresence;
- transition configuration;
- content transitions;
- mode="popLayout".

BORROW:

- shared-shell continuity;
- preserving spatial origin;
- lightweight transition composition.

DO NOT COPY blindly.

Known design caution:

Do NOT morph/stretch body text simply because shared layout permits it.

For Diffusion prefer:

SURFACE SHELL MORPHS
CONTENT CROSS-FADES / SETTLES

rather than stretching labels/text between states.

Do not introduce Motion Primitives as a dependency unless clearly justified.

Use its source as implementation reference first.

==================================================
5. OVERLAY / CONTROL IMPLEMENTATION REFERENCES
==================================================

### Floating UI

Existing dependency.

https://floating-ui.com/docs/react
https://floating-ui.com/docs/usetransition

Inspect:

- FloatingPortal;
- FloatingFocusManager;
- useDismiss;
- useRole;
- useTransitionStyles;
- useTransitionStatus;
- transform-origin / placement-aware transitions.

CRITICAL:

Floating UI positioning may use transforms.

Do not animate the same transform layer that Floating UI uses for positioning if that causes conflicts.

Prefer:

positioning wrapper
  -> animated visual child

Preserve the v0.2.1 exclusive transient ownership model.

### Base UI

https://github.com/mui/base-ui

Study only unless adoption is justified.

Target:

Popover
Select
animation handbook/examples

Inspect especially:

- --transform-origin;
- --anchor-width;
- --available-width;
- data-starting-style;
- data-ending-style;
- detached trigger movement;
- placement-aware popup animation.

Borrow:

- surface growing from actual anchor;
- restrained scale/opacity;
- controls that feel spatially attached to their trigger.

Do not import Base UI simply for styling convenience.

### React Aria Components

https://github.com/adobe/react-spectrum

Study:

Popover
Modal
overlay lifecycle

Pay attention to:

- entering/exiting states;
- DOM remaining mounted during exit;
- interruption;
- rapid overlay switching;
- accessibility during animation.

### Ariakit

https://github.com/ariakit/ariakit

Use as a behavioral correctness reference for:

- focus restoration;
- Escape;
- programmatic close;
- popover origin;
- rapid popup transitions.

### Radix Primitives

https://github.com/radix-ui/primitives

Continue using as behavior reference where useful.

Do not adopt Radix's visual grammar.

==================================================
6. DIRECT-MANIPULATION / TRANSIENT MOTION REFERENCES
==================================================

### Vaul

https://github.com/emilkowalski/vaul

Inspect relevant current drawer gesture implementation.

Study:

- pointer lifecycle;
- velocity;
- thresholds;
- dragging vs animation;
- release behavior.

Key principle:

DIRECT MANIPULATION SHOULD FOLLOW THE POINTER.
ANIMATION SHOULD TAKE OVER AFTER RELEASE.

Do not apply animated lag to Thought dragging.

Do not add Vaul as a dependency.

### Sonner

https://github.com/emilkowalski/sonner

Inspect:

src/index.tsx
src/styles.css

Study:

- transient object state machines;
- mounted / removed / swiping states;
- CSS variables;
- data attributes;
- disabling transition during direct manipulation;
- different timing for entering vs removing.

Potential Diffusion relevance:

- Ghost emergence;
- Ghost recession;
- Recall wake;
- contextual actions;
- lightweight temporary feedback.

Do not turn these into toast-like UI.

==================================================
7. FIELD / SPATIAL CODE REFERENCES
==================================================

### Visual Notes

https://github.com/dandersondev/visual-notes

MIT source.

Mandatory targeted files:

src/canvas/geometry.ts
src/canvas/pan-zoom.ts
src/canvas/selection.ts

Inspect surrounding canvas implementation only where necessary.

Study:

- screen/canvas coordinate separation;
- cursor-centered zoom;
- selection ownership;
- bare text on a spatial canvas;
- geometry separated from rendering;
- direct manipulation.

Especially useful principle:

Thought-like text may exist spatially without needing a card surface.

DO NOT borrow:

- Obsidian product semantics;
- board/file hierarchy;
- card-heavy visual grammar.

### Kinopio

https://github.com/kinopio-club/kinopio-client

Study only according to its license.

Inspect current relevant:

src/components/Panning.vue

and current Space/view code if needed.

Study:

- pan feel;
- movement -> delta;
- requestAnimationFrame;
- momentum;
- cancellation;
- direct spatial response.

Do not copy licensed source unless license explicitly permits it.

### AFFiNE / BlockSuite

https://github.com/toeverything/AFFiNE

Target relevant current files:

blocksuite/affine/blocks/root/src/edgeless/edgeless-keyboard.ts

blocksuite/affine/blocks/note/src/note-edgeless-block.ts

blocksuite/affine/widgets/edgeless-selected-rect/src/edgeless-auto-complete.ts

Study:

- text editing inside spatial interaction;
- zoom-aware geometry;
- selection vs drag lifecycle;
- keyboard ownership;
- edgeless interaction boundaries.

Do NOT borrow:

- document ontology;
- block-editor assumptions;
- toolbar-heavy UI.

### Excalidraw

https://github.com/excalidraw/excalidraw

Continue to use current exact-source references including:

packages/excalidraw/css/theme.scss
packages/excalidraw/components/Island.scss
packages/excalidraw/components/LayerUI.scss
packages/excalidraw/components/dropdownMenu/DropdownMenu.scss
packages/excalidraw/types.ts
packages/element/src/dragElements.ts

Study:

- hot pointer path;
- direct drag;
- floating surface behavior;
- dark surface hierarchy.

Do NOT embed Excalidraw.

### tldraw

https://github.com/tldraw/tldraw

Targeted architecture study only.

Useful current areas include:

packages/editor/src/lib/editor/Editor.ts
packages/editor/src/lib/editor/overlays/OverlayUtil.ts

Study:

- viewport/camera ownership;
- overlay interaction contract;
- semantic representation architecture.

Do NOT adopt tldraw's product ontology or runtime.

### nodepad

https://github.com/mskayyali/nodepad

MIT.

This is both:

- a local mechanics reference;
- and an explicit product-boundary counterexample.

Inspect targeted spatial code such as:

components/graph-area.tsx

Study:

- pointer-relative zoom;
- drag lifecycle;
- responsive viewport;
- hover vs selection;
- direct manipulation mechanics.

DO NOT BORROW:

- D3 force layout;
- automatic node movement;
- degree-based hierarchy;
- graph ontology;
- automatic spatial rearrangement.

Diffusion must not silently reorganize the user's thought space.

==================================================
8. FRONTEND REFINEMENT TARGETS
==================================================

This pass should focus on:

1. Field composition
2. Thought typography
3. Focus
4. Ghost / Recall presence
5. Speak
6. More menu
7. Settings
8. temporary surfaces
9. Thread / Deep Dive transitions
10. semantic zoom transition feel

Do NOT redesign everything equally.

Use the initial audit to identify high-impact problems.

==================================================
9. FIELD COMPOSITION
==================================================

Current Field direction is correct but may still read as:

“sentences scattered over an empty canvas”.

Refine composition so it feels like:

a local area of thought floating inside a larger space.

Preserve:

- user-controlled positions;
- no auto-layout after interaction;
- no forced graph;
- no automatic regrouping.

Demo/default fixtures may use curated deterministic composition.

Target:

- local density;
- meaningful negative space;
- visual center of gravity;
- uneven but intentional spacing;
- Thought groups that feel spatially related without boxes;
- enough empty surroundings to preserve quietness.

Do not create decorative background structures.

==================================================
10. TYPOGRAPHY
==================================================

Preserve both:

Editorial Serif
Quiet Sans

Editorial Serif may remain the default if current product judgment supports it.

UI chrome remains Sans.

Refine:

- Thought size;
- line-height;
- maximum width;
- Chinese fallback;
- English fallback;
- Crystal distinction;
- Ghost / Recall presence;
- Thread body;
- Deep Dive prose;
- wrapping behavior at different zoom levels.

Do not use typography merely decoratively.

Thought should still feel unfinished and spatial.

Crystal should feel more stable, not like a heading component.

==================================================
11. SURFACE VISUAL SYSTEM
==================================================

Current UI uses many:

thin-border + dark rectangle

surfaces.

Reduce template/component-library feeling.

Use reference study to decide when hierarchy can come from:

- subtle surface-level difference;
- spacing;
- typography;
- origin;
- motion;
- edge treatment;

instead of another visible rectangle.

Do not remove necessary boundaries for accessibility.

Do not introduce:

- glassmorphism;
- gradients;
- neon;
- purple AI glow;
- giant shadows;
- SaaS card layouts.

==================================================
12. MORE MENU
==================================================

Preserve current information architecture:

Find
Import / Restore
Export
Settings
Help

Refine:

- density;
- anchor relationship;
- enter/exit;
- hover;
- keyboard movement;
- separation;
- spatial origin.

The menu should feel attached to `···`.

Avoid:

“a floating unrelated rectangle appearing nearby”.

Rapid open/close should remain responsive.

Do not make the user wait for animation.

==================================================
13. MORE -> SETTINGS CONTINUITY
==================================================

This is a key showcase interaction.

Current semantics:

More menu closes
Settings opens
Only one global transient owner

Preserve exactly.

Improve perceived continuity.

Study Motion Primitives shared layout and Base UI origin behavior.

Potential direction:

More trigger
-> menu settles from trigger
-> Settings command chosen
-> menu releases
-> Settings surface appears from a related interaction origin

But:

do NOT fake a continuous morph if it damages focus ownership or produces text stretching.

Prefer:

shared shell / spatial continuity
+
content crossfade

over:

literal geometry stretching of every child.

Accessibility and overlay ownership take precedence over spectacle.

==================================================
14. SETTINGS
==================================================

Current Settings may still feel like:

“a nice generic HTML form”.

Refine it so it feels native to Diffusion.

Keep settings intentionally small:

- Language
- Appearance
- Thought typography
- Thinking service
- Reduced motion if appropriate

Do not expose visual tuning knobs.

Possible improvements:

- reduced total panel mass;
- tighter vertical rhythm;
- softer group hierarchy;
- less generic select styling;
- clearer content vs chrome distinction;
- better relationship to the Field behind it.

Do not make Settings a full app page.

==================================================
15. SPEAK
==================================================

Re-evaluate real Speak behavior after reference study.

The product rule remains:

Speak is a temporary expression surface for the current Field scope.

It is NOT:

- chatbot dock;
- chat composer;
- permanent bottom panel;
- AI assistant panel.

Refine:

- appearance origin;
- width;
- vertical expansion;
- textarea behavior;
- submit/clear transition;
- scope indication;
- dismiss behavior.

Use motion to communicate:

“the Field is ready to receive an expression”

rather than:

“a chat window opened”.

Preserve unsent draft behavior from v0.2.1.

==================================================
16. FOCUS
==================================================

Do not replace Focus semantics.

Selection:

- defines semantic scope;
- does not infer new relations;
- does not move objects;
- preserves context.

Improve perceived Focus using several subtle channels rather than one opacity switch.

Possible channels:

- clarity;
- contrast;
- relation phenomenon;
- tiny contextual settling;
- action timing;
- aura;
- subtle depth/recession.

Avoid:

- camera motion;
- big scale changes;
- blur wall;
- dark modal background;
- unrelated content disappearing.

Use Kumu as attention reference, not graph reference.

==================================================
17. THOUGHT HOVER / SELECT
==================================================

Thought rest remains plain text.

Hover:

- immediate;
- subtle;
- does not create semantic state;
- does not trigger AI;
- does not trigger Focus;
- should feel responsive.

Selected:

- aura-only;
- no card conversion;
- no geometry change;
- no text reflow caused by selection styling;
- contextual actions appear in negative space.

Do not use bounce.

Do not scale Thought text enough to alter layout.

==================================================
18. THOUGHT DRAG
==================================================

Direct drag must remain direct.

During active drag:

- pointer response must dominate;
- avoid transition lag;
- do not spring behind the cursor;
- avoid React-state frequency regressions.

After release:

a very small settle may be acceptable only if it does not move the actual committed position unexpectedly.

Do not add inertia that changes where the user placed the Thought.

The user controls spatial placement.

==================================================
19. GHOST
==================================================

Ghost is:

AI possibility.

Not:

recommendation card
AI message
purple object
sparkle object

Refine emergence.

Potential motion quality:

- developing ink;
- very small positional/opacity settling;
- appears as if becoming legible, not “popping in”.

Click:

Claim + Select

Drag:

Claim + Move

Lasso:

may select without Claim according to the existing authoritative semantics.

Do not alter these semantics.

Ghost ignore/recession remains attention-pressure-based, not countdown animation.

==================================================
20. RECALL
==================================================

Recall is:

an earlier user Thought returning into attention.

Refine wake behavior so it feels like:

distance becoming presence

rather than:

a new item being inserted.

Do not camera-steal.

Do not animate from some arbitrary screen edge unless actual spatial provenance supports it.

Click/Wake semantics remain unchanged.

==================================================
21. RELATION PHENOMENA
==================================================

Do not turn relations into permanent connector UI.

No default arrows.

Keep pairwise v0.1 relation semantics.

Focus may wake:

glyph first
label later / hover / linger

If traces exist:

keep them incomplete, quiet, phenomenological.

Do not become a knowledge graph.

==================================================
22. THREAD / DEEP DIVE
==================================================

Preserve:

Thread = sustained discourse with frozen scope.

Deep Dive = distinct structured reasoning mode.

Deep Dive must not become:

“Thread but wider”.

Refine transition feel:

Field
-> Thread
-> Deep Dive
-> return

Maintain exact semantic ownership and return context.

Do not animate so strongly that these feel like page navigation.

These are deeper working surfaces growing out of the Field.

==================================================
23. SEMANTIC ZOOM
==================================================

Preserve rule:

ZOOM REMOVES DETAIL BEFORE IT ADDS DECORATION.

Representation change may be refined to feel less abrupt.

Do NOT simply animate tiny text continuously across unusable scales.

Study transition between:

Local
Neighborhood
Atlas

for continuity.

Representation switching is allowed.

Graph soup is not.

==================================================
24. MOTION SYSTEM CONTRACT
==================================================

Create or update a concise motion contract in project docs.

Prefer a small number of shared motion roles, not dozens of random numbers.

Example conceptual roles:

INSTANT_RESPONSE
- hover/pointer feedback

MICRO_SETTLE
- small contextual controls

SURFACE_ENTER
- menu/popover/small panel

SURFACE_TRANSFORM
- related shell continuity

ATTENTION_SHIFT
- Focus / relation wake

REPRESENTATION_CHANGE
- semantic zoom / deeper surface transitions

Do not blindly use identical timings.

Do not use:

transition: all

for complex interactive components.

Animate only necessary properties.

Prefer:

transform
opacity

and carefully justified:

height / clip / layout

Avoid costly broad property animation.

==================================================
25. INTERRUPTION
==================================================

This is critical.

Animations must be interruptible.

If the user:

- clicks again;
- presses Escape;
- opens another surface;
- drags;
- changes selection;

the system must respond immediately.

Do not queue decorative animations ahead of user intent.

Rapid interaction may:

- shorten;
- skip;
- reverse;

an animation.

Correct interaction state is more important than completing the animation.

==================================================
26. REDUCED MOTION
==================================================

Respect prefers-reduced-motion.

If Settings already has or can cleanly support Reduced Motion, keep it simple.

Reduced motion must preserve:

- hierarchy;
- state clarity;
- accessibility;

without requiring moving transitions.

No feature may become ambiguous when motion is reduced.

==================================================
27. LIGHT / DARK PARITY
==================================================

Paper Day and Graphite Night are equal first-class themes.

Every changed surface/motion state must be checked in both.

Do not polish only Dark.

Paper Day remains warm paper-like, not pure SaaS white.

Graphite Night remains neutral/slightly cool graphite, not warm brown.

No neon.

==================================================
28. CHINESE / ENGLISH PARITY
==================================================

Check all changed UI in:

zh
en

Do not tune layout solely around English string lengths.

Example/demo Thought content should follow locale where it is product-provided demo content.

User-authored content is never translated.

==================================================
29. FIRST-OPEN / DEMO
==================================================

Do not turn normal first-open into a portfolio showcase.

Normal new Field remains nearly empty and quiet.

Demo/example mode may remain richer.

If product-provided example Thoughts are shown:

match current locale.

Avoid leaving mixed Chinese UI + English system-provided demo content unless intentionally demonstrating user-authored multilingual content.

==================================================
30. NO NEW BACKEND SCOPE
==================================================

Do not change:

Provider architecture
Evidence architecture
SmartSearch architecture
Dexie schema
lifecycle rules
Tauri permissions
AI semantic intent contracts

unless necessary to fix a frontend regression introduced in this run.

Do not use this frontend pass as an excuse for backend cleanup.

==================================================
31. FILE SIZE / MODULARITY
==================================================

Preserve v0.2.1 modularity rules.

Handwritten production code guidance:

ideal:
100–300 LOC

>350:
review cohesion

>500:
normally split if responsibilities are clearly separable

>700:
must fail unless explicitly documented exception

Do NOT split a hot-path file simply for cosmetic LOC compliance.

Do NOT create dozens of tiny abstraction files.

One clear responsibility per module.

If frontend refinement creates substantial reusable motion behavior, prefer small cohesive modules such as:

motion/
  motion-tokens.ts
  SurfaceMotion.tsx
  useReducedMotion.ts

only if the actual implementation benefits.

Do not create a “design system framework” unnecessarily.

==================================================
32. DEPENDENCIES
==================================================

Default:

DO NOT ADD NEW PRODUCTION DEPENDENCIES.

Current Motion + Floating UI should be sufficient for most work.

Motion Primitives
Base UI
Vaul
Sonner
React Aria
Ariakit

are source/mechanics references first.

Add a dependency only if:

1. a concrete current problem cannot be cleanly solved with existing stack;
2. the dependency significantly reduces custom complexity;
3. bundle/runtime/accessibility implications are understood;
4. the reason is documented.

Do not add a library for one animation.

==================================================
33. PERFORMANCE
==================================================

Preserve the existing performance contract.

Especially:

- pointer/camera hot paths remain outside high-frequency React state;
- DOM Thought + SVG phenomena remain the baseline;
- no expensive per-frame React rerender;
- no layout-thrashing motion loops;
- avoid getBoundingClientRect() every frame unless unavoidable and measured.

Test fixture scales remain:

100
500
2000
5000 Thoughts

Visual refinement must not invalidate the existing performance model.

==================================================
34. FRONTEND ACCEPTANCE CHECK
==================================================

After implementation, manually/automatically verify:

Field:
- rest;
- hover;
- selection;
- drag;
- lasso;
- Ghost;
- Recall;
- Crystal.

Focus:
- enter;
- relation wake;
- contextual actions;
- release.

Surfaces:
- More;
- More -> Settings;
- Find;
- Import/Restore;
- Help;
- Speak;
- Thread;
- Deep Dive.

Preferences:
- Light;
- Dark;
- Serif;
- Sans;
- Chinese;
- English;
- reduced motion where available.

Keyboard:
- Tab;
- Shift+Tab;
- Escape;
- Ctrl/Cmd+K;
- focus restoration.

Rapid interaction:
- open/close repeatedly;
- Settings -> close -> menu;
- menu -> Find;
- menu -> Settings;
- change selection during animation;
- Escape while surface is entering;
- drag while contextual actions are disappearing.

No stale overlay.
No stuck animation.
No focus theft.
No delayed click response.

==================================================
35. TESTING
==================================================

Do not weaken current passing tests.

Run:

npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check:offline

The current baseline is fully green.

Any regression caused by this pass must be fixed before delivery.

Add targeted tests where the new motion creates meaningful lifecycle risk.

Examples:

- surface remains focus-correct during exit;
- rapid More -> Settings;
- Escape during entering transition;
- reduced-motion state;
- layout animation does not change Thought coordinates;
- selection does not reflow Thought geometry;
- drag remains direct.

Do not create screenshot tests that merely lock arbitrary pixel values unless they protect a deliberate visual invariant.

==================================================
36. VISUAL VERIFICATION
==================================================

Create/update real mounted-app visual verification where practical.

Capture representative screenshots or authored visual fixtures for:

1. Paper Day / Rest
2. Graphite Night / Rest
3. Graphite Night / Focus
4. More menu
5. Settings
6. Speak
7. Thread
8. Deep Dive
9. Serif
10. Sans
11. Chinese
12. English

If possible, include short motion verification via browser-driven state sampling or frame checks for high-risk transitions.

Do not label CSS-only fixtures as full-app verification.

Clearly distinguish:

REAL REACT APP
vs
CSS/PRIMITIVE FIXTURE

==================================================
37. IMPLEMENTATION ORDER
==================================================

Use this sequence:

A. read inherited authority
B. run/inspect current UI
C. produce V0_2_2_FRONTEND_AUDIT
D. inspect mandatory references for the next subsystem
E. update REFERENCE_AUDIT
F. define compact motion roles/tokens
G. refine highest-impact surfaces first
H. refine Field/Focus motion
I. refine transient entities
J. refine typography/composition
K. check Light/Dark + zh/en
L. full regression tests
M. real UI verification
N. final source archive

Do NOT redesign five subsystems in parallel without checking the previous one.

Prefer fewer, well-finished refinements.

==================================================
38. PRIORITY ORDER
==================================================

If time is limited, prioritize:

1. More / Settings continuity
2. Settings visual refinement
3. Speak
4. Focus
5. Thought hover/selection feel
6. Ghost / Recall
7. Field composition / typography
8. Thread / Deep Dive transition
9. semantic zoom transition

Do not sacrifice core interaction correctness for lower-priority animation.

==================================================
39. WHAT “DONE” SHOULD FEEL LIKE
==================================================

The result should NOT make someone say:

“there are more animations now.”

It should make them feel:

- opening something makes spatial sense;
- closing something returns naturally;
- nothing jumps without reason;
- nothing drags behind the pointer;
- attention shifts without hiding the world;
- surfaces feel like temporary extensions of the Field;
- text remains the main material;
- the interface feels quiet but alive.

A useful test:

If the animation is removed, the interface remains understandable.

If the animation is present, the relationship between states becomes easier to feel.

==================================================
40. PROHIBITED DIRECTIONS
==================================================

Do not introduce:

- WebGL Field rewrite;
- canvas-only text rendering;
- automatic graph layout;
- D3 force layout;
- cardification of Thoughts;
- floating AI assistant;
- glowing AI objects;
- gradient SaaS styling;
- glassmorphism;
- excessive blur;
- elastic/bouncy motion everywhere;
- 3D tilt on Thoughts;
- mouse-follow gimmicks;
- parallax for decoration;
- giant modal transitions;
- cinematic page navigation;
- hidden automatic spatial rearrangement.

Do not imitate Gionatan Nese literally.

Do not imitate any reference product literally.

Reuse mechanics.
Design Diffusion semantics ourselves.

==================================================
41. MODIFICATION BOUNDARY
==================================================

This run is frontend-centered.

Expected likely touched areas:

src/ui/**
src/field/**
src/styles/**
src/ui/thread/**
src/ui/focus/**
motion-related helpers
frontend tests
docs/REFERENCE_AUDIT.md
docs/V0_2_2_FRONTEND_AUDIT.md
STATUS.md

Do not modify unrelated backend files without direct necessity.

If unrelated issues are discovered:

record them.

Do not fix them in this pass.

==================================================
42. DELIVERY
==================================================

Modify the existing project in place.

Do not create a replacement greenfield repository.

At delivery provide:

1. concise frontend audit result;
2. reference projects actually inspected;
3. exact files/pages inspected;
4. KEEP / TUNE / REFINE / REDESIGN decisions;
5. UI areas changed;
6. motion behaviors changed;
7. dependencies added, if any, and justification;
8. largest handwritten production files;
9. tests actually run;
10. real React verification performed;
11. anything remaining unverified;
12. known visual limitations;
13. final source ZIP;
14. SHA-256.

Update STATUS.md with:

IMPLEMENTED
VERIFIED
UNVERIFIED
DEFERRED

Do not say “verified” when only a primitive fixture was tested.

==================================================
43. ARCHIVE / DELIVERY SAFETY
==================================================

Preserve inherited project checkpoint and archive rules.

The final artifact must contain the actual application source.

Before final response:

- create source ZIP;
- verify ZIP CRC;
- extract it fresh;
- check required files;
- compare archived files where practical;
- run at least the available offline verification against the extracted artifact;
- generate SHA-256.

Do not deliver a report-only archive.

==================================================
44. STOP CONDITIONS
==================================================

Do not stop merely because:

- one reference site is unavailable;
- npm registry temporarily fails;
- browser tooling is unavailable;
- native Tauri cannot run.

Degrade honestly and continue safe work.

But do NOT invent visual verification.

If the real app cannot be run:

mark real visual result UNVERIFIED.

Only stop completely if:

- the source cannot be read/written;
- or a real source archive cannot be created.

==================================================
FINAL PRINCIPLE
==================================================

Diffusion should not become visually impressive by becoming louder.

It should become impressive because:

the Field feels coherent,
interaction feels continuous,
movement explains meaning,
and everything unnecessary recedes.

User acts.
The world responds.
Meaning appears.