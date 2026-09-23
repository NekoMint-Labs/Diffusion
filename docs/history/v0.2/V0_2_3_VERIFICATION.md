# Diffusion Explorer v0.2.3 — verification and delivery record

## Verification boundary

v0.2.3 is an identity-only frontend pass over the existing v0.2.2 source. No backend/provider/evidence/storage/spatial-mechanics scope was intentionally reopened.

A real mounted React application could not be produced in this environment. The final dependency install proof is:

```text
npm ci --offline --ignore-scripts
ENOTCACHED: zustand-5.0.15.tgz is not available in the npm cache
```

The earlier online `npm ci` attempt also did not complete. Therefore all browser screenshots in `verification/v0.2.3/` are explicitly authored **CSS/PRIMITIVE FIXTURES**, not React-app screenshots.

## Strongest available source verification

`npm run check:offline` — **PASS**

- source syntax/local import/JSON check: 96 TS/TSX files PASS;
- dependency-free Core typecheck: PASS;
- locale contract: 334 dictionary keys, 0 missing/unwrapped/unlocalized;
- offline Node suite: **125/125 PASS**;
- source-size contract: PASS, no handwritten production file >700 LOC.

The five v0.2.3 identity tests specifically protect:

- selection/Focus remaining text-first and glow/card free;
- transparent, line-led Speak composition;
- removal of the conventional menu active bar;
- grouped/non-table Settings presentation;
- no growth of `Field.tsx` or `Workspace.tsx` with identity presentation ownership.

## Chromium primitive / visual verification

All use actual current product CSS and source mechanics with authored DOM. They do **not** verify React lifecycle, Floating UI focus restoration, Dexie, providers or mounted-app integration.

- camera/CSS primitive: **17/17 PASS**;
- typography/theme/locale/viewport fixture: **11/11 PASS**;
- v0.2.3 identity fixture: **6/6 PASS**;
- browser performance primitive at 100 / 500 / 2,000 / 5,000 Thoughts: PASS.

Representative fixture evidence includes:

- `primitive-screenshots/paper-day.png` — Paper Day Field rest;
- `primitive-screenshots/graphite-night.png` — Graphite Night Field rest;
- `primitive-screenshots/graphite-focus.png` — selected/Focus hierarchy;
- `identity-screenshots/dark-speak-idle.png`;
- `identity-screenshots/dark-speak-composing.png`;
- `identity-screenshots/dark-more-menu.png`;
- `identity-screenshots/dark-settings-en.png`;
- `identity-screenshots/light-settings-zh.png`;
- `primitive-screenshots/chinese-focus.png` plus typography fixtures for zh/en, light/dark, Serif/Sans.

Visual inspection rejected the remaining left/right Settings table rhythm and led to the final stacked label/value grouping. It also confirmed that the final Speak composing state remains transparent and reads as temporary writing space rather than a rounded composer.

## Performance/model checks

- `npm run bench:spatial` — PASS at 100 / 500 / 2,000 / 5,000 Thoughts.
- `npm run bench:storage` — PASS for existing model/write-queue scenarios.
- Browser performance primitive — PASS; direct camera pan retains zero canonical commits until gesture boundary in the authored mechanics harness.

These are model/primitive measurements, not whole-React-app FPS claims.

## Requested dependency-backed commands

Each command was attempted once against the final working tree and its exact output/exit status is saved under `verification/v0.2.3/commands/`.

| Command | Result | Actual boundary |
|---|---|---|
| `npm run typecheck` | UNVERIFIED / exit 2 | missing installed `node` and `vite/client` type definitions |
| `npm test` | UNVERIFIED / exit 127 | project `vitest` binary unavailable |
| `npm run build` | UNVERIFIED / exit 2 | stops at the same full-typecheck dependency boundary |
| `npm run test:e2e` | UNVERIFIED / exit 1 | available `playwright` executable is not the project Playwright test runner (`unknown command 'test'`) |
| `npm run check:offline` | VERIFIED / exit 0 | 125/125 offline tests plus source/Core/locale/size gates |

## Real React / interaction verification

**UNVERIFIED in this environment:**

- real mounted React screenshots;
- real More open/close, More -> Settings -> close interruption lifecycle;
- Tab / Shift+Tab / focus restoration through actual Floating UI components;
- actual Speak idle -> compose -> submit / Escape integration;
- dependency-backed Thought/Focus/Ghost/Recall React behavior;
- production build and full E2E;
- native Tauri build/runtime.

The existing semantic/overlay code was not changed by v0.2.3; source/offline tests protect those inherited contracts, but this is not equivalent to mounted-app verification.

## Structure / dependency review

No production dependency was added or removed. Package resolutions remain unchanged; only app/native version metadata is bumped to 0.2.3.

Largest handwritten production files are recorded in `docs/history/v0.2/V0_2_3_IDENTITY_AUDIT.md` and by `npm run check:source-size`. `Field.tsx` remains 516 LOC and untouched; no touched production file exceeds 350 LOC.

## Delivery rule

The final source archive must be CRC-tested, freshly extracted, checked for required files, and `npm run check:offline` must be run again against the extracted artifact before delivery. The final SHA-256 is recorded outside the archive.
