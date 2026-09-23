# Checkpoint 06 - Desktop scaffold, recovery and interaction hardening

Implemented source: shared-frontend Tauri 2 shell, least-authority native adapters, user-confirmed project recovery into a NEW project, bounded background JSON validation, interrupted Source normalization, semantic undo identities, IME-aware editing and local Probe hold feedback.

A static review found an actual event exclusion bug: the application root used the same data-surface marker as popovers. It was renamed to data-active-surface. A source-contract regression test now guards this distinction. Browser execution is still required to verify real interactions.

Run: npm run check:offline. PASS: 65 TS/TSX syntax checks, strict independent-module typecheck, 49 offline tests. No npm install, dependency-backed app typecheck, Vite build, browser E2E, worker runtime or native compilation was possible/claimed.

Next: executable dependency-backed test sources, broader architecture/performance auditing, readable formatting and final continuation documents. Checkpoint ZIP verification remains independent of runtime verification.
