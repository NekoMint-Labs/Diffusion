# Diffusion Explorer

A quiet, local-first thinking medium before an idea is ready to become a commitment.

**The Field is state; messages are history. AI creates possibility; the user creates commitment.**

> **Source delivery, not a verified release.** The intended React/TypeScript application, shared Tauri shell, gateway, tests and recovery tools are implemented here. This environment could not install npm dependencies. Full application typechecking, Web build, React E2E, native builds and live providers remain **NOT VERIFIED**. Independent checks passed; their narrower scope is documented in [STATUS.md](STATUS.md).

## Start in a network-enabled environment

Use Node **22.12 or newer** and npm. There is deliberately no invented lockfile: dependency resolution did not succeed in the delivery environment.

```sh
npm install
npm run typecheck
npm run test:offline
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

Open `http://127.0.0.1:5173`. Run E2E before starting a second development server on the same port. If Playwright needs system libraries on Linux, install its documented platform prerequisites. Resolve any actual dependency/type errors before treating the application as runnable. Once the sequence passes, commit the real `package-lock.json`; subsequent clean installations should use `npm ci`.

Manual Field interactions and the authored **Demo** provider need no API key. Demo is deterministic example behavior, **not live model reasoning**. Settings can turn AI Off. Gateway mode is optional and requires a separately configured service; see [provider contracts](docs/PROVIDER_CONTRACT.md). No provider credentials are embedded in this source.

## The first path to exercise

Start with the authored sample Field, or double-click an empty area and write an unfinished thought. Add a second thought. Select both and choose Explore: in Demo mode an explicitly labeled possibility appears, without changing the two originals. Clicking that Ghost makes it your Thought; simply selecting other items does not ask AI anything.

Use Ask or Speak to add intent to the current scope. Open a Thought Thread for sustained discourse; it keeps its initial scope until you explicitly add the current selection. Bring an interesting thread passage back as a Ghost. When a thought is ready, choose Crystallize, edit the preview and confirm it. Handoff exports the resulting Crystal and relevant context as Markdown. Continue grows a new unfinished Thought without rewriting the old Crystal.

This is the strongest **implemented** end-to-end path, not a claim that the complete browser path was executed in the delivery environment.

## Interaction reference

| Gesture or command | Intended behavior |
| --- | --- |
| Double-click blank Field | Create a Thought and edit it immediately. |
| Click / Shift-click | Select / toggle an item in temporary scope. Selection does not call AI. |
| Drag from blank Field | Rectangular lasso. Lasso does not claim Ghosts. |
| Drag a Thought | Move directly, without handles. Group movement uses the current selection. |
| Space + drag / wheel | Pan / pointer-anchored zoom. These are local, not provider operations. |
| Double-click Thought / Enter on focused Thought | Edit. Enter saves, Shift+Enter inserts a line, Escape cancels. IME composition is guarded. |
| Drag toward another Thought and hold | Local `?` Probe cue; semantic generation begins only after the deliberate hold/drop gesture. |
| Ghost click / drag | Claim + Select / Claim + Move. Hover and lasso are not acceptance. |
| Keep | Protect an unfinished Thought from lifecycle fading. It is not a Crystal. |
| Escape | Unwind editing, menu/surface, Carry, Speak and selection rather than clearing everything at once. |
| Ctrl/Cmd+K | Project Find. Preview does not move the camera; Take me there does. |
| Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z | In-session semantic undo / redo outside text entry. |
| Arrow keys on a focused Thought | Small local movement; Shift uses a larger step. |
| Delete / Backspace outside inputs | Delete selected canonical Thoughts when no surface is open. Undo is available. |
| Field menu | Thread, history, explicit evidence search, file import, Fork, export/restore, settings and less frequent actions. |

There is no permanent file sidebar, graph toolbar or AI chat pane. Thoughts are text at rest; editing gives only the active Thought a stronger surface. Light and Dark share semantic tokens; system preference is the default. Reduced-motion styling is included.

## Sources and evidence

Drop files, text or an HTTP(S) link, or use the file chooser. Sources stay subordinate to Thoughts and expose what was actually inspected.

- Small UTF-8 text is extracted in a worker. The probe is limited to 256 KiB and the retained excerpt to 6,000 characters; partial or undecodable content is labeled accordingly.
- PDF, image, audio/video and Office files currently receive **metadata-only Limited** status. There is no hidden PDF reader, OCR or claimed image understanding.
- Original local bytes may be retained up to 32 MiB per file. At most 20 files are processed per drop. Storage quota failures are surfaced.
- Local originals are downloaded/saved as a copy rather than executed as an HTML/blob page. Web originals open through the platform adapter after URL checks.
- Search is user-triggered, or separately authorized inside Diffuse. Results begin as temporary candidates and are brought into the Field individually. Outcomes include support, challenge, partial, prior art, inconclusive and conflicting; there is no objective "Verified" stamp.

The supplied search adapter expects a **normalized Diffusion-compatible service**, not a random search URL. There is no bundled commercial-search adapter. [PROVIDER_CONTRACT.md](docs/PROVIDER_CONTRACT.md) specifies the required endpoints, limits and trust boundaries.

## Navigation, alternate worlds and exit into action

Regions emerge from repeated nearby spatial activity, rather than from a Create Box command. Zoom-out progressively substitutes neighborhood labels, Crystals and a few frontiers for ordinary detail. The implementation uses coarse deterministic spatial heuristics, not an inferred semantic map.

Carry keeps selected content attached to the viewport until dropped elsewhere; it moves, not duplicates. Fork explicitly creates an alternate project with provenance back to Main. Compare shows shared, different and exclusive content. Bring to Main copies only the explicitly selected material into new IDs, preserving Main's existing text; it does not perform an automatic merge.

Diffuse requires canonical scope plus explicit call/time budgets. Project Sources and web access are separate permissions. Pause, Stop, scope changes and user claims bound the run; unclaimed Ghosts are never used as recursive Normal-mode input. The budget is **calls and elapsed time**, not a guaranteed monetary/token limit. Cancelling a request cannot guarantee that a remote provider did not charge for work already started.

## Local storage, export and recovery

Dexie/IndexedDB stores canonical projects and retained original bytes. UI preferences and the last project ID use localStorage. The gateway session token stays in memory. The app reopens the last Field and approximate viewport, but does not force an old Thread open; unclaimed Ghosts are session-only.

**Local-first is not a backup service.** Clearing browser data or changing origin/profile can make local data unavailable. There is no account sync or multi-tab conflict coordination. Avoid simultaneous editing of one project in several tabs. Native WebView storage is not automatically shared with your browser.

Export canonical project before important changes. JSON exports include Thoughts, Crystals, Sources/provenance, relations, Regions, Threads and semantic history. They omit original file bytes, native paths, storage keys, session Ghosts, provider secrets and rebuildable capsule caches. Restoring validates in a worker, strips unsafe/local-only references and **creates a new project** rather than overwriting existing work. Original local files must be reattached separately. Restore reads at most 10 MiB.

Save failures are visible; do not leave a failing session before exporting. Persistence is serialized but currently writes a project snapshot per semantic commit, not a fine-grained delta log. Undo snapshots are in-memory and are not a durable time-travel system.

## Development map

| Directory | Responsibility |
| --- | --- |
| `src/core/` | React-independent model, actor permissions, canonical events/reducer, lifecycle, undo, validation, worlds and export. |
| `src/field/` | Imperative camera, pointer gestures, geometry cache, spatial buckets, visibility and DOM/SVG rendering. |
| `src/ui/` | Zustand surface state, themes, text-first objects, contextual controls, reasoning/reference surfaces. |
| `src/ai/` | Bounded context packets, semantic output schemas, Demo/Gateway providers, single-request runtime and bounded Diffuse. |
| `src/evidence/` | Source extraction/import worker and normalized evidence-provider boundary. |
| `src/storage/` | Repository contract, Dexie adapter, validated recovery worker. |
| `src/platform/` | Browser/Tauri file, URL and export capabilities. No separate Desktop UI. |
| `server/` | Hono gateway, server-held secrets, fixed upstream endpoints and strict request/response boundaries. |
| `src-tauri/` | Tauri 2 native shell, plugins, capabilities and original application icons. |
| `tests/`, `verification/` | Offline/unit/E2E/primitive test source and narrowly labeled measured results. |

See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [TESTING.md](docs/TESTING.md), [ACCEPTANCE_MAP.md](docs/ACCEPTANCE_MAP.md) and [DESKTOP.md](docs/DESKTOP.md). The user-supplied requirements remain under `docs/specs/`.

## Independent verification and performance fixtures

With Node 22 and an installed local/global TypeScript compiler:

```sh
npm run check:offline
npm run bench:spatial
python3 scripts/snapshot.py my-source-checkpoint
```

The delivery run used TypeScript **5.8.3** already installed in the container; the requested manifest range is `~5.9.0` and remains unresolved. Offline checks are syntax/import/JSON auditing, strict independent-module compilation and 56 dependency-free tests. They **do not replace the full application typecheck**.

After the actual Web app runs, open `/perf?count=100`, `500`, `2000` or `5000`. These authored fixtures include long text, relations, Ghosts, Crystals and Regions; changes in perf mode are intentionally not persisted. Measure pan, zoom, drag, selection, lasso and Atlas in the real app on target hardware. The delivered spatial benchmark and isolated camera/CSS browser tests are not evidence of 60 fps or a fully verified Field.

The snapshot command writes a ZIP plus SHA-256 and proof into a sibling `delivery/` directory, excludes dependencies/build junk/secrets, then extracts and compares every archived source file. Source archives and their `_checkpoints/` metadata are recovery points, not proof that a Web/native build passed.

## Continue from this delivery

First make the actual install/typecheck/unit/build/E2E sequence pass. Then manually compare Light/Dark, selection, Probe, editing and Thread return behavior against `docs/specs/03_UI_VISUAL_SYSTEM.md`; run real 100-visible/5,000-total interaction measurements. Validate Dexie/worker recovery and native dialog/CSP permissions on target platforms before expanding scope. Connect one real model and one normalized evidence service only after the permission/error tests pass.

No root software license has been selected on the owner's behalf. No third-party application source or font files are bundled; see [attribution](docs/ATTRIBUTION.md) for consulted references and dependency-license responsibilities.
