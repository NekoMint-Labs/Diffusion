# Diffusion Explorer v0.2.2 frontend audit

Date: 2026-09-14

This audit precedes v0.2.2 implementation. The v0.2.1 source is the baseline; product semantics, persistence, provider/evidence boundaries, lifecycle rules, and direct-manipulation ownership remain frozen.

## Environment and verification boundary

- `npm run check:offline` passes on the supplied source: 115/115 offline tests, core typecheck, locale parity, static import/syntax checks, and source-size checks.
- The supplied archive contains an existing production `dist/` and v0.2.1 CSS/primitive verification artifacts.
- A fresh `npm ci` cannot complete in this environment because dependency retrieval is blocked/times out. The partial install is not valid for full `tsc`, Vite build, Vitest, or React Playwright E2E.
- Chromium exists, but navigation to local HTTP/file URLs is blocked by the execution environment. Therefore the real mounted React application cannot be honestly re-inspected here. Existing screenshots are treated only according to their recorded provenance; CSS/primitive fixtures are not relabeled as real-app verification.

## Visible-area classification

| Area | Decision | Audit finding | v0.2.2 action |
|---|---|---|---|
| Field camera / drag / lasso | KEEP | Existing mechanics preserve direct manipulation and canonical coordinates. | Do not touch hot-path ownership or committed placement. |
| Field composition | TUNE | Quiet direction is correct, but default/demo composition can still read as isolated sentences in empty space. | Tune only authored demo composition/spacing if a deterministic fixture supports it; no auto-layout. |
| Thought rest | KEEP | Bare text remains the right visual primitive. | Preserve geometry, width, and no-card rule. |
| Thought hover / select | REFINE | Current aura uses a CSS radial gradient even though v0.2.2 prohibits gradients; focus is mostly an opacity switch. | Replace gradient aura with a borderless low-cost halo, preserve exact geometry, add shared attention timing only. |
| Focus / relations | REFINE | Semantics are correct and context is preserved; presentation can become more layered and less abrupt. | Tune clarity/recession and relation wake timing without moving or hiding unrelated content. |
| Ghost / Recall | REFINE | Ghost has opacity-only emergence; Recall has no distinct wake quality. | Add tiny transform+opacity settling that reads as becoming legible/present, never as a popup or inserted card. |
| Speak | REFINE | Correctly temporary, but composing state still reads like a generic bordered composer. | Make shell emerge from its resting expression line, reduce component-like border weight, preserve draft and submit semantics. |
| More menu | REDESIGN (presentation only) | Correct IA/keyboard semantics; visual shell currently appears as an unrelated rectangle and has no spatial entrance. | Add placement-aware visual child motion and quieter hierarchy; keep immediate interruption/dismissal. |
| More -> Settings | REDESIGN (continuity only) | Semantics/ownership are already correct, but Settings has no relationship to the More trigger because no anchor is handed forward. | Capture the real trigger origin and open Settings from that origin; shell continuity only, no text stretching and no delayed ownership handoff. |
| Settings | REFINE | Reads like a competent generic HTML form with repeated boxed selects and excess vertical mass. | Make rows quieter and denser, reduce rectangle repetition, preserve the small fixed preference set. |
| Other anchored temporary surfaces | TUNE | Shared `Surface` is visually competent but generic and only fades in. | Introduce one restrained, reusable surface-enter role; do not individually redesign every surface. |
| Thread | KEEP / TUNE | Distinct sustained discourse surface is already established. | Share refined surface timing only; do not turn it into page navigation. |
| Deep Dive | KEEP / TUNE | Already structurally distinct from Thread. | Preserve manuscript/context hierarchy; only inherit restrained representation transition where safe. |
| Semantic zoom | KEEP | Existing representation switching honors the product boundary. | No mechanics rewrite in this pass unless a small CSS transition can be proven not to animate unusable text. |
| Light/Dark, zh/en, Serif/Sans | KEEP / VERIFY | Existing token and localization architecture is correct. | Check every changed CSS/fixture across these axes; do not add theme-only behavior. |

## High-impact implementation order

1. Shared motion roles and origin contract.
2. More menu and More -> Settings continuity.
3. Settings visual hierarchy.
4. Speak expression surface.
5. Focus / Thought selection presentation.
6. Ghost / Recall emergence.
7. Regression and CSS/primitive verification.

Lower-priority Field composition, Thread/Deep Dive, and semantic-zoom changes are deliberately deferred unless the higher-priority work is stable. This follows the requirement to prefer fewer finished refinements over parallel redesign.

## Non-goals confirmed before edits

- no WebGL or canvas-text rewrite;
- no graph layout or automatic regrouping;
- no new AI/backend/provider/evidence work;
- no new production dependency by default;
- no cardification, gradients, glass, neon, or AI glow;
- no spring/inertia on Thought drag;
- no animation that must finish before the next user intent is accepted.
