# Phase 3 — Style Profiles, Background Materials & Personalization

Status: **implemented and checkpointed**  
Scope: **Phase 3 only** — Phase 4 motion / operation receipts / Region / semantic zoom work has not been started.

## 1. What changed

Phase 3 adds a curated appearance system without turning Diffusion into a theme editor.

### Style Profiles

Added four first-party profiles:

- **Editorial Warm** — default signature identity; warm ivory / graphite, oxide attention, slate structure.
- **Studio Slate** — cooler neutral Field with dusty warm attention and blue-grey structure.
- **Quiet Forest** — parchment/grey Field, olive graphite, muted terracotta attention, sage/slate structure.
- **Graphite Night** — an authored dark material with warm ivory ink, muted copper attention and blue-grey structure.

Profiles remap presentation tokens only. They do not alter content, geometry, Relations, lineage, placement or project persistence.

Graphite Night is intentionally a real dark presentation, not a light palette with inverted values. Selecting it resolves the document to dark presentation while it is active; leaving it restores the user's ordinary system/light/dark preference.

### Independent Background Materials

Added a second, independent appearance axis:

- **Clean** — almost flat, very low texture.
- **Paper** — default fibre grain and warm tonal variation.
- **Studio** — smoother tonal surface with much less grain.
- **Image Atmosphere** — a user image treated as ambient material rather than wallpaper.

Style Profile and Background Material are deliberately separate settings.

### Field Presence

Added one coordinated **Quiet → Rich** Field Presence control.

It currently coordinates:

- resting Thought material strength,
- nearby Thought material strength,
- sleeping causal-trace presence,
- paper/studio grain strength,
- atmosphere presence,
- a reserved Region field-presence presentation token for the Phase 4 Region pass.

This is one coordinated presentation axis, not a renamed single-opacity slider.

### Curated overrides

Advanced appearance exposes only:

- **Attention color**
- **Structure color**

Missing overrides mean **Auto / inherit from profile**. Reset removes the overrides and returns immediately to the profile recipe.

No per-node coloring, rainbow semantics or generic color-editor surface was introduced.

### Image Atmosphere

Image Atmosphere accepts device-local PNG / JPEG / WebP images up to **1.5 MB** so the existing settings store can persist them reliably.

Treatment pipeline:

1. cover/crop,
2. desaturate,
3. optional softness/blur,
4. bounded low intensity,
5. user darken/lighten trim,
6. automatic blend back toward the active Field background,
7. stronger accepted-Thought material for readability.

The image remains pointer-inert presentation state. It is never written into the canonical project model or project export.

### Settings integration

Appearance remains inside the existing Settings surface. `SettingsSurface` now delegates the curated appearance controls to `AppearanceSettings.tsx` instead of growing a second theme application.

Existing typography, interface-size and Thought-size controls remain intact.

## 2. Why

The product requirement was to allow different aesthetic preferences while keeping Diffusion recognizable and preserving semantic meaning.

The main architectural choice is therefore:

`Style Profile + Background Material + small optional overrides`

rather than:

`many unrelated color / opacity / per-node controls`.

The system keeps the important semantic roles stable:

- attention remains human focus,
- causal trace remains structure,
- Relation remains topology,
- Ghost remains provisional,
- accepted Thought remains materially stronger than Ghost.

## 3. Files changed

### New

- `src/ui/appearance.ts`
- `src/ui/surfaces/AppearanceSettings.tsx`
- `tests/offline/phase3-style-profiles.test.mjs`

### Updated

- `src/locales/zh.ts`
- `src/ui/Workspace.tsx`
- `src/ui/atmosphere.css`
- `src/ui/atmosphere.tsx`
- `src/ui/materials.css`
- `src/ui/resultSemantics.css`
- `src/ui/settings.ts`
- `src/ui/surfaces/SettingsSurface.tsx`
- `src/ui/surfaces/surfaces.css`
- `src/ui/theme.css`
- `src/ui/workspace/useWorkspaceSettings.ts`
- `tests/offline/presentation-phase1.test.mjs`
- `tests/offline/v023-identity.test.mjs`
- `tests/offline/v024-signature.test.mjs`
- `tests/offline/v04-materiality.test.mjs`
- `tests/unit/settings.test.ts`

The older visual tests were updated because several asserted obsolete literal opacity/material values from before Phase 1. They now assert the current presentation-token contract rather than stale magic numbers.

## 4. Architectural decisions

### Appearance is device state, not project state

`Settings.appearance` owns the profile/material/presence/image preferences. `src/core/model.ts` remains unchanged by Phase 3.

This means appearance changes do not mutate:

- Thought content,
- Thought position,
- causal lineage,
- semantic Relations,
- Regions,
- project export semantics.

### Central normalization

`src/ui/appearance.ts` owns:

- allowed profile ids,
- allowed material ids,
- appearance defaults,
- bounded normalization,
- safe hex-color overrides,
- bounded Image Atmosphere data URLs,
- Field Presence → coordinated CSS-variable mapping,
- Image Atmosphere presentation calculations.

### Profile/custom inheritance

Profile values remain the baseline. Custom Attention/Structure values are root-level presentation overrides. Removing an override exposes the profile token again, so reset requires no duplicated palette state.

### Background image persistence

The custom image is stored with the existing device Settings record as a bounded data URL. The limit is intentionally small because this is preference persistence, not an asset-management system.

If the browser/device refuses the settings write, the existing Settings failure path keeps the appearance active for the session and surfaces the save failure.

### Graphite Night

Graphite Night forces the resolved presentation to dark while active. The user's underlying system/light/dark preference is not destroyed; it applies again after switching away from Graphite Night.

## 5. Visual decisions

- Editorial Warm remains the default and retains the Phase 1 oxide/slate semantic split.
- Studio Slate cools the Field without becoming blue UI chrome.
- Quiet Forest uses olive/sage neutrals without turning nodes green cards.
- Graphite Night uses authored charcoal surfaces rather than color inversion.
- Profile changes use the same semantic roles and material hierarchy.
- Background Materials change surface character, not object meaning.
- Image Atmosphere is intentionally subdued; default image intensity is 22% and desaturation is 72%.
- Image mode strengthens accepted Thought surfaces automatically so text remains primary.
- No dot-grid default, neon palette, rainbow action colors or raw wallpaper treatment was added.

## 6. Tests added / updated

### New Phase 3 offline suite

`tests/offline/phase3-style-profiles.test.mjs`

Covers:

- exact four-profile vocabulary,
- exact four-background-material vocabulary,
- normalization/bounds,
- invalid color/image rejection,
- real settings save/load round-trip,
- Field Presence coordination,
- Image Atmosphere bounds,
- profile token mappings,
- profile/material independence,
- image readability guard,
- appearance remaining outside the canonical model,
- curated Settings surface scope.

Result: **9 / 9 passed**.

### Full offline regression

`node scripts/run-offline-tests.mjs`

Result: **230 / 230 passed**.

### Existing unit source updated

`tests/unit/settings.test.ts` now includes profile/default/bounds/persistence expectations for the ordinary Vitest suite when dependencies are installed.

## 7. Commands run and results

### Passed

- `node --experimental-strip-types --test tests/offline/phase3-style-profiles.test.mjs`  
  **PASS — 9 / 9**
- `node scripts/run-offline-tests.mjs`  
  **PASS — 230 / 230**
- `node scripts/check-locales.mjs`  
  **PASS — 849 dictionary keys, 0 missing, 0 unwrapped JSX, 0 unlocalized**
- `node scripts/check-source-size.mjs`  
  **PASS**
- TypeScript `transpileModule` syntax pass over all Phase 3 TS/TSX entry files  
  **PASS**

### Could not complete in this extracted environment

`npm run typecheck`

- fails before application checking because installed type packages are absent:
  - `Cannot find type definition file for 'node'`
  - `Cannot find type definition file for 'vite/client'`

`npm test -- --run`

- cannot start because `vitest` is not installed in this extracted working directory.

`npm run build`

- stops at the same missing dependency/type-definition failure in the typecheck step.

No attempt was made to invent a successful result.

## 8. Known limitations

- Browser/Playwright visual screenshots were not run. Per instruction, unavailable screenshot requirements were skipped rather than allowed to block implementation.
- Image Atmosphere uses the existing settings persistence path and therefore deliberately limits source images to 1.5 MB. It is not a general image-asset library.
- The image readability system is structurally protected, but very unusual source images should still be manually reviewed in both light profiles and Graphite Night.
- Field Presence exposes a Region presentation token, but the new soft Region field itself belongs to Phase 4 and was intentionally not implemented here.
- No giant theme editor, per-node color customization or arbitrary background CSS controls were implemented.
- Full package-manager typecheck/test/build still need to be rerun in a normal checkout with dependencies installed.

## 9. Screens / manual states still needing human review

When run locally, review:

- Editorial Warm + Paper at Quiet / default / Rich presence,
- Studio Slate + Clean,
- Quiet Forest + Studio,
- Graphite Night with the lighting preference set to system/light/dark to confirm the profile still resolves as authored dark,
- custom Attention override then Auto/reset,
- custom Structure override on sleeping/woken causal traces,
- bright Image Atmosphere,
- dark Image Atmosphere,
- image intensity / softness / desaturation / tone extremes,
- accepted Thought vs Ghost on Image Atmosphere,
- settings reload persistence,
- reduced-motion atmosphere behavior.

No screenshot gate is required for this checkpoint.

## 10. Checkpoint

The supplied archive still contains **no `.git` metadata**, so a real Git commit/checkpoint hash cannot be produced honestly.

`PHASE-3-CHECKPOINT.sha256` contains SHA-256 hashes for every Phase 3 source/test file changed from the delivered Phase 2 archive.

**Phase 3 content checkpoint hash:**

`4b2de6cdd66eb7610287068ae6eadd3e691348a756d722bbc6ac43439fc2b8de`

This is a deterministic content checkpoint, not a Git commit id.

## Acceptance status

- Four curated Style Profiles: **yes**
- Style Profile separate from Background Material: **yes**
- Editorial Warm remains default: **yes**
- Graphite Night is authored dark, not inverted light: **yes**
- Profile/custom inheritance + reset: **yes**
- Only small advanced semantic override set exposed: **yes**
- Field Presence coordinates multiple presentation strengths: **yes**
- Clean / Paper / Studio / Image Atmosphere: **yes**
- Image Atmosphere uses a restrained treatment pipeline: **yes**
- Image mode protects Thought readability: **yes**
- Appearance persists as device Settings: **yes**
- Appearance does not mutate canonical project data: **yes**
- Reduced-motion contract preserved: **yes**
- Offline regression: **230 / 230 passed**
- Browser screenshots/manual review: **skipped by instruction / environment**

**STOP: Phase 3 complete. Phase 4 has not been started.**
