# v0.2 implementation audit

Audit performed before product changes, 2026-09-13. Input: the supplied v0.1 source ZIP (SHA-256 `5c23b2079aa4b990ab7ce56e5f2cbf6899e2faf6152a9752ef69b740bafb12c9`). The existing application is reusable; a greenfield replacement is not justified.

| Classification | Existing modules / observation | Decision |
| --- | --- | --- |
| KEEP | `core/model`, events, actor gate, semantic permission checks, undo, explicit Crystal/Claim/Wake/Fork semantics | Preserve ownership and canonical/session separation; extend only where v0.2 requires it. |
| KEEP | `field/camera`, spatial grid/geometry, imperative pointer capture/drag, lasso | Preserve frame-local transforms and one canonical drag commit. Repair only reproduced defects. |
| KEEP | Hono, Zod schemas, ProjectRepository, platform adapters, bounded workers | Keep architecture and replaceable seams. |
| KEEP | Existing 56 passing offline tests; dependency-backed test sources | Preserve tests, intentionally revise tests whose old behavior conflicts with v0.2. |
| REFACTOR | `core/reducer.lifecycle` ages by `Date.now - touchedAt`; a restart has no session protection | Replace wall-clock-only decay with accumulated, active-session attention pressure; add downtime regressions. |
| REFACTOR | Controller queues an entire snapshot per mutation, with no coalescing | Single-flight latest-snapshot scheduling; flush and failure semantics tested. |
| REFACTOR | Focus has only selected/direct/receded; Atlas shrinks labels with world scale; Recall edge cues stack | Add explicit presence tiers, readable semantic representations, intentional landmarks, directional Recall. |
| REWRITE UI | Brown theme, permanently visible metadata, pill-like attention pseudo-element, fixed title/brand | Semantic Paper Day/Graphite Night tokens, editorial text geometry, borderless aura only. |
| REWRITE UI | `Workspace` mixes global and scoped actions in one long menu | Separate a short global menu from anchored Thought/Source context menus and optional deeper actions. |
| REWRITE UI | Speak uses repeated scope chips/provider label; first-open always seeds sample content | Quiet compact language entrance; empty first-open; explicit localized sample Field. |
| REWRITE UI | `ThreadSurface` changes only title/width for Deep Dive | Separate Deep Dive information architecture, relevant-context rail, structured manuscript, exact return. |
| REWRITE UI | UI copy is hardcoded English throughout | One small EN/ZH dictionary, reactive locale preference, stable test IDs. Preserve user/source text unchanged. |
| HARDEN BACKEND | Search results require an `outcome` and are brought directly as excerpts | Separate candidate/read/reasoned stages; read passages/provenance required for judgment or AI evidence context. |
| HARDEN BACKEND | AI server assumes `/chat/completions` and `choices[0]` | Isolate wire adapters; explicit Responses/custom Chat Completions configuration; safe diagnostics and abort tests. |
| HARDEN BACKEND | Dexie database declares version 1 only | Versioned non-destructive migration, pure migration tests and a real IndexedDB migration test for installed environments. |
| HARDEN BACKEND | UTF-8 extraction is bounded; PDFs/images/Office are metadata-only | Preserve honest Limited fallback; do not claim PDF content was read. Evaluate a bounded PDF extraction adapter only if verifiable. |
| HARDEN BACKEND | Find scans all project content; Recall is lexical and deterministic | Benchmark before adopting another index. Keep Recall distinct from search and preference learning. |
| HARDEN BACKEND | Native plugin scopes are configured but native execution was never verified | Audit narrow dialog-granted scopes and path fallback. Native verification remains environment-limited. |
| REMOVE | Always-on `Saved locally`, provider/demo labels, Field instructions, large selected background, global feature inventory | Remove idle chrome only. Retain errors, capability honesty at the relevant action, help and contextual access. |

## Baseline actually run

- Node 22.16.0 / npm 10.9.2. No Git metadata or lockfile in the supplied ZIP.
- `npm run check:offline`: PASS (syntax/import/JSON checks, strict independent-module typecheck, 56/56 Node tests).
- `npm run bench:spatial`: PASS at 100 / 500 / 2000 / 5000 (index-only, not FPS).
- `npm run typecheck`: BLOCKED, missing Node and Vite dependency types (exit 2).
- `npm test`: BLOCKED, Vitest unavailable (exit 127).
- `npm run build`: BLOCKED at dependency types (exit 2).
- `npm run test:e2e`: BLOCKED, installed `playwright` is the Python CLI, not the npm test runner (exit 1). No current 10/12 claim.
- npm registry DNS unavailable; no relevant packages in local npm cache. One install attempt stopped rather than retrying indefinitely. No fabricated lockfile.
- Chromium and Python Playwright exist; Rust/cargo and native prerequisites absent.
- `/mnt/data/checkpoints/00-original-v0.1.zip` CRC-tested and read back outside the working source tree.

Full application browser/production verification is not interchangeable with independent tests or isolated CSS rendering.

## Completion against the audit

The original audit above remains a record of pre-change decisions. This pass modified the existing source rather than replacing the architecture. Core permission/identity tests, camera/drag ownership, spatial grid, repository and platform seams remain. The visible shell, theme, Thought/Focus states, compact Speak, command hierarchy, EN/ZH copy and Deep Dive presentation were rewritten. Demo data is explicit and deterministic instead of replacing first-open Main.

Lifecycle now uses active attention pressure; Thread wording is frozen; snapshot writes coalesce; Dexie has a non-destructive upgrade. Evidence has explicit discovery/read/reason stages, canonical Source validation and same-reference upgrades; providers have separate wire adapters and diagnostics. SmartSearch gained a bounded optional CLI bridge after its actual v1 serializer/parser was inspected. The old debug chrome and pill selection were removed, not the underlying contextual capabilities.

No new production dependency was added without resolution. Existing Floating UI primitives are reused. SDK, PDF.js and MiniSearch were not adopted merely because they appeared in the specification. PDF/image/Office parsing remains honestly Limited. Arbitrary native-path opening remains unsupported; local original-copy saving is the available narrow-permission path.

Verification reached 95/95 offline tests, independent strict TypeScript and 285-key locale checks, plus 17/17 real-CSS/camera Chromium fixture assertions. All four scale fixtures and separate snapshot costs ran. Full app types/build, 27 Vitest cases, 18 app E2E cases, native Dexie/Tauri and real providers remain blocked/unverified. This is source and bounded primitive progress, not a claim that every v0.2 acceptance goal was runtime-verified. See `ACCEPTANCE_MAP.md`, `TESTING.md` and `../STATUS.md`.
