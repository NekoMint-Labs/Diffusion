# Diffusion Explorer v0.2.5 — Verification Record

## Verification boundary

v0.2.5 replaces several hand-written CSS approximations with the repository's existing Motion dependency and one narrow attributed React Bits adaptation. The mounted dependency-backed React application could not be started because the locked npm dependency graph is unavailable locally and registry installs do not complete in this environment.

**CSS/primitive evidence below is supplemental and is not a substitute for Motion runtime verification.**

Command outputs are retained under `verification/v0.2.5/commands/`.

## Source / offline gate

`npm run check:offline`: **139 / 139 PASS**.

Includes:

- dependency-free Core typecheck;
- local-import/syntax/config checks;
- locale coverage;
- source-size gate;
- 8 v0.2.5 reuse-first lifecycle/architecture contracts;
- inherited v0.2/v0.2.1/v0.2.2/v0.2.3/v0.2.4 contracts updated only where the implementation mechanism was deliberately superseded by Motion.

Touched TS/TSX modules were additionally run through TypeScript `transpileModule` with diagnostics: **9 / 9 PASS** for syntax/transpile diagnostics.

## Chromium primitive checks

### v0.2.5 static motion-reuse fixture

`tests/primitives/v025_motion_reuse.py`: **7 / 7 PASS**.

Checks only what an authored-DOM CSS fixture can honestly prove:

- Speak static 250px / 520px endpoints and centering wrapper;
- narrow Paper Day responsiveness;
- Focus opacity hierarchy without geometry drift;
- More and Settings shared visual shell layers are non-interactive;
- shared Settings root/material separation;
- reduced-motion CSS collapse for remaining decorative CSS transition.

It **does not** mount React or Motion and therefore does not verify `layout`, `layoutId`, focus retention, Escape timing or shared-layout continuity.

### Inherited camera/CSS primitive

`tests/primitives/run.py`: **17 / 17 PASS**.

### Typography/theme/locale fixture

`tests/primitives/typography.py`: **11 / 11 PASS**.

### Browser performance primitive

`tests/primitives/performance.py`: **PASS** at 100 / 500 / 2,000 / 5,000 Thoughts. This remains a bounded DOM/camera primitive, not whole-app FPS.

## Algorithmic benchmarks

- `npm run bench:spatial`: PASS at 100 / 500 / 2,000 / 5,000 Thoughts.
- `npm run bench:storage`: PASS for inherited model/storage scenarios. v0.2.5 does not change storage.

## Required dependency-backed commands attempted

### Dependency acquisition

- online `npm ci --ignore-scripts`: bounded attempt did not complete; partial install discarded;
- online `npm ci --ignore-scripts --registry=https://registry.npmmirror.com`: same result, partial ~828 KB install discarded;
- `npm ci --offline --ignore-scripts`: exit 1 `ENOTCACHED` for locked `zustand-5.0.15.tgz`; local npm cache contains no package content.

### Full checks

- `npm run typecheck`: **exit 2**, missing `node` and `vite/client` type definitions because dependencies are absent;
- `npm test`: **exit 127**, `vitest: not found`;
- `npm run build`: **exit 2**, stops at the same full-typecheck dependency boundary;
- `npm run test:e2e`: **exit 1**, available `playwright` executable reports `unknown command 'test'` and is not the project's Playwright Test package.

## REAL REACT APP — UNVERIFIED

The following required v0.2.5 runtime observations remain **UNVERIFIED**:

- Speak idle -> compose -> multiline -> overflow -> collapse using Motion layout;
- textarea focus retention while Speak geometry animates;
- Escape during Speak expansion;
- More -> Settings shared `layoutId` shell continuity;
- Settings immediate focusability while shared shell motion continues;
- rapid Settings close -> immediately reopen More;
- Ghost/Recall Motion presence in the mounted Field;
- normal-motion vs system reduced-motion runtime comparison.

The implementation has offline lifecycle contracts for these ownership rules, but visual/runtime completion must be checked on a machine where `npm ci` succeeds.

## Archive verification

The final source archive is created only after the source tree is frozen. `scripts/snapshot.py` verifies a single archive root, exclusions, ZIP CRC, fresh extraction, required files and byte-for-byte recovery before emitting the external `.sha256` and `.proof.json`. The final delivery proof is intentionally kept outside the hashed source archive so recording the hash cannot mutate the archive it describes. The fresh-extracted artifact is then re-checked separately during delivery; those final results are reported with the archive.
