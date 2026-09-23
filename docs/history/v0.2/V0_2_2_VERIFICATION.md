# Diffusion Explorer v0.2.2 verification and delivery record

Date: 2026-09-14

This record covers the reference-driven frontend refinement pass only. v0.2.1 remains the implementation baseline and the inherited product, Core, persistence, provider/evidence, Focus semantics, direct-manipulation ownership, and performance contracts are unchanged except for presentation code required by this pass.

## Implemented scope

- Added a compact shared motion vocabulary (`src/ui/motion.ts`) with reduced-motion handling and placement-aware origins.
- Refined More as a positioned Floating UI wrapper plus animated visual child. The command model, keyboard ownership, dismissal and exclusive transient owner are unchanged.
- Captured the actual global More trigger origin when opening Settings so the successor surface has spatial provenance without waiting for a decorative exit.
- Refined shared anchored Surface entrance motion without changing focus/dismiss semantics. Anchored point positioning continues to use Floating UI with `transform:false`, avoiding transform-layer conflict.
- Reduced Settings mass and repeated boxed-control styling; retained only the existing small preference/service set. Labels now read Language, Appearance, Thought typography and Thinking service, with Chinese parity.
- Refined Speak into a temporary composing shell while preserving its draft, scope, submit and dismissal behavior.
- Removed the prohibited selected-Thought radial gradient. Selection remains transparent bare text with a subtle neutral text aura and no geometry change.
- Added small Ghost/Recall legibility/presence settles; no claim, wake, lasso, cooling, or placement semantics changed.
- No new production dependency was added. No provider/evidence/storage/Tauri permission/backend architecture was changed.

## Reference gate

`docs/REFERENCE_AUDIT.md` records the exact pages/files actually inspected, observed mechanics, borrow/do-not-borrow decisions, and the resulting Diffusion decision. This pass inspected the relevant Gionatan Nese / Emil Kowalski product-writing references, Allume / Are.na / Linear / Kumu product references, Motion and Motion Primitives targeted files, Floating UI official docs, React Aria source/docs, Base UI animation/popover docs, Ariakit behavior docs, Sonner targeted source, and Visual Notes targeted spatial files. Vaul's requested exact gesture source was not reliably retrievable and is marked BLOCKED; no Thought drag rewrite was performed, so that gate was not activated.

## Verification actually run

### Independent source/offline checks — PASS

`npm run check:offline`

- static syntax/import/config scan: PASS;
- dependency-free Core typecheck: PASS;
- locale parity: 334 dictionary keys, no missing/unwrapped/unlocalized findings;
- independent Node tests: **120/120 PASS**;
- source-size guard: PASS.

The five v0.2.2-specific offline checks cover the shared motion roles/reduced-motion path, real More-origin handoff to Settings, separation of Floating UI positioning and visual motion in CommandMenu, no gradient/`transition: all`/card conversion with Ghost/Recall emergence, and small bilingual Settings labels.

### Chromium CSS/primitive checks — PASS, not React E2E

These use actual product CSS and authored DOM through `page.set_content`. They do **not** mount React, Floating UI, Motion lifecycle, Dexie, routing, providers, or focus restoration.

- inherited camera/CSS primitive regression: **17/17 PASS**;
- typography/theme/locale/viewport regression: **11/11 PASS**;
- v0.2.2 frontend fixture regression: **6/6 PASS**;
- reduced-motion CSS transition suppression: PASS;
- selected Thought remains geometry-stable and transparent: PASS;
- More menu bounded in Paper Day and Graphite Night: PASS;
- Settings row hierarchy checked in dark/en and light/zh: PASS;
- Speak composing shell / bare selected Thought fixture: PASS.

Representative screenshots live under `verification/v0.2.2/*screenshots/` and are explicitly labeled CSS/PRIMITIVE FIXTURE.

### Performance-model checks — PASS within stated primitive/model scope

- browser camera/culling primitive: PASS at **100 / 500 / 2,000 / 5,000 Thoughts**;
- `npm run bench:spatial`: PASS;
- `npm run bench:storage`: PASS.

These are not whole-React-app FPS or actual IndexedDB disk measurements.

## Requested dependency-backed checks — UNVERIFIED / environment-blocked

A fresh online `npm ci` was attempted earlier in the run but dependency retrieval timed out. A later explicit offline attempt also failed because the locked `zustand-5.0.15.tgz` is not present in the local npm cache. No dependency versions were substituted and no declarations were faked.

The requested commands were then attempted once against the incomplete environment and recorded under `verification/v0.2.2/commands/`:

- `npm run typecheck` — exit 2: project type definitions `node` and `vite/client` are unavailable;
- `npm test` — exit 127: project `vitest` binary unavailable;
- `npm run build` — exit 2 at the same full typecheck boundary;
- `npm run test:e2e` — exit 1: the available Playwright CLI does not provide the project test-runner command.

Therefore the complete React application build and React Playwright lifecycle suite are **not claimed as verified** in this environment.

## Real React visual verification boundary

Chromium is available, but this execution environment blocks navigation to local HTTP/file application URLs. The existing inherited `dist/` is a stale v0.2.1 artifact and is not used as proof of v0.2.2. The final source snapshot excludes `dist/`.

Accordingly:

- REAL REACT APP visual result: **UNVERIFIED**;
- CSS/PRIMITIVE FIXTURE visual result: **VERIFIED within the narrow fixture scope above**.

The most important remaining release gate is to install the locked npm dependencies in a normal development environment, run the real Vite app, then exercise More -> Settings, Settings, Speak, Focus, Ghost/Recall, Light/Dark, zh/en, Serif/Sans, reduced motion, rapid interruption/Escape, and the full existing React E2E suite.

## Largest handwritten production files after this pass

The source-size guard reports:

1. `src/field/Field.tsx` — 516 LOC, inherited hot pointer/render boundary; documented exception, not rewritten here.
2. `src/ui/Workspace.tsx` — 331 LOC.
3. `src/core/validation.ts` — 278 LOC.
4. `src/core/reducer.ts` — 249 LOC.
5. `src/ui/field.css` — 205 LOC.

No >700 LOC handwritten production file exists.

## Known visual limitations / deliberate deferrals

- Full More -> Settings motion continuity has source/static coverage but could not be visually observed in the mounted React app here.
- Lower-priority Field composition, Thread/Deep Dive transition and semantic-zoom transition were deliberately not broadly redesigned after the higher-priority refinements; this follows the instruction to prefer fewer finished changes.
- Vaul exact gesture-source inspection remains BLOCKED, with no drag-mechanics change made.
- No screenshot fixture is presented as application E2E evidence.
