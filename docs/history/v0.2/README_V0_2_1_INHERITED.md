# Diffusion Explorer v0.2.1

A quiet thinking medium for ideas that are not fully formed yet. Thoughts settle into space; attention reveals their relationships. AI can offer possibilities, but only a person can claim a Thought, confirm a relation, or form a Crystal.

This is an **in-place hardening of the supplied v0.2 React/TypeScript/Tauri application**, not a replacement architecture or product redesign. The existing Paper Day / Graphite Night themes, bilingual interface, distinct Deep Dive, Core ownership, imperative camera and local-first storage remain.

v0.2.1 adds single-owner transient surfaces, guarded focus handoff, an Editorial Serif / Quiet Sans content preference, narrower presentation-only setting updates, and focused extraction/transport cleanup. Reference decisions and verification limits are recorded in [the hardening audit](docs/history/v0.2/V0_2_1_HARDENING_AUDIT.md) and [verification report](docs/history/v0.2/V0_2_1_VERIFICATION.md). The inherited specifications remain authoritative; the new scope is in [the hardening prompt](docs/specs/POWERFUL_AI_DIFFUSION_V0_2_1_HARDENING_PROMPT_EN.md) and [authority order](docs/specs/DIFFUSION_EXPLORER_V0_2_1_INHERITED_AUTHORITY.md).

**Read [STATUS.md](STATUS.md) before treating this as a release.** Independent Core tests and actual camera/CSS browser fixtures ran. npm dependencies were unavailable in the build environment, so the complete React application, production build, dependency-backed tests and native shell are **not verified**. The source ZIP is real and independently integrity/extraction checked.

## Start locally

Use Node 22.12 or newer. In the extracted `diffusion-explorer/` directory:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://127.0.0.1:5173`). The supplied archive includes a genuine `package-lock.json`; its dependency resolutions are preserved. `npm ci` needs registry access or a complete local cache. This build environment had neither, so no current production bundle is included.

The first Field is nearly empty. Write the first Thought through Speak, or double-click the Field to create a Thought. AI is off by default; manual interaction does not require an API key. The ordinary UI does not show permanent saving/provider/debug labels. Errors are surfaced when relevant.

The small top-right menu contains only Find, Import/Restore, Export, Settings and Help. Settings changes language, lighting and Thought typography. Presentation changes do not start AI inference or replace the Field; service credentials remain session-only. Help contains the example Field and creation of another empty Field. An explicit example route is available at `/demo?locale=en` or `/demo?locale=zh`; `/demo` uses a separate persistent project ID instead of replacing Main. Existing user project wording is never translated or rearranged when a UI locale changes.

## Working in the Field

Click selects a scope and wakes only already-known relationships; it never calls AI or moves the camera. Selected Thoughts retain their text geometry, with a soft aura rather than a card. Blank-click releases Focus. Shift-click or a lasso selects multiple objects. A click claims a Ghost or wakes a Recall in place; lasso alone does not claim a Ghost.

Drag directly to move. Space + drag or the middle mouse button pans. The wheel zooms around the pointer. Camera and drag transforms run through independent frame controllers; canonical coordinates are committed at the gesture boundary. Zoom removes detail and reveals Regions/Crystals instead of reducing every label to an unreadable dot.

Ask opens the compact language entrance for the chosen scope. Contextual More holds Keep, Thread, history, Carry, Crystallize, evidence, Diffuse and Fork. Two selected Thoughts can be explored without inventing a permanent relation. Let fade reverses Keep for an unfinished Thought without deleting it; undo restores the prior state. Crystals are protected from ordinary fading.

A Thread is a split manuscript beside the still-usable Field. Its scope IDs **and wording** are frozen when created, and change only through explicit Add current selection. Deep Dive is a separate focus layout with a relevant-context rail and structured reasoning. It can display headings, quotations, compact tables and safe links without becoming a full document editor. Returning restores the saved Field camera/selection.

Crystal formation always includes an editable preview and explicit confirmation. Continue grows a new Thought without rewriting the Crystal. Fork creates a separate world and brings only explicitly chosen results back; it is not an automatic merge.

## Optional AI gateway

Manual use needs no service. To enable a real provider, copy `.env.example` to a private `.env`, fill the server-side settings, and run a second terminal:

```sh
npm run gateway
```

Use Settings -> AI provider -> Gateway and point it at your Diffusion gateway, not directly at a secret-bearing upstream provider. `VITE_GATEWAY_URL` may supply the public gateway URL; **never use a `VITE_` variable for an API key**. Gateway session tokens are held in the current UI session and are not persisted in local settings.

`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_PROTOCOL=chat-completions|responses` and `AI_JSON_MODE=json-object|none` select the explicit wire contract. There are no hidden protocol probes or automatic fallback calls. JSON mode is not a schema guarantee: Zod and Core still validate semantic intents. Responses requests use `store:false`. Native Anthropic/Google adapters are not included; custom endpoints must implement the selected wire protocol.

The optional Demo provider is a deterministic fixture, selectable in Settings. It is not live AI and does not pretend to search. Explicit requests may explain this relevant limitation; no permanent demo label is placed on the Field.

Keep the default loopback host for local development. A remotely reachable gateway needs an exact allowed origin, a strong `GATEWAY_TOKEN` and trusted HTTPS termination. This is not a multi-tenant public authorization/billing service. Request diagnostics retain only safe IDs, stage, timing, protocol/status and failure code, not private content or keys.

## Sources and evidence

Drop files or URLs, or choose files through Import/Restore. UTF-8 text, Markdown and common code formats use a bounded worker. PDF/image/Office/audio/video content remains **Limited, metadata-only** in this build. No PDF.js extraction or image understanding is claimed. Original file bytes up to the explicit budget can be retained locally; portable project JSON does not embed them.

A dropped URL is not automatically fetched. Read source is explicit. Evidence search results are candidates, not judgments:

```text
Search -> candidate -> explicit fetch/extract -> matched read passages
       -> optional scoped assessment -> explicit Bring/Update Field reference
```

The passage text must match fetched content and retain URL, locator, time and provider. A separate assessment cites actual passage IDs and can be inconclusive. Search snippets never enter AI evidence context as read passages. A candidate already brought to the Field can be upgraded without duplicating or moving its Source Thought.

Choose one server-side evidence adapter:

- `SEARCH_PROVIDER=http` (default): point `SEARCH_BASE_URL` at your normalized evidence service. Its required routes are documented in [EVIDENCE_GATEWAY.md](docs/EVIDENCE_GATEWAY.md).
- `SEARCH_PROVIDER=smartsearch-cli`: separately install/configure the current SmartSearch v1 CLI, set `SMARTSEARCH_BIN` to an operator-owned executable, and leave `SEARCH_BASE_URL` unused. This bridge calls only `search` and `read`; it does not bundle SmartSearch, call autonomous `research`, or maintain another provider aggregation stack.

The optional CLI bridge has offline contract/process tests, **not a live-provider test**. Evidence discovery/reading can work without an AI model configured; scoped assessment needs both a reader and the AI gateway.

## Persistence and migration

The database name stays `diffusion-explorer-v1` so existing projects remain discoverable. Dexie version 2 upgrades in place without dropping tables. Pure migration preserves IDs, positions, camera and original references, initializes attention state and frozen Thread context, and demotes old web snippets to explicitly unread discovery text without losing the words. Actual Dexie transaction tests are included but were not executable here.

Cooling depends on active-session interaction and crowding, not time spent closed. Reopening after a long absence cannot alone send ordinary Thoughts into Memory. Keep protects persistence, not foreground visual prominence.

A controller holds at most one active write and one latest pending snapshot. Project switching flushes and checks saving; a failure remains visible. Export is the portable recovery path. Concurrent multi-tab edits are not coordinated; use one editing tab per project.

## Verification and continuation

```sh
npm run check:offline
npm run bench:spatial
npm run bench:storage
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The offline check uses locally available TypeScript; it does not install dependencies. It includes strict independent-module typechecking, syntax/local-import/config checks, locale coverage and 94 Node tests. The production app still needs the full checks that follow. There is no configured ESLint/format-check gate; `format:source` is a mutating utility, not a PASS/FAIL check.

The 18 full application E2E tests cover the existing interaction paths and v0.2 regressions. They are authored, not executed in this environment. Historical test results are separated under `verification/v0.1/`; current evidence and explicitly labelled CSS fixtures are under `verification/v0.2/`.

The optional independent Chromium harness uses actual source camera/index/geometry/CSS and authored test DOM. It does not mount React, and its images are **not application screenshots**:

```sh
node scripts/prepare-primitives.mjs ../primitive-fixture
python3 tests/primitives/run.py ../primitive-fixture --report ../primitive-browser.json
python3 tests/primitives/performance.py ../primitive-fixture --report ../browser-performance.json
```

It needs Python Playwright and an installed Chromium (`CHROMIUM_PATH` can select it). It uses `page.set_content` without HTTP navigation; no browser policy bypass is required. See [TESTING.md](docs/TESTING.md) and [PERFORMANCE.md](docs/PERFORMANCE.md) for measurement boundaries.

## Desktop

Tauri wraps the same frontend; it is not a separate UI. After the Web dependencies and your platform's Tauri prerequisites are installed:

```sh
npm run tauri -- dev
npm run tauri -- build
```

Rust/cargo/native runtime were unavailable here. Dialog/file-system scope, import -> persist -> close/reopen -> inspect, and save-original-copy need real OS verification. Arbitrary native path opening is intentionally not granted. See [DESKTOP.md](docs/DESKTOP.md).

## Project map

| Path | Responsibility |
|---|---|
| `src/core/` | Canonical model/events, authority, attention, undo, Thread scope, worlds |
| `src/field/` | Camera/drag, DOM/SVG Field, geometry/index/culling/semantic disclosure |
| `src/ui/` | Quiet shell, Thought states, anchored/split/focus surfaces, settings |
| `src/shared/i18n.ts`, `src/locales/` | Small EN/ZH dictionary; no user-text translation |
| `src/ai/`, `src/evidence/` | Bounded semantic runtime, replaceable providers, source/evidence stages |
| `src/storage/`, `src/platform/` | Repository, Dexie migration, shared browser/native adapters |
| `server/` | Protected Hono gateway, wire adapters, optional SmartSearch bridge |
| `tests/`, `verification/v0.2/` | Executable tests and honestly scoped current evidence |
| `docs/specs/` | Frozen product boundaries and supplied authoritative v0.2 spec/prompt |

## Source checkpoints

```sh
python3 scripts/snapshot.py my-source-checkpoint
```

This writes outside the mutable project tree to `../delivery/`, checks actual required application files, excludes dependencies/secrets/caches, tests ZIP CRC, extracts and compares every included file, and writes SHA-256/proof. A note or Git commit is not a replacement for that source archive. Current same-name proof is excluded to avoid recursively claiming its own hash.

The rebuild's initial classification and actual reuse decisions are in [V0_2_AUDIT.md](docs/history/v0.2/V0_2_AUDIT.md) and [REFERENCE_AUDIT.md](docs/REFERENCE_AUDIT.md). Prior supplied documentation is retained under `docs/history/v0.1/`. Do not let a borrowed mechanic turn Diffusion into a whiteboard, graph editor, file desk, task manager or chatbot with a canvas attached.
