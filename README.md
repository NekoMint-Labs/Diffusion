# Diffusion

Diffusion is a quiet thinking medium for ideas that are not fully formed yet. Thoughts settle into a spatial Field; attention reveals relationships without turning the workspace into a whiteboard or graph editor. AI may suggest possibilities, but only a person can claim a Thought, confirm a relation, or form a Crystal.

This README describes the current `main` branch. The package metadata remains `0.3.0`; that is not a claim that every current feature belongs to a published release.

## What is different

- **The Field is state; messages are history.** The spatial Field holds canonical work. Threads and model responses are context and history until the user explicitly brings something into the Field.
- **Selection defines scope.** Selecting Thoughts changes what an action addresses; it does not silently call AI or rearrange the camera.
- **AI creates possibility; the user creates commitment.** Provider output remains transient until a user action crosses the Core authority boundary.
- **The camera stays imperative.** Pointer-frequency pan, zoom, drag, culling, and geometry work do not travel through React state.
- **Desktop is the same product.** Tauri wraps the React/Vite frontend behind platform adapters; it is not a second UI.

## Current capabilities

Diffusion currently includes:

- direct spatial creation, editing, selection, lasso, drag, pan, zoom, semantic disclosure, Regions, and Crystals;
- bounded compact/regular/wide Thought sizing that stays fixed while editing and continues to use rendered DOM geometry;
- five lazy, viewport-bounded Field materials — Paper Texture, Topography, Threads, Waves, and Silk — while preserving the DOM Thought layer, SVG phenomena, and single camera authority;
- one command model projected into menus, keyboard shortcuts, command palette, and help;
- undo/redo, Find in Field, Threads, Deep Dive, Fork, Diffuse, evidence flows, and portable export;
- bounded local source ingestion for UTF-8 text, Markdown, and common code formats;
- optional AI providers and optional discovery/evidence services, with explicit credential and authority boundaries;
- local-first project persistence with in-place migration and portable recovery exports;
- English and Chinese UI;
- a device-local Appearance system that changes presentation without entering canonical project state.

## Run locally

Requirements are declared in [`package.json`](package.json):

- Node.js 22.12 or newer;
- pnpm 12.4.2 (the `packageManager` version).

```sh
pnpm install
pnpm run dev
```

Open the URL printed by Vite. Manual Field interaction needs no provider or API key. `/demo?locale=en` and `/demo?locale=zh` open a separate example project.

## Windows installer

Open the repository's **Actions** tab, choose **Windows Package**, click **Run workflow**, and select the desired branch or ref. After the workflow finishes, download the `diffusion-windows-<commit SHA>` artifact, extract it, and run the NSIS `.exe` installer.

The **Windows Package** workflow is **MANUAL ONLY**. It does not run on normal pushes or pull requests.

## Basic Field interaction

- Double-click blank Field space to create a Thought, or write through Speak.
- Click to select; Shift-click or lasso to select several Thoughts.
- Drag a Thought to move it.
- Space + drag or middle-button drag pans.
- The wheel zooms around the pointer.
- `Ctrl/Cmd+K` opens the command palette.
- `Ctrl/Cmd+F` finds content in place.
- `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` undo and redo one deliberate action.
- The Field title owns Field/project operations; the top-right menu owns application and view operations.

Selection wakes only already-known relationships. It does not call AI, create a permanent relation, or move the camera.

## Appearance

Appearance preferences are presentation-only, device-local settings. They do not modify canonical project state, Thought semantics, geometry, or provenance.

- **Theme/Profile:** Editorial Warm, Studio Slate, Quiet Forest, or Graphite Night.
- **Field Style:** Paper Texture, Topography, Threads, Waves, or Silk.
- **Accent:** a curated accent or bounded Custom Accent.
- **Image Atmosphere:** an optional local PNG, JPEG, or WebP layer with adaptive recommendations and explicit manual ownership.
- **Field Presence:** controls the strength of the Field material.
- **Ambient Motion:** controls each Field Style's material motion; Motion 0 is static, and Reduced Motion overrides effective motion without changing the saved preference.

Theme, Field Style, Accent, and Image Atmosphere are independent axes. Decorative Field layers remain pointer-inert and do not replace the DOM Thought layer or SVG phenomenon architecture.

## Optional AI gateway

Copy [`.env.example`](.env.example) to a private `.env`, configure the server-side values, and run:

```sh
pnpm run gateway
```

Then select the Diffusion Gateway in Settings. Point the client at the gateway, not directly at a secret-bearing upstream provider. Never place API keys in `VITE_` variables. Gateway session tokens are not persisted in local settings.

The Demo provider is a deterministic fixture, not live AI. Direct provider and gateway behavior, protocols, and credential handling are documented in [`docs/PROVIDER_CONTRACT.md`](docs/PROVIDER_CONTRACT.md).

## Discovery and evidence

Search results are candidates, not read evidence:

```text
Search -> candidate -> explicit fetch/extract -> matched read passages
       -> optional scoped assessment -> explicit Bring/Update Field reference
```

The gateway can use a normalized evidence service described in [`docs/EVIDENCE_GATEWAY.md`](docs/EVIDENCE_GATEWAY.md). Desktop uses the Diffusion-owned engine under `internal/discovery-engine/`; its SmartSearch-derived provenance is recorded in [`internal/discovery-engine/PROVENANCE.md`](internal/discovery-engine/PROVENANCE.md).

PDF, image, Office, audio, and video contents are currently metadata-only. No extraction or understanding is claimed for those formats.

## Repository map

| Path | Responsibility |
|---|---|
| `src/core/` | Canonical model, events, authority, history, attention, and worlds |
| `src/field/` | Camera, geometry, culling, pointer/drag interaction, DOM Thoughts, SVG phenomena |
| `src/ui/` | Product shell, surfaces, commands, settings, motion, and Appearance |
| `src/ui/fieldBackgrounds/` | Lazy Paper Texture, Topography, Threads, Waves, and Silk production renderers |
| `src/ai/` | Provider registry, transport, runtime, and semantic intent validation |
| `src/evidence/`, `src/discovery/` | Evidence stages and discovery transport boundary |
| `src/storage/` | Repository, Dexie persistence, and migration |
| `src/platform/`, `src-tauri/` | Browser/native adapters and the Tauri shell |
| `server/` | Protected Hono gateway and wire adapters |
| `tests/` | Unit, offline-contract, browser E2E, and fixture tests |
| `docs/specs/` | Durable product, architecture and performance contracts that still govern implementation |
| `docs/history/` | Historical provenance, not current authority |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for ownership and shared boundaries,
[`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for naming and file conventions, and
[`docs/README.md`](docs/README.md) for the documentation index.

## Verification

Fast, dependency-backed checks:

```sh
pnpm run typecheck
pnpm run check:offline
pnpm test
pnpm run build
git diff --check
```

Browser E2E:

```sh
pnpm exec playwright install chromium
pnpm run test:e2e
```

The full Playwright suite is a blocking CI gate. The final stabilization pass produced two consecutive complete local runs with 148 passed and 8 intentionally skipped tests per run, using one worker and no retries. See [`STATUS.md`](STATUS.md) and [`docs/TESTING.md`](docs/TESTING.md) for exact claim boundaries.

The production build succeeds and retains Vite's warning that the main minified chunk exceeds 500 kB. The warning is documented rather than suppressed; no speculative split was added without startup or interaction evidence.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Before changing a shared seam, read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the relevant contract under [`docs/specs/`](docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md). Current documentation is indexed in [`docs/README.md`](docs/README.md); archived phase reports under [`docs/history/`](docs/history/README.md) are provenance only.

## License

Except where otherwise noted, Diffusion-owned source code is licensed under the
[Apache License 2.0](LICENSE). Third-party, copied, adapted and vendor-derived material remains
subject to its respective license terms; that root license does not replace or alter them. See
[`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) and [`docs/third_party/`](docs/third_party/MATERIAL_GALLERY.md)
for the boundary and the retained notices.
