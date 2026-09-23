# Verification guide

## What already ran

The delivery environment ran Node 22.16.0, global TypeScript 5.8.3 and a standalone Chromium runtime. npm registry resolution and cache could not supply application dependencies. Exact results are in `verification/verification.json` and its companion reports.

```sh
npm run check:offline
npm run bench:spatial
```

`check:offline` first transpiles 70 TS/TSX sources for syntax, checks local imports/config JSON and Core's dependency boundary, then strictly typechecks the independent modules in `tsconfig.core.json` and runs 56 dependency-free tests. The test runner enumerates filenames rather than relying on shell glob expansion. It needs a locally installed or discoverable global TypeScript compiler; it does not download one.

A syntax transpile is not a semantic full-app typecheck. In particular, React, Vite, Dexie, Zod, Hono, Motion/Floating UI and native API compatibility are not established by this command. `tsconfig.core.json` intentionally excludes dependency-backed UI/adapters.

The spatial benchmark measures only index construction and local query cost. It does not measure layout, paint, frame cadence, events-to-pixels latency or persistent-storage performance.

## Isolated browser primitive regression

This optional test uses the actual camera controller transpiled with local TypeScript and the original theme/Field CSS. It checks geometry invariance, visible unrelated context, theme tokens, RAF coalescing, commit boundaries, pointer-centered zoom and reduced-motion behavior. It does not mount React or replace the intended application.

With Python Playwright and Chromium already available:

```sh
node scripts/prepare-primitives.mjs ../primitive-fixture
python3 tests/primitives/run.py ../primitive-fixture --report ../primitive-browser.json
```

`CHROMIUM_PATH` can select a system browser. The runner embeds its fixture with `page.set_content` and performs no HTTP navigation or network calls. This was useful because the delivery browser rejected loopback navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`; no policy was changed. Eight primitive checks passed. The fixture's tiny static markup is test-only, not a fallback frontend or screenshot of the product.

## Required checks after dependency resolution

```sh
npm install
npm run typecheck
npm run test:offline
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Resolve and commit real lockfiles only after successful resolution. The 19 Vitest cases exercise dependency-backed schema guards (6), Dexie/fake IndexedDB (5) and Hono gateway behaviors with explicitly mocked upstream responses (8). The 12 Playwright cases run against the real Vite frontend and cover core interaction, Focus, Ghost Claim, Thread scope, Crystal confirmation, Find, Source limits, nonblocking requests, themes and the 5000-Thought fixture. Neither suite was run in the delivery environment.

Gateway unit tests do not need real API keys and must not make real provider calls. A separate operator-configured smoke test is needed for each real model/search service. Verify malformed output, timeouts, cancellations, missing keys and denied web permission, not only happy paths.

## Native and performance checks

See `DESKTOP.md` for the Tauri shared-frontend path. Valid JSON/TOML only proves parsability, not Rust/plugin/CSP permission correctness. Validate dialogs, native original-copy saving, workers, IndexedDB persistence and external opening on the intended platform before packaging/signing.

The actual app exposes `/perf?count=100`, `/perf?count=500`, `/perf?count=2000` and `/perf?count=5000`. These are nonpersistent fixtures. Inspect actual mounted objects, frame cadence during camera/drag, Focus and LOD transitions, and behavior while a provider is pending. The target remains smooth 100-visible interactions on ordinary hardware; no 60fps PASS is claimed from isolated tests.

## Packaging regression

```sh
python3 scripts/snapshot.py my-source-checkpoint
```

The script checks required real source/config/test contents, excludes secrets/dependencies/build outputs, creates one `diffusion-explorer/` root inside a sibling delivery ZIP, tests CRC, extracts to a temporary directory, compares every source byte and records SHA-256. It also writes a proof outside the archive so a ZIP cannot claim its own final hash recursively. The current same-name proof is excluded from the archive; older checkpoint proofs remain useful history.

Extract the final source to a separate folder and repeat `npm run check:offline` (or the full installed suite when possible). A clean-extraction offline pass proves the archive contains enough independent source to run those checks, not that missing npm packages are magically installed.
