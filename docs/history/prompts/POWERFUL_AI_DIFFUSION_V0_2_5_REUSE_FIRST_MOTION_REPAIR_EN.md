IMPORTANT: THIS PASS CHANGES THE IMPLEMENTATION STRATEGY

Work in place on the existing Diffusion Explorer v0.2.4 source.

This is NOT another redesign.

The current static visual direction is broadly acceptable.

The problem to solve is:

THE REAL APPLICATION STILL FEELS TOO STATIC,
AND SEVERAL MOTION IMPLEMENTATIONS ARE SO SUBTLE
THAT THE USER CANNOT PERCEIVE THE STATE CONTINUITY.

This pass must prefer mature, proven primitives and reusable source
over hand-written one-off animation code.

Do not interpret "reuse" as "add lots of dependencies".

Use this priority:

1. existing mature dependency already in the repo;
2. directly reusable vetted source component;
3. small proven implementation technique;
4. custom implementation only when the first three do not fit.

==================================================
DIFFUSION EXPLORER v0.2.5
REUSE-FIRST MOTION REPAIR
==================================================

PRIMARY TARGETS:

1. determine why real runtime motion is barely perceptible;
2. rebuild Speak transition using mature Motion layout primitives;
3. rebuild More -> Settings continuity using mature shared-layout primitives;
4. use a vetted reusable implementation for Ghost / Recall emergence;
5. improve a few microinteractions with proven reusable techniques;
6. preserve the quiet Diffusion visual identity.

DO NOT:

- redesign the Field;
- redesign Settings layout again;
- redesign the More menu again;
- change backend;
- change Provider / Evidence / Dexie;
- change Ghost Claim semantics;
- change Recall semantics;
- change Thread / Deep Dive;
- change camera / pointer / lasso semantics.

==================================================
0. FIRST DIAGNOSE WHY MOTION IS HARD TO SEE
==================================================

Before changing animation code, run the REAL React application.

Do not use CSS fixtures for this diagnosis.

Inspect:

window.matchMedia('(prefers-reduced-motion: reduce)').matches

Also inspect the application's MotionConfig and any local reduced-motion
preference.

Determine whether:

A. OS/browser prefers-reduced-motion is active;
B. the app explicitly forces reduced motion;
C. the motion exists but is visually too subtle;
D. the intended Motion animation is not actually mounted/firing;
E. transition lifecycle is interrupted by immediate unmount;
F. the implementation is only CSS fixture logic and is not wired to real UI.

Record the answer in:

docs/V0_2_5_MOTION_REUSE_AUDIT.md

Do NOT solve a local Reduce Motion setting by shipping:

reducedMotion="never"

The product must continue respecting accessibility preferences.

For development verification only, compare normal-motion and reduced-motion
modes deliberately.

==================================================
1. REUSE POLICY
==================================================

This pass explicitly permits mature code reuse.

But every reused implementation must be documented:

SOURCE
LICENSE
EXACT FILE / COMPONENT
LOCAL MODIFICATIONS
WHY IT FITS
WHY IT IS SAFE FOR DIFFUSION

Do not merely say "inspired by".

Classify each reference as:

DIRECTLY REUSED
ADAPTED
REFERENCE ONLY
REJECTED

==================================================
2. MOTION — USE THE LIBRARY WE ALREADY HAVE
==================================================

Diffusion already depends on Motion.

Stop manually approximating features Motion already provides.

Mandatory study/use where appropriate:

motion/react:

- motion
- AnimatePresence
- LayoutGroup
- layout
- layoutId
- useReducedMotion

Use Motion's native shared-layout implementation for relationships such as:

compact Speak
<-> composing Speak

and potentially:

More surface
<-> Settings surface

when semantically and technically safe.

Do NOT implement shared-element geometry manually if Motion can own it
cleanly.

Do NOT add GSAP simply to replace Motion.

==================================================
3. SPEAK — REBUILD WITH REAL LAYOUT ANIMATION
==================================================

Current problem:

the static shape is improved,
but compact -> composing does not feel like a meaningful transition.

The user can barely perceive an animation.

Rebuild the transition around Motion layout primitives.

Desired implementation direction:

one Speak shell
with one persistent identity.

Idle and composing must not behave like:

component A disappears
component B appears.

Prefer something equivalent to:

<motion.div layout ...>

or a shared layoutId where the component structure requires it.

Animate:

- width;
- height;
- very small vertical settling;
- opacity of secondary composing affordances.

Do NOT animate the text by stretching/scaling it.

The textarea must become focusable immediately.

Animation must not block focus.

Target normal desktop states:

idle:
approximately 230–280px visual width

composing:
approximately 480–560px visual width

multiline:
height grows naturally to approximately 3–4 lines

overflow:
internal scrolling continues

The change should be clearly visible,
but not theatrical.

A user should be able to notice:

"this writing place opened"

without thinking:

"an animation played".

Use:

useReducedMotion()

to collapse spatial motion appropriately.

==================================================
4. MORE -> SETTINGS — REAL SHARED SURFACE CONTINUITY
==================================================

The previous implementation improved the origin,
but simply passing a Point is not sufficient if the resulting visual
transition is still imperceptible.

Do not redesign the menu.

Instead inspect whether More and Settings can share a real visual shell.

Preferred mature mechanism:

Motion LayoutGroup
+
layoutId
+
AnimatePresence

Conceptually:

More surface
   ↓
same transient surface identity
   ↓
Settings surface

Do NOT morph individual menu labels into Settings labels.

Only the SHELL may maintain shared geometry.

Content should:

fade / settle / swap

rather than stretch.

Preserve the existing exclusive transient ownership semantics.

The logical ownership may switch immediately even while the outgoing visual
representation completes its exit.

No stale interactive menu may remain behind Settings.

The exiting surface must become non-interactive immediately.

Focus ownership and Escape behavior are more important than the animation.

If a true shared-layout shell conflicts with Floating UI positioning or focus
ownership:

do NOT force it.

Instead use the nearest robust Motion primitive that keeps spatial origin
obvious.

Document the decision.

==================================================
5. REACT BITS — DIRECT SOURCE REUSE IS NOW ALLOWED
==================================================

Repository:

DavidHDev/react-bits

License currently used by the project:

MIT + Commons Clause.

The source may be used/modified as part of an application/product,
but must not be repackaged or redistributed as a standalone component
collection.

Preserve required attribution/license notice for substantial reused source.

DO NOT add the full React Bits library.

Vendor only the exact code we actually need.

--------------------------------
ALLOWED CANDIDATE: BlurText
--------------------------------

Inspect:

src/ts-default/TextAnimations/BlurText/BlurText.tsx

This is a real reusable candidate for:

Ghost emergence
Recall wake

Do not rewrite its animation engine from scratch if the component can be
safely adapted.

If vendored, place it in a clearly owned small module such as:

src/ui/vendor/react-bits/BlurText.tsx

or an equally explicit location.

Do NOT use the reference defaults.

The original defaults are far too dramatic for Diffusion.

Adapt configuration toward roughly:

very small blur or preferably almost none;
~0–2px movement;
short duration;
minimal/no stagger;
quiet opacity progression.

Use it ONLY for a small number of transient Ghost / Recall entities.

Do NOT wrap every ordinary Thought with BlurText.

Do NOT apply it to thousands of Field items.

If its word-splitting / IntersectionObserver model proves inappropriate,
reject it explicitly instead of forcing reuse.

--------------------------------
DO NOT DIRECTLY REUSE: TrueFocus
--------------------------------

Inspect:

src/ts-default/TextAnimations/TrueFocus/TrueFocus.tsx

Do NOT copy this component into the Field.

Reasons to verify:

- strong blur;
- glow;
- animated frame;
- per-word state;
- DOM geometry measurement;
- wrong product semantics.

It remains REFERENCE ONLY.

==================================================
6. DO NOT USE REACT BITS AnimatedContent / FadeContent
   FOR APP SURFACES
==================================================

Inspect if needed:

Animations/AnimatedContent
Animations/FadeContent

These implementations use GSAP + ScrollTrigger and are intended for
scroll-triggered content reveal.

They are not the right lifecycle primitive for:

- More;
- Settings;
- Speak;
- Focus.

Do not add GSAP just to reuse them.

Mark:

REJECTED FOR THIS USE CASE

This pass is reuse-first,
not reuse-at-any-cost.

==================================================
7. DETAIL.DESIGN — APPLY PROVEN MICROINTERACTION TECHNIQUES
==================================================

Inspect these exact Detail entries:

- Morphing Button to Input
- Interruptible Animation
- Cursor Style While Morphing
- Prevent Layout Shift from Font Weight Change
- Animated State-Based Icons

Apply the useful mechanics rather than recreating them abstractly.

--------------------------------
INTERRUPTION
--------------------------------

Every opening animation must be immediately reversible/closable.

The user must never wait for animation completion before:

- Escape;
- close;
- selecting another surface;
- activating another command.

--------------------------------
FONT-WEIGHT LAYOUT SHIFT
--------------------------------

If More menu / Settings / contextual controls use font-weight changes for
hover/focus/current state:

reuse the proven pseudo-element width-reservation technique from Detail:

visible text
+
invisible same-text pseudo element at the heavier weight

so visual emphasis does not change layout width.

Do not apply this where weight does not change.

--------------------------------
CURSOR DURING MORPH
--------------------------------

Do not allow changing internal form elements to create strange cursor changes
during a shell morph.

Interactive descendants should become interactive at the correct logical
moment.

Do not create a period where the surface looks like Settings but focus/cursor
still belongs to More.

==================================================
8. ANIMATED ICON REUSE — OPTIONAL AND VERY LIMITED
==================================================

Detail recommends Lucide Animated for state-based icons.

It is MIT and Motion-based.

If the current real UI benefits from it,
you MAY directly reuse/copy-paste only specific icons such as:

- close;
- chevron/down;
- possibly more.

Do NOT add icons to every menu row.

Diffusion remains text-first.

Do not introduce a second visual icon language if the existing project already
has a coherent icon implementation.

If used:

reuse only specific icon source/components;
document provenance;
keep them small;
trigger animation only when it mirrors actual UI state.

Example:

chevron rotates/settles when a select opens.

Do NOT animate icons just because hover occurred.

If animated icons add visual noise:

REJECT them.

==================================================
9. 60FPS — USE AS VISUAL ACCEPTANCE TARGET, NOT WEB CODE SOURCE
==================================================

Inspect these interactions:

- Monogram Keyboard Icon Morph to Chat Input
- Family Dynamic Sheet Expand / Contract
- Family Wallet Card Morph to Screen
- Family Sheet-to-Sheet transition

60fps currently exposes many snippets,
but the directly surfaced implementations are primarily SwiftUI and are not
appropriate React code for this project.

Therefore:

REFERENCE ONLY for this web application.

Use them to judge:

- continuity;
- timing;
- perceived object identity;
- event ordering.

Do not port SwiftUI source line-by-line into React.

==================================================
10. REMOVE HOME-GROWN MOTION THAT BECOMES REDUNDANT
==================================================

After adopting mature primitives:

remove obsolete one-off animation code where safe.

Examples:

- manual origin interpolation replaced by layoutId;
- duplicated enter/exit CSS replaced by one shared Motion primitive;
- redundant duration/easing constants;
- ad-hoc timers used only to fake transitions.

Do NOT perform unrelated cleanup.

The goal is:

LESS CUSTOM MOTION CODE
+
BETTER MOTION.

==================================================
11. MOTION MUST NOW BE PERCEPTIBLE
==================================================

Previous passes over-corrected toward subtlety.

This pass should remain quiet,
but meaningful state changes must be perceivable.

Do not use 2px + tiny opacity for every event.

For major surface transformations such as:

Speak compact -> composing
More -> Settings

the spatial change itself may be clearly animated.

For micro states such as:

Ghost emergence
Recall wake

motion should remain much smaller.

Use different amplitude for different semantic importance.

Do not use one universal animation recipe.

==================================================
12. SETTINGS
==================================================

Do not redesign Settings.

The current layout is acceptable.

Only ensure:

- its entrance feels connected to the source action;
- its shell is not overly heavy;
- controls have polished state feedback;
- no native-browser-looking interaction suddenly breaks the visual language.

Do not make Settings the showcase.

==================================================
13. FIELD / FOCUS
==================================================

Do not introduce React Bits TrueFocus.

Do not add blur walls.

Do not add glow.

Do not animate Thought positions.

Keep the existing semantic clarity hierarchy.

Only repair transition timing if the change between states currently feels
instant/harsh.

Opacity/contrast interpolation is sufficient here.

==================================================
14. CODE SIZE AND EXTENSIBILITY
==================================================

Maintain the existing hard structural requirements.

Handwritten production code:

100–300 LOC:
preferred.

>300:
acceptable when cohesive.

>350:
review responsibilities.

>500:
normally split if separable.

>700:
prohibited without strong documented reason.

Do not split Field.tsx only to satisfy LOC.

Do NOT put the new reusable animation implementation into Field.tsx.

Prefer focused ownership:

src/ui/motion/
src/ui/primitives/
src/ui/vendor/

only when those responsibilities actually exist.

Vendored external source must remain visibly identifiable.

Do not mix copied third-party source into a giant local component where its
provenance becomes impossible to track.

No:

AnimatedEverything.tsx

No universal framework.

No plugin system.

==================================================
15. DEPENDENCY POLICY
==================================================

Before adding any dependency:

verify:

- exact need;
- current license;
- bundle impact;
- whether existing Motion solves it already.

Motion is already present and should solve the main shell transitions.

Do not add:

GSAP

for this pass.

React Bits source should be vendored narrowly rather than pulling the entire
library.

Animated icon code should preferably be copied per-icon if chosen,
rather than importing an unnecessary icon suite.

==================================================
16. REAL APP CHECKPOINTS
==================================================

This pass cannot be accepted from CSS fixtures alone.

Run the REAL React app.

Record short visual evidence for:

A. Speak

idle
-> compose
-> 3 lines
-> overflow
-> collapse

B. More -> Settings

More
-> select Settings
-> Settings settles
-> close
-> immediately reopen More

C. Ghost / Recall

emerge / wake

D. Focus

selected
-> Focus
-> release

Normal motion and reduced motion must both be checked.

==================================================
17. TESTS
==================================================

Preserve all current tests.

Run:

npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check:offline

Add targeted regression tests for:

- Speak retains focus through layout animation;
- Escape works while Speak is expanding;
- More -> Settings never leaves two interactive overlays;
- Settings is immediately focusable even while shell motion continues;
- reduced motion disables unnecessary spatial transitions;
- Ghost Claim semantics unchanged;
- Recall semantics unchanged;
- Thought geometry unchanged by Focus.

Do not test arbitrary pixel-perfect animation frames.

Test lifecycle and semantic invariants.

==================================================
18. FINAL REPORT
==================================================

Report a reuse table:

SOURCE
COMPONENT / TECHNIQUE
CLASSIFICATION
LOCAL FILE
MODIFICATION
LICENSE

Classifications:

DIRECTLY REUSED
ADAPTED
REFERENCE ONLY
REJECTED

Also report:

- why animation was previously barely visible;
- whether reduced motion contributed;
- custom animation code removed;
- dependencies added;
- largest production files;
- all touched >350 LOC files;
- real React verification performed;
- tests actually run;
- unverified items.

Update:

docs/REFERENCE_AUDIT.md
docs/V0_2_5_MOTION_REUSE_AUDIT.md
STATUS.md

Create final source ZIP.

CRC check.
Fresh extract.
Verify files.
Run strongest available checks on extracted archive.
Generate SHA-256.

==================================================
SUCCESS CRITERIA
==================================================

The improvement must be visible in the REAL application.

Speak should obviously but quietly transform from:

a small invitation

into:

a temporary writing place.

More -> Settings should feel like:

one interaction continuing

rather than:

menu disappears, modal appears.

Ghost / Recall should gain a polished entrance by reusing proven animation
code where appropriate.

Focus should remain quiet.

The implementation should contain LESS hand-written animation machinery,
not more.

Reuse mature mechanics.
Keep Diffusion's own semantics.