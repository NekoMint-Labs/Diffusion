# Stage A/B checkpoint — Spatial Editorial / Living Paper

Date: 2026-09-19

## Scope completed

Only the first two implementation stages from the redesign brief were taken in this checkpoint:

- Stage A — audit and reference decisions.
- Stage B — visual grammar foundation.

No Stage C direct-manipulation contracts were intentionally changed. In particular, blank-drag, Ghost drag ownership, multi-selection drag, pointer-centered zoom, Focus/Fit and proposal-constellation semantics remain for the next stage.

## Stage A findings

The current repository already has useful foundations worth retaining: DOM Thoughts, a GeometryCache, explicit session Ghosts, SVG phenomena overlays, a quiet atmosphere layer, and a restrained warm-neutral palette. The main failure is perceptual rather than architectural: several semantic identities are technically represented but too visually similar at rest.

The current pointer implementation was inspected as part of the audit. Blank left-drag still enters the existing blank/marquee path; this is known and intentionally untouched because it belongs to Stage C.

See `REFERENCE_AUDIT.md` for the current Kinopio / tldraw / BlockSuite / Allume / Milanote / Are.na / Linear decisions.

## Stage B changes

### Field identity
- Raised the Field title from utility-label scale to a quiet editorial page identity.
- Uses the thought serif family for the project title while keeping the `FIELD` eyebrow in UI typography.
- Added Chinese-specific tracking so the Latin eyebrow treatment does not over-space Chinese text.

### Thought material
- Preserved the existing non-card geometry and the rest/hover/selected material progression.
- Tightened radius and added a minute paper-edge lift without changing bounds.
- Editing remains the only fully legible writing surface.

### Ghost
- Ghost is no longer identified mainly through low opacity.
- All Ghosts now carry a stable pencil trace at rest.
- Continue uses a solid trace; Another Angle uses a dashed trace; Question adds an unresolved `?` posture.
- Ghost text is substantially more readable while remaining weaker than authored Thought ink.
- No purple, glow, shimmer or permanent AI badge was added.

### Source
- Source now reads as a quiet editorial reference with a small rule, subordinate typography, and a low-presence `SOURCE` meta label.
- No browser-card frame or ontology color was added.

### Crystal
- Crystal now uses a restrained filled diamond and a slightly firmer settled material edge.
- No gold/success color/celebration treatment.

### Relations
- Confirmed relations sleep more deeply in ordinary state and wake near active scope.
- Tentative/probing relations use pencil-like trace tokens and stay weaker than confirmed topology.

### Accent ownership
- Oxide/brick attention accent remains reserved for human attention, selection and explicit control.
- New Ghost/Source/Crystal distinctions use graphite/pencil tonal roles rather than ontology colors.

## Files changed

- `docs/REFERENCE_AUDIT.md`
- `docs/history/v0.4/V0_4_STAGE_AB_SPATIAL_EDITORIAL.md`
- `src/ui/theme.css`
- `src/ui/field.css`
- `src/ui/materials.css`
- `src/ui/resultSemantics.css`
- `tests/offline/v04-stage-ab-visual.test.mjs`

## Verification note

Verified in this checkpoint:

- `node --test tests/offline/v04-stage-ab-visual.test.mjs` — 2/2 pass.
- `npm run test:offline` — 196/196 pass.
- `npm run check:source-size` — PASS (`src/ui/field.css` is 688 lines, below the 700-line maximum).
- `npm run check:locales` — PASS (749 keys; no missing, unwrapped, or unlocalized strings).

Not claimed as passing:

- `npm run typecheck` is blocked by the incomplete dependency environment: TypeScript cannot find `node` and `vite/client` type definitions.
- The uploaded archive did not contain `node_modules`, `pnpm` is unavailable here, and a best-effort dependency install did not complete.
- Build, browser/E2E, and mounted-app screenshot review therefore remain unverified in this checkpoint. No visual-success claim is being made from source inspection alone.
