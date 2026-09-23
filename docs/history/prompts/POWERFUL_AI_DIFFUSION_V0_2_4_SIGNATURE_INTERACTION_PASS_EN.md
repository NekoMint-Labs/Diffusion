IMPORTANT: THIS IS A NARROW SIGNATURE-INTERACTION REFINEMENT PASS

Work directly on the existing Diffusion Explorer v0.2.3 source.

Do not create a replacement project.

Do not reopen:

- product architecture;
- AI/provider semantics;
- Evidence;
- Dexie/storage;
- lifecycle;
- Ghost Claim semantics;
- Recall semantics;
- Thread semantics;
- Deep Dive semantics;
- camera / pointer / lasso mechanics;

unless this pass directly introduces a regression requiring repair.

This pass exists to refine several high-value visual and interaction details
that remain visible in the real v0.2.3 application.

==================================================
DIFFUSION EXPLORER v0.2.4
SIGNATURE INTERACTION PASS
==================================================

The current product is already clean.

The problem is no longer:

"make the frontend nicer."

The remaining problem is:

SEVERAL IMPORTANT INTERACTIONS STILL DO NOT FEEL
DISTINCTIVELY LIKE DIFFUSION.

This pass should refine:

1. Speak idle -> composing
2. More -> Settings
3. Field attention hierarchy / Focus
4. Ghost / Recall emergence
5. small Settings visual details

Do not broaden the scope.

Do not redesign Thread / Deep Dive in this pass.

==================================================
0. READ CURRENT AUTHORITY FIRST
==================================================

Read the existing project authority before editing.

At minimum inspect:

- frozen product architecture;
- v0.2 redesign specification;
- technical / performance contracts;
- docs/REFERENCE_AUDIT.md;
- docs/V0_2_2_MOTION_CONTRACT.md;
- docs/V0_2_3_IDENTITY_AUDIT.md;
- STATUS.md;
- current frontend tests.

Preserve all existing semantics.

The current real application screenshots are also part of the design evidence.

Important currently observed issues:

- Speak direction improved dramatically, but composing still appears wider
  and heavier than intended in real runtime;
- native textarea/scroll controls are visually exposed near Speak;
- Field is calm, but the resting Thoughts can still feel too uniformly present;
- Settings is much better, but the shell/accent can still be slightly too strong;
- More menu is now sufficiently clean and should NOT be broadly redesigned.

==================================================
1. REFERENCE GATE
==================================================

Before editing each target subsystem, inspect the exact reference assigned to it.

Do not merely write:

"inspired by Family"
or
"inspired by React Bits".

Update docs/REFERENCE_AUDIT.md with:

INSPECTED
OBSERVED
BORROW
DO NOT BORROW
DIFFUSION DECISION

For closed-source interaction references, record only visual/interaction
observation.

Do not pretend source code was inspected.

==================================================
2. EXACT REFERENCE SET
==================================================

Do NOT expand this into another broad reference search.

Use this deliberately small set.

--------------------------------
A. SPEAK
--------------------------------

60fps.design:

- Monogram Keyboard Icon Morph to Chat Input Interaction
- Family Dynamic Sheet Expand Contract Interaction

Study:

- compact state and expanded state visibly belonging to the same object;
- expansion from the actual interaction origin;
- shell adapting its dimensions to content;
- reversal feeling natural;
- interruption remaining responsive.

BORROW:

compact
-> compose
-> collapse

as one continuous object lifecycle.

DO NOT BORROW:

- chat semantics;
- microphone UI;
- bottom pill bar;
- large action bar;
- springy mobile-app personality;
- excessive rounding;
- keyboard-specific choreography.

Diffusion decision:

Speak should feel like:

THE FIELD TEMPORARILY MAKES ROOM FOR WRITING.

Not:

A CHAT COMPOSER OPENS.

--------------------------------
B. MORE -> SETTINGS
--------------------------------

60fps.design:

- Family Wallet Card Morph to Screen Transition
- Family Action on Sheet to Sheet Morph Interaction
- Family Contextual Continuity Sheet Morph Interaction

Study:

- source surface retains spatial continuity;
- next state seems to grow from the previous interaction;
- container ownership stays coherent while content changes;
- content may crossfade while the shell maintains continuity.

BORROW:

SHARED SPATIAL ORIGIN
+
SHELL CONTINUITY
+
CONTENT SETTLE

DO NOT BORROW:

- full-screen mobile sheet structure;
- bounce;
- colorful headers;
- illustration;
- dramatic spring overshoot;
- literal stretching of labels.

Diffusion decision:

Do NOT morph the text "设置" into the Settings heading.

Do NOT stretch menu rows.

If continuity is used:

animate the surface relationship,
not the typography.

--------------------------------
C. FOCUS
--------------------------------

React Bits repository:

DavidHDev/react-bits

Inspect commit/revision currently corresponding to:

3a1c7f2f9f94ed833934ab5c2635760b9e644583

Target source:

src/ts-default/TextAnimations/TrueFocus/TrueFocus.tsx

Study:

- explicit distinction between active and inactive text;
- clarity as a state channel;
- one active region becoming perceptually authoritative.

DO NOT COPY:

- moving corner frame;
- glow;
- border;
- obvious blur;
- automatic cycling;
- per-word focus;
- repeated getBoundingClientRect measurement;
- React animation state in Field hot paths.

The important idea is:

FOCUS CAN BE EXPRESSED THROUGH LEGIBILITY,
NOT THROUGH A CARD OR GLOW.

Diffusion must achieve this using existing semantic states:

selected
direct
nearby
receded
peripheral

not an invented AI importance ranking.

--------------------------------
D. GHOST / RECALL
--------------------------------

React Bits repository:

DavidHDev/react-bits

Inspect:

src/ts-default/TextAnimations/BlurText/BlurText.tsx

Study the staged progression:

less legible
-> partially present
-> fully present

Do NOT copy its defaults.

The reference uses:

- strong blur;
- large vertical movement;
- per-word animation;
- IntersectionObserver-based reveal.

Those are inappropriate for Diffusion.

Diffusion adaptation should be dramatically quieter.

Prefer:

container-level opacity
+
at most a very small 2–4px settle
+
existing typography/contrast

Avoid filter blur if possible.

Especially do not animate blur independently on many Thoughts.

Ghost:

possibility becoming legible.

Recall:

an earlier Thought returning to presence.

Neither should look like an animation demo.

--------------------------------
E. FIELD COMPOSITION
--------------------------------

Departure Mono repository:

rektdeckard/departure-mono

Inspect the current website and source around:

src/components/typetest.tsx
src/components/header.css

Study:

- typography itself creating structure;
- spacing acting as composition;
- asymmetric whitespace;
- scale / tracking / line-height creating hierarchy without cards.

DO NOT BORROW:

- Departure Mono font;
- pixel typography;
- terminal aesthetic;
- ASCII graphics;
- retro-tech styling;
- sci-fi visual language.

Diffusion decision:

TEXT IS THE PRIMARY VISUAL MATERIAL.

The Field should gain composition through:

- spacing;
- clarity;
- typographic weight;
- local attention;

not decoration.

==================================================
3. SPEAK — FIRST PRIORITY
==================================================

Use the REAL application, not only primitive fixtures.

The current runtime screenshots show that Speak composing still has two
specific issues:

1. the writing region can visually become too wide;
2. native scrolling controls / arrows can become visible.

Fix these first.

--------------------------------
WIDTH
--------------------------------

At a normal desktop viewport, composing Speak should remain approximately:

480–560px maximum visual width.

It must not stretch across most of the screen.

Use responsive constraints so narrow windows still work.

Do not solve this with a fixed width that overflows mobile/small windows.

The measured REAL runtime width matters more than what the CSS declaration
claims.

Verify the rendered bounding box.

--------------------------------
HEIGHT
--------------------------------

Speak begins compact.

As the user types:

- grow vertically with content;
- allow approximately 3–4 comfortable lines;
- after the maximum composing height, keep the content scrollable.

Do not allow the shell to keep expanding indefinitely.

--------------------------------
NATIVE SCROLL CHROME
--------------------------------

Do not expose browser-default scrollbar arrow buttons or visually intrusive
textarea chrome.

Scrolling must remain functional using:

- wheel;
- trackpad;
- keyboard;
- touch where relevant.

Do NOT globally hide all application scrollbars.

This rule applies specifically to the quiet Speak composing surface.

--------------------------------
VISUAL FORM
--------------------------------

Do not restore the old rounded composer.

Prefer:

text
+
quiet writing region
+
one subtle grounding line or similarly incomplete edge treatment.

Avoid a complete heavy rectangle.

Avoid strong background fill.

Avoid shadow.

Avoid pill styling.

The input should feel present,
but the Field should still visually dominate.

--------------------------------
TRANSITION
--------------------------------

Idle Speak and composing Speak should visibly be the same object.

The transition may include:

- width expansion;
- small vertical growth;
- content opacity;
- subtle origin-aware settling.

It must remain interruptible.

Focus should be immediate even if motion is still settling.

Escape / submit / blur should never wait for decorative animation.

==================================================
4. FIELD / FOCUS — SECOND PRIORITY
==================================================

The current removal of glow/text-shadow is correct.

Do NOT restore glow.

Do NOT create cards.

The remaining issue is:

at rest, several Thoughts can still feel equally foregrounded.

Refine the existing visual hierarchy.

Use only legitimate state.

Possible channels:

- text opacity;
- ink contrast;
- extremely small weight differences;
- relation visibility;
- contextual action timing.

Avoid significant blur.

Avoid scale.

Avoid positional movement.

Avoid changing wrapping.

--------------------------------
REST
--------------------------------

Resting Thought must remain readable.

Do not make normal Thoughts look disabled.

But the entire Field does not need uniform foreground intensity.

--------------------------------
SELECTED
--------------------------------

Selected should become clearly legible immediately.

It still remains plain text.

No shell.

No box.

No glow.

--------------------------------
FOCUS
--------------------------------

Focus is stronger than selection.

Directly related Thoughts may remain near full clarity.

Nearby relevant Thoughts remain readable.

Unrelated Thoughts recede gently.

Peripheral Thoughts may become quieter.

Context must remain visible.

Do not darken the whole Field.

Do not blur the background like a modal.

--------------------------------
NO NEW SEMANTIC RANKING
--------------------------------

Never calculate visual importance from:

- AI confidence;
- hidden relevance score;
- engagement ranking;
- recommendation logic.

Use only existing authoritative Field state.

==================================================
5. GHOST / RECALL
==================================================

Do not redesign their semantics.

Only refine emergence.

Try a restrained staged presence transition.

For example conceptually:

Ghost:

quiet
-> becoming readable
-> stable possibility

Recall:

distant
-> returning
-> readable earlier Thought

Do not animate each word independently.

Do not use obvious blur.

Do not use spring bounce.

Do not use glow.

Do not use color as the primary differentiator.

Do not increase React hot-path work.

A container-level transition should normally be enough.

==================================================
6. MORE -> SETTINGS
==================================================

The menu itself is already sufficiently clean.

Do NOT redesign its layout again.

Focus only on continuity into Settings.

Current behavior semantics remain:

one transient owner
-> More open
-> Settings selected
-> More releases ownership
-> Settings owns surface

No stale overlapping surfaces.

No menu underneath Settings.

--------------------------------
TARGET FEEL
--------------------------------

The user should feel:

"I opened something from here."

not:

"one rectangle vanished and another rectangle appeared."

Explore whether the existing Motion/Floating UI implementation can provide:

- origin information from More/menu;
- subtle shell continuity;
- related enter/exit direction;
- shared visual origin.

Do NOT sacrifice overlay correctness.

Do NOT delay Settings availability until an exit animation completes.

Do NOT create fragile shared-layout coupling if a lighter continuity treatment
works better.

Correct ownership beats visual morphing.

==================================================
7. SETTINGS — MICRO REFINEMENT ONLY
==================================================

Do NOT redesign Settings again.

Its v0.2.3 structure is largely successful.

Only inspect:

- outer border strength;
- accent color dominance;
- close affordance;
- vertical spacing;
- whether Thinking Service attracts too much attention.

The selected/current service should not become the visual protagonist.

Avoid introducing dividers again.

Avoid making each setting a card.

==================================================
8. FIELD COMPOSITION
==================================================

Do not auto-layout user Thoughts.

Do not move any user-owned coordinates for visual polish.

Do not introduce clustering.

Do not introduce gravity.

Do not introduce graph layout.

However:

product-owned demo/default composition may be refined deterministically if
necessary to demonstrate the intended visual hierarchy.

If demo content is changed:

- preserve semantics;
- support zh/en;
- do not turn the demo into an art poster.

The target is still a usable product Field.

==================================================
9. PERFORMANCE RULE
==================================================

This pass must not make Field presentation expensive.

Do not:

- run getBoundingClientRect per Thought per frame;
- animate CSS filter blur across hundreds/thousands of Thoughts;
- create per-word Motion components for normal Thoughts;
- move camera/pointer hot state into React;
- introduce layout thrashing.

The React Bits references are design/mechanics references.

They are NOT permission to copy their rendering strategy.

For scalable Field states, prefer cheap CSS properties and existing state
derivation.

==================================================
10. CODE STRUCTURE / EXTENSIBILITY
==================================================

This requirement is mandatory.

Do not achieve visual polish by growing giant files.

Preferred handwritten production module size:

100–300 LOC:
preferred for focused modules.

>300 LOC:
acceptable when responsibility remains clear.

>350 LOC:
explicitly review responsibilities.

>500 LOC:
normally split when independently understandable responsibilities exist.

>700 LOC:
prohibited unless a strong documented technical reason exists.

Do NOT split solely for LOC compliance.

Hot-path cohesion matters.

Specifically:

Field.tsx is already large and performance-sensitive.

Do not casually add:

- Ghost animation machinery;
- Focus presentation algorithms;
- Speak motion logic;
- Settings animation;
- shared motion constants;

directly into Field.tsx.

If new logic represents a distinct PRESENTATION responsibility,
prefer a focused existing module or a small cohesive helper.

However:

do not create abstraction layers with no present need.

No:

- AnimatedEverything;
- universal transition framework;
- plugin architecture;
- dozens of tiny wrapper components.

Prefer:

SMALL COHESIVE MODULES
+
CLEAR OWNERSHIP
+
OBVIOUS NEARBY EXTENSION POINTS.

Semantic state and presentation state remain separate.

Core must not depend on animation code.

Do not persist presentation-only state.

At delivery report:

- largest handwritten production files;
- LOC;
- every touched >350 LOC file;
- why it remains cohesive;
- newly created modules and their exact responsibilities.

==================================================
11. DEPENDENCIES
==================================================

Do not add React Bits.

Do not add a new animation library.

Do not add Family/60fps code.

Current Motion + Floating UI + CSS should be enough.

React Bits is reference source only.

Departure Mono source is reference source only.

Do not copy substantial external source without explicit license review.

==================================================
12. REDUCED MOTION
==================================================

Every refinement must support prefers-reduced-motion.

Reduced motion may collapse transitions into immediate:

- opacity;
- contrast;
- state changes.

No interaction may become harder to understand without motion.

==================================================
13. LIGHT / DARK / ZH / EN
==================================================

Verify all changed states in:

Graphite Night
Paper Day

Chinese
English

Editorial Serif
Quiet Sans

Do not solve a Dark-theme issue in a way that makes Paper Day generic.

Do not tune width only for English.

==================================================
14. IMPLEMENTATION ORDER
==================================================

Use this exact sequence:

A. run real current app
B. capture baseline Speak / Focus / More->Settings
C. inspect assigned references
D. fix Speak width + native chrome
E. refine Speak transition
F. inspect real result
G. refine Focus hierarchy
H. inspect real result
I. add only restrained Ghost/Recall emergence if useful
J. refine More->Settings continuity
K. micro-tune Settings only if still necessary
L. Light/Dark + zh/en review
M. regression verification

Do not make all changes before visually checking any of them.

==================================================
15. REJECTION RULE
==================================================

During this pass, actively reject experiments.

Remove an experiment if it becomes:

- more "animated" but not clearer;
- glow-like;
- too blurry;
- too mobile-app-like;
- too SaaS-like;
- too chat-like;
- too card-like;
- too decorative;
- too slow;
- too expensive at Field scale.

Record rejected attempts briefly in:

docs/V0_2_4_SIGNATURE_INTERACTION_AUDIT.md

This is useful evidence, not failure.

==================================================
16. REAL APP VERIFICATION
==================================================

Primitive fixtures are not enough for this pass.

If the real React application can run, visually verify it.

Required views:

- Field rest
- selected Thought
- Focus
- Speak idle
- Speak one-line composing
- Speak multiline composing
- Speak overflow state
- More
- More -> Settings
- Settings
- Ghost
- Recall
- Paper Day
- Graphite Night

For motion-critical states, inspect actual transitions rather than relying
only on screenshots.

If possible, capture a short real-app recording of:

Speak idle
-> compose
-> type multiline
-> close
-> More
-> Settings
-> close
-> select Thought
-> Focus

==================================================
17. TESTS
==================================================

Preserve all currently passing tests.

Run:

npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check:offline

Add only focused regression coverage where needed.

Useful invariants include:

- desktop Speak composing does not grow beyond the intentional maximum width;
- narrow viewport remains responsive;
- multiline Speak remains scrollable;
- native scrollbar chrome is not required for scrolling;
- opening Settings never leaves More simultaneously active;
- Escape remains immediate during transition;
- selection/Focus changes never alter Thought coordinates;
- no Claim semantics change;
- reduced motion works.

Do not weaken tests to accommodate motion.

==================================================
18. DELIVERY
==================================================

Update:

docs/REFERENCE_AUDIT.md
docs/V0_2_4_SIGNATURE_INTERACTION_AUDIT.md
STATUS.md

Final report must state:

IMPLEMENTED
VERIFIED
UNVERIFIED
REJECTED
DEFERRED

Report exact references actually inspected.

Report exact production files changed.

Report file sizes.

Report tests actually executed.

Distinguish:

REAL REACT APP VERIFICATION

from:

PRIMITIVE / CSS FIXTURE VERIFICATION.

Create the actual final source ZIP.

Verify ZIP CRC.

Fresh-extract it.

Verify required files.

Run available verification against the extracted artifact.

Produce SHA-256.

==================================================
SUCCESS CRITERIA
==================================================

The pass succeeds when:

Speak feels like a temporary writing place,
not a chat composer.

Focus creates a real attention field
without glow, blur walls, cards or movement.

Ghost and Recall become present quietly,
rather than appearing as UI components.

More -> Settings feels spatially related,
without sacrificing overlay correctness.

Settings remains quiet and secondary.

The Field remains text-first.

And the code becomes no harder to extend.

Do not make Diffusion louder.

Make its existing ideas more perceptible.