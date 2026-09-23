# Testing and verification

This guide explains what each verification layer proves, how to run it, and where its claims stop. Historical reports under [`history/`](history/README.md) remain historical; current outcomes belong in [`../STATUS.md`](../STATUS.md).

## Which layer owns a test

Each layer proves something the others cannot. Put a new check in the lowest layer that can fail for
the real reason.

| The behaviour under test | Layer | Why there |
|---|---|---|
| Pure logic: reducers, model/validation, geometry, migration functions, parsers, schemas | `tests/unit/` (Vitest) | Fast, no DOM, no network; a failure points at the function |
| Module boundaries and contracts: provider/gateway wire shapes, credential boundary, discovery envelope, source-size/locale policy, cross-module ownership | `tests/offline/` (Node `--test`, dependency-free) | Runs in the network-free `check:offline` gate, so a boundary regression cannot hide behind an uninstalled dependency |
| Real mounted application behavior: gestures, camera commits, focus/Escape handoff, persistence through the UI, visual/material contracts, Reduced Motion | `tests/e2e/` (Playwright) | The assertion is on the assembled product, not an isolated module |
| Native shell: dialogs, filesystem scope, OS credentials, packaging, Windows/WebView2 | manual `cargo`/Tauri pass, documented in [`DESKTOP.md`](DESKTOP.md) | No headless substitute exists for OS integration |

`tests/primitives/` is a separate authored harness, not a fourth gate; it measures camera/geometry
and typography costs without mounting React. Test file naming and placement conventions are in
[`CONVENTIONS.md`](CONVENTIONS.md#tests).

Generated evidence is not a layer: only tracked tests, [`../STATUS.md`](../STATUS.md), this document
and [`ACCEPTANCE_MAP.md`](ACCEPTANCE_MAP.md) are portable verification authority. The
`verification/`, `playwright-report/` and `test-results/` trees are local and gitignored — see
[`VERIFICATION.md`](VERIFICATION.md#portable-evidence-vs-local-evidence).

## Install the declared toolchain

Use Node and pnpm versions compatible with [`package.json`](../package.json):

```sh
corepack enable
pnpm install --frozen-lockfile
```

The repository currently requires Node 22.12 or newer and declares pnpm 12.4.2.

## Fast local gates

Run these before opening a pull request:

```sh
pnpm run typecheck
pnpm run check:offline
pnpm test
pnpm run build
git diff --check
```

### `pnpm run typecheck`

Runs dependency-backed TypeScript checking for the application. A syntax-only transpile or Core-only check is not a substitute.

### `pnpm run check:offline`

Runs the repository's network-free contract gate:

- syntax transpilation and local-import/config validation;
- React-independent Core typechecking;
- EN/ZH locale coverage;
- independent Node contract tests;
- source-size policy.

Its opening syntax message explicitly says what it does **not** prove. The complete command continues into dependency-backed Core and contract checks.

### `pnpm test`

Runs Vitest against Core behavior, migrations, repository/Dexie behavior, gateway routes, providers, discovery, UI contracts, Appearance migration and recommendations, Field Style motion, and related modules. Tests use injected/fake upstreams and do not contact live providers.

### `pnpm run build`

Runs the application typecheck and creates a Vite production build. A successful build proves bundling, not native packaging or live integration. The current build emits a warning that the main minified chunk exceeds Vite's 500 kB recommendation; the warning is tracked rather than suppressed.

### `git diff --check`

Checks whitespace errors in the proposed diff. It does not format files and does not modify the working tree.

There is no configured lint or non-mutating format-check command. `pnpm run format:source` edits files and must not be presented as a verification gate.

## Browser and interaction E2E

Install Chromium once:

```sh
pnpm exec playwright install chromium
```

Run the production-bundle E2E suite:

```sh
pnpm run test:e2e
```

[`playwright.config.ts`](../playwright.config.ts) builds and serves the production bundle, uses one worker, and preserves full assertions. The suite covers Field interaction, camera/geometry, command and surface ownership, persistence, providers, motion, materials, tutorial flows, visual contracts, Appearance, and Reduced Motion.

A valid E2E claim records the complete command, pass/fail result, and exact failing tests. When a failure may be flaky:

1. keep the original full-suite result;
2. rerun the exact test in isolation;
3. report whether it passes intermittently or fails deterministically;
4. do not weaken, skip, or add retries merely to make CI green.

Until a complete run fails and is classified, full Playwright is a blocking CI gate. Two consecutive complete stabilization runs passed with one worker and no retries. A valid E2E claim still records the complete command and exact result.

On failure, preserve `playwright-report/` and `test-results/`; both are ignored locally and uploaded by the E2E GitHub Actions workflow.

## Visual and Appearance verification

For changes to Theme/Profile, Field Style, Accent, Image Atmosphere, Field Presence, Ambient Motion, Field materials, or motion:

- run the relevant unit/offline and Playwright tests;
- compare at a fixed viewport and camera when visual behavior is under review;
- attach screenshots or a short video to the pull request;
- check Reduced Motion and Motion 0 when motion is affected.

Local artifacts belong under `verification/`, `playwright-report/`, or `test-results/` and are intentionally ignored. Do not commit generated screenshots or recordings unless the repository owner explicitly chooses a tracked evidence update.

A CSS fixture, component screenshot, or isolated animation does not prove the mounted application interaction path. Label evidence by what it actually exercised.

## Discovery engine

The Diffusion-owned discovery engine is independently maintained under `internal/discovery-engine/`.

```sh
pnpm run test:discovery
pnpm run build:discovery
pnpm run check:discovery
```

- `test:discovery` runs offline Python tests with fake sources/readers and needs no credentials or network.
- `build:discovery` freezes the engine for the Tauri resource directory on a suitable build machine. The resulting executable is platform-specific and should not be treated as Windows package evidence when built on Linux.
- `check:discovery` verifies that the generated sidecar matches current source.

These checks stay separate from `check:offline` because the normal JavaScript/TypeScript gate must not require Python or PyInstaller. Contract tests in `tests/offline/` and `tests/unit/` additionally enforce the browser/native discovery credential boundary.

## Native/Tauri verification

See [`DESKTOP.md`](DESKTOP.md) for platform requirements and acceptance scope. With Rust, Cargo, platform Tauri prerequisites, and the discovery sidecar available:

```sh
pnpm run typecheck
pnpm test
pnpm run build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm run tauri -- dev
pnpm run tauri -- build
```

A native acceptance pass should cover:

- picker -> bounded read -> project persistence -> close/reopen -> Source inspection;
- native Save/Open dialog scope and save-original-copy behavior;
- OS credential storage and native provider/discovery transport;
- Windows display scaling and Chinese IME where applicable;
- packaged sidecar and installer behavior.

Valid JSON/TOML, a Web build, or a browser E2E pass is not native compilation or OS acceptance.

## Live provider and discovery smoke tests

Offline fixtures intentionally use no private credentials. Operator-authorized live testing is separate:

```sh
pnpm run smoke:providers
```

The script prints skipped providers as **UNVERIFIED**, never as passes. Discovery sources require native credential setup and an operator-authorized query/read acceptance pass; offline discovery tests and a current sidecar do not establish live source behavior.

Use private environment configuration and never commit output containing credentials or private source content. Verify failures, malformed/refused output, cancellation, deadlines, missing credentials, and degraded discovery envelopes—not only the happy path. A passing envelope contract does not prove that a real provider works.

## Benchmarks

```sh
pnpm run bench:spatial
pnpm run bench:storage
pnpm run bench:history
```

Read [`PERFORMANCE.md`](PERFORMANCE.md) before interpreting results. Spatial/index and serialization measurements are not IndexedDB disk latency, GPU performance, or an end-user latency claim.

## Verification honesty

- Report current commands, environment, and outcomes; do not reuse old phase counts.
- Distinguish syntax checks, unit/contracts, mounted browser behavior, native behavior, and live integrations.
- Do not turn skipped, retried, or fixture-only evidence into a broader pass claim.
- Do not edit product behavior or assertions solely to make an unrelated gate green.
- Keep secrets and private data out of reports and artifacts.
