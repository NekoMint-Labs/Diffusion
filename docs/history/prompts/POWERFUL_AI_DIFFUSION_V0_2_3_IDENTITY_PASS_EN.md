IMPORTANT: THIS IS AN IDENTITY PASS, NOT ANOTHER PRODUCT REDESIGN

Work on the existing Diffusion Explorer v0.2.2 source.

Do not create a new project.
Do not rewrite the architecture.
Do not reopen backend, Provider, Evidence, Dexie, lifecycle, Ghost Claim semantics, persistence, Thread semantics, Deep Dive semantics, or spatial interaction mechanics unless a regression introduced by this pass requires it.

Before changing anything, read the existing project authority and current frontend/reference audits.

At minimum inspect:

- docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md
- docs/specs/02_TECH_STACK_AND_IMPLEMENTATION.md
- docs/specs/03_UI_VISUAL_SYSTEM.md
- docs/specs/04_PERFORMANCE_CONTRACT.md
- docs/REFERENCE_AUDIT.md
- docs/V0_2_2_FRONTEND_AUDIT.md
- docs/V0_2_2_MOTION_CONTRACT.md
- STATUS.md
- all existing v0.2 / v0.2.1 / v0.2.2 authority documents referenced by those files

Authority order:

1. this v0.2.3 Identity Pass for its narrow frontend scope;
2. existing v0.2 redesign/product authority;
3. frozen architecture, technical and performance contracts;
4. current v0.2.2 implementation where consistent with the above.

If this prompt is silent, preserve the existing behavior.

==================================================
DIFFUSION EXPLORER v0.2.3 — IDENTITY PASS
==================================================

The goal is NOT:

- more features;
- more animations;
- a new design system;
- another component-library makeover.

The goal is:

MAKE DIFFUSION BEGIN TO LOOK AND FEEL LIKE DIFFUSION.

The current UI is already reasonably clean and functional.

Its current weakness is different:

it still resembles a tasteful generic productivity application.

The identity pass should make the interface feel like:

a quiet field of unfinished thought,
where attention changes what becomes legible,
and temporary surfaces grow naturally out of user action.

The intended feeling is:

quiet,
editorial,
spatial,
tactile,
slightly mysterious,
but still practical and readable.

==================================================
0. CURRENT VISUAL PROBLEMS TO SOLVE
==================================================

Treat these as the starting diagnosis, but verify them against the real current app.

A. FIELD

The Field is clean but still resembles:

“several attractive serif sentences positioned over a dark background”.

The Thoughts do not yet create enough perceived depth or attention hierarchy.

Do NOT solve this with decoration.

Do NOT add:

- grids;
- graph lines;
- blobs;
- glowing backgrounds;
- decorative particles;
- fake 3D;
- automatic layout.

Identity should emerge primarily from:

- typography;
- clarity;
- weight;
- attention;
- relation phenomena;
- negative space.

B. SPEAK

This is currently the clearest remaining generic-AI/productivity pattern.

Idle Speak is relatively successful.

Focused/composing Speak becomes too much like:

- ChatGPT composer;
- large SaaS input;
- bottom dock.

This must be redesigned.

C. MENU

The More menu is cleaner than before, but still feels like a polished generic menu.

The active/focused vertical indicator is especially conventional and should not become part of Diffusion's identity.

D. SETTINGS

Settings is significantly improved, but still resembles a polished preference panel:

label left
value right
divider
chevron
repeat

The next pass should reduce this “component table” feeling without sacrificing clarity.

==================================================
1. DO NOT BEGIN WITH CODE
==================================================

First run and inspect the actual React application.

If dependencies are available:

npm ci
npm run dev

Inspect at minimum:

- Graphite Night Field at rest
- Paper Day Field at rest
- More menu
- Settings
- Speak idle
- Speak composing
- Thought hover
- Thought selected
- Focus enter / release
- Ghost appearance
- Recall wake

Also inspect:

- Chinese
- English
- Editorial Serif
- Quiet Sans

Create:

docs/V0_2_3_IDENTITY_AUDIT.md

For each of:

FIELD
SPEAK
MENU
SETTINGS

record:

KEEP
REMOVE
REFINE
NEW IDENTITY RULE

Do not stop after the audit.

Continue directly into implementation.

==================================================
2. IDENTITY REFERENCES
==================================================

Do not broadly search for another 20 references.

Use a small deliberate set.

These references define feeling and composition, not product semantics.

--------------------------------
GIONATAN NESE
--------------------------------

https://www.gionatannese.com/

Role:

MOTION / INTERACTION FEEL

Study:

- soft response;
- continuity;
- state transitions that feel spatially related;
- restraint;
- subtle depth;
- movement that does not compete with content.

Borrow:

- continuity;
- softness;
- spatial origin;
- responsive motion.

Do not borrow:

- WebGL spectacle;
- portfolio navigation;
- cursor tricks;
- decorative 3D.

--------------------------------
COSMOS
--------------------------------

https://www.cosmos.so/

Role:

EDITORIAL SPACE / PLACE / COMPOSITION

Study:

- large meaningful negative space;
- content itself creating composition;
- minimal chrome;
- hierarchy without excessive borders;
- interface feeling like a place rather than a dashboard.

Borrow:

- editorial confidence;
- spatial breathing room;
- typography carrying hierarchy.

Do not borrow:

- visual asset-grid product model;
- recommendation/feed semantics.

--------------------------------
MMM.PAGE
--------------------------------

https://mmm.page/

Role:

DIGITAL PAPER / SPATIAL LOOSENESS

Study:

- digital space behaving more like paper than application chrome;
- imperfect spatial composition;
- elements existing freely without containers;
- low pressure toward alignment.

Borrow:

- freedom;
- digital-paper feeling;
- objects not needing cards.

Do not borrow:

- playful/kitsch visual style;
- excessive decoration;
- website-builder semantics.

--------------------------------
MYMIND
--------------------------------

https://mymind.com/
https://mymind.com/our-philosophy-on-notes

Role:

QUIET CAPTURE / SPEAK

Study:

- capture interface getting out of the way;
- temporary writing space;
- content before editor chrome;
- low-friction note entry.

Borrow:

- Speak as temporary writing presence.

Do not borrow:

- product organization model;
- card-based memory system.

--------------------------------
ARC / NATE PARROTT DESIGN ARCHIVE
--------------------------------

https://nateparrott.com/arc/index.html

Role:

INTERACTION PERSONALITY

Study:

- small signature interactions;
- temporary surfaces belonging to one coherent world;
- product personality emerging from repeated interaction details.

Borrow:

- consistent interaction personality.

Do not borrow:

- browser UI model;
- sidebar model;
- decorative novelty for its own sake.

==================================================
3. EXISTING IMPLEMENTATION REFERENCES REMAIN VALID
==================================================

Reuse the source/mechanics references already recorded in docs/REFERENCE_AUDIT.md.

Especially where relevant:

Motion
Motion Primitives
Floating UI
Base UI
React Aria
Ariakit
Visual Notes
Kinopio
AFFiNE / BlockSuite
Excalidraw
tldraw
Sonner
Vaul where accessible

Do NOT re-add them as production dependencies merely because they are references.

Existing Motion + Floating UI should remain sufficient by default.

==================================================
4. THREE DIFFUSION IDENTITY MOTIFS
==================================================

This pass should establish three reusable identity motifs.

These motifs matter more than individual CSS values.

--------------------------------
MOTIF A — INK
--------------------------------

Thought is the primary material.

State changes should often feel like changes in legibility:

faint
→ becoming present
→ clear
→ stable

This applies differently to:

Thought
Ghost
Recall
Focus
Crystal

Do not literally simulate ink.

Do not add ink splashes or obvious textures.

The principle is:

MEANING BECOMES LEGIBLE.

Possible channels:

- opacity;
- font weight;
- contrast;
- very restrained text-shadow / clarity treatment;
- tiny emergence movement;
- relation visibility.

No neon glow.

No purple AI glow.

--------------------------------
MOTIF B — ATTENTION FIELD
--------------------------------

The world should not be uniformly loud.

Attention should create local hierarchy while preserving spatial context.

A selected or focused neighborhood may become:

- clearer;
- slightly more authoritative;
- more relationally legible.

Unrelated content may recede gently.

But it must not:

- disappear;
- blur heavily;
- move;
- become modal;
- lose spatial context.

The Field is not decorated.

The Field becomes alive because attention changes perceptual weight.

--------------------------------
MOTIF C — SURFACES GROW FROM ACTION
--------------------------------

Temporary UI should feel spatially connected to the user action that invoked it.

Examples:

More button
→ menu

menu action
→ Settings

Field scope
→ Speak

Thought / sustained discourse
→ Thread

This does NOT require literal morphing.

Prefer:

shared spatial origin
+
shell continuity
+
content settle/crossfade

over:

stretching text
or
transforming one arbitrary rectangle into another.

==================================================
5. SCOPE OF THIS PASS
==================================================

PRIMARY IMPLEMENTATION SCOPE:

1. Field
2. Speak
3. More menu
4. Settings

SECONDARY:

5. Thought / Focus identity details

Do NOT expand this pass to:

- Thread redesign;
- Deep Dive redesign;
- major semantic zoom work;
- backend work;
- storage work;
- source/evidence UI redesign.

Those may inherit the identity language later.

==================================================
6. SPEAK — HIGHEST PRIORITY
==================================================

Redesign composing Speak.

Current problem:

Idle:

“说点什么…”

is relatively quiet and appropriate.

But focusing it creates a very wide rounded rectangle that reads as:

AI chat composer.

Remove that association.

Desired concept:

THE FIELD MAKES TEMPORARY ROOM FOR WRITING.

Preferred qualities:

- narrower;
- lighter;
- less container-heavy;
- grows with content;
- does not dominate the whole viewport;
- remains visually attached to the Field.

Target approximate maximum width:

480–560px

Do not treat this number as mandatory if actual typography requires adjustment.

Do NOT make the focused composer span most of the viewport.

Explore whether the writing area needs:

- only a subtle lower line;
- very incomplete edge treatment;
- extremely soft surface;
- or a minimal shell that appears only while actively composing.

Avoid a heavy full rounded rectangle.

Preserve:

- draft behavior;
- keyboard behavior;
- submit;
- dismiss;
- scope semantics;
- accessibility.

It must never resemble a chatbot dock.

==================================================
7. FIELD — CREATE DEPTH WITHOUT MOVING THOUGHTS
==================================================

Do not change user coordinates.

Do not auto-layout.

Do not reposition Thoughts for visual beauty.

Do not introduce force layout.

Instead refine perceived hierarchy.

The Field should move from:

“four sentences placed on canvas”

toward:

“a local area of thought with perceptual depth”.

Use carefully:

- relative clarity;
- tonal weight;
- typography;
- relation wake;
- Focus hierarchy;
- negative space.

Important:

Do not assign permanent importance from AI.

Perceptual emphasis must derive only from legitimate current state:

selection
focus
relation
lifecycle/presence
Ghost/Recall/Crystal type

Do not invent semantic ranking.

At rest, avoid making every Thought look equally foregrounded.

But avoid so much variance that important user text becomes unreadable.

==================================================
8. THOUGHT / FOCUS
==================================================

The v0.2.2 direction of avoiding card-like selection is correct.

Preserve:

- Thought rest = text only;
- no card;
- no selection background;
- no geometry change;
- no reflow;
- no large glow.

Review the current text aura in the actual app.

If it looks like glowing text:

reduce or replace it.

Selection should feel like:

ink becoming slightly more present

not:

a label turning on.

Focus should be the stronger state.

Consider multiple weak channels instead of one strong one:

- clarity;
- contrast;
- contextual action timing;
- relation awakening;
- subtle recession of unrelated content.

Do not scale Thought text enough to alter layout.

==================================================
9. GHOST / RECALL
==================================================

Do not change semantics.

Ghost remains:

AI possibility.

Recall remains:

earlier user Thought.

Identity rules:

Ghost emergence should feel like something becoming readable.

Recall wake should feel like something returning from distance.

Neither should feel like:

- notification;
- card insertion;
- recommendation;
- sparkle;
- AI magic effect.

No special bright colors.

==================================================
10. MORE MENU
==================================================

Remove or strongly reconsider the current conventional vertical active indicator.

Do not replace it with another strong selection ornament.

Menu hierarchy should rely mostly on:

- text;
- spacing;
- restrained hover/focus surface;
- contrast.

Keep:

Find
Import / Restore
Export
Settings
Help

Keep keyboard/accessibility behavior.

Make the menu feel attached to `···`.

Avoid over-rounding.

Avoid excessive visible borders.

Do not turn it into a command palette.

==================================================
11. SETTINGS
==================================================

Settings should become less like a preference table.

Current structure:

label | value
divider
label | value
divider

is clear, but too familiar.

Refine without sacrificing scanability.

Explore:

- more breathing space between semantic groups;
- fewer dividers;
- softer alignment;
- stronger typography instead of structural lines;
- reduced outer panel mass;
- quieter chevrons;
- less emphasis on the container itself.

Settings should still remain compact.

Do not expose more settings.

Keep:

Language
Appearance
Thought typography
Thinking service

Do not turn Settings into a full-page experience.

Do not make each setting a card.

==================================================
12. SURFACE MATERIAL
==================================================

Graphite Night currently risks feeling like a uniformly filled CSS background.

You MAY explore extremely subtle surface variation.

But this is optional.

If implemented, it must be nearly imperceptible.

Allowed direction:

a very restrained sense that the Field has material depth.

Not allowed:

- visible noise;
- film grain effect;
- paper image texture;
- gradients that become noticeable;
- vignette;
- glow;
- glass;
- blur decoration.

If the material effect is noticeable before the content is noticed:

remove it.

Paper Day must receive equivalent care.

==================================================
13. TYPOGRAPHY
==================================================

Do not replace Editorial Serif simply because it is distinctive.

Current Serif is part of the product's emerging identity.

Keep:

Editorial Serif
Quiet Sans

Refine only if real runtime inspection shows:

- poor Chinese fallback;
- poor line height;
- strange wrapping;
- weak hierarchy.

UI chrome remains Sans.

Thought typography should be expressive enough to feel human,
but not literary to the point of becoming a quote-wall aesthetic.

==================================================
14. NO GENERIC DESIGN-SYSTEM DEFAULTS
==================================================

Before adding any visual treatment, ask:

“Does this belong to Diffusion,
or is this simply what modern React apps usually do?”

Be suspicious of:

- full rounded rectangles;
- repeated dividers;
- pills;
- active side bars;
- generic cards;
- oversized modal shells;
- strong shadows;
- standard SaaS selected states.

Do not remove them blindly.

Remove them where spatial/typographic hierarchy can replace them.

==================================================
15. MOTION
==================================================

Use the existing v0.2.2 motion contract.

Do not invent a second motion system.

Motion should support the new identity motifs:

INK
ATTENTION FIELD
SURFACE FROM ACTION

Prioritize:

- continuity;
- interruption;
- immediate response;
- soft settling.

Do not add:

- bounce;
- elastic Thought motion;
- mouse-follow effects;
- decorative parallax.

==================================================
16. REDUCED MOTION
==================================================

All new identity effects must remain understandable with reduced motion.

In reduced motion:

use:

- opacity;
- contrast;
- instantaneous state hierarchy;

instead of spatial animation where appropriate.

No semantic state may depend on animation.

==================================================
17. IMPLEMENTATION STYLE
==================================================

Prefer editing the existing implementation.

Do not build a parallel new component system.

Do not add production dependencies unless absolutely necessary.

Likely touched areas may include:

src/ui/**
src/field/**
src/styles/**
src/ui/motion.ts
frontend-specific tests
docs/**

Do not touch backend files without direct necessity.

Preserve existing file-size rules.

No handwritten production file >700 LOC without explicit justification.

Do not split Field.tsx merely for cosmetic LOC reduction.

==================================================
18. REQUIRED VISUAL CHECKPOINTS
==================================================

Do not do the entire pass without looking at the result.

After each major area, run the real app and inspect.

Checkpoint A:
Speak

Checkpoint B:
Menu + Settings

Checkpoint C:
Field + Thought + Focus

At each checkpoint ask:

1. Is this more distinctive?
2. Is it quieter?
3. Did it become more decorative?
4. Does it still feel practical?
5. Did we accidentally introduce cards?
6. Does it still work in Light/Dark?
7. Does Chinese still look intentional?

If a refinement is “more designed” but less Diffusion-like:

revert it.

==================================================
19. TESTING
==================================================

Do not weaken existing tests.

Run the strongest available verification in the actual environment:

npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check:offline

If dependencies prevent a command:

record the actual failure.

Do not call it verified.

Also test manually:

- More open / close
- More -> Settings
- Settings -> close
- rapid More -> Settings -> close
- Escape during transition
- Tab / Shift+Tab
- focus restoration
- Speak idle -> compose -> submit
- Speak compose -> Escape
- Thought hover
- Thought selection
- Focus enter / release
- Ghost emergence
- Recall wake
- reduced motion

==================================================
20. SCREENSHOT / VISUAL EVIDENCE
==================================================

Capture actual React app screenshots where possible.

Required representative views:

1. Graphite Night Field rest
2. Paper Day Field rest
3. Thought selected / Focus
4. Speak idle
5. Speak composing
6. More menu
7. Settings
8. Chinese UI
9. English UI

Do not use primitive fixtures as substitutes for the real app.

If real screenshots cannot be produced:

say UNVERIFIED.

==================================================
21. REFERENCE AUDIT
==================================================

Update docs/REFERENCE_AUDIT.md only for references actually inspected.

For new identity references record:

INSPECTED
OBSERVED
BORROW
DO NOT BORROW
DIFFUSION DECISION

Do not invent code-level observations for closed-source visual products.

For:

Cosmos
mmm.page
mymind
Arc
Gionatan Nese

distinguish clearly between:

VISUAL / INTERACTION OBSERVATION

and:

SOURCE-CODE INSPECTION

unless source code was actually inspected.

==================================================
22. FINAL AUDIT
==================================================

Update:

docs/V0_2_3_IDENTITY_AUDIT.md

with:

BEFORE
AFTER
WHY

for:

Field
Speak
Menu
Settings
Thought / Focus

Also include:

WHAT WAS TRIED AND REJECTED

This is important.

Record experiments that were removed because they felt:

- too card-like;
- too SaaS-like;
- too decorative;
- too weak;
- too glowy;
- too animated.

==================================================
23. DELIVERY
==================================================

Deliver:

1. concise summary;
2. exact references inspected;
3. exact implementation changes;
4. screenshots/visual verification performed;
5. tests actually run;
6. failures/unverified areas;
7. dependencies changed, if any;
8. modified file list;
9. largest production files;
10. final source ZIP;
11. verified SHA-256.

Update STATUS.md:

IMPLEMENTED
VERIFIED
UNVERIFIED
DEFERRED

Archive the actual source.

Verify ZIP CRC.

Extract it fresh.

Verify required files exist.

Run the strongest available offline verification on the extracted artifact.

==================================================
24. SUCCESS CRITERIA
==================================================

This pass succeeds if:

A new viewer does NOT primarily think:

“nice dark productivity app”.

Instead, even before understanding all features, the interface suggests:

“this is a place where thoughts exist spatially and become clearer as I attend to them.”

Speak should no longer look like a chat composer.

Thought should remain text rather than becoming UI cards.

Settings should no longer dominate as a generic preference table.

Menu should feel contextual rather than component-library-like.

The Field should feel more alive without adding visible decoration.

And most importantly:

the interface should gain identity
without becoming louder.

==================================================
FINAL PRINCIPLE
==================================================

Do not decorate Diffusion.

Reveal Diffusion.

Thought is the material.
Attention is the hierarchy.
Space is the structure.
Motion explains change.
Everything else should recede.
==================================================
17A. CODE STRUCTURE / FILE SIZE / EXTENSIBILITY — USER ADDENDUM
==================================================

This frontend pass must preserve maintainability and future extensibility.

Do not solve visual refinement by accumulating more responsibilities inside Field.tsx, Workspace.tsx, Settings, or another existing large component.

The goal is not merely to keep files under a hard LOC limit. The goal is:

SMALL COHESIVE MODULES + CLEAR OWNERSHIP + OBVIOUS EXTENSION POINTS.

For handwritten production code, 100–300 LOC is preferred for focused modules; >300 is acceptable while cohesive; >350 requires explicit responsibility review; >500 normally splits if independently understandable responsibilities exist; >700 is prohibited without a strong documented technical reason. Generated files, locale data, fixtures, static datasets and some tests may be exceptions.

Field remains performance-sensitive. Do not fragment pointer/camera/drag hot paths for cosmetic LOC reduction, but do not place new visual identity behavior in Field.tsx unless it belongs to the interaction engine. Presentation helpers may depend on semantic state; Core/semantic modules must not depend on visual animation components. Presentation-only state must stay local/transient and must not mutate canonical project semantics.

Prefer narrow shared primitives only when current behavior is genuinely shared. Do not create a universal animation abstraction or a plugin framework for hypothetical needs. Before adding a file, verify that it represents a real responsibility, clarifies ownership and does not increase coupling. Before growing a touched file over ~350 LOC, review responsibilities explicitly; for touched files >500 LOC, report why they remain cohesive and whether a safe split exists.

Final delivery must report largest handwritten production files and LOC, new files, extracted responsibilities, touched >350 LOC files, explicit >500 LOC justification, and any new architectural extension point.
