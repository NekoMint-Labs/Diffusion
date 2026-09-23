# Architecture and preserved boundaries

Diffusion is a quiet thinking medium for ideas before commitment. This document is the authority on
current implementation ownership and on the boundaries that presentation, AI and platform code must
not cross; product semantics are in
[`specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md`](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md).

## State ownership

`ProjectController` and a React-independent reducer own canonical Thoughts, Crystals, Sources, relations, Regions, Threads and semantic trajectory. Events declare an actor; AI cannot mutate this state. System commands are narrowly allowlisted. Explicit user confirmation creates a Crystal/permanent relation. Ghosts remain session possibilities until claimed; Claim/Wake preserve IDs and geometry.

Camera/drag/pointer/lasso state is transient. Zustand owns UI selection/editing/surfaces/return points, not canonical history. React subscribes at semantic or throttled visibility boundaries; it does not own each pointer frame.

## Interaction and presentation

`pointer/wheel -> controller -> requestAnimationFrame -> DOM transform`

`pointerup/idle -> one canonical command -> reducer -> coalesced repository snapshot`

DOM Thoughts and an SVG phenomenon layer remain. Grid index, cached ResizeObserver geometry and viewport-margin culling bound work. Local Thought geometry is measured; semantic-zoom fonts counter-scale without corrupting that local geometry cache. Neighborhood/Atlas disclosure suppresses overlapping labels and removes ordinary detail, not world coordinates. A small number of remembered landmarks replaces full tiny text.

The Quiet Editorial Field uses a shared token system for both themes, text-like Rest/Hover/Selected states, surfaces only for an active task, and a five-command application menu. Contextual actions use the already-declared Floating UI primitives. Theme, Focus and one-time emergence transitions never run pointer-frequency React state updates. Focus only reveals established relationships.

Field materials have one production architecture: Paper Texture (the default), Topography, Threads, Waves, and Silk are lazy renderers inside `src/ui/fieldBackgrounds/`. The host is viewport-bounded and screen-space, so camera frames update only the Thought/phenomenon world and never write background CSS variables onto `.app`. Every material remains pointer-inert, `aria-hidden`, and outside the camera-owned world.

Thought width is deterministic and bounded (`compact`, `regular`, or `wide`) from text content. Editing freezes the measured pre-edit width and applies a new class only after commit. Mounted interaction uses cached `ResizeObserver` geometry. Before an item mounts—and when semantic disclosure decides which labels may mount—deterministic kind-aware estimates mirror the CSS widths for ordinary Thoughts, Sources, and Crystals; measurement supersedes the local estimate after render. Collision correction and lasso use rendered bounds when available, while disclosure, initial placement, and Region observation deliberately use those bounded estimates rather than inventing a second renderer.

Appearance is device-local presentation state owned by `src/ui/appearance.ts`, `src/ui/workspace/useWorkspaceSettings.ts`, `src/ui/fieldBackgrounds/`, and the atmosphere layer. Theme/Profile, Field Style, Accent, and Image Atmosphere are independent; Field Presence and Ambient Motion are bounded controls. Reduced Motion sets effective ambient movement to zero without changing the stored preference. None of these settings enter canonical `ProjectState`, project Dexie records, collision, camera authority, or `GeometryCache`. Decorative Field layers stay full-bleed in viewport space, pointer-inert, and `aria-hidden`; the camera-owned world continues to contain DOM Thoughts and SVG phenomena only.

## Commands and history

One command model (`src/ui/commands`) defines every semantic action once: id, localized label, aliases, platform-neutral shortcuts, contextual availability and one `run`. Menus, the palette, the keyboard router and the shortcut reference are projections of that registry, so no presentation owns business logic. An action may be reachable from the Field title, right-click, the Scope Hub, the palette and a shortcut while remaining a single definition.

Ownership is split deliberately: the Field title owns Field-level operations, the top-right affordance owns application/view operations, and selection-bound actions live in the selection menu and palette. Availability removes commands that cannot apply, so presentations never fill with disabled rows.

Keyboard ownership is a single ordered chain: IME composition is never a command, Escape closes exactly one transient owner, `global` navigation commands may supersede an open owner, and every other command requires that no text editor, menu or modal owns input. The router's `window` listener is wired with the commit (`useLayoutEffect`), never after paint: the DOM is interactive as soon as React commits it, so a press delivered before a passive effect flushed would be dropped. Undo/Redo histories live beside canonical mutation in `ProjectController` as bounded snapshots; one user dispatch is one entry, camera/selection/focus are never entries, and UI components never hold a stack. Find in Field is deliberately non-modal: it reveals matching content in place, keeps the Field interactive, and moves the camera only on an explicit next/previous request, preserving zoom.

The EN/ZH dictionary is small and reactive. User text, fetched passages and model replies are never rewritten for localization. Static coverage is checked independently of runtime component rendering.

## Threads and depth

Thread stores frozen scope IDs plus text/kind/source references captured on creation. Explicit Add selection extends snapshots but does not silently refresh earlier wording. Field remains usable beside its split manuscript. Deep Dive has its own context rail and structured manuscript component, not the Thread rendered wider. The Field remains mounted but visually recedes completely in focus mode; exact return camera/selection is preserved.

Messages are response history, not canonical Field content. Bring from a response creates a possibility. The bounded manuscript parser handles readable headings/tables/quotes/code and safe links; no arbitrary HTML execution or general writing-editor model is imported.

## Sources, providers and trust

Explicit intent compiles a bounded packet -> replaceable provider -> semantic intent validation -> Core permission gate -> session candidates/permitted presentation. Canonical state is not handed to a model as a mutable object.

Phase 3A gives unscoped authored input a separate structured-ingestion contract. The exact text is first persisted as an `InputRecord`; extraction then returns bounded Thought/Question proposals whose exact `sourceQuotes` are resolved deterministically into ranges over that record, followed by a separate relation-inference pass over validated proposal IDs. Those results remain session `Ghost` / tentative `Phenomenon` state until the person claims, edits, keeps or confirms them. A failed/disabled ingestion falls back to one canonical Thought containing the authored text, while the raw input remains durable. This path reuses provider transport but is deliberately not squeezed through `SemanticIntent`.

AI work has one request-id-aware `ThinkingOperation` source for pending/completed/failed/cancelled presentation. Action-specific runtime permissions are stricter than global semantic legality: a relation probe, for example, may surface a relation candidate or no result but cannot navigate into Deep Dive, Thread or Crystal.

Discovery results are stripped to candidates. Read requires bounded fetch + extraction matched to fetched text, with actual locators/time/provider. Assessment requires a claim and actual passages; the gateway re-fetches before reasoning and outcomes cite known IDs. Core validates Source records on add/update/Fork bring. Imported legacy snippets remain discovery text, not evidence. Updates of an explicitly brought candidate preserve the existing Thought's identity and position.

Hono, Zod and the operator-controlled gateway are retained. Chat Completions and Responses are isolated wire adapters. Normalized HTTP evidence remains default; one discovery transport seam (`src/discovery/runtime.ts`) carries either the bundled Diffusion-owned engine or the operator's normalized HTTP endpoint, and nothing above it knows which one answered, so aggregation/normalization/retry/reranking stay in the engine and are never duplicated. The short-lived fetched-body pairing cache is memory-only and bounded. Private bodies and subprocess error text are not telemetry.

**Phase 2.8B-1 separates thinking from discovery.** They are two capability families, not one provider system, and either may be missing while the product stays usable:

```text
                    Diffusion intent
                          |
             +------------+------------+
             |                         |
        Thinking engine          Discovery engine
             |                         |
      AI provider layer            bundled engine
             |                         |
   OpenAI / Anthropic /          Exa / Tavily / Brave
   Gemini / DeepSeek /                  |
   OpenAI-compatible /            reader / fetch
   Diffusion Gateway                    |
             |                         v
             +--------------------> Evidence pipeline
```

*Capability composition, not dependency chains.* No AI and no search is a valid product state (the Field is manual). AI without search is valid (model-based exploration). Search without AI is valid. Missing an optional capability never means the whole feature crashes.

`src/ai/providers.ts` is the inspected provider table; `src/ai/wire.ts` implements four protocols by name rather than flattening them; `src/ai/transport.ts` is the one send seam, so no provider adapter knows how a request leaves: a browser build sends it itself with its session credential, and Desktop hands it to the native layer (`src-tauri/src/native_ai.rs`), which resolves the provider key from the operating system's store, signs the request and performs it. `src/ai/registry.ts` turns a selection into a provider and, on a build with an OS-backed store, learns only whether a credential exists rather than its value. `src/discovery/runtime.ts` is the one discovery transport seam, carrying either the bundled Diffusion-owned engine or the operator's normalized HTTP endpoint, so Settings, Explore semantics and evidence records are unchanged by which one answered. Diffusion owns exactly one copy of the engine's output envelope (`src/discovery/envelope.ts`) because it is the integration seam; no adapter, retry policy, normalization, pooling or reranking is duplicated.

The provider may return possibilities. It never moves, deletes or edits a Thought, commits a Crystal, confirms a relation or mutates canonical storage. Semantic validation and the Core permission gate are unchanged and were not weakened for provider compatibility.

## Persistence and attention

The ProjectRepository boundary is unchanged. Dexie still uses the original database name and snapshot/original tables, now with a version-3 in-place migration that adds durable raw-input records without changing portable project `schemaVersion: 1`. Pure migration runs on load too, covering imported legacy exports after a database is already upgraded. Invalid legacy data is reported rather than silently discarded.

Controller saves are single-flight, with only the newest pending snapshot retained. Gesture commits, not individual pointer frames, schedule writes. Flush and visible errors guard project switching. Undo is bounded in-memory semantic state, not durable event-sourced time travel. Portable export excludes local native paths/original keys/bytes and transient Ghosts.

Attention pressure is produced by recent purposeful activity in an active, sufficiently crowded Field. Closed time is not a cooling trigger. Participants and confirmed neighbors are protected; Keep caps fading before Memory and Crystals are exempt. Explicit Let fade releases an unfinished Thought's Keep protection without deleting it. Re-entry preserves the spatial landscape.

Measured memory/serialization/Find/index costs did not justify replacing snapshots or adding a new index dependency. Actual IndexedDB disk latency remains unmeasured, and multi-tab write coordination is not implemented.

## Platform

The platform factory selects browser or Tauri adapters around one UI/database. Native file dialogs grant scoped access; no filesystem-root permission or unrestricted retained-path opener is added. Unsupported content is Limited/metadata-only, not fake parsing. Native original bytes can be saved as a copy. Real OS permission/persistence/reopen checks remain required.

## Frontend ownership (v0.3.2 structural cleanup)

`src/ui/Workspace.tsx` is the composition root and nothing else: it constructs the systems, connects them, keeps the DOM refs that the command registry and keyboard router share, holds the one notice line and the pending blank-Field point, and renders the top level. Each capability has one owner:

| Module | Owns |
|---|---|
| `ui/workspace/useWorkspaceSettings.ts` | Device preferences, locale, Thought typography, Theme/Profile, Field Style, Accent, Image Atmosphere, Field Presence, and Ambient Motion. Never canonical Field state; secrets are never restored. |
| `ui/workspace/useWorkspaceCapabilities.ts` | What this *build* can do: which credential store exists, whether a bundled discovery engine is present and how it is launched. Asks the native layer rather than trusting a build flag, so an unpackaged development run reports "not available" instead of promising a search that fails; the enabled sources are handed over as identifiers, and the native layer — never this hook — turns them into the child environment and its secrets. |
| `ui/workspace/useThinkingCapabilities.ts` | What is known about the selected provider, and the two deliberate actions (`Test connection`, `Refresh models`) that change it. No network follows a keystroke. |
| `ui/workspace/useThinkingService.ts` | Provider selection, `AIRuntime`, `DiffuseSession`, evidence provider, source parser/importer, and their disposal. |
| `ui/workspace/useWorkspaceSurfaces.ts` | Which transient place owns input, the return point (camera + selection) captured on open and restored on close, per-surface scope, the Crystal preview draft. |
| `ui/workspace/useFieldActions.ts` | Field-scoped operations on canonical content: create, duplicate, copy, keep, fade, delete, carry, observe, dropped text, reference/Region entry. |
| `ui/workspace/useThinkingIntents.ts` | How deliberate intent becomes thinking: the temporary writing session, a Thread, a Crystal preview, continuing from a Crystal, a brought reference. |
| `ui/workspace/useProjectActions.ts` | The Field as a file: create, duplicate, switch, export archive/Markdown, flush-before-crossing. |
| `ui/workspace/useWorkspaceLifecycle.ts` | Notice dismissal, the slow attention tick, window visibility, the unload guard. |

A composition root may connect systems; it must not implement a capability another module owns. When a capability is added, it goes to the owner above, not into `Workspace`.

## Field hot path

`field/spatial/pointerTarget.ts` is the only pointer/context classification in the product: which event belongs to a text editor, to a control that owns its own press, to passive decoration, or to the blank Field. It is pure DOM classification, reads no state, and is tested without a DOM.

Everything that is one machine stays in `Field.tsx`: the gesture object, `CameraController`, pointer capture, rAF coalescing, the grid index, culling and direct world transforms. React state there is limited to the culled visible set, the semantic level and the stable camera; pointer-frequency values live in refs and are never mirrored into React state. Moving them into a store would put a React render on the pointer path, which the performance contract forbids.

## Phenomena boundary

Semantics never reach a renderer directly:

```text
Core / session semantics          relation, phenomenon, selection, attention
        |
        v
field/spatial/focus.ts            attention (which relations are live)
        |
        v
field/phenomena/describe.ts       typed description, world coordinates, no drawing
        |
        +--> current SVG renderer (Field.tsx)
        +--> a future GPU renderer
```

`describeRelations()` resolves endpoints from the geometry cache and returns `RelationPhenomenon[]`; a relation with an unmeasured endpoint is absent rather than drawn at an invented position. Core knows nothing about SVG, canvas, shaders or visual timing, and `field/phenomena/glyph.ts` holds the visible mark for each relation kind instead of `core/model.ts`.

## Motion ownership contract (Motion, GSAP, and the future GPU layer)

`ui/motion/tokens.ts` is the vocabulary: duration roles (`instant`, `micro`, `control`, `surface`, `spatial`, `settle`, `signature`) and easing roles (`enter`, `exit`, `move`, `settle`, `attention`, `signature`). `ui/motion.ts` turns a role into a Motion transition. `ui/motion/signature.ts` turns the *same* roles into GSAP eases by registering a `CustomEase` per role with the identical control points. `ui/surfaces/surfaceMotion.ts` decides which kind of place gets which role, as one pure function. `theme.css` mirrors the numbers as `--motion-*` / `--ease-*` for the pointer-frequency micro-states CSS owns. `tests/unit/motion.test.ts` holds all three copies to the same values, so a role is a contract rather than a naming convention.

The rule that must hold with more than one animation technology present:

> **The same visual property may not have two animation owners at the same time.**

- React/Motion owns ordinary component animation: hover, press, menus, selects, tabs, dialogs, shared-layout shells and component enter/exit.
- GSAP owns *authored sequences*, and nothing else. It is imported by exactly one module (`ui/motion/signature.ts`) and its three sequences are Empty → First Thought, Field switch, and the History reveal. GSAP never writes the Field world transform, the camera, or anything on the pointer path.
- A GPU phenomena layer (Pixi) will own spatial visual effects that the description boundary above feeds. It does not exist yet.
- Semantic ownership never waits for animation: a dismissed owner stops owning input, `role`, `aria-hidden` and its test id immediately, and its exit is only a visual echo. `pointerEvents` is applied at once, never animated.
- A **menu is not a dialog**. A Diffusion menu is a bounded projection and the Field stays live underneath it, so the menu library's modal mode is off: Base UI's default modal menu renders a full-screen invisible layer that absorbs the first outside press, which would make selecting a Thought or placing the caret take two clicks.
- **Focus follows the gesture.** One coordinator (`useTransientFocus`) is the only authority that restores focus. It treats a pointer press outside an open owner as the user choosing a new target and focuses what they pressed; a keyboard dismissal has no such gesture and returns to the opener. A popup library's own return-focus is disabled rather than left to disagree with it.
- A transient owner claims focus from an effect on its own ownership flag, never from mount-time `autoFocus`: when an owner is re-opened before its exit finishes, `AnimatePresence` revives the same key instead of remounting the child, so a mount-only focus is never applied and the owner appears without input focus.
- Reduced motion collapses a role to zero duration rather than hiding the change, for both technologies: a GSAP sequence is not built at all when the user asks for reduced motion, because the state change it decorates has already happened.
- CSS never owns a property Motion or GSAP animates on the same element (`transition: all` is prohibited). The empty-field invitation carries no CSS transition precisely because an authored GSAP sequence animates its opacity and transform.

## UI primitives

Interaction primitives are owned by `@base-ui/react`; every pixel is Diffusion's. The package owns behaviour that is easy to get subtly wrong and expensive to maintain: menu and listbox roles, roving highlight, Home/End, typeahead, collision-aware placement, popup lifecycle and focus contracts. Diffusion keeps ownership of *semantics* (which command exists and where it appears), of *transient ownership* (which place currently holds input), and of *focus restoration* (`useTransientFocus` remains the single authority).

| Primitive | Owner | Responsibility |
|---|---|---|
| `ui/focus/CommandMenu.tsx` | Base UI `Menu` | The one menu family. Element-anchored and pointer-anchored (virtual anchor) are the same implementation; `finalFocus={false}` so restoration stays with `useTransientFocus`. |
| `ui/primitives/Select.tsx` | Base UI `Select` | The one ordinary Select in the product. Used by every preference that is a choice between named options. |
| `AISettings` model field | Base UI `Combobox` | The one editable combobox, and a deliberate exception to "every preference is a Select": a model id must be typeable *and* suggested, which a Select cannot express. It carries the Select's own popup classes and the same positioner, so the control system stays one system. |
| `ui/surfaces/SettingsSurface.tsx` | Base UI `Tabs` | Settings section navigation: a real tablist, so the section the user is in is the section the keyboard is in. |
| `ui/surfaces/Surface.tsx` | Diffusion (intentionally custom) | The one dialog-like place, with its own depth classes (`anchored`/`split`/`focus`/`bar`/`window`), modal/non-modal focus, dismissal, input shield and shared shell. Retained deliberately: placement and depth are part of the product, and a second overlay authority is forbidden. |
| `SurfaceClose` | Diffusion | The one close affordance, with one glyph, one control-sized hit area, one accessible name. |

A layer of thin wrappers around one to three attributes was deliberately not added: it would re-name DOM, not remove a decision. The palette's own listbox keyboard handling beside Base UI is the one remaining duplication and is a migration for the phase that owns the palette, not a refactor to do twice.

## Development-only visual labs

`/dev/motion` renders `src/dev/MotionLab.tsx`, a design environment where every primitive and every signature moment can be compared side by side in isolation. `/dev/material-gallery` renders `src/dev/material-gallery/MaterialGallery.tsx`, an equally isolated comparison of sourced background renderers against static production-class Thought fixtures. `src/main.tsx` guards both route modules with `import.meta.env.DEV`, so the labs are unreachable and tree-shaken out of production navigation. The five approved Field backgrounds live separately under `src/ui/fieldBackgrounds/` and are production-reachable only through lazy imports; Perlin remains gallery-only. Neither lab imports Dexie, platform adapters, the core controller, canonical state, or camera ownership. Material renderer provenance and licenses live in `docs/third_party/MATERIAL_GALLERY.md`.

## Settings as a place

Settings is a dedicated same-window workspace, not a corner form and not a second window. It may occupy most of the window while the Field keeps its state behind it: opening Settings does not destroy the camera, selection, drafts or current Field, and closing restores exactly that state. It owns no canonical data.

Everything about thinking is *reported* rather than assumed. `GET /api/capabilities` is the gateway's truthful self-description; the Model control shows the operator's declared list, or a custom id only when the backend says it would accept one, or "Gateway default" when there is nothing to declare. Thinking depth is a product-level word that the gateway maps to its own output budget (`DEPTH_OUTPUT_BUDGET`), so no product surface hardcodes a vendor parameter.

**Four questions, four sections.** Settings answers how the application behaves, how it looks, who helps it think, and whether it may look outside this Field: General / Appearance / AI / Search & Evidence. `SettingsSurface.tsx` is the frame; `AppearanceSettings.tsx` owns device-local presentation, `AISettings.tsx` owns the provider experience, and `SearchSettings.tsx` owns discovery. AI and discovery remain independent capabilities — a missing key, a missing provider, and a missing search source must be distinguishable at a glance.

Capability honesty has three rules. A **direct** provider's capabilities come from an inspected table and make no network request, so editing a URL or a key never triggers a probe. `Ready` is shown only after a real bounded request succeeded; a provider that merely answered is not ready. And **model discovery never blocks model entry** — an empty list, a failed list or no listing support all fall back to typing a model id, so "could not discover models" can never become a dead end.


## Repository map: authority vs provenance

| Group | Location | Status |
|---|---|---|
| Current architecture and product contract | `README.md`, `STATUS.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/TESTING.md`, `docs/ACCEPTANCE_MAP.md`, `docs/specs/01`, `docs/specs/02`, `docs/specs/04`, the v0.2 redesign specification | CURRENT AUTHORITY |
| Current verification authority (portable) | `tests/`, `STATUS.md`, `docs/TESTING.md`, `docs/ACCEPTANCE_MAP.md`, and the workflows under `.github/workflows/` | CURRENT AUTHORITY, TRACKED |
| Current local evidence | the newest pass directory under `verification/`, plus `playwright-report/` and `test-results/` | LOCAL / GENERATED, gitignored |
| Earlier pass evidence | `verification/v0.1` … `v0.4.6`, including the generated `primitives/modules/*.js` copies of `src/` | HISTORICAL PROVENANCE / GENERATED, gitignored |
| Checkpoint notes, proofs, supplied build prompts, inherited README/STATUS, the v0.1 kickoff pack, and the v0.2.1 inherited-authority run note | `docs/history/` | HISTORICAL PROVENANCE |
| Supplied v0.1 documentation | `docs/history/v0.1/` | HISTORICAL PROVENANCE |
| Build and evidence output | `dist/`, `test-results/`, `playwright-report/`, `src-tauri/target/`, `verification/` | GENERATED/LOCAL, not tracked — absent from a fresh clone |

Historical material is kept, never mixed into current truth: `docs/history/README.md` says what each group is. The whole `verification/` tree is gitignored local evidence: a document that cites a path under it is describing something a new clone does not contain, so cite a tracked source — `tests/`, `STATUS.md`, `docs/TESTING.md` or `docs/ACCEPTANCE_MAP.md` — for a claim that must travel with the repository. The tracked/local split is stated in [`VERIFICATION.md`](VERIFICATION.md#portable-evidence-vs-local-evidence).

## Continuation rule

Consult the current product and architecture contracts under [`docs/specs/`](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) — indexed in [`docs/README.md`](README.md) — before changing a shared seam. Historical material in `docs/history/` never overrides them. Preserve the imperative hot path, semantic ownership, evidence honesty and verified source checkpoints. Generic library behavior may be reused; whiteboard, graph, file-desk, task-manager or chatbot semantics must not replace Diffusion's model.
