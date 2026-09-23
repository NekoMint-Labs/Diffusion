# v0.2.1 verification and delivery record

## Result boundary

This is a source hardening delivery, not a certified production build. The requested source work is implemented and the available independent checks pass. The dependency-backed React, Hono/Zod and Dexie suites could not execute in this environment. In particular, a pure ownership-state test is not proof that Floating UI's browser focus integration passes. The new React regression cases are retained for that release gate.

All eleven inherited files under `docs/specs/` are byte-identical. All twenty inherited test files are byte-identical. No inherited file was removed. Dependency resolutions, Core, camera/pointer/spatial source, AI/provider implementation, storage schema/repository and native permission/security configuration remain unchanged. Only application/version metadata changes from 0.2.0 to 0.2.1. See `verification/v0.2.1/preservation.json` for the exact changed inherited paths and source hashes. Historical STATUS and README are retained in `docs/history/`.

## Commands actually executed

Environment: Node 22.16.0, npm 10.9.2, global TypeScript 5.8.3, Chromium 144.0.7559.96 on Debian 13. The package lock declares a newer TypeScript resolution; independent type checks here do not substitute for the locked application toolchain.

| Check | Current result | What this establishes |
| --- | --- | --- |
| `npm run check:locales` | PASS; 332 dictionary keys, zero reported missing/unwrapped/unlocalized copy | Static localization coverage, not an exhaustive translation review. |
| `npm run check:offline` | PASS; 115/115 tests, zero skipped/failed | All 95 inherited independent tests plus 12 ownership/preference and 8 extraction/HTTP tests. Also syntax-transpiles 95 TS/TSX files, validates JSON/local imports, runs the independent Core typecheck and source-size guard. |
| Targeted strict `tsc` on `src/ui/transient.ts` | PASS | Dependency-free transient transition types, not React integration types. |
| `npm run check:source-size` | PASS | No non-exempt production file exceeds 700 physical lines. A temporary 701-line probe was correctly rejected and then removed. |
| `npm run typecheck` | BLOCKED; exit 2 | Missing `node` and `vite/client` type definitions; no full application typecheck claim. |
| `npm test` | BLOCKED; exit 127 | Project Vitest is not installed. New Dexie tests were authored but not executed. |
| `npm run build` | BLOCKED; exit 2 | Stops at the same missing-type prerequisite. No new production bundle was generated. |
| `npm run test:e2e` | BLOCKED; exit 1 | The available non-project Playwright CLI rejects `test`; the project's `@playwright/test` dependency is absent. Chromium itself is available. |
| `cargo --version` | BLOCKED; exit 127 | Rust/cargo unavailable; native Tauri build and real file/reopen flow remain unverified. |

Command/exit-code records and full requested-check transcripts are in `verification/v0.2.1/requested-checks.json` and `verification/v0.2.1/commands/`. Registry DNS failed, and `npm ci --offline --ignore-scripts --no-audit --no-fund` failed with an uncached locked dependency. No versions were substituted, no declarations were faked, and no existing test was weakened to obtain a pass.

## Real Chromium checks, with an explicit limit

`tests/primitives/run.py` passed **17/17** assertions using compiled camera/spatial modules and actual product CSS in an authored DOM fixture. It covers stable selection geometry, Focus context, theme parity, camera commit boundaries, zoom, reduced motion, bounded Speak and distinct Deep Dive presentation.

`tests/primitives/typography.py` passed **11/11** cases: the eight Serif/Sans x Light/Dark x English/Chinese combinations plus three viewport checks. Actual CSS resolves the content font for Thought, Ghost, Recall, Crystal, Thread, Deep Dive and draft prose while chrome stays Sans. It checks transparent selection/input-shield presentation, shield hit testing, unchanged transforms and bounded Settings at 768x960, 390x740 and 1440x600. Representative English Light Serif and Chinese Dark Sans screenshots were visually inspected for hierarchy and clipping.

These are **not React application screenshots or end-to-end focus/persistence tests**. Screenshots are labeled accordingly, under `verification/v0.2.1/css-previews/` and `typography-previews/`. No visual acceptance claim is made for unexecuted React states.

Reproduction commands, after installing the ordinary project dependencies or providing the documented independent tools:

```sh
node scripts/prepare-primitives.mjs .tmp/primitives
python3 tests/primitives/run.py .tmp/primitives --report verification/v0.2.1/primitives.json --screenshots verification/v0.2.1/css-previews
python3 tests/primitives/typography.py --report verification/v0.2.1/typography.json --screenshots verification/v0.2.1/typography-previews
python3 tests/primitives/performance.py .tmp/primitives --report verification/v0.2.1/performance-primitives.json
npm run bench:spatial
npm run bench:storage
```

The Python fixture scripts require Python Playwright and an available Chromium executable. They are optional development verification tools, not new runtime dependencies.

## Performance and persistence evidence

The real camera/culling primitive scenario ran at 100, 500, 2,000 and 5,000 Thoughts. All scenarios kept canonical writes out of pointer-frame updates, made one final gesture commit and respected the local/Atlas DOM budgets. The report includes construction/layout and rAF samples; those are **not whole-application FPS**.

Spatial-index and storage-model benchmarks also ran at those fixture sizes. The actual single-flight write queue retained one active writer and one latest pending snapshot while 100 edits were queued; two writes persisted the initial/latest states. Serialization, migration, validation and model mutation timings are included. These are **not Dexie/IndexedDB disk-latency benchmarks** and do not justify a storage-model normalization rewrite.

Two new dependency-backed tests in `tests/unit/hardening-persistence.test.ts` describe the real Dexie legacy DB -> migration -> edit -> save -> close -> fresh repository -> reopen sequence, original-Blob preservation, frozen Thread snapshot, idempotence, and failed-write/latest-state retry. They remain **UNVERIFIED**, rather than being replaced with a fake storage pass.

## Frontend regression coverage

Twenty new Playwright cases are authored in `tests/e2e/hardening.spec.ts`: More -> Settings/Find/Import/Help, Import -> Restore, Escape, keyboard navigation, Tab/Shift+Tab, outside dismissal, focus return/reopening, Ctrl-K handoff, all eight font/theme/locale preference combinations with persistence/no project replacement, Speak reset/draft retention, and non-modal frozen Thread scope. These have not executed in the React app here.

The actual pure transition/preference functions passed twelve independent tests, including predecessor epoch invalidation, exclusive owner transitions, legacy defaults, invalid stored preferences, memory-only tokens, storage failure and visual/service change separation. The localStorage persistence test uses a test double; it is not claimed as browser persistence verification.

## Backend changes and proof

`src/evidence/parser.ts` now handles worker disposal while Blob reading is pending and synchronous transfer failure. Pending entries and timers are released, queued requests settle, late replies do not revive them, and the resulting state is honestly Limited. The tests use an injected Worker fixture; no unimplemented parser or renderer-thread fallback was added.

`src/shared/http.ts` releases rejected/oversized response streams without allowing cleanup failures to replace redacted diagnostics. Malformed successful responses now retain the SyntaxError classification but do not quote raw response text or retain a raw cause. A comparison against the actual inherited HTTP module demonstrates the old diagnostic quoting a short test fixture and the hardened diagnostic withholding it; see `malformed-json-comparison.json`. This is transport hardening, not a claim of a full security audit.

Chat Completions, Responses, custom operator-configured endpoints, AbortSignal/timeouts, semantic schemas and the normalized SmartSearch boundary are retained. Live provider/model behavior, credentials, network error paths through the full Hono application and a deployed SmartSearch service were not exercised. Search snippets still cannot become final evidence judgments.

## References and modularity

The current-run section of `docs/REFERENCE_AUDIT.md` records actual inspections of Floating UI, Radix Dialog/DropdownMenu, Excalidraw theme/island/layer/dropdown source, Penpot color/token source, Kumu Focus/Showcase, Linear's contextual menu, Are.na's Sander article and selected Allume update entries. Exact paths/URLs, blob IDs where available, license basis, observations, non-borrow rules and decisions are included. Product pages are not labeled source-code inspections. No Radix dependency, foreign product ontology, external font or copied visual asset was introduced.

Pointer/camera rewrites were not undertaken, so Kinopio/tldraw/AFFiNE mechanics inspections are explicitly **not claimed**. Their reference/license gate remains in force before future changes to those systems.

The largest handwritten production files are Field.tsx (504 physical LOC), Workspace.tsx (327), validation.ts (278) and reducer.ts (249). Field.tsx is the only non-exempt file above 350 LOC and is byte-identical to the inherited version. Splitting its gesture/render lifecycle without its specific reference study and application tests was deliberately deferred. Workspace was reduced from 367 LOC by extracting Speak, workspace shortcuts and transient focus coordination, with the pure owner transition model separate from React. The size report includes bytes as well as LOC; source was not minified to satisfy thresholds. Static localization is explicitly classified, not used to hide logic.

## Remaining release gates and limitations

Run the complete locked typecheck, Vitest, build and React Playwright suites on a registry-connected machine. The most important pending browser gate is the real Floating UI portal/focus handoff: CSS fixture success does not close it. Verify the native Tauri picker/import/persist/close/reopen flow on a supported desktop with Rust and platform prerequisites. Native original-file handling remains retained-copy export, not unrestricted filesystem opening.

PDF/image/Office/audio/video extraction remains Limited where no proper reader exists. Multi-tab conflict handling and full application performance at large Field sizes are inherited limitations, not completed work in this pass. No live web evidence, model reasoning or source-reading result was fabricated.

## Delivery preservation

The immutable pre-edit archive and the valuable UI checkpoint were independently CRC/extraction/byte verified. The UI checkpoint was produced at 13:45 UTC, within the first half hour of the run. A final source ZIP is created by `scripts/snapshot.py`, which verifies required real application files, a single archive root, excluded dependency/secret/build folders, ZIP CRC, extraction and every recovered file's bytes. The ZIP has an external SHA-256 and proof JSON; an archive cannot contain its own final hash. Archive integrity is separate from runtime verification. Final delivery does not contain stale v0.2 build output presented as a v0.2.1 bundle.
