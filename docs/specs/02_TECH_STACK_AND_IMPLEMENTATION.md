# 02 — Technical Stack and Implementation

> **Status: current architecture contract for the boundaries it defines.** The module boundaries,
> canonical/transient/surface separation, storage, platform and provider seams, and the semantic
> token rule remain authoritative. The v0.1 stack table (§2), suggested repository structure (§10),
> v0.1 scope limits (§11) and first-checkpoint goal (§13) are the original proposal, and the
> implementation has since chosen differently in places. Current ownership is in
> [`ARCHITECTURE.md`](../ARCHITECTURE.md); current naming and file conventions are in
> [`CONVENTIONS.md`](../CONVENTIONS.md).

## 1. Product form: Web + Desktop, one frontend

Decision:

> **Ship both Web and Desktop, but maintain one React/TypeScript UI. Use Tauri 2 as the Desktop shell.**

Do not maintain separate Web and Desktop client implementations.

```text
React/Vite UI + Diffusion Core
          │
          ├── Browser platform adapter
          └── Tauri platform adapter
```

Web is the lowest-friction entry point and primary development environment. Desktop adds filesystem, native file selection, opening originals and global-shortcut capabilities.

Do not build mobile-first in v0.1.

## 2. Concrete stack

> **Historical (v0.1 proposal).** This table was chosen before the product was built and differs
> from current `main` in places: the camera is Diffusion's own `CameraController`, not d3-zoom; the
> package manager is pnpm; and Base UI, GSAP and the Field-background renderers were added later.
> [`package.json`](../../package.json) is the authoritative dependency list and
> [`ARCHITECTURE.md`](../ARCHITECTURE.md) the authoritative module map. The table is kept as the
> original decision record.

| Layer | Choice | Purpose |
|---|---|---|
| Language | TypeScript | shared frontend, Core, contracts and server language |
| UI | React | Shell, Thought, Thread, Deep Dive and surfaces |
| Build | Vite | Web development/build and Tauri frontend |
| Desktop | Tauri 2 | desktop shell around the same Web UI |
| Runtime UI state | Zustand | selection / hover / editing / surfaces / transient mode |
| Animation | Motion (`motion/react`) | emergence, focus, split, settling; not pointer hot paths |
| Persistence | Dexie / IndexedDB | v0.1 local-first canonical project storage |
| API/Gateway | Hono | Web AI/Search gateway, CORS and API-key boundary |
| Validation | Zod | model / event / provider / persistence schemas |
| Anchored UI | Floating UI | contextual actions and reference surfaces |
| Camera | d3-zoom or equivalent thin layer | pan/zoom input and camera semantics only |
| Unit tests | Vitest | Core, reducers, geometry and state |
| E2E | Playwright | critical Web vertical-slice behavior |
| Styling | CSS + semantic CSS variables | first-class Light/Dark without design-system lock-in |

Package manager is not a product decision. Follow an existing repository standard; for a new repository npm or pnpm is fine, but commit a lockfile.

## 3. Field rendering: DOM Thought Layer + SVG Phenomenon Layer

Formal direction:

```text
Viewport
└── World Transform
    ├── HTML / DOM Thought Layer
    │   ├── Thought
    │   ├── Ghost
    │   ├── Recall
    │   ├── Crystal
    │   └── Source reference
    │
    └── SVG Phenomenon Layer
        ├── relation traces
        ├── phenomenon glyph anchors
        ├── lasso
        └── transient Probe cues
```

Thought is text-first. DOM is the right default for typography, editing, accessibility, selection, themes and progressive surfaces. SVG is appropriate for the small set of attention-dependent relation / phenomenon / lasso visuals.

**Do not start Canvas/WebGL-first in v0.1.** Only revisit if measured DOM scale becomes a real bottleneck.

## 4. Keep Core independent from React

Diffusion Core must not depend on React.

```text
AI Provider / User Event
        ↓
Semantic Intent / Domain Event
        ↓
Diffusion Core
(state + permission + lifecycle)
        ↓
Spatial Engine
(placement + geometry + visibility)
        ↓
React UI / Renderer
```

React is visual expression, not the single location of product rules.

### AI never directly controls UI components

The model produces semantic intents such as:

- `surface_possibility`
- `surface_relation`
- `surface_evidence`
- `request_recall`
- `request_thread`
- `request_deep_dive`
- `request_crystal_preview`

Core checks permissions; the UI state machine decides the actual presentation.

## 5. Separate Canonical, Transient and UI Surface state

### Canonical Thought State

Persistent and traceable:

- Thoughts
- Crystals
- confirmed relations
- Sources + provenance
- Regions
- raw Threads
- semantic History / trajectories
- explicit rejections and user-confirmed decisions

### Transient Interaction State

High-frequency and not persisted per frame:

- pointer position
- hover
- drag preview
- camera while moving
- lasso preview
- Probe proximity
- animation progress
- renderer-only temporary geometry

### UI Surface State

- current selection
- editing target
- Thread / Deep Dive state
- Find overlay
- contextual surface
- theme

Do not collapse all three into one Zustand store, and never put IndexedDB on pointer-frequency hot paths.

## 6. Storage boundary

Define a thin repository interface:

```ts
interface ProjectRepository {
  loadProject(id: string): Promise<ProjectState>
  applyEvent(event: DomainEvent): Promise<void>
  getThought(id: string): Promise<Thought | null>
  getTrajectory(id: string): Promise<Trajectory>
  search(query: string): Promise<SearchHit[]>
  saveSource(source: SourceRecord): Promise<void>
}
```

Use Dexie/IndexedDB for both Web and Desktop in v0.1 to avoid maintaining IndexedDB + SQLite immediately.

If Desktop later needs SQLite, replace the adapter, not Core.

## 7. Platform Adapter

Do not scatter `if (isTauri)` through the application.

```ts
interface PlatformAdapter {
  pickFiles(): Promise<PickedFile[]>
  openExternal(target: string): Promise<void>
  openOriginal(source: SourceRecord): Promise<void>
  saveExport(data: Uint8Array, name: string): Promise<void>
  platformCapabilities(): PlatformCapabilities
}
```

Implement:

- `BrowserPlatformAdapter`
- `TauriPlatformAdapter`

## 8. AI / Web provider abstraction

```ts
interface AIProvider {
  respond(packet: ContextPacket, intent: UserIntent): Promise<AIResponse>
}

interface WebEvidenceProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  fetch(url: string): Promise<FetchedResource>
  extract(url: string, query?: string): Promise<EvidenceChunk[]>
  metadata(url: string): Promise<ResourceMetadata>
}
```

Providers return normalized candidates and **must not mutate the Field directly**.

The Web app uses a Hono gateway for secrets/CORS. Desktop may later choose a gateway or a safe direct adapter, without changing Core.

## 9. Context Compiler

Never send the entire project history to a model.

Compile a Context Packet for each invocation:

1. Core Contract
2. Current Scope
3. Local Field
4. Thread Working Memory
5. Retrieved Context
6. Available tools

Suggested Thread Capsule fields:

- Goal
- Confirmed
- Tentative
- Rejected
- Open Questions
- Current Hypotheses
- Relevant Sources
- Relevant Thoughts / Crystals
- Trajectory refs

Raw transcript remains persisted. Capsule is a rebuildable cache, not truth.

## 10. Suggested repository structure

> **Historical (v0.1 proposal).** This sketch does not match the current tree. The current layout is
> in [`CONVENTIONS.md`](../CONVENTIONS.md#module-ownership) and [`ARCHITECTURE.md`](../ARCHITECTURE.md).

```text
src/
  core/
    model/
    events/
    permissions/
    lifecycle/
    context/
    relations/

  field/
    camera/
    spatial/
    selection/
    probe/
    zoom/
    rendering/

  ui/
    shell/
    thought/
    focus/
    thread/
    deep-dive/
    reference/
    theme/

  ai/
    providers/
    intents/
    context-compiler/

  evidence/
    providers/

  storage/
    repository/
    dexie/

  platform/
    browser/
    tauri/

src-tauri/
server/
  hono/
```

Do not force a monorepo merely for aesthetics. The first stable checkpoint benefits more from one repository, one UI, and clear module boundaries.

## 11. Do not add in v0.1 without a measured need

> **Historical (v0.1 scope limit).** Current `main` no longer follows this list literally: Three.js
> is a production dependency for the Silk Field background, and the UI primitives come from
> `@base-ui/react`. Current dependency decisions are in
> [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md#dependency-policy) and [`package.json`](../../package.json).

- React Flow
- tldraw SDK as runtime
- Excalidraw component as runtime
- Three.js
- PixiJS
- Redux
- XState
- Yjs / Liveblocks
- TipTap / ProseMirror as the primary object model
- graph database
- multiplayer stack

## 12. Light / Dark are first-class from day one

Never hardcode theme colors inside components. Use semantic tokens:

```css
--field-bg
--surface-rest
--surface-hover
--surface-active
--ink-primary
--ink-secondary
--ink-tertiary
--attention
--attention-soft
--trace
--trace-muted
--ghost-ink
--recall-ink
--source-ink
--system-danger
--system-warning
```

Light and Dark are two lighting environments over the same visual semantics, not two products.

## 13. First stable checkpoint engineering goal

> **Historical (v0.1 checkpoint goal).** Retained as the record of what the first stable checkpoint
> had to prove.

Prove that:

> **Thoughts feel natural in the Field; create/move/select/edit/pan/zoom are immediate; Light and Dark both work; the architecture can accept Ghost / Focus / Probe without being rewritten.**

Do not rush into a full AI integration.
