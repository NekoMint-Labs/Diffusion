# Diffusion Explorer v0.2.4 — Verification Record

## Scope boundary

v0.2.4 is a narrow signature-interaction pass. It changes frontend presentation/continuity only: Speak, attention hierarchy, Ghost/Recall emergence, More -> Settings origin handoff, and Settings micro-weight. Product semantics, storage, providers, Evidence, Thread/Deep Dive semantics and Field camera/pointer/lasso mechanics are unchanged.

A full dependency-backed React application could not be mounted in this environment. All evidence below is labelled by its actual verification level.

## Requested application commands

| Command | Result | Actual boundary |
|---|---|---|
| `npm ci --offline --ignore-scripts` | FAIL / exit 1 | locked `zustand-5.0.15.tgz` absent from local npm cache (`ENOTCACHED`) |
| `npm run typecheck` | UNVERIFIED / exit 2 | project `node` and `vite/client` type definitions unavailable because dependencies are not installed |
| `npm test` | UNVERIFIED / exit 127 | project Vitest binary unavailable |
| `npm run build` | UNVERIFIED / exit 2 | stops at the same full typecheck boundary |
| `npm run test:e2e` | UNVERIFIED / exit 1 | available `playwright` executable is not the project's Playwright Test runner (`unknown command 'test'`) |
| `npm run check:offline` | **PASS** | source/import/JSON checks + dependency-free Core typecheck + locale + offline Node suite + source-size gate |

An online `npm ci --ignore-scripts` was also attempted before edits and made no meaningful dependency-download progress; the partial `node_modules` tree was discarded rather than treated as an install.

Command outputs are retained under `verification/v0.2.4/commands/`.

## Offline/source regression

`npm run check:offline`: **PASS**

- offline Node tests: **131 / 131 PASS**;
- includes 6 v0.2.4 signature-interaction contract tests;
- dependency-free Core typecheck: PASS;
- locale completeness: PASS;
- source-size/ownership check: PASS;
- inherited v0.2.2/v0.2.3 assertions were updated only where the intended invariant became stronger (exact Settings command-row origin with More-button fallback; compact -> expanded Speak lifecycle).

## CSS / primitive Chromium verification

These checks use actual product CSS and dependency-independent source mechanics with authored DOM. They are **not** React app E2E.

### Camera / Field primitive

`tests/primitives/run.py`: **17 / 17 PASS**

Covers inherited camera/culling/semantic representation invariants plus the updated Speak compact->bounded-compose rule. Representative labelled screenshots are under `verification/v0.2.4/primitive-screenshots/`.

### Typography / theme / locale fixture

`tests/primitives/typography.py`: **11 / 11 PASS**

Checks Paper Day / Graphite Night, zh/en, Editorial Serif / Quiet Sans, Thought/Ghost/Recall/Crystal and surface typography in Chromium. Screenshots are under `verification/v0.2.4/typography-screenshots/`.

### v0.2.4 signature fixture

`tests/primitives/v024_signature.py`: **7 / 7 PASS**

Verified:

1. Speak idle width ~250px and composing width ~520px at a 1440px viewport;
2. multiline Speak capped at 108px, scrollable, with hidden local native scrollbar chrome;
3. narrow 480px Paper Day viewport keeps composing Speak inside the viewport;
4. Focus hierarchy uses exact existing emphasis states and does not change Thought bounding boxes;
5. Ghost/Recall use the intended text-level animation names, no filters and no settled geometry drift;
6. Settings has no shell shadow and Thinking service remains visually secondary;
7. reduced motion removes signature spatial motion while state hierarchy stays readable.

Screenshots are under `verification/v0.2.4/signature-screenshots/` and are visibly labelled **CSS/PRIMITIVE FIXTURE - not the React application**.

## Performance regression

### Browser primitive

`tests/primitives/performance.py`: **PASS** at 100 / 500 / 2,000 / 5,000 Thoughts.

The test exercises actual GridIndex / GeometryCache / CameraController / semantic-disclosure source and product CSS in Chromium. It is not whole-app FPS or React reconciliation.

### Spatial benchmark

`npm run bench:spatial`: **PASS** at 100 / 500 / 2,000 / 5,000 Thoughts.

### Storage/model benchmark

`npm run bench:storage`: **PASS** for inherited storage/model scenarios. v0.2.4 does not change storage.

## Code structure verification

- `src/field/Field.tsx`: 516 LOC, **untouched**.
- `src/ui/Workspace.tsx`: 331 LOC, touched only for optional command-origin handoff.
- `src/ui/field.css`: 217 LOC.
- No touched production file exceeds 350 LOC.
- No production dependency added.
- No new production module or global/canonical visual state added.
- New narrow local hooks only: optional `Surface.className` and optional command activation `origin?: Point`.

## REAL REACT APP — UNVERIFIED

Because the dependency graph cannot be installed here, the following required real-app views/transitions remain unverified:

- Field rest / selected / Focus in mounted React;
- Speak actual React idle -> one-line -> multiline -> overflow -> collapse lifecycle;
- More -> Settings with Floating UI/Motion/focus restoration in the mounted app;
- Settings runtime layout with real controls;
- Ghost/Recall React lifecycle;
- real Tab / Shift+Tab / Escape / rapid interruption behavior;
- full Vitest / build / Playwright application suite;
- Tauri runtime.

Primitive screenshots are never used as substitutes for these claims.
