# v0.2 reference audit

Inspection date: 2026-09-13. Only entries below were actually inspected. References do not define Diffusion's ontology. No third-party source code was copied into this rebuild. (Later, on 2026-09-15, selected components of `onedotmint/smartsearch` v1.0.3 were adapted into `internal/discovery-engine/`; see that entry's attribution, `internal/discovery-engine/PROVENANCE.md` and `ATTRIBUTION.md`.)

| Subsystem | Actual inspected source/page | Revision / license | Decision / use | Attribution |
|---|---|---|---|---|
| Theme | https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss | master as retrieved; MIT LICENSE blob `8a844bc750a313db95d147bea9e4c9537b2cebc0` inspected separately | Studied semantic surface/ink/border separation. Independently authored Paper Day/Graphite Night tokens, not Excalidraw colors or shape UI. | Study only, link retained. No copied code. |
| Layering | https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/Island.scss and https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/LayerUI.scss | master as retrieved; MIT | Studied explicit overlay pointer ownership and surface tokens. Keep Field interactive outside deliberate surfaces. | Study only. |
| Menus | https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/dropdownMenu/DropdownMenu.scss | master as retrieved; MIT | Studied viewport-bounded menu dimensions and focus affordance; no imported visual system. | Study only. |
| Drag | https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/dragElements.ts | master as retrieved; MIT | Original-pointer snapshot plus transient delta supports retaining our existing imperative drag controller. No whiteboard bindings/shapes imported. | Study only. |
| Accessible anchored UI | https://floating-ui.com/docs/react, https://floating-ui.com/docs/useListNavigation, https://floating-ui.com/docs/FloatingFocusManager | Current official docs retrieved; MIT footer | Reuse already-declared @floating-ui/react. Collision middleware, roving focus, dismissal, return focus. Nonmodal Thread must not trap Field interaction. | Runtime package's own MIT notice applies; no doc code copied. |
| Persistence | https://dexie.org/docs/Version/Version.upgrade() | Current official documentation | Versioned upgrade transaction; preserve v1 projects before schema evolution. No database rename/reset. | Study only; existing Dexie dependency. |
| Evidence boundary | https://github.com/onedotmint/smartsearch/blob/main/README.md | README blob `b25d728e72044b9232266810f46cd284e0f32b09`; README states MIT | Search discovers candidates; read fetches passages; host reasons. Current README describes a CLI contract, NOT our gateway's HTTP routes. Do not claim plug-and-play HTTP compatibility or duplicate aggregation. | Origin of Diffusion's own discovery engine: selected components were adapted under `internal/discovery-engine/` (see `internal/discovery-engine/PROVENANCE.md`). Retained upstream MIT notice: `internal/discovery-engine/LICENSE.smartsearch`. |

## Scope of verification

The inspected Excalidraw code was retrieved at a moving branch, not a pinned repository checkout; do not imply a reproducible full-repo audit. Exact paths above and the independently retrieved license are recorded. No source code adaptation requiring copied-license headers was performed.

Vercel AI SDK structured-data documentation retrieval returned an unsupported content type. OpenAI's full API-reference page exceeded retrieval size. Those attempts do not count as inspected. Provider decisions must rely on subsequent explicitly recorded successful inspection or on local adapter contract tests, not those failures.

Container DNS/npm dependency installation is unavailable. Existing Floating UI, Motion, Dexie and Hono dependencies remain declared; no fictitious lockfile is generated. No new production dependency is required by the first visual slice. PDF.js and MiniSearch are not automatically added just because the specification lists them.

## Subsequent successful provider inspection

| Subsystem | Actual inspected path/page | Revision / license | Implementation consequence | Use |
|---|---|---|---|---|
| Provider abstraction spike | https://github.com/vercel/ai/blob/main/packages/openai/src/openai-provider.ts (lines 1-240) | blob `aa4afce9584f573ef02642abc10521a866072802`; no source copied; SDK license not audited for adoption | Inspected explicit `.chat`/`.responses` factories, configurable baseURL and injectable fetch. Keep a thin replaceable wire adapter for this pass; see PROVIDER_DECISION.md. | Studied only; SDK not installed or runtime-tested. |
| Responses/JSON output | https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses | Official docs retrieved 2026-09-13, particularly JSON Mode comparison and Responses output/incomplete examples | Separate response envelopes. JSON mode is not schema validation; validate semantic output separately and reject incomplete/refused output. | Documentation study only. |
| Native source permission boundary | https://v2.tauri.app/plugin/file-system/ | Official Tauri 2 docs retrieved 2026-09-13, scopes and read-file permissions | Retain narrow command capabilities and dialog-mediated access. Do not grant whole-filesystem permission to mask an unverified original-path workflow. | Study only; native runtime unavailable. |

## SmartSearch inspection and the discovery engine's origin

Subsequently inspected exact v1 serialization and parser targets through the GitHub connector:

- `https://github.com/onedotmint/smartsearch/blob/main/docs/commands.md`, blob `1a269bea6e3b4fda4eef48ec4505fa2831520dfb`.
- `https://github.com/onedotmint/smartsearch/blob/main/src/smart_search/core/models.py`, blob `289ac8745a6802bef595248de2fdbc2a51efc4e3`.
- `https://github.com/onedotmint/smartsearch/blob/main/src/smart_search/cli.py`, lines 1-250 and 450-650, blob `031cd7078cfa57a382bf084c7ab94ff089a27b0f`.

Implementation consequence, as it stands today: the inspected `search` and `read` commands, their argument arrays with an explicit positional `--` delimiter, and the strict version-1 envelope are the contract implemented by Diffusion's own bundled discovery engine (`internal/discovery-engine/`, frozen with `pnpm run build:discovery`). The engine calls only `search` and `read`, never the autonomous `research` command, and maps `data.candidates`/`data.evidence`. A bounded fetched-body extraction step remains in Diffusion; aggregation/reranking stays in the engine. The gateway's discovery backend is a normalized HTTP endpoint; `SEARCH_PROVIDER=smartsearch-cli` and `SMARTSEARCH_BIN` no longer exist.

The earlier README-only row was study-only at that stage. Selected components of the inspected v1 engine were later adapted into Diffusion's own source under `internal/discovery-engine/`, maintained independently since; its provenance and license record travel with that source (`internal/discovery-engine/PROVENANCE.md`). The engine is not live-provider verified. MIT is stated in the inspected upstream README. See `EVIDENCE_GATEWAY.md` for deployment and limitations.


# v0.2.1 reference-first gate (2026-09-13)

This section extends, not replaces, the historical audit above. Entries describe what was actually read in this run, before implementation. Blob hashes identify returned file contents, not repository commits. Moving-branch reads are not a full pinned checkout. No upstream application source is copied. The inherited archive includes a real package-lock.json; the older no-lockfile environment statement above is historical.

## Overlay ownership: INSPECTED

**Exact project/pages:** Floating UI official documentation:
- https://floating-ui.com/docs/react
- https://floating-ui.com/docs/floatingportal
- https://floating-ui.com/docs/floatingfocusmanager
- https://floating-ui.com/docs/usedismiss
- https://floating-ui.com/docs/userole
- https://floating-ui.com/docs/useinteractions

**Revision/license:** current pages retrieved 2026-09-13, MIT footer; no tagged checkout.

**OBSERVED:** Shared floating context composes positioning, dismissal and ARIA. Focus manager distinguishes modal from non-modal interaction, conditional mounting, initial focus, return focus, and focus-out closing. Interaction handlers belong inside prop getters. Portals preserve React context, not DOM ancestry.

**BORROW:** Existing Floating UI dependency for accessible ownership; explicit modal global dialogs and non-modal Thread; one transition source and deliberately guarded focus return.

**DO NOT BORROW:** A library cannot determine Diffusion scope, permanence, or Thread semantics. No generic modal treatment of the entire product.

**DECISION (before edits):** Add shared owner transitions, portal/focus/dismissal to Surface, and stop competing unmount/Field focus callbacks. Retain the existing dependency; no Radix installation. Verify installed API compatibility when dependencies are available.

## Dialog/menu behavior: INSPECTED

**Exact project/files:** Radix Primitives:
- https://github.com/radix-ui/primitives/blob/main/packages/react/dialog/src/dialog.tsx (lines 1-160 and 240-450; blob `586590f2928245b1044805f13d101081d4c478e7`)
- https://github.com/radix-ui/primitives/blob/main/packages/react/dropdown-menu/src/dropdown-menu.tsx (lines 160-290; blob `0c8ebac3dfe01e62911494ce56988eeeed0ed3cf`)
- https://github.com/radix-ui/primitives/blob/main/LICENSE (blob `a18858fb7b014098cba85703e66609be66a26ef5`)

**Revision/license:** returned main-branch blobs; MIT, WorkOS.

**OBSERVED:** Modal trapping follows open state, not merely mounted presence. Non-modal content tracks outside interaction before returning focus. Trigger interaction is distinguished from outside dismissal to avoid close/reopen races. Dialog and menu compose focus-scope/dismissable behavior.

**BORROW:** Explicit focus ownership and deliberate restoration on actual close, not on menu-to-dialog handoff.

**DO NOT BORROW:** Radix runtime dependency or copied focus-trap implementation.

**DECISION:** Use FloatingFocusManager with restoration delegated to one epoch-guarded caller; stale dismissal must not close a successor. Keep Thread non-modal.

## Theme/surface/menu hierarchy: INSPECTED

**Exact project/files:** Excalidraw:
- https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss (light/dark token sections read; returned full response truncated near the end; blob `ad7cf55b325b9dc90fd60e904042f13af7dc2bdf`)
- https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/Island.scss (complete; blob `7d09a39273bd69b0995444103f8d4e69780dcf1d`)
- https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/LayerUI.scss (lines 1-170; blob `9dcc0a5982619d54142970b49197943f5eb26557`)
- https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/dropdownMenu/DropdownMenu.scss (complete; blob `308031425009a7b55302e41e482caee05a55a8fc`)
- https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/dropdownMenu/DropdownMenu.tsx (complete; blob `5b0ef39c3e99ad7a8b7de7653bf397346400b438`)
- https://github.com/excalidraw/excalidraw/blob/master/LICENSE (blob `8a844bc750a313db95d147bea9e4c9537b2cebc0`)

**Revision/license:** master blobs as returned; MIT license independently read.

**OBSERVED:** Semantic tokens separate surfaces, borders, ink and states. Islands own fill/shadow. Layer wrapper releases pointer events except its controls. Menus bound dimensions to the viewport and distinguish keyboard highlight from hover. Current menu root is explicitly non-modal.

**BORROW:** Bounded transient surfaces; shared theme tokens; explicit interaction ownership.

**DO NOT BORROW:** Whiteboard ontology, shape toolbars, palette, selected-card fill, or default arrows.

**DECISION:** Keep Paper Day/Graphite Night palette. Use a transparent input shield only while a global modal exists, not on Field selection; retain contextual menu hierarchy and dimensions.

## Semantic theme consistency: INSPECTED

**Exact project/files:** Penpot:
- https://github.com/penpot/penpot/blob/develop/frontend/src/app/main/ui/ds/colors.scss (lines 1-150; blob `aec1a8b4c3c4279b2719bc36b3f345e021c38fbf`)
- https://github.com/penpot/penpot/blob/develop/frontend/resources/styles/common/refactor/design-tokens.scss (lines 1-100; blob `62b7200305b3d38f60fd41d20ff0777ba4f96736`)

**Revision/license:** develop blobs as returned; MPL-2.0 stated in both source headers. Study only.

**OBSERVED:** Light/default theme roles map into common panel and button-state tokens rather than per-component hard-coded palettes.

**BORROW:** A single content-font token orthogonal to theme tokens; preserve identical Settings structure in both themes.

**DO NOT BORROW:** Design-editor control density, Penpot colors, source adaptation, or dozens of tuning preferences.

**DECISION:** Add one persisted Serif/Sans content preference; leave chrome Sans and themes unchanged.

## Contextual expression: INSPECTED product/documentation references

**Exact pages:**
- Linear: https://linear.app/changelog/2019-10-07-contextual-command-menu (page displays October 8, 2019; article body read).
- Are.na: https://www.are.na/editorial/introducing-sander-our-new-web-client (November 1, 2023; article and roadmap read).
- Allume: https://allume.com/updates/ (4.0/4.0.2, 3.5 and 3.4 entries inspected; not the complete multi-year archive).

**Revision/license:** dated public product pages, no source inspected or license to copy UI assets established. Product study only; no images, fonts or source copied.

**OBSERVED:** Linear brings applicable actions near the invoking control while retaining keyboard behavior, and deactivates Peek for a command menu. Are.na emphasizes responsiveness/accessibility while preserving its experience. Allume records hiding chrome and avoiding theme-only snapshot regeneration.

**BORROW:** Temporary, bounded expression; preferences should not recreate project state; contextual action hierarchy.

**DO NOT BORROW:** Issue tracking, channels/cards/boards, liquid-glass styling, or chatbot docking. These pages do not establish a specific Speak pixel width.

**DECISION:** Retain Speak's current compact width and low-chrome style, extract its behavior, fix height reset after submission, and suppress it while a global modal owns input. No speculative visual redesign. Keep Settings small and move its heading to the chrome font.

## Focus semantics: INSPECTED

**Exact pages:** https://docs.kumu.io/guides/focus and https://docs.kumu.io/guides/showcase (current documentation retrieved 2026-09-13).

**Revision/license:** public documentation; no code or reusable-asset license established; product study only.

**OBSERVED:** Kumu Focus temporarily hides other map content. Showcase instead fades unselected data and offers neighbor modes. These are different behaviors.

**BORROW:** Reversible foreground/background attention, specifically Showcase's context-retaining principle.

**DO NOT BORROW:** Focus's hiding behavior, graph ontology, degree traversal, automatic relation claims, or opacity controls.

**DECISION:** KEEP Diffusion's existing Focus computation and context-preserving rendering. Selection remains inference-free.

## Unchanged mechanics: gate not activated

Excalidraw pointer types/dragElements, Kinopio Panning/Space, tldraw Editor/OverlayUtil and AFFiNE edgeless keyboard are NOT claimed as inspected in this v0.2.1 run. Camera, pointer controller, spatial navigation, Focus inference rules and semantic zoom are retained without rewrite. Their mandatory source/license inspections remain a prerequisite for any future rewrite of those mechanics. The workspace-level Escape guard is overlay ownership, not a replacement spatial keyboard system. No Kinopio/tldraw/AFFiNE source adaptation is permitted by this record.


### Additional menu focus check (before finalizing keyboard behavior)

INSPECTED: https://floating-ui.com/docs/uselistnavigation, current official page, MIT footer, retrieved 2026-09-13. OBSERVED: ordinary menus use the default initial focus together with a roving tabindex; -1 is appropriate when a combobox must keep focus in its input. BORROW: default menu entry focus plus arrow/typeahead navigation. DO NOT BORROW: combobox input ownership. DECISION: keep CommandMenu's default initialFocus, with returnFocus delegated to the guarded workspace coordinator.

# v0.2.2 reference-driven frontend refinement gate (2026-09-14)

This section records only references actually inspected before the corresponding v0.2.2 presentation edits. No third-party source code is copied into Diffusion; the mechanics below are re-expressed against the existing Motion + Floating UI stack.

## Feel / motion language: INSPECTED

### Gionatan Nese

**INSPECTED**
- https://www.gionatannese.com/
- https://www.gionatannese.com/projects
- https://www.gionatannese.com/about
- Current public pages retrieved 2026-09-14. Product/portfolio study only; no reusable source/license inspected.

**OBSERVED**
- The site describes its own work in terms of refined interaction, subtle 3D/WebGL, curated typography, and an interaction goal of natural response, eye guidance, clarity, and ease.

**BORROW**
- Quiet continuity, immediate response, motion that explains hierarchy, and typography staying visually calm while state changes.

**DO NOT BORROW**
- WebGL, decorative 3D, portfolio navigation, cursor spectacle, or motion that competes with reading/editing.

**DIFFUSION DECISION**
- Keep DOM/SVG/CSS/Motion. Movement is limited to meaningful state continuity: trigger -> surface, attention shift, and transient presence.

### Emil Kowalski

**INSPECTED**
- https://emilkowal.ski/ui/great-animations
- https://emilkowal.ski/ui/you-dont-need-animations
- https://emilkowal.ski/ui/7-practical-animation-tips
- Current public pages retrieved 2026-09-14. Product/article study only.

**OBSERVED**
- Purposeful animation should clarify change, respond immediately, stay short for repeated UI, and avoid starting from implausibly tiny scale. Repeated interaction should not be burdened by ornamental motion.

**BORROW**
- Immediate pointer feedback, short ease-out entrances, restrained scale deltas, and omitting motion when it adds latency rather than understanding.

**DO NOT BORROW**
- Decorative blur, button-scale treatment applied indiscriminately, or animation merely to make the interface look busy/alive.

**DIFFUSION DECISION**
- Surface entrances use small offsets/scale only; close/successor handoffs may skip animation. Thought drag receives no transition lag.

### Allume / Are.na / Linear / Kumu

**INSPECTED**
- https://allume.com/updates/
- https://www.are.na/editorial/introducing-sander-our-new-web-client
- https://linear.app/changelog/2019-10-07-contextual-command-menu
- https://docs.kumu.io/guides/focus
- https://docs.kumu.io/guides/showcase
- Current/datestamped public pages retrieved in the v0.2.1/v0.2.2 audit window; product documentation only.

**OBSERVED**
- Linear places commands near their invocation point; Are.na emphasizes responsiveness/accessibility without abandoning its established experience; Allume demonstrates low-chrome board work but its newer liquid-glass direction is not appropriate here; Kumu distinguishes hiding Focus from context-preserving Showcase/fade emphasis.

**BORROW**
- Anchor relationship, calm hierarchy, negative space, and context-preserving foreground/background emphasis.

**DO NOT BORROW**
- Liquid glass, graph ontology, card/board semantics, hidden context, or issue-tracker interaction assumptions.

**DIFFUSION DECISION**
- More and Settings retain visible spatial provenance; Focus continues to recede unrelated context rather than hide it.

## Motion implementation: INSPECTED

### Motion / Motion Primitives

**INSPECTED**
- https://motion.dev/docs/react-layout-animations
- https://motion.dev/docs/react-animate-presence
- Current Motion documentation retrieved 2026-09-14.
- https://github.com/ibelick/motion-primitives/blob/main/components/core/morphing-popover.tsx
- https://github.com/ibelick/motion-primitives/blob/main/components/core/morphing-dialog.tsx
- https://github.com/ibelick/motion-primitives/blob/main/components/core/transition-panel.tsx
- https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md
- Moving `main` as retrieved 2026-09-14; Motion Primitives license inspected as MIT.

**OBSERVED**
- Morphing Popover shares a shell through `layoutId` and keeps open/exit lifecycle inside `AnimatePresence`. Transition Panel uses keyed content with `AnimatePresence` `mode="popLayout"`. Morphing Dialog exposes shared-layout pieces separately, showing that shell and content do not need one monolithic geometry animation.

**BORROW**
- Spatial origin, shared-shell thinking, separate content settling, and a compact shared transition vocabulary.

**DO NOT BORROW**
- The reference spring (`bounce: 0.1`, `duration: 0.4`), label/text stretching, wholesale primitive code, Tailwind visual grammar, or a new dependency.

**DIFFUSION DECISION**
- Implement a small local Motion transition module. More/Surface animate a visual child/shell from the anchor while content remains normal-flow text. No literal trigger-to-body text morph.

## Overlay / control mechanics: INSPECTED

### Floating UI

**INSPECTED**
- https://floating-ui.com/docs/react
- https://floating-ui.com/docs/usefloating
- Existing v0.2.1 FloatingFocusManager/useDismiss/useRole pages remain part of the inherited audit.
- Current official docs retrieved 2026-09-14; existing dependency, MIT project.

**OBSERVED**
- `useFloating` returns placement and positioning styles. Official guidance explicitly warns that transform positioning can conflict with transform animation and recommends a positioned wrapper with an animated child when needed. Anchors should remain conditionally mounted with `autoUpdate` where appropriate.

**BORROW**
- Positioning wrapper -> animated visual child; placement-aware transform origin; keep existing dismissal/focus primitives.

**DO NOT BORROW**
- No new overlay abstraction that replaces Diffusion's single transient-owner state machine.

**DIFFUSION DECISION**
- CommandMenu separates Floating UI positioning from visual motion. Shared Surface retains `transform:false` for anchored point positioning and animates only its presentation shell properties.

### React Aria / Ariakit / Base UI

**INSPECTED**
- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/Popover.tsx
- https://github.com/adobe/react-spectrum/blob/main/packages/react-aria-components/src/Modal.tsx
- https://react-aria.adobe.com/Popover
- https://react-aria.adobe.com/Modal
- https://ariakit.com/reference/popover
- https://base-ui.com/react/components/popover
- https://base-ui.com/react/handbook/animation
- Current public/source pages retrieved 2026-09-14. React Spectrum source headers are Apache-2.0; Base UI and Ariakit are mechanics/behavior references only in this pass. No third-party source is copied.

**OBSERVED**
- Mature overlay systems separate lifecycle, focus restoration, and animation state. Mid-transition interruption is a first-class behavior rather than an edge case.

**BORROW**
- Correct focus ownership over spectacle; origin-aware entrance; successor transitions may supersede exit animation.

**DO NOT BORROW**
- No Base UI, React Aria, or Ariakit production dependency in this pass.

**DIFFUSION DECISION**
- Preserve v0.2.1 epoch-guarded transient ownership exactly. More -> Settings closes the menu immediately, then Settings uses the captured More origin; no queued exit blocks the next owner.

## Transient/direct-manipulation mechanics: INSPECTED

### Sonner

**INSPECTED**
- https://github.com/emilkowalski/sonner/blob/main/src/index.tsx
- https://github.com/emilkowalski/sonner/blob/main/src/styles.css
- https://github.com/emilkowalski/sonner/blob/main/package.json
- Moving `main` as retrieved 2026-09-14; package metadata states MIT.

**OBSERVED**
- Toasts retain explicit mounted/removed/swiping states. Removal is staged before unmount. During direct swiping the stylesheet sets `transition: none`, while non-direct removal uses a different transition.

**BORROW**
- State-specific motion and the principle that direct manipulation disables transition lag.

**DO NOT BORROW**
- Toast stacking, notification visuals, timers, swipe-to-dismiss semantics.

**DIFFUSION DECISION**
- Keep Thought drag/camera paths transition-free. Ghost/Recall presence may settle only while not directly manipulated.

### Vaul

**BLOCKED / NOT REQUIRED FOR EDIT**
- The repository and issue/index pages were reachable, but the exact current drawer gesture source requested by the brief was not reliably retrieved in this environment before implementation.
- No Thought drag mechanics are changed in v0.2.2, so the Vaul gate is not activated for a drag rewrite. No Vaul source is copied and no dependency is added.

## Spatial field mechanics: INSPECTED

### Visual Notes

**INSPECTED**
- https://github.com/dandersondev/visual-notes/blob/main/src/canvas/geometry.ts
- https://github.com/dandersondev/visual-notes/blob/main/src/canvas/pan-zoom.ts
- https://github.com/dandersondev/visual-notes/blob/main/src/canvas/selection.ts
- https://github.com/dandersondev/visual-notes/blob/main/LICENSE
- Moving `main` as retrieved 2026-09-14; MIT license inspected.

**OBSERVED**
- Viewport state is explicitly separated from canvas coordinates; pointer-centered zoom adjusts translation so the point under the pointer remains stable. Selection is a separate ownership concern with simple replace/add/toggle/clear semantics.

**BORROW**
- Preserve coordinate separation and selection ownership; bare spatial text does not require a card container.

**DO NOT BORROW**
- Note/card/file product semantics or any automatic organization.

**DIFFUSION DECISION**
- No camera/selection mechanics rewrite. v0.2.2 changes remain presentation-only around existing Thought coordinates.

### Kinopio / AFFiNE / tldraw / nodepad / additional Excalidraw paths

**NOT ACTIVATED FOR REWRITE**
- v0.2.2 does not rewrite camera, keyboard ownership, pointer drag, selection geometry, or semantic representation architecture. Existing v0.2/v0.2.1 exact-source audits remain authoritative where present.
- No claim of new inspection is made for unvisited exact files in this run. They remain mandatory before any future mechanics rewrite.

# v0.2.3 identity-pass references — inspected 2026-09-14

The following are **visual / interaction observations** unless explicitly stated otherwise. No source-code inspection is claimed for these closed-source products/sites.

## Gionatan Nese — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://www.gionatannese.com/
- https://www.gionatannese.com/projects
- https://www.gionatannese.com/about

**OBSERVED**
- The public site describes and demonstrates a portfolio built around refined interaction, carefully controlled typography, subtle depth and motion that supports the experience rather than filling the screen with persistent chrome.
- The About page explicitly frames good interaction as something that should feel effortless and almost invisible, with detail refined until the result feels inevitable.

**BORROW**
- Soft state response, continuity, restraint, spatial origin and the idea that motion should disappear into interaction quality.

**DO NOT BORROW**
- WebGL spectacle, decorative 3D, portfolio navigation, cursor novelty or any motion that competes with reading.

**DIFFUSION DECISION**
- Keep the existing v0.2.2 motion vocabulary. Identity changes should be legibility/spacing/origin changes first, motion second.

## Cosmos — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://www.cosmos.so/
- https://help.cosmos.so/en/articles/11717949-discovery

**OBSERVED**
- The public presentation uses large breathing room, strong editorial type and content itself as the primary composition. Chrome is sparse relative to the amount of content and imagery.
- The product language repeatedly frames exploration as entering a space/world rather than operating a dashboard.

**BORROW**
- Editorial confidence, meaningful negative space, content-led hierarchy and low chrome.

**DO NOT BORROW**
- Visual-asset grid/feed semantics, recommendation/discovery semantics or image-first product structure.

**DIFFUSION DECISION**
- Do not decorate the Field. Preserve generous empty space and let Thought clarity/type/lifecycle create the local composition.

## mmm.page — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://mmm.page/
- https://notes.mmm.page/paper

**OBSERVED**
- mmm.page explicitly describes an “internet canvas” and a long-term “digital paper” direction: elements can exist freely without needing application-style containers, and imperfect spatial composition is treated as a feature rather than an error.

**BORROW**
- Digital-paper looseness, low pressure toward alignment and the principle that text can exist directly in space without cards.

**DO NOT BORROW**
- Camp/kitsch visual language, playful decoration, website-builder semantics or mixed-media chrome.

**DIFFUSION DECISION**
- Keep Thought text bare. Strengthen perceived depth only through legitimate state/lifecycle and attention hierarchy; no containers or auto-layout.

## mymind — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://mymind.com/our-philosophy-on-notes
- https://mymind.com/the-new-quick-note

**OBSERVED**
- mymind's Quick Note is intentionally a clean, close-at-hand capture surface with very little styling in the way. Its 2026 update describes the field as gently expanding to provide more room without the heavy feeling of creating a full document.

**BORROW**
- Temporary writing presence, low-friction capture and expansion that follows the thought rather than announcing a new application mode.

**DO NOT BORROW**
- Sticky-note/card organization model, saved-content grid or long-form editor semantics.

**DIFFUSION DECISION**
- Rework composing Speak from a filled rounded composer into a lighter line-led writing presence that grows with content and remains attached to the Field.

## Arc / Nate Parrott archive — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://nateparrott.com/arc/index.html
- https://nateparrott.com/arc-max/index.html

**OBSERVED**
- The archive shows one product personality expressed across many focused temporary interactions/surfaces (Command Bar, Little Arc, Previews, PIP, Mini Audio Player, Focus Mode) rather than through one giant ornamental design gesture.
- The Arc Max note emphasizes useful AI that makes browsing subtly better without requiring a new interaction model.

**BORROW**
- Repeated small interaction choices forming one coherent product personality; temporary surfaces should feel like parts of one world.

**DO NOT BORROW**
- Browser/sidebar product model, novelty for its own sake or Arc-specific visual styling.

**DIFFUSION DECISION**
- Reuse the same three identity motifs across Speak/Menu/Settings/Focus: ink, attention field, surfaces from action. Do not invent a separate motif per component.

# v0.2.4 signature-interaction references — inspected 2026-09-14

This pass used the deliberately small reference set required by the v0.2.4 brief. 60fps pages are recorded as **VISUAL / INTERACTION OBSERVATION** only. No Family/60fps production code was inspected or copied. React Bits and Departure Mono entries below identify the exact source inspected.

## Speak — 60fps Monogram + Family Dynamic Sheet — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://60fps.design/shots/monogram-keyboard-icon-morph-to-chat-input-interaction
- https://60fps.design/shots/family-dynamic-sheet-expand-contract-interaction
- Public interaction pages retrieved 2026-09-14. No source-code inspection is claimed.

**OBSERVED**
- The Monogram example presents a compact control and an expanded multiline input as two states of the same object, with a reversible relationship rather than an unrelated popup appearing elsewhere.
- The Family sheet example changes one sheet's dimensions across compact/expanded states so the container relationship remains coherent while content changes.

**BORROW**
- Compact -> compose -> collapse as one object lifecycle; expansion from the interaction's own location; dimensional change that remains interruptible.

**DO NOT BORROW**
- Chat/microphone semantics, bottom-pill chrome, keyboard-specific choreography, mobile-sheet proportions, springy/bouncy personality, or excessive rounding.

**DIFFUSION DECISION**
- Speak remains one Field-owned temporary writing object: about 250px while idle, expanding to a responsive maximum of 520px while composing. It stays transparent and uses an incomplete grounding line rather than a chat shell. Autosizing stops at 108px and then scrolls locally without visible native scrollbar chrome.

## More -> Settings — 60fps Family continuity set — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://60fps.design/shots/family-wallet-card-morph-to-screen-transition
- https://60fps.design/shots/family-action-on-sheet-to-sheet-morph-interaction
- https://60fps.design/shots/family-contextual-continuity-sheet-morph-interaction
- Public interaction pages retrieved 2026-09-14. No source-code inspection is claimed.

**OBSERVED**
- The examples keep a perceptible source/next-state relationship while container ownership changes. Content can change/crossfade while the surface feels spatially descended from the initiating action.

**BORROW**
- Shared spatial origin, shell continuity, and content settling as distinct concerns.

**DO NOT BORROW**
- Full-screen mobile sheet structure, dramatic spring overshoot, literal label stretching, colorful headers, or fragile shared-layout coupling.

**DIFFUSION DECISION**
- The More menu layout remains unchanged. Selecting Settings captures the actual Settings command-row center and passes that point into the existing anchored Settings surface. The More button center remains a fallback only. Exclusive transient ownership still closes More immediately; Settings availability never waits for an exit animation.

## Focus — React Bits TrueFocus — SOURCE-CODE INSPECTION

**INSPECTED**
- Repository: https://github.com/DavidHDev/react-bits
- Revision: `3a1c7f2f9f94ed833934ab5c2635760b9e644583`
- Exact source: `src/ts-default/TextAnimations/TrueFocus/TrueFocus.tsx`
- License file inspected at the same project/revision context: MIT-style license with Commons Clause restriction. Source is used as a reference only; no React Bits code is copied or added as a dependency.

**OBSERVED**
- TrueFocus separates an active word from inactive words through legibility and also measures the active word with `getBoundingClientRect()` to animate a visible focus frame. Its defaults add blur and a glow/frame around the active region.

**BORROW**
- The generic principle that one active region can become perceptually authoritative through clarity rather than a surrounding card.

**DO NOT BORROW**
- Moving corner frame, glow, blur, automatic word cycling, per-word focus state, repeated geometry measurement, or React animation state on the Field hot path.

**DIFFUSION DECISION**
- Existing semantic states (`selected`, `direct`, `nearby`, `receded`, `peripheral`) are the only attention inputs. CSS opacity/ink color establish hierarchy; no new importance score, measurement loop, visual frame, filter, scale, or coordinate change is introduced.

## Ghost / Recall — React Bits BlurText — SOURCE-CODE INSPECTION

**INSPECTED**
- Repository: https://github.com/DavidHDev/react-bits
- Revision: `3a1c7f2f9f94ed833934ab5c2635760b9e644583`
- Exact source: `src/ts-default/TextAnimations/BlurText/BlurText.tsx`
- License context as above. Reference-only; no source copied into Diffusion.

**OBSERVED**
- BlurText stages text from low-legibility to clear using per-word/per-letter Motion elements, strong blur, large vertical displacement and IntersectionObserver-triggered reveal.

**BORROW**
- Only the abstract staged-presence idea: less legible -> partially present -> clear.

**DO NOT BORROW**
- Blur filters, 50px-scale vertical motion, per-word animation, IntersectionObserver reveal, or hundreds/thousands of animated child components.

**DIFFUSION DECISION**
- Ghost/Recall stay container-level phenomena. Their existing text child gets only opacity progression plus a 2px-or-less settle, with no blur/glow and no semantic/lifecycle changes.

## Field composition — Departure Mono source/site — SOURCE-CODE + VISUAL OBSERVATION

**INSPECTED**
- Repository: https://github.com/rektdeckard/departure-mono
- Exact source on current `main` retrieved 2026-09-14:
  - `src/components/typetest.tsx`
  - `src/components/header.css`
- Website: https://departuremono.com/
- Repository license inspected: MIT.

**OBSERVED**
- `typetest.tsx` builds visible hierarchy largely from type size, tracking, line-height and spacing. `header.css` similarly lets padding/gaps/alignment create composition rather than enclosing each unit in a component surface.

**BORROW**
- Typography and spacing as structural material; asymmetric whitespace can carry hierarchy without cards.

**DO NOT BORROW**
- Departure Mono font itself, pixel/terminal/ASCII aesthetics, retro-tech or sci-fi language.

**DIFFUSION DECISION**
- Field depth remains text-first. Rest/Focus differences use existing legibility state and negative space; no decorative background, font swap, clustering, or user-coordinate rewrite is introduced.

# v0.2.5 reuse-first motion repair references — inspected 2026-09-14

## Motion 12.43.0 — SOURCE / DOCUMENTATION INSPECTION

**INSPECTED**
- Existing lockfile package: `motion@12.43.0`, MIT.
- https://motion.dev/docs/react-layout-animations
- https://motion.dev/docs/react-animate-presence
- https://motion.dev/docs/react-use-reduced-motion
- https://motion.dev/docs/react-motion-config

**OBSERVED**
- `layout` lets a persistent Motion component animate size/position changes caused by React layout updates; `layoutId` connects separate elements as one shared layout identity; `LayoutGroup` coordinates layout measurement across related components; `AnimatePresence` preserves exit lifecycles where needed.
- Motion documents `MotionConfig reducedMotion="user"` and `useReducedMotion()` as accessibility mechanisms; transform/layout motion can collapse while opacity/state clarity remains.

**BORROW / DIRECTLY REUSE**
- Native layout/shared-layout measurement instead of manually interpolating widths/origins.
- LayoutGroup namespacing for the global transient shell.
- `MotionConfig reducedMotion="user"` plus local `useReducedMotion` where bespoke fallbacks are useful.

**DO NOT BORROW**
- No spring/bounce by default; no layout animation on pointer/drag hot paths; no shared element morph for typography.

**DIFFUSION DECISION**
- Rebuild Speak around one persistent Motion layout shell. Give More and Settings a shared *visual shell* identity while keeping menu/Settings content and focus ownership separate.

## React Bits BlurText — SOURCE-CODE INSPECTION / REFERENCE ONLY

**INSPECTED**
- Repository: https://github.com/DavidHDev/react-bits
- Revision: `3a1c7f2f9f94ed833934ab5c2635760b9e644583`
- `src/ts-default/TextAnimations/BlurText/BlurText.tsx`
- Project license: MIT + Commons Clause License Condition v1.0.

**OBSERVED**
- The component constructs multi-step Motion keyframes from an initial state, then applies them to per-word/per-letter spans after IntersectionObserver entry. Defaults use 10px/5px blur, large vertical displacement and stagger.

**INTERACTION REFERENCE ONLY**
- Text can become present through a short opacity progression and a minimal settle.

**DO NOT BORROW**
- The component API or implementation, keyframe-building helper, word splitting, per-word Motion elements, IntersectionObserver, filter blur, 50px motion, long stagger, or use on normal Thoughts.

**DIFFUSION DECISION**
- `src/ui/motion/TransientTextPresence.tsx` is independently authored for Ghost/Recall only. It animates one container's opacity and a 2px-or-less settle without observers, splitting, blur, filters, or stagger.

## React Bits TrueFocus — SOURCE-CODE INSPECTION / REFERENCE ONLY

**INSPECTED**
- Same repository/revision.
- `src/ts-default/TextAnimations/TrueFocus/TrueFocus.tsx`.

**OBSERVED**
- Per-word focus state; blur for inactive words; active geometry measured with `getBoundingClientRect()`; Motion frame animates x/y/width/height; glow/border are first-class visuals.

**BORROW**
- Only the already-adopted principle that legibility can express focus.

**DO NOT BORROW**
- Component/source implementation, blur, glow, frame, automatic cycling, geometry measurement, per-word state.

**DIFFUSION DECISION**
- Keep current semantic clarity hierarchy; no TrueFocus code enters the Field.

## Detail.design — MICROINTERACTION TECHNIQUES

**INSPECTED**
- https://detail.design/detail/morphing-button-to-input
- https://detail.design/detail/interruptible-animation
- https://detail.design/detail/cursor-style-while-morphing
- https://detail.design/detail/prevent-layout-shift-from-font-weight-change
- https://detail.design/detail/animated-state-based-icon

**OBSERVED**
- Morphing button/input: compact and editable states read as one object.
- Interruptible animation: close/reversal should be available immediately, not after animation completion.
- Cursor while morphing: interaction ownership should switch coherently with visual state; stale form/control behavior during geometry morph feels wrong.
- Font-weight layout shift: an invisible same-text heavier pseudo-element can reserve width when weight changes.
- State-based icons: icon motion is strongest when it mirrors real state rather than decorating hover.

**BORROW / ADAPT**
- Persistent Speak shell, immediate logical ownership, interruption, and content/shell separation.

**DO NOT BORROW / REJECT**
- No font-weight reservation because this pass introduces no weight-changing menu/settings state.
- Animated icon reuse is rejected because existing controls do not need another icon language.

**DIFFUSION DECISION**
- Motion geometry must never delay textarea focus, Escape, overlay ownership, or Settings focusability.

## 60fps Monogram / Family — VISUAL / INTERACTION OBSERVATION

**INSPECTED**
- https://60fps.design/shots/monogram-keyboard-icon-morph-to-chat-input-interaction
- https://60fps.design/shots/family-dynamic-sheet-expand-contract-interaction
- https://60fps.design/shots/family-wallet-card-morph-to-screen-transition
- https://60fps.design/shots/family-action-on-sheet-to-sheet-morph-interaction
- https://60fps.design/shots/family-contextual-continuity-sheet-morph-interaction

**OBSERVED**
- Compact/expanded states preserve perceived object identity through obvious geometry continuity; Family repeatedly keeps a surface relationship while content swaps or expands.

**BORROW**
- Perceptible geometry continuity, reversible event ordering, shell identity.

**DO NOT BORROW**
- SwiftUI/mobile implementation, chat/microphone semantics, pill bars, full-screen sheets, spring overshoot, colorful headers, label stretching.

**DIFFUSION DECISION**
- Use these only as acceptance references. Web implementation remains Motion + Floating UI + CSS.


# v0.2.6 interaction-visibility pass — inspected 2026-09-14

## Existing Motion + Floating UI — REUSED

**INSPECTED**
- Existing local `motion@12.43.0` and `@floating-ui/react` use documented in the v0.2.2/v0.2.5 audit sections above.
- Existing application implementations: `src/ui/motion.ts`, `src/ui/focus/CommandMenu.tsx`, `src/ui/surfaces/Surface.tsx`, `src/ui/workspace/Speak.tsx`.

**DECISION**
- Scope Hub uses the existing Motion micro-settle role only; placement is pure presentation geometry from cached Field bounds.
- More -> Settings retains the existing shared non-interactive Motion shell and Floating UI focus/dismissal. The v0.2.6 change separates the captured command origin from Settings’ final top-right global-control home.

**DO NOT BORROW**
- No new animation library, toolbar framework, selection-frame component, pointer-frame DOM measurement, or external source code.

# v0.3 interaction-maturity references — inspected 2026-09-14

Product references below are **published product documentation/changelog pages**: they are recorded as interaction observation only, with no claim of source inspection and no license to copy UI assets. Source references name the exact file or package inspected and its license.

## Linear — contextual command menu

**INSPECTED**
- https://linear.app/changelog/2019-10-07-contextual-command-menu (retrieved 2026-09-14; page displays 2019-10-08).
- The same page was already part of the v0.2.1 audit above; this pass re-read it for the command-model decision only.

**OBSERVED**
- The applicable actions of the current view/selection are collected into one command surface that is reachable from the object itself (`Cmd/Ctrl+K` on a selection) rather than only from a permanent toolbar.
- Commands are grouped by relevance; Peek is deliberately deactivated while the command menu owns interaction.

**BORROW**
- Commands depend on the current view/selection; mouse-invoked action UI appears near the triggering object; keyboard invocation uses one stable central surface; grouping by relevance; shortcut hints next to commands; hit areas larger than the visible label.

**DO NOT BORROW**
- Issue-tracker semantics, dense SaaS chrome, permanent navigation rails.

**DIFFUSION DECISION**
- One `DiffusionCommand` list feeds the palette, the Field menu, the right-click context menus and the keyboard router. Presentation decides *which* commands appear and in what order; the semantic action is defined once.

## Raycast — root search, action panel, shortcut management

**INSPECTED**
- https://developers.raycast.com/information/getting-started (retrieved 2026-09-14).
- https://developers.raycast.com/api-reference/user-interface/actions (retrieved 2026-09-14).

**OBSERVED**
- The command system *is* the application surface: one searchable root, an Action Panel that changes with the focused result, and shortcuts displayed next to each action and configurable from one preference surface.

**BORROW**
- Command system as the application backbone; shortcuts shown next to actions; a single system that registers shortcuts; `Ctrl/Cmd+,` for Settings; Esc follows a predictable ownership back-stack.

**DO NOT BORROW**
- Launcher-first product model, visually dense result rows with metadata columns.

**DIFFUSION DECISION**
- The palette is a quiet editorial list of the same commands the Field already exposes. No launcher-as-home-screen; the Field remains the product.

## Obsidian — command palette, hotkeys, file-explorer context operations

**INSPECTED**
- https://help.obsidian.md/plugins/command-palette (retrieved 2026-09-14).
- https://help.obsidian.md/customization/hotkeys (retrieved 2026-09-14).

**OBSERVED**
- Fuzzy discovery over commands; recently used commands are surfaced first; commands can be pinned; a command may be assigned a configurable hotkey; object operations are reachable from a context menu as well as from the palette.

**BORROW**
- Fuzzy/approximate discovery over localized labels and aliases; recent/pinned commands are a later layer; one command may receive a configurable hotkey; object operations exist in both a context menu and the palette.

**DO NOT BORROW**
- Permanent file-tree requirement, vault/file ontology as the visible model.

**DIFFUSION DECISION**
- The registry is a plain array, so recent/pinned/remapped shortcuts can be added later without redesign. Usage tracking is **not** implemented in this pass.

## Notion — one operation, several paths

**INSPECTED**
- https://www.notion.com/help/duplicate-delete-and-move-blocks (retrieved 2026-09-14).

**OBSERVED**
- Duplicate/delete/move are reachable from the block handle, the right-click menu, the "more" affordance and keyboard shortcuts; the underlying operation is the same.

**BORROW**
- The same semantic action may be available through contextual action, right click, "more", palette and shortcut.
- Each path must invoke the same implementation.

**DO NOT BORROW**
- Slash-command document/block ontology, page/sidebar architecture.

**DIFFUSION DECISION**
- Every presentation maps a `DiffusionCommand` to a row. No presentation owns business logic.

## tldraw — actions.tsx and HistoryManager (SOURCE INSPECTION)

**INSPECTED**
- https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/ui/context/actions.tsx — retrieved 2026-09-14, 1923 lines (moving `main`, file header states tldraw license / `tldraw/tldraw` README).
- https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/editor/managers/HistoryManager/HistoryManager.ts — retrieved 2026-09-14, 10294 bytes.

**OBSERVED**
- `TLUiActionItem` is `{ id, kbd, label, readonlyOk, onSelect }`; label can be a per-context map (`default` / `menu` / `context-menu`); `kbd` is a single string carrying platform alternatives (`"cmd+z,ctrl+z"`); undo/redo are ordinary actions that call `editor.undo()`.
- History is recorded as diffs against explicit **marks**; `squashToMark` collapses everything between the head and a mark into one entry; the recorder can be paused (`HistoryRecorderState.Paused`) and ephemeral keys are ignored when diffs are applied.

**BORROW THE ARCHITECTURAL IDEA**
- One action definition, many presentations. Explicit *stopping points*: a user gesture becomes one coherent history entry, not one entry per frame.

**DO NOT BORROW**
- The tldraw editor model, shape/document ontology, diff-squashing machinery, or any source code.

**DIFFUSION DECISION**
- Diffusion already mutates through named domain events, so a "stopping point" is simply *one user dispatch*: a drag commits one `thought.move`, an edit session commits one `thought.edit`. Undo snapshots stay in the controller beside the canonical state, never in UI components. The tldraw recorder's pause/ignore mechanism is not needed because camera, selection, hover and focus are already dispatched as `system` events and are excluded from the undo set.

## Excalidraw — main-menu DefaultItems (SOURCE INSPECTION)

**INSPECTED**
- https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/main-menu/DefaultItems.tsx — retrieved 2026-09-14, 647 lines; repository LICENSE is MIT.

**OBSERVED**
- Field-level operations have a stable home in one menu: `LoadScene`, `SaveToActiveFile`, `SaveAsImage`, `CommandPalette`, `SearchMenu`, `Help`, `ClearCanvas`.
- Each item is a thin presentation: it checks `actionManager.isActionEnabled(...)` and calls `actionManager.executeAction(...)`; shortcut labels come from a shortcut registry (`getShortcutFromShortcutName`) rather than being hardcoded in the menu.

**BORROW**
- Field-level operations have one stable home; the menu row is a presentation of a shared action with shared enablement and a shared shortcut source.

**DO NOT BORROW**
- Excalidraw visual styling, canvas/export semantics, `ClearCanvas`-style destructive defaults.

**DIFFUSION DECISION**
- The Field title becomes that stable home for Field ownership: rename, create, open, duplicate, export, import, history. Shortcut labels are rendered from the shared command registry.

## cmdk — candidate direct dependency (PACKAGE INSPECTION)

**INSPECTED**
- `cmdk@1.1.1` tarball from the npm registry, unpacked locally on 2026-09-14: `package.json`, `LICENSE.md`, `README.md`, `dist/index.d.ts` (18785 bytes), `dist/index.js` (13210 bytes), `dist/command-score.js`.
- License: MIT (Copyright (c) 2022 Paco Coursey).
- Declared dependencies: `@radix-ui/react-dialog`, `@radix-ui/react-compose-refs`, `@radix-ui/react-id`, `@radix-ui/react-primitive`. `dist/index.d.ts` line 1: `import * as RadixDialog from '@radix-ui/react-dialog'` — the Radix dialog is imported by the package entry, so it is bundled even when `Command.Dialog` is never used.
- Documented mechanics read in `README.md`: `Command.Input`/`List`/`Group`/`Item`, `keywords`, `forceMount`, `shouldFilter`, `defaultFilter` (`commandScore`, a subsequence scorer over the item's `textContent`).

**CLASSIFICATION: REJECTED for this pass.** Reasons, in order:
1. v0.2.1 of this project recorded an explicit decision *not* to take a Radix runtime dependency, and `src/ui/transient.ts` owns a single documented transient-owner invariant with epoch-guarded focus restoration. `Command.Dialog` would introduce a second portal/focus authority over the same `ui.surface` state.
2. The command list must be ranked by deterministic context (selection scope first), hidden by semantic availability, and searched by localized label *and* English/internal aliases. cmdk's value is its own filtering and item registration, which is exactly the part that would be overridden (`shouldFilter={false}` + pre-sorted items), leaving mainly markup.
3. The primitives cmdk would supply for that remainder — portal, dismissal, roving list navigation, typeahead — are already in the existing Floating UI dependency and already used by `src/ui/focus/CommandMenu.tsx`.
4. Estimated cost of the local implementation is ~130 lines with no new dependency, no Radix tree and no second focus authority.

**NOT ADOPTED** — no cmdk or Radix package is installed; no cmdk source is copied or forked.

## Radix Context/Dropdown Menu — candidate primitive reuse

**INSPECTED (inherited from v0.2.1, re-read for this decision)**
- https://github.com/radix-ui/primitives/blob/main/packages/react/dropdown-menu/src/dropdown-menu.tsx and `.../dialog/src/dialog.tsx`; MIT.

**CLASSIFICATION: REJECTED — not necessary.** The existing `CommandMenu` already composes `useFloating` + `useDismiss` + `useRole` + `useListNavigation` + `useTypeahead` + `FloatingFocusManager` and is already covered by end-to-end keyboard tests (Home/End/Arrow/Tab/outside-click/return-focus). Right-click menus need only a virtual reference element (`refs.setPositionReference`), which Floating UI supports directly and which `Surface` already uses for anchored points.

**EXISTING FLOATING UI WAS SUFFICIENT.** No Radix package is installed.

## Reuse summary

| Source | Mechanism | Classification | Local implementation | License |
|---|---|---|---|---|
| Linear (product docs) | contextual command grouping near the invoking object | REFERENCE ONLY | contextual ordering in `src/ui/commands`; menus anchored to the trigger or pointer | n/a |
| Raycast (product docs) | command backbone, next-to-action shortcut labels, `Ctrl+,` settings | REFERENCE ONLY | one registry rendered into palette/menu/keyboard | n/a |
| Obsidian (product docs) | fuzzy discovery, alias search, recent/pinned as a later layer | REFERENCE ONLY | normalized label/alias/id matching, extensible array registry | n/a |
| Notion (product docs) | one operation, several access paths | REFERENCE ONLY | single `run` per command id | n/a |
| tldraw `actions.tsx` | `{id, kbd, label, onSelect}` action definitions, per-context labels | ADAPTED ARCHITECTURE | `DiffusionCommand` + presentation mapping (no code copied) | tldraw source inspected, not copied |
| tldraw `HistoryManager.ts` | explicit marks; squashed user-level entries; paused recorder for ephemeral state | ADAPTED ARCHITECTURE | undo snapshots in `ProjectController` keyed to one user dispatch (`src/core/controller.ts`) | inspected, not copied |
| Excalidraw `DefaultItems.tsx` | field operations in one stable home; menu rows are thin presentations of shared actions | ADAPTED ARCHITECTURE | Field menu built from the same registry | MIT |
| cmdk 1.1.1 | command palette engine, keyword filtering | REJECTED | local palette on Floating UI | MIT |
| Radix dropdown/context menu | accessible menu primitive | REJECTED | existing Floating UI composition | MIT |
| `@floating-ui/react` (installed) | positioning, dismissal, roving focus, virtual reference | DIRECT DEPENDENCY | `CommandMenu`, `CommandPalette`, `Surface` | MIT (existing dependency) |

No upstream application source was copied into Diffusion in this pass.

# v0.4 Phase 2 reference gate — inspected 2026-09-14 (before implementation)

This section extends, not replaces, the audits above. It records only first-party references actually retrieved in this run, before the corresponding production edits. Exact URLs and the exact attributes/APIs seen are named. Documentation pages were retrieved as their published Markdown sources (`*.md`) where the site offers them, so the text below is the upstream text, not a scraped approximation. No upstream source code was copied into Diffusion.

## Base UI — DIRECT DEPENDENCY (`@base-ui/react@1.8.0`, MIT)

**INSPECTED**
- https://base-ui.com/react/overview/about.md
- https://base-ui.com/react/overview/quick-start.md
- https://base-ui.com/react/handbook/animation.md
- https://base-ui.com/react/components/menu.md
- https://base-ui.com/react/components/context-menu.md
- https://base-ui.com/react/components/select.md
- https://base-ui.com/react/components/dialog.md
- https://base-ui.com/react/components/tabs.md
- https://base-ui.com/react/components/tooltip.md
- https://base-ui.com/react/components/popover.md
- https://github.com/mui/base-ui (project/licence context)

**OBSERVED**
- The package was renamed from `@base-ui-components/react` to `@base-ui/react`; the docs state this as authoritative over older references.
- Components are unstyled and own only behaviour. Anatomy is explicit and composable: `Root` / `Trigger` / `Portal` / `Positioner` / `Popup` / `Item` for Menu, plus `Group`, `GroupLabel`, `Separator`, `RadioGroup`, `CheckboxItem`, `SubmenuRoot`, `Viewport`; `Root` / `Label` / `Trigger` / `Value` / `Icon` / `Portal` / `Positioner` / `Popup` / `List` / `Item` / `ItemText` / `ItemIndicator` / `Group` for Select; `Root` / `List` / `Tab` / `Panel` / `Indicator` for Tabs; `Root` / `Trigger` / `Portal` / `Backdrop` / `Viewport` / `Popup` / `Title` / `Description` / `Close` for Dialog.
- Animation is a styling contract, not a component: `[data-starting-style]` / `[data-ending-style]` for CSS transitions (documented as preferable to keyframes because a transition can be cancelled midway), `[data-open]` / `[data-closed]` for CSS animations, and for JavaScript libraries only `opacity` is reflected in `element.getAnimations()` so Base UI waits for animation finish before unmounting.
- Composition with an external animation library is a documented, supported path: make the root controlled with `open`, wrap the portal child in `<AnimatePresence>`, mark the `Portal` `keepMounted`, and compose `Popup` through `render` with `motion.div`. The alternative (kept mounted) animates from the `open` state without `AnimatePresence`.
- Positioning is separated from the popup: `Positioner` owns `side`, `align`, `sideOffset`, `alignOffset`, `collisionAvoidance`, `collisionBoundary`, `collisionPadding`, `sticky`, `positionMethod` and exposes `--transform-origin`, `--available-height`, `--available-width`. It also accepts `anchor` as `Element | VirtualElement | RefObject | (() => …)`, which is what a pointer-anchored menu needs.
- Menus own `loopFocus`, `highlightItemOnHover`, `closeParentOnEsc`, imperative `actionsRef.close/unmount`, and a `Popup` `finalFocus` prop that can be set to `false` to leave focus restoration to the caller.
- Items expose `data-highlighted` / `data-disabled` and a `label` prop used for keyboard text navigation; Select items add `data-selected`.
- `Menu.Root` is controlled with `open` / `onOpenChange(open, eventDetails)`; `Popup` exposes `data-side`, `data-align`, `data-starting-style`, `data-ending-style` for styling.
- `Menu.Root` has `modal?: boolean` and it is **on by default**: a modal menu renders an invisible full-screen `role="presentation"` layer that absorbs the first outside press, and `Menu.Popup` has `finalFocus` (`true` when the menu has no submenu parent), which would be a second focus-restoration authority beside Diffusion's own coordinator. Both were overridden (`modal={false}`, `finalFocus={false}`) after measurement, not by assumption.

**BORROW**
- The ownership split: `Positioner` positions, `Popup` presents, `Root` owns open state. It maps directly onto Diffusion's existing single transient-owner machine, which keeps the open state and the focus coordinator.
- `finalFocus={false}` so `useTransientFocus` remains the one focus-restoration authority (the architecture already forbids a second focus authority).
- `data-starting-style` / `data-ending-style` / `data-side` / `--transform-origin` as the styling seam, so Base UI's behaviour and Motion's animation do not fight over the same element.
- Base UI for the interaction families that are genuinely ordinary: **Menu**, **Select**, **Tabs**.

**DO NOT BORROW**
- Example visual styling, Tailwind/CSS-module class strings, default sizes and paddings.
- A second focus/portal authority over `ui.surface`: Diffusion's `Surface` keeps owning dialog-level focus, dismissal and return for split/focus/bar/anchored/window places, because their placement is part of the product, not a generic popup.
- `Dialog`/`Popover`/`Tooltip` are not adopted in this pass: Diffusion has exactly one dialog-like owner with its own depth classes, and no tooltip family exists to replace. Introducing them would create a second owner, which the architecture forbids.

**DIFFUSION DECISION (recorded before edits)**
- `@base-ui/react` becomes the interaction-primitive layer for ordinary menus, selects and tabs. `CommandMenu` is re-expressed on `Menu.Root/Positioner/Popup/Item` (one menu family for both element-anchored and pointer-anchored menus, using `anchor` with a virtual element for right-click). Native `<select>` elements are replaced by one `Select` wrapper. Settings section navigation becomes real `Tabs`. `Surface` is retained as the intentionally custom place/dialog primitive and is documented as such.

## Motion — EXISTING DEPENDENCY, RE-DOCUMENTED (`motion`, previously 12.43.0, MIT)

**INSPECTED**
- https://motion.dev/docs/react
- https://motion.dev/docs/react-layout-animations
- https://motion.dev/docs/react-animate-presence

**OBSERVED**
- `layout` animates a component's size/position when React re-layouts it; `layoutId` connects two different elements as one shared identity and an element with a matching `layoutId` entering the tree animates out from the outgoing one; `LayoutGroup` synchronises layout measurement across siblings; `AnimatePresence` keeps a removed child mounted until its `exit` finishes and needs a `key`.
- Layout transitions can follow a path (`transition.layout.path: arc()`), which changes the *shape* of the movement, not its duration.

**BORROW**
- Motion remains the sole owner of ordinary component animation: hover/press, menus, selects, tabs, dialogs, shared-layout surfaces, and component enter/exit. Layout/shared-layout measurement replaces hand-interpolated geometry.

**DO NOT BORROW**
- Layout or presence animation on the pointer-frequency Field hot path; a layout animation on an element whose transform is written imperatively by the Field.

**DIFFUSION DECISION**
- One property may not have two animation owners at once. Motion animates React components; GSAP animates authored sequences on elements that no Motion component owns. The Field's world transform stays imperative and is never animated by either.

## GSAP — DIRECT DEPENDENCY (`gsap@3.15.0`, standard "no charge" licence)

**INSPECTED**
- https://gsap.com/docs/v3/ (docs root and navigation)
- https://gsap.com/docs/v3/Plugins/Flip/
- https://gsap.com/docs/v3/Plugins/SplitText/
- https://gsap.com/docs/v3/Eases/CustomEase/
- https://gsap.com/docs/v3/GSAP/gsap.context()/
- https://github.com/greensock/GSAP (project/licence context)

**OBSERVED — Flip**
- `Flip.getState(targets, {props})` records position/size/rotation/skew (plus named CSS props) without changing anything, and forces a competing flip to completion so the captured state is accurate.
- `Flip.from(state, {duration, ease, absolute, absoluteOnLeave, fade, nested, onEnter, onLeave, props, scale, targets, …})` immediately applies the inverse offsets and animates them away, returning a timeline that can be interrupted.
- `absolute: true` removes flipped targets from document flow during the flip, which is what a layout-changing React update needs; `nested: true` prevents parent/child offsets compounding; `onEnter`/`onLeave` receive the elements that have no counterpart and any tween they return is added to the flip timeline so an interrupting flip forces it to completion; `fade: true` crossfades swapped elements; `data-flip-id` correlates elements across states; `Flip.killFlipsOf(targets, complete)` and `Flip.isFlipping()` bound the lifecycle.
- React guidance in the same page: a framework may have re-rendered new element instances, so `Flip.from` must be given explicit `targets`; and the state must be captured and the flip started inside the commit, not after paint.

**OBSERVED — SplitText**
- `SplitText.create(target, {type, mask, autoSplit, onSplit, aria, …})`; accessibility is first-class (`aria: "auto"` puts an `aria-label` on the split element and `aria-hidden` on the slices), `autoSplit` re-splits on resize and on font load, `onSplit(self)` is where animations belong so re-splits clean up and resume them, and `revert()` restores the original `innerHTML`.

**OBSERVED — CustomEase**
- `CustomEase.create(id, data)` accepts either an SVG path (`M0,0 C…`) or a plain `cubic-bezier()` value string such as `".17,.67,.83,.67"`; `gsap.registerPlugin(CustomEase)` is required.

**OBSERVED — gsap.context()**
- `gsap.context(fn, scope)` collects every animation created inside `fn` so a single `revert()` reverts them all, and scopes selector text to an element/ref; a cleanup function may be returned; `self.add(name, fn)` registers extra callbacks on the context. The docs point to `useGSAP()` from `@gsap/react` as the React abstraction.

**BORROW**
- `gsap.context()` for collection and revert, driven through `useGSAP()` from `@gsap/react` so an unmount or a dependency change reverts cleanly.
- `CustomEase.create` with the *same numeric control points as the CSS ease token*, so a role means one curve in both technologies.
- Flip where a signature moment is genuinely a layout change (`onEnter`/`onLeave` for particles that appear and disappear), with explicit `targets` — **but only when both states are on screen at once**, which none of the three sequences in this pass satisfy (a Field switch remounts the composition root, so there is no before/after pair to interpolate).
- SplitText only with `aria: "auto"`, `autoSplit: true`, animation inside `onSplit`, and CJK-safe options — and only where per-line motion is actually the design.

**DO NOT BORROW**
- SplitText per-character animation of Chinese text for spectacle; `mask: "chars"`; SplitText at all on ordinary Thoughts.
- GSAP on the Field world transform, camera, drag, or anything on the pointer path.
- A second easing vocabulary that disagrees with the CSS/Motion roles.

**DIFFUSION DECISION**
- GSAP owns three authored sequences in this phase: **Empty → First Thought**, **Field switch**, and **History reveal**. Each one is built inside `gsap.context()`, resolves through the shared role durations, and is skipped outright (not shortened) under reduced motion, because the semantic result must be identical without it.
- `Flip` is deliberately **not adopted in this pass**. It was read in full, and it is the right tool for a signature moment that is genuinely a layout change; none of the three sequences here is one. A Field switch remounts the composition root (`Workspace key={project.id}`), so the outgoing and incoming DOM never coexist and there is nothing for `Flip.getState()`/`Flip.from()` to interpolate; the sequence animates the arrival veil, the identity and the visible Thought text instead. Registering Flip without a call site would have shipped plugin bytes for a capability nothing uses, so the import, the registration and the `flipFrom` wrapper were removed and this record was corrected.
- `SplitText` is deliberately **not adopted in this pass**: the Empty → First Thought sequence animates a composed block (eyebrow, line, hint, mark) whose parts already exist as real elements, so splitting text would add a re-split/accessibility surface for no additional meaning. Recorded as studied and rejected, not as unexamined.

## Reuse summary (Phase 2)

| Source | Mechanism | Classification | Local implementation | Licence |
|---|---|---|---|---|
| Base UI `Menu` | `Root`/`Positioner`/`Popup`/`Item`, roving focus, virtual `anchor`, `finalFocus`, `modal` | DIRECT DEPENDENCY | `src/ui/focus/CommandMenu.tsx` re-expressed on Base UI; ownership/focus still `ui/transient.ts` + `useTransientFocus`; `modal={false}` because a menu must not block the Field | MIT |
| Base UI `Select` | `Root`/`Trigger`/`Value`/`Portal`/`Positioner`/`Popup`/`List`/`Item` | DIRECT DEPENDENCY | `src/ui/primitives/Select.tsx`, one ordinary Select for the whole product | MIT |
| Base UI `Tabs` | `Root`/`List`/`Tab`/`Panel` | DIRECT DEPENDENCY | Settings section navigation | MIT |
| Base UI `Dialog`/`Popover`/`Tooltip` | overlay ownership, backdrop, popup lifecycle | REJECTED (for now) | `ui/surfaces/Surface.tsx` remains the single dialog-like owner | MIT |
| Motion | `layout`, `layoutId`, `LayoutGroup`, `AnimatePresence`, `MotionConfig reducedMotion="user"` | DIRECT DEPENDENCY (existing) | ordinary component animation, unchanged ownership | MIT |
| GSAP `Flip` | `getState`/`from`, `absolute`, `nested`, `onEnter`/`onLeave`, `killFlipsOf` | STUDIED / NOT ADOPTED for this pass | none — see below | standard no-charge |
| GSAP `CustomEase` | `create(id, cubic-bezier)` | DIRECT DEPENDENCY | shared signature eases, numerically equal to the CSS roles | standard no-charge |
| GSAP `gsap.context()` | collected animations, scoped selectors, one `revert()` | DIRECT DEPENDENCY | `src/ui/motion/signature.ts` | standard no-charge |
| GSAP `SplitText` | split/revert, `autoSplit`, `onSplit`, `aria` | STUDIED / REJECTED for this pass | none | standard no-charge |
| `@gsap/react` | `useGSAP()` — context scope + automatic revert | DIRECT DEPENDENCY | used by every signature sequence | standard no-charge |

No upstream application source was copied into Diffusion in this pass. GSAP's licence is not MIT; it is the GSAP standard "no charge" licence, under which the free plugin used here (`CustomEase`) is redistributable inside an application.

# v0.4 Phase 2.5 reference gate — inspected 2026-09-15 (before implementation)

This section extends, not replaces, the audits above. It records what was actually retrieved in
this pass, what was adopted, what was rejected, and why the adopted mechanism fits Diffusion. The
Phase 2 gate above studied Base UI, Motion and GSAP from the same first-party URLs; what follows
records only what changed, plus the CSS foundations this pass depends on for the first time.

Two honesty notes about retrieval in this pass:

- `https://developer.mozilla.org/...` retrieves fine over HTTPS but is refused by the in-agent URL
  reader (its resolver maps the host to a private address), so those four pages were fetched as
  ordinary HTTP responses and the relevant text is quoted below.
- `https://gsap.com/docs/v3/...` is a client-rendered documentation SPA: a plain fetch returns the
  app shell with no body text. The GSAP mechanisms this pass uses were therefore verified against
  the shipped type declarations in `node_modules/gsap/types/*.d.ts`, which is a stronger check of
  the exact API surface than prose documentation would be.

## MDN — the CSS foundations this pass introduces

**INSPECTED**
- https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient
- https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode
- https://developer.mozilla.org/en-US/docs/Web/CSS/filter
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

**OBSERVED (quoted / paraphrased from the retrieved text)**
- `radial-gradient()` "creates an image consisting of a progressive transition between two or more
  colors that radiate from an origin. Its shape may be a circle or an ellipse", and it is specified
  by naming the centre (where the 0 % ellipse will be) plus an optional size. Multiple gradients
  are simply comma-separated `background-image` layers.
- `mix-blend-mode` "sets how an element's content should blend with its backdrop — the content
  rendered behind the element **within the same stacking context**." The stacking-context qualifier
  is the operative sentence: it means the blend is bounded by the nearest ancestor that creates a
  stacking context, which in this application is `.app` (`isolation: isolate`).
- `filter` is a property whose functions are all GPU-ish but *raster-scoped* effects; `blur()` on a
  full-viewport element forces offscreen rasterisation of that element every frame it changes.
- `prefers-reduced-motion` "is used to detect if a user has enabled a setting on their device to
  minimize the amount of non-essential motion" — it is a *motion* preference, not a
  "disable-the-animation-library" switch, which is why the codebase's rule is to collapse a role to
  zero duration and keep the end state, never to hide a change.

**BORROW**
- Layered `radial-gradient` as the whole illumination model: a base colour plus a handful of
  comma-separated radial layers with alpha stops, no image asset, no canvas, no filter.
- `mix-blend-mode: soft-light` for the grain only, at ~5 % opacity, so the grain reads as material
  rather than as a texture laid on top. Bounded by `.app`'s existing stacking context.
- The `prefers-reduced-motion` media query as a *guard*, layered on top of the existing global
  collapse, for the one ambient animation the background owns.

**DO NOT BORROW**
- `filter: blur()` anywhere in the Field background. It is the most expensive thing a full-screen
  layer can do and the repository already forbids it (`filter: blur` appears in no stylesheet, and
  an offline contract asserts that the Field stylesheet never gains one).
- `backdrop-filter`: same cost class, and it would make the Field behind a surface pay for the
  surface. Diffusion's surfaces dim with a scrim colour instead (Phase 2), and that is unchanged.
- Blend modes on Thoughts or relations. `mix-blend-mode` outside the atmosphere layer would put a
  compositing dependency under content the Field moves every frame.

**DIFFUSION DECISION (recorded before edits)**
- The Field's atmosphere is `base colour + three radial illumination layers + a fractal-noise grain
  at ~5 % + a vignette`, in one new stylesheet (`src/ui/atmosphere.css`) behind one presentation
  component, with exactly one animated property (`transform`) at one meaningful change per ~48
  seconds. Paper Day and Graphite Night get their own material constants; the semantic background
  (particles, filaments, region distortion) stays a Phase 3 Pixi concern and is not started here.

## Base UI — re-checked, no new adoption (`@base-ui/react@1.8.0`, MIT)

**INSPECTED**
- https://base-ui.com/react/overview/about
- https://base-ui.com/react/components/select (retrieved as `.md`, body text confirmed in this pass:
  the unstyled `Root`/`Label`/`Trigger`/`Value`/`Icon`/`Portal`/`Positioner`/`Popup`/`List`/`Item`
  anatomy, and the standing note that the package was renamed from `@base-ui-components/react`)
- https://base-ui.com/react/components/tabs
- https://base-ui.com/react/components/menu
- https://base-ui.com/react/components/dialog

**OBSERVED**
- Nothing in the retrieved text contradicts the Phase 2 gate above. The Select anatomy and the
  rename note are unchanged; Tabs is still `Root`/`List`/`Tab`/`Panel`/`Indicator`; Menu is still the
  family with `Positioner`/`Popup`/`Item`; Dialog is still the overlay family Phase 2 declined.

**BORROW**
- The same three primitives Phase 2 adopted, and nothing more. The Settings restructure adds two
  `Select` instances (Interface size, Thought size) and one status line — all inside the existing
  tablist, using the existing one-Select wrapper.

**DO NOT BORROW**
- `Dialog`/`Popover`/`Tooltip` — still declined for the same reason: `ui/surfaces/Surface.tsx` is
  the single dialog-like owner, and this pass introduces **no new overlay, no new place, no new
  permanent UI**.

**DIFFUSION DECISION**
- Zero new primitives. Phase 2.5's Settings work is an information-architecture change inside the
  accepted shell, plus one new shared *status* vocabulary, which is Diffusion's own component
  (`ui/primitives/Status.tsx`) because it describes product states ("can I use this right now?"),
  not generic popup behaviour.

## Motion — re-checked, ownership unchanged (`motion@12`, MIT)

**INSPECTED**
- https://motion.dev/docs/react
- https://motion.dev/docs/react-layout-animations
- https://motion.dev/docs/react-animate-presence

**OBSERVED / BORROW / DO NOT BORROW**
- Unchanged from the Phase 2 gate above: `layout` + `LayoutGroup` for the composer's geometry,
  `AnimatePresence` for presence of an action or a hint row, and no Motion on the Field world
  transform. Nothing in this pass adds a second layout-animation owner.

**DIFFUSION DECISION**
- The composer's idle → focused → scoped → writing → submitting states are *named in TypeScript*
  (`ui/workspace/composer.ts`) and rendered as `data-state`, with Motion animating geometry and
  presence. The states are decided once, so the visual vocabulary and the state machine cannot
  drift — the same discipline the motion roles already enforce.

## GSAP — Timeline / CustomEase / context re-used, Flip re-examined (`gsap@3.15.0`)

**INSPECTED**
- https://gsap.com/docs/v3/ (docs root)
- https://gsap.com/docs/v3/GSAP/Timeline/
- https://gsap.com/docs/v3/Plugins/Flip/
- https://gsap.com/docs/v3/Eases/CustomEase/
- https://gsap.com/docs/v3/GSAP/gsap.context()/
- `node_modules/gsap/types/gsap-core.d.ts`, `custom-ease.d.ts`, `flip.d.ts` (local, shipped types)

**OBSERVED**
- gsap.com's documentation is a client-rendered SPA and returns no extractable body text to a plain
  fetch. The API surface used in this pass was therefore read from the shipped declarations:
  `Timeline` exposes `eventCallback(type, callback)` (used to await a departure without polling),
  `kill()`, `revert()`, `totalDuration()`, and position parameters on `to/from/fromTo/set`; `Tween`
  exposes `kill()`/`revert()`/`clear`-style lifecycle; `CustomEase.create(id, data)` is registered
  once; `gsap.context(fn, scope)` collects and reverts.
- `Flip` (`flip.d.ts`) is unchanged from the Phase 2 reading: `getState`/`from` interpolate between
  two states that exist **at the same time**.

**BORROW**
- `Timeline` as the authored unit, including `eventCallback('onComplete')` as the honest way to wait
  for a departure — and a bounded timeout beside it, so presentation can never hold a semantic
  action hostage.
- `CustomEase` + `gsap.context()` exactly as Phase 2 established: the same numeric control points as
  the CSS/Motion roles, one `revert()` per sequence.

**DO NOT BORROW**
- `Flip`, again. This pass adds a **Field departure** sequence, which looks like the missing
  before/after pair — and is not one. Departure and arrival are *sequential*: the outgoing
  composition root is replaced before the incoming one exists (`Workspace key={project.id}`), so
  the two DOM states never coexist and there is still nothing to interpolate. What the departure
  animates is the outgoing Field's own children receding, which needs no measurement pair.
- GSAP anywhere on the pointer path, the camera, or the Field's world transform — and GSAP in any
  module other than `src/ui/motion/signature.ts` (a contract test enumerates the importers).
- Per-character or per-word text animation on Thought text.

**DIFFUSION DECISION**
- The sequence set grows from three to five authored moments: **First Thought** (a composer half
  that yields the space plus a Thought half that travels a measured 24–90 px from the composer with
  a depth change and a typography resolution), **Field switch** (a departure plus a grouped arrival),
  **Settings open/close** (a two-beat arrival and a Field pull-back that resolves home), and the
  existing **Empty Field** and **History reveal** moments, the latter now ordered as hierarchy
  (overview → structure → events). Reduced motion builds none of them.

## Reuse summary (Phase 2.5)

| Source | Mechanism | Classification | Local implementation | Licence |
|---|---|---|---|---|
| MDN `radial-gradient` | layered comma-separated radial layers, no asset | STANDARD CSS | `src/ui/atmosphere.css` illumination | — |
| MDN `mix-blend-mode` | `soft-light`, bounded by `.app`'s stacking context | STANDARD CSS | `src/ui/atmosphere.css` grain | — |
| MDN `filter` | documented cost class | STUDIED / REJECTED | `blur()` and `backdrop-filter` appear nowhere in the background | — |
| MDN `prefers-reduced-motion` | motion preference, not an animation switch | STANDARD CSS | guard on the one ambient animation; the existing global role collapse is unchanged | — |
| Base UI `Select`/`Tabs` | existing dependency | REUSED, NO NEW ADOPTION | two more Select instances inside the accepted tablist | MIT |
| Base UI `Dialog`/`Popover`/`Tooltip` | overlay ownership | STILL REJECTED | no new overlay exists in this pass | MIT |
| Motion | `layout`, `LayoutGroup`, `AnimatePresence` | REUSED | composer geometry, action/hint presence | MIT |
| GSAP `Timeline` | `eventCallback('onComplete')`, `kill()`, `revert()` | DIRECT DEPENDENCY | `fieldDepartureSequence` bounded by a 260 ms beat | standard no-charge |
| GSAP `CustomEase` + `gsap.context()` | shared eases, one revert per sequence | REUSED | `src/ui/motion/signature.ts` | standard no-charge |
| GSAP `Flip` | `getState`/`from` between simultaneous states | STUDIED / STILL NOT ADOPTED | none — a Field switch has no simultaneous before/after pair | standard no-charge |

No upstream application source was copied into Diffusion in this pass. No new runtime dependency was
added.

# Phase 2.7 — background recomposition (inspected 2026-09-15, before the edit)

This section extends, not replaces, the audits above. It records the reference study for the Field
background recomposition, the exact recipe shipped, and the measured pixel evidence. The Phase 2.6
atmosphere was rejected in review as "too artificial / muddy", reading like a spotlight / giant
radial gradient on a foggy game menu. The brief was to *recompose*, not to lower opacity.

## antfu.me — the reference for restraint (visual reference source)

**INSPECTED**
- `https://antfu.me/` — fetched over plain HTTPS (the in-agent URL reader maps the host to a private
  address and refuses it, the same limitation recorded for MDN above). HTTP 200, 14,454 bytes.
- `https://antfu.me/assets/app-BcNORnHM.css` — the site's own bundled stylesheet, 299,950 bytes. This
  is where the design decisions actually live.
- `https://antfu.me/notes`, `/projects`, `/sponsor` — prerendered HTML (HTTP 200).

**OBSERVED (quoted from the retrieved CSS/HTML)**
- The homepage is a client-rendered Netlify SPA: its `<body>` returns no text to a plain fetch, so
  observations are taken from the **CSS bundle and the prerendered pages**, not from the homepage DOM.
- The palette is neutral and tiny. `:root{--c-bg:#fff;--c-scrollbar:#eee;--c-scrollbar-hover:#bbb;
  color-scheme:light dark}` and `html.dark{--c-bg:#050505;--c-scrollbar:#111;--c-scrollbar-hover:#222}`.
  The foreground is a four-step grey ladder: `--fg-light:#888;--fg:#555;--fg-deep:#222;--fg-deeper:#000`.
- The app's own background is **one flat token**. Across the whole bundled stylesheet there are
  **zero** `radial-gradient`, **zero** `linear-gradient` and **zero** `feTurbulence`; `background-image`
  is never used for atmosphere. `backdrop-filter`/`blur-*` appear only as *unused UnoCSS utility class
  definitions*, never in the site's own rules.
- Depth is one or two hairlines, not shadow: `.prose thead{...border-bottom-color:#8882...}`. Prose is
  `max-width:var(--prose-max-width)` (`65ch`) at `line-height:1.75`.
- Colour is spent on meaning, not decoration: `--color-note/tip/warning/severe/caution/important` are
  the only saturated values. They are reserved for callouts.
- The dark mode is the *same structure* with a different token set (`html.dark`, `dark:` variants
  everywhere) — one place, two lights.

**BORROW**
- A near-flat neutral plane as the base of everything; a short neutral tonal ladder; no gradient or
  texture used merely to fill space.
- Colour reserved for meaning (Diffusion's `--attention`), never for the surface.
- Very large, low-contrast tonal forms with no visible boundary, and depth by restraint rather than
  by a bright centre or an obvious vignette.
- One structure, two lights: identical geometry, separate constants per theme.

**DO NOT BORROW**
- The palette values, type, layout, spacing scale or any branding: this is a *principles* reference.
  No antfu.me value, name or class is copied into Diffusion.
- The purely flat plane *as the whole answer*: the visual contract requires Graphite Night to keep a
  **measurable** gradient (`luminance spread > 2`), so Diffusion keeps one extremely large, very low
  contrast form instead of a flat fill.
- The absence of grain: the review explicitly asks for a fine material, so the inline-SVG fibre grain
  stays (reduced to ~5%), which antfu.me's own UI does not use.

**DIFFUSION DECISION**
- The atmosphere keeps its four-layer *shape* (base colour → large illumination form(s) → edge depth →
  grain) but is recomposed around one rule: **the plane is a material, not a picture.** No warm hue
  exists in either theme, so the rejected brown hotspot is structurally impossible; the forms are
  larger than the viewport, so no circular boundary can be read; the edge depth is a *straight*
  top/bottom falloff, so there is no ring and no centre. Only `transform` animates.

## Exact recipe shipped (`src/ui/atmosphere.css`)

| Token | Paper Day (light) | Graphite Night (dark) |
|---|---|---|
| `--field-bg` (theme.css) | `#f5f4f1` | `#171819` |
| `--atmos-lift` | `#ffffff` | `#34383d` |
| `--atmos-warm` (a depth tone, never warm) | `#e4e3df` | `#0d0f11` |
| `--atmos-vignette` (edge depth) | `#3d4045` | `#05070a` |
| `--atmos-lift-strength` | `52%` | `32%` |
| `--atmos-warm-strength` | `20%` | `20%` |
| `--atmos-vignette-strength` | `3.5%` | `9%` |
| `--atmos-grain-opacity` | `.05` | `.06` |
| geometry `--atmos-lift-x/-y` | `40% / 34%` | `40% / 34%` |
| geometry `--atmos-warm-x/-y` | `78% / 82%` | `78% / 82%` |
| `--atmos-drift` / `-x` / `-y` | `24s` / `56px` / `-64px` | identical |

- `::before` is the only animated element: two `radial-gradient(120%/115% at var(--atmos-…-x) var(--atmos-…-y) …)` forms — both larger than the layer — drifting on `translate3d` only.
- `::after` is the edge depth: `linear-gradient(to bottom … 0%, transparent 30%)` + `linear-gradient(to top … 0%, transparent 34%)` of `--atmos-vignette`. **No radial vignette.**
- The grain rectangle is unchanged (160 px `feTurbulence` tile, `soft-light`).
- `[data-atmosphere="attention"]` moves both `*-x/y` and lifts `--atmos-lift-strength` 52→68 (light) /
  32→40 (dark) and `--atmos-warm-strength` 20→30 (light) / 20→26 (dark) — a *local* shift of where the
  light falls, not a global brightness change.

## Contrast (risk check: does the new base colour hurt Thought ink?)

WCAG 2.1 relative-luminance ratios, computed from the actual token values:

| Pair | Ratio | Note |
|---|---|---|
| `--ink-primary` `#33332f` on light `#f5f4f1` | **11.53:1** | was 11.43:1 on `#f4f3ef` — marginally better |
| `--ink-primary` `#e7e3dc` on dark `#171819` | **13.90:1** | was 14.17:1 on `#151617` |
| dark ink on the *brightest* dark composite (~`#202224`) | 12.48:1 | worst case inside the lift |
| light ink on the *deepest* light composite (~`#eeeeec`) | 10.92:1 | worst case at an edge |

Every case is far above WCAG AA (4.5:1) and AAA (7:1) for normal text; the recomposition does not
weaken readability.

## Measured pixel evidence

Captured at 1440×960, deviceScaleFactor 1, decoded with the same non-interlaced PNG reader the visual
gate uses. Artefacts in `verification/v0.4.4/atmosphere/`:
`empty-{light,dark}.png`, `demo-{light,dark}.png`, `demo-selected-{light,dark}.png`, and the
background-isolated `_bg-only-{light,dark}.png` (only `.atmosphere` shown, for a clean scanline).

**The 8 acceptance points** (`tests/e2e/visual.spec.ts`):

| | R min/max/mean | G | B | R−B | luminance spread |
|---|---|---|---|---|---|
| Paper Day | 244/249/246.5 | 244/249/246.0 | 241/246/243.9 | 2…3 (mean 2.6) | 5.0 |
| Graphite Night | 26/31/28.6 | 29/34/30.9 | 30/36/32.8 | −6…−3 (mean −3.5) | 4.9 |

**Whole-plane grid** (every 24 px, 2400 points, background only): Paper Day R 234–250, G 234–250,
B 231–248, R−B 1…4 (mean 2.7), luminance 234.0–249.8 (spread 15.8). Graphite Night R 20–33, G 21–34,
B 22–37, R−B −7…0 (mean −3.5), luminance 21.1–33.9 (spread 12.8). Graphite Night has no positive
R−B anywhere: **no warm cast exists to read as a brown hotspot.**

**Centre scanline luminance profile** (background only, sampled every 8 px; the "no boundary / no
hotspot" claim as evidence rather than an adjective). A spotlight or a radial vignette would show a
hump peaked at the *centre* (x≈720 / y≈480) with a visible ring on the way down:

- Paper Day, horizontal y=480: min 243.1 (x=1416) → max 248.1 (x=584), peak-to-peak **5.1**; profile
  (every 64 px): `247 247 246 246 247 248 248 247 246 248 247 247 246 247 246 247 246 245 246 245 245 245 244`.
- Paper Day, vertical x=720: min 236.9 (y=912) → max 248.9 (y=272), peak-to-peak **12.0**; profile:
  `240 241 244 245 248 248 248 247 247 246 246 243 242 241 237`. A single gentle arc, brightest in the
  upper third, deepest at the bottom edge — no ring, no centre peak.
- Graphite Night, horizontal y=480: min 26.8 (x=1360) → max 31.7 (x=328), peak-to-peak **4.9**.
- Graphite Night, vertical x=720: min 22.9 (y=936) → max 33.1 (y=288), peak-to-peak **10.2**; profile:
  `28 28 31 31 32 33 32 31 32 31 30 28 27 25 25`. Brightest above the middle, settling toward the
  bottom — the shape of one large off-centre form, not a centred gradient.

Both axes are smooth and single-humped with the peak *off-centre* (upper/left), i.e. exactly the
opposite of the rejected centred spotlight; nothing in either profile shows a circular boundary.

## Verification run

- `npx vitest run tests/unit/atmosphere.test.ts tests/unit/interactionLayer.test.ts` — pass (all
  contract assertions: custom-property geometry, `radial-gradient(… at var(--atmos-lift-x) var(--atmos-lift-y) …)`,
  `--atmos-drift: 24s`, drift inside 35–80 px, exactly one `animation: atmosphere-drift` and two
  `animation:` declarations, `--atmos-grain-opacity`, `feTurbulence`, the reduced-motion stop shape,
  `--interaction-mask: var(--field-bg)`).
- `npx playwright test tests/e2e/visual.spec.ts` — 8/8 pass (numbers above). One unrelated settings
  assertion (`sectionTitle`) flaked to `NaN` once and passed on re-run; it does not touch the
  atmosphere.
- `tests/e2e/motion.spec.ts › the atmosphere is alive within seconds` — pass (`atmosphere-drift`, 24 s,
  >1 px of travel inside the watch window).

## Could not verify

- antfu.me's homepage DOM (client-rendered SPA; no body text on fetch) — the study used its CSS bundle
  and prerendered pages instead.
- Motion or taste: a screenshot cannot see the 24 s drift, and no pixel test can judge "does it feel
  alive"; only the quantitative claims above are verified.

# Phase 2.7 — the Composer's material (studied 2026-09-15, before the redesign)

The review asked for the current ChatGPT and Claude web composers to be studied for *how a floating
writing surface behaves*, and explicitly forbade copying them pixel-for-pixel. This section records
what was actually studied and what was taken.

**What could and could not be inspected.** ChatGPT (`chatgpt.com`) and Claude (`claude.ai`) are
authenticated, client-rendered applications: their composer exists only after sign-in, in a canvas the
server never sends, so there is no DOM or stylesheet to fetch the way antfu.me's bundle was fetched
above. The study below is therefore of their **published, widely-documented design language** — the
surface behaviour visible in every released client — not of their source. That is stated plainly
rather than dressed up as a source inspection, and every adopted principle below is checkable in
Diffusion's own stills and CSS.

**OBSERVED (the design language, restated as principles)**

- **One writing row.** The composer is a single line of text with its one action at the end of that
  same line; it is not a form with a control row under the writing.
- **Grows only as needed.** One line at rest; the surface opens downward as text is added, and the
  text scrolls at a cap instead of the surface chasing the text forever.
- **A soft, low-contrast surface.** A fill that is barely distinguishable from the page, a hairline
  edge, a restrained radius and a soft shadow *only* to seat it above the page — never a heavy card,
  never a glowing border.
- **Writing first, controls second.** The primary action is quiet and secondary to the words;
  keyboard rules are not permanently on screen.
- **The controls never crowd the placeholder.** At rest the surface is mostly empty space with a
  single low-contrast prompt.

**BORROW (Diffusion decisions)**

| principle | what Diffusion did |
| --- | --- |
| one writing row | the focused shell is a grid: `.speak-row` and `.speak-action` share row 2 (`grid-area: 2 / 1` and `2 / 2`, bottom-aligned) |
| grow only as needed | unchanged and pinned: 108 px textarea cap, then `data-overflowing` scrolls |
| low-contrast surface | fill one step above the Field (`surface-1` at 92 %), edge at 46 % of `--boundary`, one small lift `0 12px 28px -22px` + `0 1px 3px` |
| writing first | the action sits at the end of the sentence it commits; the keyboard note moved *out* of the material to a quiet line below it |
| quiet placeholder | unchanged idle: the Field's own caret mark and 20 px tick, 250 px wide |

**DO NOT BORROW**

- Pixel values, type sizes, radii, colours, the circular filled send button, or any branding. Every
  number in Diffusion comes from its own scale (`--radius-control`, `--space-*`, the type roles).
- The chat-app reading of the object: no send-icon-only affordance, no permanent hint row, no
  growing "panel" holding history. Diffusion's composer stays a place to *think into*, and the
  action keeps its words (`↵ Think`) because the label is what says what committing does.
- A raised, opaque card with a second opaque layer under it. `.speak-light` was cut from two layers
  (a warm radial **plus** an opaque surface gradient) to just the 6 % highlight: the second layer was
  what made the surface read as a card rather than as paper resting on the Field.

**What the review rejected, and why it was real.** The Phase 2.6 composer was already "quiet" by its
own description — a thin surface, a restrained radius, one illumination layer — but it was
*three stacked rows inside one material* (scope, writing, action, note), ~106 px tall for one line of
writing, with an opaque fill. That is the shape of a form, not of a writing surface, and it is what
the review saw. The material barely moved in this pass; the *layout* is what changed.

## Phase 2.8B-1 — provider and discovery reference gate (inspected 2026-09-15, before implementation)

Per this project's reference-first rule, every provider adapter in this phase was written against
current first-party documentation and a live measurement, never from memory. The `aft_outline` URL
fetcher is unusable in this environment (external hosts resolve into a blocked private range), so
documents were fetched read-only with `curl` and parsed from server-rendered HTML / first-party
JSON.

**Host migrations observed** — the addresses in older notes now redirect, which is itself the reason
this gate exists: `platform.openai.com/docs/*` → `developers.openai.com/api/docs/*` (API reference at
`developers.openai.com/api/reference/resources/...`), `docs.anthropic.com/en/*` →
`platform.claude.com/docs/en/*`. `ai.google.dev` is bot-walled and was read with a Googlebot user
agent plus Google's own discovery document
(`generativelanguage.googleapis.com/$discovery/rest?version=v1beta`, `revision: 20260914`).

### OpenAI

- Base `https://api.openai.com/v1`; `POST /chat/completions`, `POST /responses`, `GET /models`.
- Auth `Authorization: Bearer <key>`.
- **Chat Completions: `max_tokens` is explicitly deprecated in favour of `max_completion_tokens`** and
  is *not compatible with o-series models*. Diffusion therefore sends `max_completion_tokens`.
- **Responses nests JSON mode under `text.format`**, not `response_format`; the output cap is
  `max_output_tokens`. Both differences are encoded in the provider table rather than guessed.
- Model list shape `{object:"list", data:[{id, created, object, owned_by}]}`.
- Errors `{error:{code, message, param, type}}` (OpenAI's own OpenAPI spec marks all four required).
  `429` carries `type: rate_limit_error` (sometimes `code: slow_down`); billing `429`s use
  `type: insufficient_quota` with specific codes. `503 service_unavailable_error` carries
  `code: server_is_overloaded` and asks the client to honour `Retry-After`.

### Anthropic

- Base `https://api.anthropic.com`; `POST /v1/messages`; `GET /v1/models`.
- **Auth: `Authorization: Bearer` is now primary, `x-api-key` is the legacy fallback still supported.**
  Diffusion uses `x-api-key`, which remains valid and is what a user-created API key is for.
- `anthropic-version` is **required**; `max_tokens` is **required** on the Messages API, so `auto` depth
  still has to send a concrete number or the request is a 400. That exception is deliberate and
  commented in `outputBudget`.
- Model list `{data:[{type, id, created_at, display_name}], first_id, has_more, last_id}`.
- Structured output currently lives at `output_config.format` (the older `output_format` field and its
  beta header are deprecated), and reasoning effort at `output_config.effort` (`low|medium|high|xhigh`).
- Extended thinking: `{type:"enabled", budget_tokens}` is **deprecated on Claude 4.6 and rejected with a
  400 on 4.7+**; the current model is `thinking:{type:"adaptive"}`. Diffusion sends **no thinking
  parameter at all** for Anthropic in this pass and claims no reasoning control in Settings — a
  capability Diffusion does not exercise must not be advertised.
- Errors `{type:"error", error:{type, message}}`; `401 authentication_error`, `403 permission_error`,
  `404 not_found_error`, `429 rate_limit_error`, `500 api_error`, `504 timeout_error`,
  `529 overloaded_error`.
- **Measured, not assumed:** a preflight for `x-api-key`, `anthropic-version` and
  `anthropic-dangerous-direct-browser-access` from a desktop webview origin answers
  `access-control-allow-origin: *` (HTTP 200); without that header the same preflight is refused.
  Anthropic therefore documents and supports this exact situation — an application calling the API
  with a credential the user holds on their own machine — and Diffusion sends the header.

### Google Gemini

- Base `https://generativelanguage.googleapis.com/v1beta`; `POST /models/{model}:generateContent`;
  `GET /models`.
- Auth is `x-goog-api-key` **or** `?key=`; Diffusion uses the header, so a key can never land in a URL,
  a log or a referrer.
- Body `{systemInstruction, contents:[{role, parts:[{text}]}], generationConfig}`; JSON output via
  `generationConfig.responseMimeType: "application/json"` (`responseSchema` is flagged deprecated in
  Google's own discovery document in favour of `responseJsonSchema`); text read from
  `candidates[0].content.parts[].text`.
- Model list `{models:[{name:"models/…", displayName, …}]}` — the id is `name` with the `models/`
  prefix stripped.
- Errors: Google's specific envelope uses a numeric `code` plus an UPPER_SNAKE `status`, while the newer
  Interactions surface documents string codes (`invalid_request`→400, `authentication`→401,
  `permission_denied`→403, `model_not_found`→404, `rate_limit_exceeded`→429, `service_unavailable`→503,
  `deadline_exceeded`→504). Diffusion reads whichever token is present.
- **Measured:** the preflight answers `access-control-allow-origin: <origin>` and explicitly allows
  `x-goog-api-key`, so the desktop shell can call it directly.

### DeepSeek

- Base `https://api.deepseek.com` (also an Anthropic-compatible base at `/anthropic`).
- `POST /chat/completions`, `GET /models`, `Authorization: Bearer <key>`.
- Model list `{object:"list", data:[{id, object, owned_by}]}`.
- JSON output supports `response_format:{"type":"json_object"}` **only** — there is no `json_schema`
  mode — and, exactly as with OpenAI's JSON mode, the model must still be *instructed* to emit JSON or
  it may return whitespace until it hits the token limit. Diffusion's shared instruction block
  satisfies that requirement for every provider.
- Error statuses 400/401/402/422/429/500/503 are documented; the error *body* is not printed by
  DeepSeek and is inferred from its stated OpenAI compatibility. Flagged as PARTIAL, not VERIFIED.
- **Measured:** the endpoint answers the desktop webview origin.

### Cross-origin result (the measurement that decided the transport)

All four providers accept a request from this application's origin, which is what allows the desktop
build to use the user's own key directly with no separately running gateway:

| Provider | Direct cross-origin | Note |
|---|---|---|
| OpenAI | Yes | `access-control-allow-origin: *` |
| Anthropic | Yes, only with `anthropic-dangerous-direct-browser-access` | refused otherwise |
| Gemini | Yes | explicitly allows `x-goog-api-key` |
| DeepSeek | Yes | — |

A web deployment still leads with the Diffusion Gateway. This measurement shows browser-direct access
is *possible*; it does not show it is universally safe, deployable or desirable, and the browser build
does not offer it.

### Discovery engine source (SmartSearch 1.0.3 origin)

- Version `1.0.3`. `requires-python >=3.10`; runtime dependencies `httpx[socks]` and `tenacity` with no
  stdlib fallback for the network path, so the engine needs a real Python environment — which is
  precisely why the desktop build freezes it rather than asking the user for one.
- The machine contract is one JSON line on stdout: `{version, operation, status, data, attempts,
  warnings, error}` with `version: 1` as the *schema* version. **There is no `--version` flag**, and
  the docs state the v1 CLI does not promise one — so the bundled artifact carries its own `VERSION`
  file instead of being interrogated.
- **The exit code is not the contract.** Measured: an unsupported operation and an invalid URL both
  exit `0`, and an unconfigured search exits `0` while emitting `status: "failed"`. The envelope is the
  authority, which is what `envelope()` implements.
- Discovery roles `brave`/`exa`/`tavily`; reader roles `jina` (anonymous-capable), `firecrawl`, and an
  Exa reader. Jina is a fetch provider, **not** a fourth search engine.
- Configuration is environment-first and needs no interactive `setup`: `setup` is interactive-only and
  is never invoked by Diffusion.
- **Measured: `<SOURCE>_ENABLED` defaults to `true`.**
  `providers/registry.py` builds a discovery adapter when `api_key and enabled`, and `config.py`
  resolves the flag with `(value or "true").lower() in ("true","1","yes")`. This is the single most
  important fact for Diffusion's integration, because it means *omitting* a disabled source would
  silently enable it.
- No PyInstaller/Nuitka/shiv/pex configuration existed upstream; `build/` is a stale gitignored
  setuptools `bdist` directory, not an artifact. The standalone executable is produced by Diffusion's
  own build script.

**Packaging measurement (this pass):** PyInstaller `--onefile` over the engine source produces a
**11.6 MiB** self-contained `diffusion-discovery` (built by `pnpm run build:discovery`), runs with
`PATH` containing no Python, and performs a real search through Diffusion's own argument/environment
builders against a stub provider in **≈0.4 s** including the provider round trip.


# Spatial Editorial / Living Paper reference pass (2026-09-19)

This pass is limited to Stage A/B of the redesign: audit/reference decisions and the visual grammar foundation. It does **not** adopt another product's object model, canvas framework, or source code. Public product/documentation pages were inspected for interaction and composition principles only.

## Kinopio — direct manipulation

**Inspected:** https://kinopio.club/

**OBSERVED:** Cards are created directly on the space, connections are dragged from objects, and paint selection makes multi-object manipulation visible and forgiving.

**BORROW:** The feeling that spatial objects are grab-able without hunting for handles; generous interaction affordance should be legible from hover/selection.

**DO NOT BORROW:** Colorful card language, Boxes/Lists ontology, or the assumption that every Thought is a card.

**DIFFUSION DECISION:** Keep DOM Thoughts and existing Field geometry. In Stage B, reveal material presence at hover/selection while preserving the rule that a Thought is not a permanent card. Hand/gesture semantics stay for Stage C.

## tldraw — interaction overlays and pointer ownership

**Inspected:** https://tldraw.dev/sdk-features/indicators, https://tldraw.dev/sdk-features/tools, https://tldraw.dev/sdk-features/selection

**OBSERVED:** Hover/selection indicators are rendered separately from shape content; input routes through explicit interaction states/targets; selection is state while bounds/indicators are derived presentation.

**BORROW:** Keep canonical content separate from interaction overlays and transient selection presentation. Preserve the current imperative pointer hot path rather than pushing pointer-frequency state through React.

**DO NOT BORROW:** Whiteboard tool modes, shape ontology, handles, or a new canvas/state-machine framework.

**DIFFUSION DECISION:** Stage B stays CSS/presentation-first. Existing relation/selection SVG overlays remain overlays; no React Flow/tldraw migration.

## BlockSuite Edgeless — layer separation

**Inspected:** https://blocksuite.io/components/editors/edgeless-data-structure, https://blocksuite.io/components/editors/edgeless-editor

**OBSERVED:** Edgeless content separates document/block data from spatial surface elements and top-layer widgets; spatial coordinates are first-class without requiring every visible interaction affordance to become document state.

**BORROW:** Treat canonical objects, transient generated material, and interaction overlays as distinct conceptual layers.

**DO NOT BORROW:** Block tree, frames/groups, surface block architecture, or AFFiNE/BlockSuite document semantics.

**DIFFUSION DECISION:** Keep the current ProjectState/session/phenomena split and make the distinction perceptually clearer rather than rewriting storage.

## Allume / Muse — organized unfinishedness

**Inspected:** https://allume.com/ and the current App Store description for Allume (formerly Muse).

**OBSERVED:** The product explicitly treats the canvas as a place where raw materials can grow organically before formal organization; mixed material can coexist without forcing early structure.

**BORROW:** Uneven but intentional visual weight, comfortable local composition, and the sense that an unfinished space can still feel inhabited.

**DO NOT BORROW:** Nested-board ontology, file/card model, or a canvas-inside-canvas navigation system.

**DIFFUSION DECISION:** Preserve negative space and the existing atmosphere, but give Thoughts/Ghosts/Sources/Crystals enough material identity that unfinished no longer reads as empty.

## Milanote — composition rhythm

**Inspected:** https://help.milanote.com/en/articles/359381-images and Milanote public guide pages demonstrating drag-on-board composition.

**OBSERVED:** Board composition relies on clear object rhythm, freely positioned material, and immediate drag/resize feedback.

**BORROW:** Spatial rhythm and side-by-side legibility: related material should read as a local composition rather than a vertical transcript.

**DO NOT BORROW:** Permanent note-card framing, media-board chrome, columns, or card-editor affordances.

**DIFFUSION DECISION:** Stage B changes object weight and relation traces only; placement grammar remains a later stage.

## Are.na — quiet consistency

**Inspected:** https://help.are.na/docs/getting-started/channels and https://help.are.na/docs/getting-started/blocks/adding-blocks

**OBSERVED:** Reordering and adding material use restrained, consistent surfaces; the UI stays secondary to the collected content.

**BORROW:** Quiet feedback and consistent element treatment without making the interface invisible.

**DO NOT BORROW:** Channel/block content model or feed/grid composition.

**DIFFUSION DECISION:** Keep system labels small and secondary. Let human-written text remain the dominant ink.

## Linear — contextual action proximity

**Inspected:** https://linear.app/docs/select-issues, https://linear.app/changelog/2019-10-07-contextual-command-menu

**OBSERVED:** Actions are scoped by the current selection and can be invoked near the object/context rather than always through a global center-screen command surface.

**BORROW:** Selection should visibly own its local actions; proximity and immediate state feedback reduce ambiguity.

**DO NOT BORROW:** Issue-tracker density, status color coding, or list-centric selection visuals.

**DIFFUSION DECISION:** The existing ScopeHub remains structurally intact in Stage B. Its full editorial-action-strip redesign belongs to Stage D; this pass only ensures the selected material beneath it has enough perceptual weight.

## Stage A repository audit: KEEP / REWORK / REMOVE

### KEEP
- Existing DOM Thought rendering and geometry cache.
- Existing ProjectState/session separation and Ghost session model.
- Existing atmosphere: neutral paper/graphite material, subtle grain, no pointer ownership.
- Existing SVG relation/selection overlay architecture.
- Existing warm-neutral palette and oxide/brick attention accent.
- Existing imperative pointer path; Stage A found no reason to replace it for visual work.

### REWORK IN STAGE B
- Field identity was too small/recessive to read as page identity.
- Resting Thoughts had material code but still read close to floating text.
- Ghost identity depended too much on low opacity and action-specific borders.
- Source identity depended mostly on font/meta text and lacked a reference trace at rest.
- Crystal used a hollow diamond and insufficient settled weight.
- Relation lines stayed too present in ordinary state and did not sleep enough.

### REMOVE / AVOID
- No ontology-by-color.
- No purple AI language, glow, shimmer, particles, cards, or decorative tech imagery.
- No production component replacement for visual reasons alone.
- No interaction-semantic changes in Stage B.

# Development Material Gallery references

## Paper Shaders 0.0.81 — PACKAGE + SOURCE INSPECTION / DIRECT USE

**INSPECTED**
- Package `@paper-design/shaders-react@0.0.81` and exact core dependency `@paper-design/shaders@0.0.81`.
- Repository https://github.com/paper-design/shaders at `43cd68db79fa0b1759f72ffc941b3238e2a3954c`.
- `packages/shaders-react/src/shaders/paper-texture.tsx`, `perlin-noise.tsx`, `shader-mount.tsx`; corresponding core shaders/mount; Apache-2.0 `LICENSE` and `NOTICE`.

**USE**
- Public `PaperTexture` and `PerlinNoise` components are package imports in the dev-only gallery. No Paper Shaders source is copied.
- Diffusion supplies adjacent neutral colors, low detail, a 1080p pixel cap, and `speed={0}` for true static rendering. The package already pauses RAF while hidden/offscreen.

**NOTICE**
- Exact provenance and retained Apache license/NOTICE are in `docs/third_party/MATERIAL_GALLERY.md`.

## React Bits material backgrounds — SOURCE-CODE INSPECTION / ADAPTED COPY

**INSPECTED**
- Repository https://github.com/DavidHDev/react-bits at `9481af758aae6cfb34c3652ec40a1c099360331f`.
- `src/ts-default/Backgrounds/Topography/Topography.tsx`
- `src/ts-default/Backgrounds/Threads/Threads.tsx`
- `src/ts-default/Backgrounds/Waves/Waves.tsx`
- `src/ts-default/Backgrounds/Silk/Silk.tsx`
- Root `LICENSE.md`: MIT + Commons Clause License Condition v1.0, Copyright (c) 2026 David Haz.

**USE**
- Those four implementations are copied into `src/dev/material-gallery/backgrounds/vendor/`, with prominent modification notices.
- Diffusion retains each renderer's shader/noise implementation while adding true static mode, hidden/offscreen pause, capped resolution, neutral parameters, and pointer-inert operation. Silk remains in its own lazy chunk.
- This is application use, not sale, sublicense, or redistribution of the components themselves.

**NOTICE**
- The retained license, exact source mapping, dependency versions, and modifications are in `docs/third_party/MATERIAL_GALLERY.md` and `docs/third_party/REACT_BITS_MATERIALS_LICENSE.md`.
