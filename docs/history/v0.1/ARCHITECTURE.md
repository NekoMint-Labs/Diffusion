# Architecture and invariants

## Three distinct kinds of state

**Canonical state** belongs to `ProjectController` and the React-independent reducer. Thoughts, Crystals, Sources/provenance, confirmed relations, Regions, raw Threads and meaningful trajectory are persisted through `ProjectRepository`. Commands declare an actor; the reducer rejects AI canonical edits and tightly limits system operations. User confirmation is the only path from preview to permanent relation/Crystal.

**Transient interaction state** lives in the camera/Field controllers and session candidates. Pointer positions, drag transforms, lasso geometry and proximity previews do not write the database or cause a React tree render per pointer event. Pointer-up/idle boundaries commit stable position/camera values. Unclaimed Ghosts are not canonical history or long-term model input.

**UI surface state** lives in a separate Zustand store. Selection, editing, temporary surfaces, return points and theme are renderer concerns, not one giant canonical database store. `useSyncExternalStore` subscribes React to controller snapshots without importing React into Core.

## Frame-frequency path

`pointer/wheel -> independent controller -> requestAnimationFrame -> world/item DOM transform`

`pointerup/idle -> canonical command -> reducer -> serialized repository save`

Geometry is measured using ResizeObserver and cached. A replaceable grid index bounds visible candidates. Local, Neighborhood and Atlas choose progressively simpler representations; only relevant active relations receive SVG marks. A 5000-object project is not intended to mount 5000 Thought components. Viewport-set refresh can cause a render at throttled boundaries; this is different from routing every pixel through Zustand.

The index, candidate caps and isolated RAF coalescing have tests. Real full-app rendering performance is not established yet.

## Model and evidence path

`explicit user intent -> bounded ContextPacket -> provider -> strict semantic response -> Core permission checks -> session candidates / permitted surface request`

The provider returns no coordinates or component commands. Core rejects objects outside available scope and Source references it does not know. New candidates are positioned locally without moving existing Thoughts. Normal calls stop after one response. Claims commit the Ghost's original ID/position as user-owned content.

Thread scope is copied at creation; field selection cannot silently extend it. Raw messages persist; capsules are bounded derived caches. Source excerpts and search candidates are untrusted data and declare inspected extent. A submission record means an excerpt was sent, not that a model understood a whole document.

Diffuse adds an explicit bounded scheduler around this same runtime, rather than giving the model unrestricted UI or repository access. It validates scope, limits calls/time, separately gates project Sources and web, reveals candidates progressively and stops on ownership/scope changes. Its optional search budget is not an invisible Normal-mode capability.

## Durable worlds and recovery

The Dexie adapter is shared by browser and Tauri. Whole-project writes are serialized; failures remain visible and flush blocks unsafe project switches. Semantic undo uses bounded in-memory snapshots and preserves important concurrent source/thread state; it is not a durable command-log time-travel system.

Fork creates a new project and retains provenance/baseline. Compare is deterministic. Bring to Main allocates new IDs for chosen content and needed Sources; it never writes over the old Main Thought or automatically merges relations. Project JSON export omits local-only paths/keys, original bytes, Ghosts and rebuildable caches. Import parses/validates off the UI thread and generates a new project ID.

No multi-tab concurrency protocol, cloud sync, database backend migration or public account system is implemented. Avoid adding one implicitly while fixing local correctness.

## Platform and service seams

Only the platform factory knows whether the shell is Tauri. Browser/native adapters implement file picking, original/external access and export. UI code does not acquire broad filesystem permissions. Desktop uses the same React/Dexie state and is not a separate native client.

The browser calls the Hono gateway, not secret-bearing upstream endpoints. Server configuration fixes allowed origins, binding, token policy, upstream URLs and request budgets. AI uses Chat Completions JSON-object output; evidence uses a separate normalized service contract. The personal/local gateway is not a production multi-user authorization or cost-control product.

## Maintain these rules when continuing

Read relevant `docs/specs/` boundaries before modifying a shared seam. A React convenience must not make the domain depend on React. A reference UI pattern must not make Thoughts permanent cards or connections permanent arrows. A new model capability must not bypass user commitment. A failed Source parser must produce honest Limited/Unavailable state, not fabricated content. Preserve a verified source ZIP before risky refactors, then run the smallest relevant independent tests plus the full installed typecheck/build/E2E suite when available.
