# Diffusion Explorer v0.3.1 — Refinement pass

Status: **implemented and verified by the repository's gates in the mounted React application.** This is an in-place UX/UI/interaction refinement of the surfaces that already existed in v0.3.0. No persistence, no domain semantics, no Core/backend change, no new production dependency, and no new surface semantics. `v0.3.1` is a pass label; package and Tauri metadata remain `0.3.0`.

## Scope

Touched: the Field identity (title / rename), the empty Field and the blank-Field gesture, Settings, the close affordance, the "How did this form?" surface, the motion system, and the depth/hierarchy of every existing surface.

Not touched: `src/core`, `src/storage`, `src/evidence`, `src/ai`, `server/`, the Tauri shell, camera/gesture mechanics, Find, Thread/Deep Dive, Diffuse, Fork, Handoff, and the command registry's semantics. The command registry itself was not extended with new actions; only its presentations changed.

## Diagnosis — why the product read as "too thin"

"Thin" was a hierarchy and feedback problem, not a missing-feature problem.

| Symptom | Real cause | Repair |
| --- | --- | --- |
| The title looked like a permanently exposed input while renaming | `input` replaced the title with no resting identity, no container, no hint, no transition | Title rests as labelled identity; rename is a small composed surface with select-all and an explicit Enter/Escape hint |
| Settings felt like a panel attached to the top-right corner | One anchored 400px column of `select` rows, no information architecture | Dedicated centred window surface with a section nav, section rhythm, a designed service panel, a shortcut reference and About |
| Empty state was weak and competed with the Field | Centred copy floated in the middle of the Field, far from the input it invited, with no hierarchy | One composed invitation (eyebrow / signature line / hint / caret) sitting with the Speak input it points at; decoration is explicitly non-interactive |
| Interactions did not announce themselves | Surfaces were mostly pasted in; the only exit was instant removal | Motion system with role-based transitions, a spring arrival, a scrim, and a real recede on close |
| Close buttons were inconsistent | A plain 11px "Close" text button, no hit area, no states, no shortcut hint | One `SurfaceClose` for every surface: same glyph, placement, hit area, hover/focus/press states and a decorative `Esc` hint |
| "How did this form?" was raw | Undated `<ol>` of entries whose visible label was the internal event id (`thought.edit`) | Day-grouped timeline with category chips, time + marker + human summary; the event id is only a `data-kind` attribute |
| Narrow shortcut visibility | Hints existed in menus, but there was no reference inside Settings | A Shortcuts section in Settings and the Shortcuts surface render the same registry through one component |
| Creating a Field was silent | `switchProject` swapped the controller; only the mount changed | Arrival reset overlay, title settle, and a transient arrival caption in the identity block |
| Controls felt borrowed from the browser | `select`/`input` styled inline; no focus or hover affordance around the row | Row-level hover surface, section headings, panel for the Thinking service, `kbd` chips, a real scrim instead of a transparent shield |

## Audit: KEEP / REWORK / REMOVE / ADD

| Area | KEEP | REWORK | REMOVE | ADD |
| --- | --- | --- | --- | --- |
| Title & rename | `.identity` anchor, `field-title`/`field-rename` testids, one reversible `field.rename` history step | resting title as identity; rename as a composed shell with select-all, focus ring and a hint | the always-exposed bare rename `input` styling | eyebrow, hover/focus underline that also shows while the field menu is open |
| Empty state & blank gesture | every existing Field gesture, canonical coordinates | invitation moved from the Field centre to the input it invites | `.empty-field` centre copy and its CSS | composed invitation, `[data-decoration]` target guard, blank-double-click regression test |
| Settings | ownership and exclusivity, modal focus trap, `locale-select`/`lighting-select`/`typography-select`/`provider-select` testids, every existing preference | anchored panel → centred `window` surface; grouped into General / Appearance / Typography / Thinking service / Shortcuts / About | single flat cluster as the whole surface | section nav, service status line, About rows, Shortcuts section |
| Shortcut discoverability | one registry, `aria-keyshortcuts`, decorative `kbd` hints, exact accessible names | one shared `ShortcutReference` for both presentations | duplicated shortcut markup in `ShortcutsSurface` | grouped reference inside Settings |
| History surface | `level="focus"` place, scope filter, honest "not recorded" statement | timeline grouped by day with category chips and time + marker + summary | raw `msg(e.kind)` as the visible label; raw provenance ids as visible text | `trajectoryCategory`/`dayKey`, empty/low-activity state, scope section |
| Close affordances | accessible name "Return to Field", top-right placement in the header | one glyph button with a 30×32 hit area, hover/focus/press states and an `Esc` hint | per-surface text-button styling | shared `SurfaceClose` |
| Motion | `MotionConfig reducedMotion="user"`, existing layout roles (Speak, shared shell, menu origin) | role-based tokens; every owned place arrives and recedes | fade-only arrival for the settings surface | panel spring, scrim fade, recede transitions, exit-as-echo semantics |
| Surface depth | the quiet editorial palette, ink-based focus, three resting interactive elements | hairline header, `--shadow-panel`, `kbd` chips, scrim strength by surface class | transparent shield as the only modal treatment | one scrim, two weights (window / anchored-split), no blur |
| New-Field feedback | `key={project.id}` remount, no persistence change | arrival is a transition, not a flash | — | arrival overlay, title settle, transient arrival caption |

## Motion system

Tokens in `src/ui/motion.ts`:

| Token | Value | Role |
| --- | --- | --- |
| `instant` / `micro` | 90 / 140 ms | hover, press, helper copy |
| `surface` | 180 ms | existing role, unchanged (asserted by `v022-frontend`) |
| `recede` | 160 ms | closing motion for everything that closes with motion |
| `panel` | spring `stiffness 420 / damping 38 / mass 0.9` | arrival of a place that owns input |
| `title` | 360 ms | identity settling (title, invitation lines) |
| `arrival` | 460 ms | entering a different Field |
| `attention` / `representation` / `transform` | 220 / 240 / 280 ms | unchanged existing roles |

One rule per surface class:

- **Owned place** — Settings, the palette, menus, History, Shortcuts, Help, Import, Restore, Open Field: arrives with its own transition and **recedes** on close.
- **Contextual projection** — anything anchored to a Thought, a region or a pointer (Thread, Deep Dive, Source, Relation, Region, Evidence, Crystal, Diffuse, Fork, Handoff, Find): arrives from its own origin and **closes at once**, because a projection that lingers is a projection that lies about what is still open.

Reduced motion resolves every role to duration 0 rather than hiding the change: the same final state is reached without a transition (verified in the e2e gate).

### Closing is a visual echo, not an owner

An exiting surface or menu is a picture of what just closed:

- `useIsPresent()` gates `role`, `aria-hidden`, `inert`, `data-testid` and `data-global-owner`, so a receding owner can never compete with the surface that replaced it (verified: no duplicate `field-menu`/`dialog` matches during a handoff).
- `EXIT_UNOWNED` sets `pointerEvents: 'none'` as a non-animatable value, so Motion applies it immediately and an exiting surface can never intercept the click the user is already making.
- `useTransientFocus.restore()` treats focus that is still inside the dismissed owner (`[role="menu"]` or the new `[data-exiting]` marker) as "not a new target", so dismissal still returns focus to the opener.

## Reference influence

| Reference | Decision it influenced |
| --- | --- |
| Obsidian | Settings as a place with its own section navigation and a command/shortcut reference inside it; "Settings is reachable from the command palette and a shortcut, but is a surface, not a corner control" |
| Raycast | Shortcut hints beside menu rows and palette rows as first-class UI; one compact close affordance that states its own `Esc` key rather than a text label |
| Linear | Hover/press/focus states on every interactive row, menu and palette radius, hairline header separation, one close button language, exact spacing rhythm in the settings rows |
| Framer / Arc | A spring arrival plus a scrim so opening a place has weight; a short recede so closing is perceivable; the reset overlay when entering a different Field |
| Notion | Only the empty-state invitation feeling: a quiet, centred, non-interactive invitation with a supporting hint. Explicitly not its document structure, page tree or block model |

## Abstractions added

Five, each with more than one real call site or a real invariant:

1. `src/ui/surfaces/ShortcutReference.tsx` — one registry, two presentations (Shortcuts surface + Settings section); it is why a documented shortcut cannot drift.
2. `src/ui/motion.ts` role functions (`panelTransition`, `recedeTransition`, `settleTransition`, `arrivalTransition`, `EXIT_UNOWNED`) — motion is a system, not per-component one-offs.
3. `SurfaceClose` + the `window` surface level in `Surface.tsx` — one close affordance and one dedicated-place geometry for every surface that needs it.
4. `interactionTarget()` in `Field.tsx` — one pointer-target guard covering blank double-click, pointer start and the blank context menu.
5. `trajectoryCategory()` / `dayKey()` in `src/ui/presentation.ts` — reading a trajectory is presentation, not core semantics.

## Verification

Recorded in `STATUS.md`; measured in this pass:

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 11 files / 74 tests (3 new trajectory-reading tests) |
| `npm run build` | PASS — existing Vite >500 kB chunk warning only |
| `npm run test:e2e` | PASS — 66 real React/Chromium tests, including 8 new `tests/e2e/refinement.spec.ts` tests |
| `npm run check:offline` | PASS — 140 / 140 contracts, core typecheck, locale and source-size gates |
| `npm run bench:spatial` / `bench:storage` / `bench:history` | PASS — unchanged (history: change-detection mean 7.4 ms / p95 11.2 ms) |
| Screenshots | `verification/v0.3.1/screenshots/` — captured from the same dev server at 1440×960 |

The new e2e gate explicitly verifies the items this pass exists for: blank double-click places a thought while the invitation is visible on screen (probed with `elementFromPoint` at three points of the invitation), the title rests as identity and renames in a composed state with select-all, Settings is a centred surface with 6 sections whose nav reports its own state and whose close affordance shows `Esc`, menu rows expose their shortcut while keeping the exact accessible name, the history timeline is day-grouped and never shows an internal event id, the settings window's arrival is measured frame-by-frame (scale < 1 and opacity < 1 sampled, then settled), reduced motion reaches the same final state without a transition, and creating a Field announces arrival before the reset overlay leaves.

### Two assertions were rewritten to the new intent

Neither was deleted or weakened:

- `tests/offline/v022-frontend.test.mjs` asserted Settings is `level="anchored"`. It now asserts `level="window"` and that the new centred geometry exists, while `.surface.anchored` keeps its previous rule (still asserted).
- `tests/e2e/field.spec.ts` "Settings keeps its final home in the global top-right zone" asserted the old corner position. It is now "Settings opens as a dedicated centred surface, not a corner panel" and asserts stronger invariants: width, insets from every viewport edge, and horizontal centring.

## Deliberate limits

- No shortcut remapping. The reference surfaces expose the registry; editing it is additive work.
- The settings section nav reports the section the user navigated to, not the section currently scrolled into view. Scroll-position tracking was not worth an observer for six anchors.
- Pointer-anchored projections (menus excepted) close immediately instead of animating out: a lingering projection would keep competing with the Field it was pointing at. The menus, which are the frequent case, do recede.
- The arrival caption is a fixed 4.2 s hold, not tied to the user's reading or activity.
- The arrival overlay covers the Field but not the Speak surface: the input stays available while the space resets.
- `inert` on an exiting surface relies on the browser's focus fixup; the focus-return contract does not depend on it, it only makes the echo unreachable sooner.
- Visual quality was not reviewed by inspection. Behavior, geometry, motion, accessibility, copy and the locale gate were verified programmatically; the screenshots are captured artifacts for human review.
