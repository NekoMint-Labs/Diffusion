# v0.4 Phase 2.12 — Quiet Material / Editorial Instrument

This pass converges the current application onto one visual system without changing Diffusion's
product authority or inventing Phase 3 domain structure.

## Direction

The Field remains an open spatial thinking environment. A Thought is not a dashboard card. Its
materiality is progressive: rest is almost ink-only; hover reveals a quiet object edge; selection
adds local presence and contextual controls; drag adds tangible lift while confirmed topology stays
visible. Application chrome is deliberately more substantial than Field content.

## Shared UI layer

- Base UI remains the behavior/accessibility layer.
- `Button`, `Switch`, `Checkbox`, `SettingRow`, and `SurfaceGroup` are the ordinary chrome
  primitives. Existing Base UI `Select`, Combobox, Tabs, Menu behavior is preserved.
- `primitives.css` owns controls and Settings anatomy.
- `materials.css` owns Field material states, contextual toolbar materiality, drag state and the
  active Composer shell.
- `surfaces.css` owns the common application-surface hierarchy: Settings, Find, menus/palette,
  lists, History, Fork comparison, reference/evidence detail, notices/status and Thread/Deep Dive.

The source patterns continue the earlier inspected references: Twenty for compact control anatomy,
AFFiNE and Onlook for contextual tool chrome, xyflow for screen-space toolbar positioning patterns,
Supabase for Settings rows/groups, and Langfuse for dense detail/status presentation. Those patterns
are adapted into Diffusion's existing tokens rather than imported as a second design system.

## Field behavior

`src/field/phenomena/dragPreview.ts` mirrors a selection drag into confirmed relation SVG using only
presentation geometry. Canonical Thought coordinates still commit on pointer-up. Tentative phenomena
stay tentative, selection does not call AI, and proximity never creates or confirms a Relation.

ScopeHub keeps the existing screen-space architecture. Its placement footprint was updated for the
new material toolbar so long labels clear the selection and nearby content.

## Surface rollout

The shared visual/control language now covers the current Settings sections (General, Appearance,
AI, Search & Evidence, Shortcuts, About) plus Find, Diffuse, Fork, History, Restore, Region,
Open Field, Handoff, Crystal Preview, relation/source/evidence detail, menus, command palette,
Thread/Deep Dive, notices, errors, empty/loading/status UI and confirmation actions.

Special controls that remain custom are special interaction roles rather than ordinary buttons:
the Field identity/menu trigger, Command Palette listbox options, the shortcut recorder row and the
motion-owned Composer action.

## Verification in this environment

Passed on the modified source tree:

- `node scripts/offline-check.mjs`
- `npm run check:locales`
- `npm run test:offline` — 152/152
- `npm run check:source-size`
- `git diff --check`

A Chromium visual review rendered the current CSS and current DOM/class anatomy for Light/Dark Field,
empty/populated/hover/selected/drag/Composer states, Settings/AI/Search, narrow Settings, zoomed Field,
Find/menu chrome, History, Fork and Open Field. Rest/hover Thought bounds were measured unchanged;
Settings had no horizontal overflow at 1440, 860 or 700 px review widths.

The uploaded archive intentionally contains no installed JavaScript dependencies. Network package
installation is unavailable in this execution environment, so dependency-backed React/Vite
`typecheck`, Vitest and application Playwright E2E could not be run here. The visual review therefore
uses the real current styles and real current UI anatomy in Chromium, but is not claimed as a built
React application run. Native Tauri/WebView2 validation was not available either.

## Phase 3 remains deferred

No temporary `Material.title`, generated summary, Material Detail, Relation Detail, provenance model
or decomposition proposal model was invented for this pass. The current surface/control anatomy is
ready for those features when the domain model actually owns them.
