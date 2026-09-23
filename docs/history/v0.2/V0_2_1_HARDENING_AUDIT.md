# v0.2.1 reference-first hardening audit

## Authority and inspection boundary

This extends, and does not supersede, the v0.2 REV1 redesign contract. The v0.2.1 user instruction controls only this hardening scope. Product/interaction semantics, frozen technical/performance contracts and inherited checkpoint safety remain authoritative. No specification is deleted or rewritten.

The supplied tar was extracted safely into the existing project tree. Before application edits, all 125 handwritten source/test/script/config text files (508,368 bytes in the review corpus) were read, together with the eleven required inherited documents, the value-checkpoint-safe prompt, README and relevant architecture/migration/provider/evidence/desktop/testing notes. Generated lockfile/assets were inventoried rather than mistaken for handwritten source. Historical verification is not current verification.

Baseline: Node 22.16.0, npm 10.9.2, global TypeScript 5.8.3. Registry DNS fails; offline npm installation has an uncached dependency. Rust/cargo are absent. A genuine package-lock.json is present in this supplied archive, contrary to some inherited delivery prose; retain its dependency resolutions. Current independent `npm run check:offline`: **95/95 tests pass**, along with its syntax/import/Core type/localization checks. Full dependency-backed and browser/native outcomes will be recorded separately.

Original source preserved outside the worktree in `inherited-source.zip`: CRC, extraction and every-file byte comparison passed. SHA-256: `e63dff67b09f9a4eb10a5fe31560d1a172d09e9ac6d52694a470413bd7cf4cd3`.

## Classification before application changes

| Area | Class | Verified source finding and bounded decision |
| --- | --- | --- |
| Canonical Core / ownership | KEEP, VERIFY | Actor-checked reducer, session Ghosts, explicit Claim/Wake/Crystal and confirmed relations already exist. No new ontology, layout or inference permissions. Preserve all passing invariant tests. |
| Global overlays / menus / dialogs | FIX, REFACTOR | `Workspace.openSurface` already calls `setMore(false)`, so the issue is not merely a missing close call. Independent local More state and `ui.surface` permit conflicting owners; the shared Surface lacks focus management and outside-dismiss. Menu focus return and unconditional Field focus on surface close can race a handoff. Introduce one explicit transient ownership transition, stale-dismiss protection and reference-backed focus behavior. Not a z-index-only fix. |
| Global keyboard | FIX, VERIFY | Window Escape handler ignores `defaultPrevented` and composition; Ctrl-Z can reach Field while a surface owns keys. Give each active surface first ownership without breaking non-modal Thread/Field use. Preserve native input/select behavior. |
| Settings | FIX, REFACTOR | Service cancellation is currently run for every language/theme update. Surface title-dependent focus effect can refocus on localization changes. Separate service changes from appearance; retain compact categories and session-only secret storage. |
| Thought typography | FIX (requested addition), VERIFY | Editorial Serif is already the content token. Add persisted Editorial Serif / Quiet Sans preference; maintain Sans chrome and CJK fallbacks, leave canonical coordinates and camera untouched. No arbitrary font editor or external font dependency. |
| Speak | VERIFY, possible FIX/SPLIT | Current composing width is 500px; no optional visual change before editorial/contextual references. Inline textarea resize is only driven on input and conditional blur; successful draft clearing can retain a tall inline height. A small cohesive Speak module and reset-on-value-change are appropriate if reproduction confirms. No chat dock, avatar or provider chrome. |
| Focus Field | KEEP, VERIFY | Pure local function reveals only existing relations, keeps direct neighbors and graded unrelated context. Selected geometry stays unchanged. No retuning opacity or graph visual language. |
| Camera / pointer / semantic zoom | KEEP, VERIFY | Imperative rAF camera and drag transforms, stable commits, spatial cache/culling, screen-space label disclosure. Do not redesign or introduce per-frame store work. `Field.tsx` is 504 physical LOC; inspect separate rendering responsibilities only if touched. |
| Thread / Deep Dive | KEEP, VERIFY | Frozen scope snapshots and distinct deep context/manuscript mode already exist. Thread must remain non-modal with usable Field; Deep Dive return camera/selection semantics must survive shared Surface changes. |
| Provider adapters / Hono | KEEP, VERIFY | Separate Chat/Responses wires, explicit trusted custom bases, AbortSignal/deadlines, bounded JSON and strict semantic validation, generic redacted diagnostics. Add targeted failure/transport tests; change only demonstrated defects. No SDK replacement. |
| Evidence / SmartSearch | KEEP, VERIFY | Candidate normalization, fetched-text matched passages, provenance, explicit assessment and fixed HTTP/no-shell CLI boundaries already implemented. No second aggregator. Never promote snippets to judgments. |
| Source extraction | VERIFY, possible FIX | Worker may be disposed while `blob.arrayBuffer()` is awaited; later non-null assertion/postMessage can throw or strand a pending entry. Reproduce with an injected Worker fixture, then harden without renderer-thread extraction. |
| Dexie / migration / writes | KEEP, VERIFY | Existing v1-to-v2 migration and database name retained; pure idempotence and single-flight/latest-pending writes tested. Extend actual Dexie edit/save/reopen tests when dependencies permit; no normalization rewrite. Multi-tab concurrency is not provided. |
| Tauri | KEEP, VERIFY / DEFER native run if blocked | Narrow explicit picker scopes and retained original blobs remain. No broad filesystem/open-path permission. Actual native close/reopen flow requires absent Rust/OS prerequisites. Static checks are not native verification. |
| Large directly affected source files | SPLIT selectively | Workspace 367 LOC contains services, global keyboard, commands, overlay routing and Speak. Separate coherent responsibilities while retaining shared React/Tauri architecture. Format touched code readably, not by minifying to satisfy counts. Do not decompose the repository for aesthetics. |
| Unsupported source formats | KEEP, DEFER | PDF/image/Office/audio/video stay honest Limited unless proper extraction exists. No OCR/parser expansion in this pass. |

## Reference gate and implementation sequence

1. Record this audit before application edits (this document).
2. Inspect required references for the next subsystem; append exact files/pages, blob/revision where available, license and observed/borrow/not-borrow/decision to `REFERENCE_AUDIT.md`. Mark blocked references honestly. Do not reuse old audit entries as proof of a fresh inspection.
3. Fix systemic menu/surface ownership and keyboard/focus handoff with regression tests.
4. Add persistent content typography; isolate presentation updates from provider configuration.
5. Apply only concrete reference-supported Speak/Settings improvements and split directly affected oversized responsibilities.
6. Reproduce and harden specific backend/source transport defects; verify migration/queue/native boundaries without replacing them.
7. Run all available baseline and new checks; preserve missing-dependency/native/live-provider checks as UNVERIFIED.
8. Refresh STATUS and size report; produce external valuable checkpoints, final real source ZIP, SHA-256, CRC/extraction/byte comparison and extracted-source checks.

## Outcome log

Application implementation has not started at audit creation. Append outcomes below without rewriting these baseline findings.


## Outcome checkpoint 1

Reference gate entries were written before UI implementation. Global surfaces now replace menu ownership through the same state transition; opening More dismisses an existing surface presentation without altering its canonical Thread or restoring the camera. No two owners are interactive at once. Deferred focus returns are invalidated by successor epochs. Thread stays non-modal. Speak keeps its prior width and aesthetics; only its ownership/measurement behavior was extracted. Settings gained the requested two content-font options, and preference persistence now reports storage failure without exposing secrets. Workspace is 327 physical lines after extracting keyboard/focus/Speak responsibilities.

Executed: existing 95 + 12 new offline tests = 107 passed; static source/local-import check, Core typecheck and locale check passed. Dependency-backed React behavior remains UNVERIFIED.

## Final hardening outcome

The supplied implementation remains the foundation. Central owner state, guarded focus restoration and the shared Floating UI layer now define the menu/dialog handoff; the React release gate remains explicitly unverified rather than inferred from pure tests. Settings gained only the requested two-way content typography control. Content and draft prose use the chosen font while chrome remains Sans. Presentation updates are separate from thinking-service configuration. Speak's existing width/style is retained; only concrete ownership/draft/height behavior changed.

Backend work was confined to `SourceParser` worker shutdown/transfer races and the shared bounded JSON transport. Worker-failure fixtures now settle all pending work without fabricated extraction. Rejected/oversized streams are released. A late comparison with the actual inherited HTTP module confirmed that native SyntaxError messages quote a short invalid response fixture; the new boundary preserves the error class but not raw body text/cause. Provider wire adapters, Hono routes, normalized evidence/SmartSearch and the Dexie schema/repository are byte-identical to the inherited code. No second search aggregator or broad native permission was added.

Final independent suite: **115/115** (95 inherited + 12 ownership/preference + 8 extraction/HTTP). Static syntax/local imports, Core types, strict transient-model types, localization and size checks pass. Real Chromium fixture checks pass **17 + 11** cases, and actual camera/culling plus spatial/storage-model benchmarks ran at 100/500/2,000/5,000 Thoughts. These are not whole-app performance, React focus integration or actual Dexie persistence verification. Twenty new React Playwright cases and two new Dexie cases are authored but dependency-blocked. Full typecheck, build, Vitest, React E2E, native Tauri and live provider/gateway checks remain UNVERIFIED for the precise reasons in `V0_2_1_VERIFICATION.md`.

Workspace is **327 physical LOC**, down from 367, with Speak, global shortcuts, transient focus and the pure ownership model separated by responsibility. Field.tsx remains **504 LOC**, byte-identical, and is the only non-exempt production file above 350 LOC. Its pointer/gesture lifecycle was not split without the mechanics reference gate and full app tests. No production file exceeds 700 LOC. The new dependency-free size guard is part of `check:offline`; a temporary 701-line probe was rejected and removed. Static localization is an explicit data-only exception. `source-size.json` reports physical LOC and bytes to avoid hiding density through minification.

All eleven inherited frozen specification files and all twenty inherited test files were byte-compared and preserved. No inherited file was removed. Package versions were updated to 0.2.1 without changing dependency resolutions; Tauri metadata changed only its version, not security or permissions. The new user hardening prompt and authority order are preserved beside the inherited contracts. Earlier STATUS/README are retained under `docs/history/`.

Final delivery is a real source archive with external SHA-256 and independent CRC/extraction/every-file verification; it is not a production bundle or only a report. Complete raw check transcripts, narrow fixture screenshots, benchmark records, preservation comparison and remaining release gates are under `verification/v0.2.1/` and the current STATUS.
