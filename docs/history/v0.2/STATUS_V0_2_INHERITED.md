# Diffusion Explorer v0.2 Status

Updated 2026-09-13. **Continuation-ready source redesign, not a fully verified application release.** The supplied React/TypeScript/Vite/Tauri/Hono project was modified in place; it was not replaced by a static/vanilla frontend.

## Product state

The principal v0.2 UI and backend paths are implemented in source. The strongest executed path is the independent Core flow: create/edit -> Claim/Wake -> frozen Thread -> explicit Crystal -> Source discovery/read/judgment -> archive validation/re-entry, with ownership, geometry, long-downtime and save-queue assertions. A separate Chromium harness tests the actual camera and CSS. Neither is a full React application run.

## UI redesign

Implemented: Paper Day/Graphite Night; editorial text-like Thoughts with unchanged selection geometry; aura-only selection; nuanced Focus; reduced-motion fallback; contextual Ask/More and five-command global menu; compact Speak; empty first-open; deterministic EN/ZH example; same-ID Ghost/Recall transitions; quiet Crystal; readable semantic zoom; directional offscreen Recall; distinct manuscript/context Deep Dive; frozen Thread wording; explicit reversible Let fade; readable unsupported-Source inspection.

Static localization coverage: 285 dictionary keys, no missing statically referenced keys or unwrapped JSX prose. User/source/model content is never auto-translated. Provider diagnostics, raw errors and legacy metadata can still be English; full interactive localization acceptance remains open.

Focus release now retains exiting SVG glyphs briefly, removes their interaction targets immediately, and lets the aura release last. CSS transition endpoints were tested; actual React release timing, multilingual typography and anchored menus still need full-app visual inspection. Semantic-zoom collision disclosure is implemented, but complex real Fields require evaluation beyond deterministic fixtures. PDF/image/Office content extraction is not implemented: metadata-only Limited remains explicit.

## Backend hardening

Implemented: active-session attention pressure rather than closed-time decay; one active plus one latest-pending snapshot; non-destructive Dexie v1->v2 migration; frozen Thread snapshots; canonical Source validation; discovery/read/judged evidence boundary; fetched-text-matched passages; separate scoped judgments with server-side re-fetch; Source updates without duplicate/moved Thoughts; explicit Chat Completions/Responses wire adapters; bounded JSON/timeout/abort handling; request IDs and redacted diagnostics; optional SmartSearch v1 CLI bridge alongside custom HTTP.

Partial/unverified: actual Dexie transaction and disk latency, dependency-backed gateway validation, real provider/SmartSearch connectivity, native dialog/file/read/persist/reopen/original workflow. Native local originals can be saved as a copy, but arbitrary retained native-path opening is not granted. Native Anthropic/Google protocol adapters and a live AI-SDK comparison were not implemented.

## Reuse/reference audit

Reused the already-declared Floating UI primitives, Motion, Dexie, Hono and Zod boundaries. No new production package or fabricated lockfile. Actual targeted inspection: Excalidraw theme/layers/dropdown/drag plus MIT license; Floating UI focus/navigation; Dexie upgrade; Vercel AI SDK OpenAI factory source; OpenAI structured-output docs; Tauri filesystem scopes; SmartSearch v1 command/model/CLI serialization. See `docs/REFERENCE_AUDIT.md`; the SDK was studied, not adopted. SmartSearch is an optional separately installed executable, not bundled code.

## Verification

| Check | Result and actual scope |
|---|---|
| Full application TypeScript | BLOCKED: absent Node/Vite dependency types. Not a PASS. |
| Independent strict TypeScript | PASS, global TypeScript 5.8.3 and `tsconfig.core.json`; not the declared 5.9 full application toolchain. |
| Source syntax/local imports/JSON | PASS; syntax transpilation is not React/Hono/Dexie API compatibility. |
| Offline Node tests | PASS 95/95. Original 56 retained with intentional v0.2 expectation changes, 39 added. |
| Locale static coverage | PASS, 285 keys. Not a full runtime language audit. |
| Vitest unit/integration | BLOCKED: Vitest/application dependencies unavailable. Includes actual Dexie/fake-IndexedDB migration and Hono route tests, authored but not executed. |
| Production Web build | BLOCKED by missing application dependencies. |
| Full Playwright application E2E | BLOCKED: npm Playwright runner absent. 18 tests authored, zero executed here. Historical 10/12 is not this run. |
| Chromium camera/CSS primitives | PASS 17/17; four explicitly labelled CSS fixtures inspected, not screenshots of a mounted React app. |
| Spatial benchmark | PASS at 100/500/2000/5000, index build/query only. |
| Browser DOM/culling scenario | PASS at 100/500/2000/5000, authored DOM with actual camera/index/CSS; not React FPS. |
| Snapshot/Find/queue benchmark | PASS at 500/2000/5000 for memory/serialization/Core costs. Native IndexedDB probe was blocked by browser policy; no disk-latency PASS. |
| Pure migration/re-entry | PASS, including old snippets, closed-time preservation and idempotence; actual Dexie upgrade unverified. |
| SmartSearch integration | Seven offline contract/process tests PASS; no installed/live SmartSearch or providers. |
| Tauri check/build | NOT VERIFIED: Rust/cargo/native prerequisites unavailable. |
| Source archive | Checkpoints A/B/C/D/E already integrity/extraction verified; final archive proof is generated alongside the final ZIP and includes a clean-extraction offline smoke test. |

## Environment limitations

Node 22.16.0/npm 10.9.2 are available. npm registry DNS/cache could not provide dependencies; no lockfile existed in the input. No real provider credentials were configured. Chromium's administrative policy blocked file/loopback navigation. The primitive harness uses `page.set_content` without changing that policy. Rust/cargo are absent. Network/dependency failures did not stop source implementation.

## Known remaining defects and limits

Full dependency-backed compile/build/browser acceptance is open and can reveal additional defects. The isolated fixtures cannot certify the actual menu, focus ownership, IME, Source inspection, theme-switch or Deep Dive user path in React. React Focus-release timing, stale-selection cleanup and Deep Dive return-point behavior are implemented but require application E2E verification. Original-file export/reopen on desktop still needs OS testing; direct original-path opening is intentionally unavailable. PDF page extraction and image analysis are absent. Concurrent multi-tab editing is not coordinated. Snapshot timings use a memory writer, not IndexedDB disk. Long Threads are bounded as provider context, but render virtualization is not implemented. SmartSearch bridge subprocess cancellation terminates the invoked executable; operators must ensure wrappers do not leave detached descendants. No production multi-tenant security/cost-control claim is made.

## Product-boundary checks

Core never imports React. Pointer-frequency camera/drag paths remain imperative. Selection never calls AI. Search snippets are not read evidence. Providers never issue canonical mutations. Crystals and permanent relations need user confirmation. Ghosts do not silently become owned. Keep protects persistence, not foreground prominence. Closed time cannot by itself cool ordinary Thoughts. No hidden preference learning, automatic spatial reorganization, new task manager, graph editor, whiteboard or chat-centered product was introduced.

## Exact next work

1. On a network-enabled development machine: install genuine dependencies, generate a real lockfile, run full TypeScript/Vitest/build and all 18 application E2E cases; repair any failures before claiming release readiness.
2. Inspect the real application in both locales/themes, including menu collision/keyboard focus, compact Speak and preserved drafts with AI off, IME, Source Limited path and exact Deep Dive return. Check the staged Focus-release sequencing and Deep Dive return after panning in Thread.
3. Verify actual Dexie migration and disk timings; smoke-test one configured AI protocol and SmartSearch/custom evidence adapter, including abort/degraded output.
4. Run the native picker -> read -> persist -> close/reopen -> inspect -> save-original-copy path under narrow capabilities. Add PDF.js only with page-provenance tests and a real verified dependency resolution.
