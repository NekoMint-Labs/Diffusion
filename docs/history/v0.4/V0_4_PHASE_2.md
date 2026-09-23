# v0.4 Phase 2 — professional interaction primitives and signature motion

Record of the Phase 2 pass: what was adopted, what was rejected, what it cost, and what is still
unverified. Phase 1 (the structural cleanup) is the baseline this starts from and is not redone
here. No PixiJS was added and core semantics were not changed.

## Dependencies

| Package | Version | Why it exists |
|---|---|---|
| `@base-ui/react` | 1.8.0 | Interaction-primitive layer: menu/listbox/tablist behaviour, roving highlight, typeahead, collision-aware placement, popup lifecycle and focus contracts. Replaces the hand-maintained menu mechanics and the native `<select>` stack. |
| `gsap` | 3.15.0 | Authored sequences only. `CustomEase` carries the shared easing roles; `gsap.context` collects and reverts. `Flip` was read in full and is **not** registered — see the signature-sequences note below. |
| `@gsap/react` | 2.1.2 | `useGSAP` — scopes a `gsap.context` to a component and reverts it on dependency change or unmount. Adopted because the alternative is hand-managing `gsap.context` lifecycle in every sequence, which is the exact class of leak this codebase forbids. |

`@base-ui/react` is MIT. GSAP is the GSAP standard "no charge" licence, not MIT; `Flip` and
`CustomEase` are redistributable inside an application under that licence. No other primitive
stack (Radix, Headless UI, shadcn, Tailwind) and no second general animation library was added.

## Primitives: adopted vs intentionally custom

| Primitive | Owner | Note |
|---|---|---|
| Menu / context menu | Base UI `Menu` | One family. An element anchor and a pointer anchor are the same implementation; the pointer case passes a virtual element to `Positioner`. `finalFocus={false}` keeps `useTransientFocus` the only focus-restoration authority. |
| Select | Base UI `Select` | `src/ui/primitives/Select.tsx` is the only Select in the product; every preference uses it. |
| Tabs | Base UI `Tabs` | Settings section navigation is a real tablist. |
| Dialog / Popover / Tooltip | **Rejected** | `ui/surfaces/Surface.tsx` remains Diffusion's dialog-like place. Its depth classes (`anchored`/`split`/`focus`/`bar`/`window`) are product placement, not generic popup placement, and a second overlay authority is forbidden by the architecture. No tooltip family exists to replace. |
| `SurfaceClose` | Diffusion | Unchanged ownership, widened hit area (one control size, 38px) for every global surface. |

## Motion ownership

One vocabulary, three copies held together by a test:

- `src/ui/motion/tokens.ts` — duration roles (`instant` 0.09, `micro` 0.14, `control` 0.20,
  `surface` 0.22, `spatial` 0.34, `settle` 0.40, `signature` 0.62) and easing roles
  (`enter`, `exit`, `move`, `settle`, `attention`, `signature`).
- `src/ui/motion.ts` — role → Motion transition, plus the panel spring and the shared-shell id.
- `src/ui/motion/signature.ts` — role → a registered `CustomEase` with the same control points,
  inside `useGSAP`, plus the three sequences.
- `src/ui/theme.css` — `--motion-*` / `--ease-*` for the pointer-frequency micro-states CSS owns.
- `tests/unit/motion.test.ts` — pins the vocabulary as golden values and asserts the CSS mirror
  is numerically identical.

Rules enforced:

- Motion owns ordinary component animation. GSAP owns authored sequences and is imported by
  exactly one module (asserted in `tests/offline/v025-motion-reuse.test.mjs`); it never touches the
  Field world transform, the camera, or the pointer path.
- A property has one owner. Two violations found in review were removed: the Speak action button's
  CSS `opacity` transition (Motion animates it) and the empty-field invitation's CSS transition
  (GSAP animates it).
- Reduced motion collapses a role to zero rather than hiding a change. Two paths that bypassed this
  were fixed: the arrival veil now rests at `opacity: 0` and the sequence raises it, so a Field
  switch with reduced motion leaves the Field visible immediately instead of behind an opaque
  rectangle for 4.2 s; and the first-Thought emergence is now a hook that reads the preference and
  owns a revertible context.

## Motion Lab

`/dev/motion` → `src/dev/MotionLab.tsx` (294 lines) + `src/dev/labScenarios.ts` (154) +
`src/dev/motionLab.css` (89). `src/main.tsx` guards the dynamic import with
`import.meta.env.DEV`, so the module is unreachable and tree-shaken out of a production bundle;
eleven lab-only strings were grep-verified absent from every emitted `dist/` asset and no lab chunk
is emitted. Scenarios: button hover/press, anchored menu, pointer context menu, select, dialog,
close control, settings rhythm, title rename, empty state → first Thought, thought create/delete,
new Field / Field switch, ghost arrival, recall wake, crystal settle, history timeline — each with
comparable variants labelled by role and duration, plus a forced reduced-motion toggle and a theme
toggle.

## Settings

A dedicated same-window workspace (`level="window"`, 1000 × 680), not a corner form and not a
second window. Opening it does not touch the camera, selection, drafts or current Field; closing it
restores exactly that state, because it owns no canonical data. Sections: General (language),
Appearance (theme, thought typography), Thinking (service, model, depth), Gateway (base URL, token,
capability report), Shortcuts (the command registry, grouped), About.

Thinking configuration is reported, never assumed:

- `GET /api/capabilities` is the gateway's own answer. `defaultModel` is `null` when nothing is
  configured — never a placeholder.
- The Model control shows the operator's declared list when there is one, a free-text id only when
  the gateway reports `allowModelOverride`, and the static text "Gateway default" otherwise.
- Thinking depth is a product word (`Auto`/`Light`/`Standard`/`Deep`) mapped by the gateway to the
  protocol's own output-budget parameter — `max_tokens` for chat completions, `max_output_tokens`
  for Responses. The UI never names a vendor parameter.
- The capability probe runs only when a gateway is selected, so a Field with thinking off makes no
  network request.
- Removing the legacy duration names was avoided: `motionDuration` still resolves, to roles.

## Signature sequences (three)

1. **Empty → First Thought.** The invitation breathes while it waits, contracts when writing begins,
   releases on commit, and the first Thought rises into the space it left. The invitation now stays
   mounted while the Field is empty *including* while composing, so the contraction is reachable
   rather than dead code.
2. **Field switch** (create / open / duplicate / fork entry). The veil lifts, the identity settles,
   and the Thoughts already visible come up through the surface. Visible Thoughts only: ghosts and
   recalls are Motion-owned presences and are excluded.
3. **History reveal.** Day markers land first and the entries follow in order, matching the reading
   order of "how did this form?".

`SplitText` was studied and deliberately rejected: the invitation's parts are already real elements,
so splitting text would add a re-split/accessibility surface for no additional meaning, and
per-character animation of Chinese text is spectacle rather than design. `Flip` was studied in
equal detail and is also not adopted: it interpolates between two states that exist at the same
time, and none of the three sequences here has that shape — a Field switch remounts the
composition root, so the outgoing and incoming DOM never coexist. It is not registered at all
rather than registered without a call site.

## UX repairs

- **Blank double-click.** The decorative text was already excluded from interaction by
  `field/spatial/pointerTarget.ts` (Phase 1); this pass preserved the `data-decoration`,
  `pointer-events: none` and `user-select: none` contract through the redesign, and the e2e test
  that probes three points of the invitation for `elementFromPoint` still passes.
- **Field rename.** No boxed dialog and no oversized input: the title itself becomes the editor,
  at the same size and position, with one underline and a hint line.
- **Close control.** One glyph, one placement, one accessible name ("Return to Field"), now with a
  38px target and a focus ring, used by every global surface (Settings, History, Thread, Deep Dive,
  Source, Shortcuts, Help, Import/Restore, Fork, Diffuse, Open Field).
- **How did this form?** The human sentence is now the primary line, the category chip is secondary
  support, the internal event kind survives only as `data-kind`, and each day states how many
  decisions it holds.

## Code structure

Only two files are over the 350-line review threshold, and both were already documented
exceptions before this pass (`scripts/check-source-size.mjs` `retained` map):

| File | Lines | Note |
|---|---|---|
| `src/field/Field.tsx` | 582 | untouched by Phase 2 — the spatial interaction engine |
| `src/ui/field.css` | 436 | the Field's single stylesheet |

Everything Phase 2 added or rewrote is under that threshold:

| File | Lines | Note |
|---|---|---|
| `src/ui/motion/tokens.ts` | 76 | new — the role vocabulary |
| `src/ui/motion/signature.ts` | 212 | new — GSAP lifecycle + three sequences |
| `src/ui/primitives/Select.tsx` | 47 | new — the only Select |
| `src/ui/workspace/useThinkingCapabilities.ts` | 42 | new |
| `src/dev/MotionLab.tsx` | 294 | new, dev-only |
| `src/dev/labScenarios.ts` | 154 | new, dev-only |
| `src/dev/motionLab.css` | 89 | new, dev-only |
| `src/ui/surfaces/SettingsSurface.tsx` | 154 | rewritten |
| `src/ui/focus/CommandMenu.tsx` | 85 | rewritten on Base UI |
| `src/ui/workspace/useTransientFocus.ts` | 92 | focus follows the gesture |
| `src/ui/workspace/Speak.tsx` | 136 | invitation is GSAP-owned |
| `src/ui/surfaces/HistorySurface.tsx` | 84 | reveal + hierarchy |
| `src/ui/Workspace.tsx` | 216 | composition root, still under its 500-line ceiling |
| `tests/e2e/primitives.spec.ts` | 100 | new |
| `tests/e2e/lab.spec.ts` | 141 | new — skips when the dev route is absent |
| `tests/e2e/selects.ts` | 31 | new — the one way the suite uses the one Select |

Dependency changes: `package.json` gained `@base-ui/react`, `gsap` and `@gsap/react`; nothing was
removed. `src/field/Field.tsx` and the whole `src/core` layer are untouched, which is why the
spatial/storage/history benches are expected to be unchanged — and were.

## Cost

The production bundle's main chunk grew from 789,030 B (gzip 257,223) to 1,002,990 B
(gzip 335,459): **+213,960 B raw / +78,236 B gzip (+27.1% / +30.4%)**. That is the tree-shaken,
minified contribution of GSAP, `@base-ui/react`, `@gsap/react` and the new application code
together; the other seven JS chunks are byte-identical. Measured by building the pre-Phase-2
commit from a `git archive` of HEAD with the same toolchain and the same gzip level.

Two deliberate measurements inside that number: registering `Flip` while nothing called it cost
roughly 24 kB raw / 8 kB gzip, which is why it is not registered at all; and the development-only
Motion Lab contributes **zero** bytes, because `import.meta.env.DEV` folds the dynamic import away
before Rollup graphs it (eleven lab-only strings were grep-verified absent from every emitted
asset).

## Verification

See `STATUS.md` for the gate table. Deliberately changed tests, and why:

| Test | Change |
|---|---|
| `tests/offline/v022-frontend.test.mjs` | The menu assertion now describes Base UI placement instead of the removed Floating UI composition; the surface-duration assertion asserts the role rather than a literal. |
| `tests/offline/v023-identity.test.mjs` | Menu-item and Settings-control CSS selectors moved to the Base UI attributes (`data-highlighted`, `.ui-select-trigger`). |
| `tests/offline/v024-signature.test.mjs` | The service-emphasis assertion moved from `select` to the cluster, because the control is no longer a native select. |
| `tests/offline/v025-motion-reuse.test.mjs` | "no GSAP dependency" became a stronger claim: GSAP is present and is imported by exactly one file, and the Field never references it. |
| `tests/e2e/*.spec.ts` | `selectOption()`/`toHaveValue()` on native selects became `choose()`/`expectChoice()` against the one Base UI Select, asserting the chosen *value* via `data-value` rather than a native control; `aria-current` became `aria-selected`; `#setting-service` became `#setting-thinking`. |

## Review findings, fixed before this pass was called done

An adversarial review of the change found four contract or correctness defects and several smells.
Every one was fixed rather than documented around:

| Finding | Fix |
|---|---|
| With reduced motion, a Field switch left the Field behind an **opaque veil for 4.2 s**: the veil rested at `opacity: 1` and only GSAP ever lowered it, and the sequence is skipped under reduced motion. | `.field-arrival` now rests at `opacity: 0` and `fieldSwitchSequence` raises it before lowering it (`fromTo`), so a skipped sequence leaves the Field immediately visible. |
| Thinking depth sent `max_tokens` on the **Responses** protocol, whose parameter is `max_output_tokens` — a silent no-op or a 400 — while the capability answer claimed depth was supported. | `server/provider.ts` emits the protocol's own parameter; the unit test now asserts the *absence* of the wrong name on each protocol as well as the budget. |
| The first-Thought emergence **ignored reduced motion** and ran outside any GSAP context, so the tween outlived a Thought deleted mid-animation. | It is now `useFirstThoughtEmergence`, a hook that reads the preference and owns a revertible context that kills the previous tween. |
| The invitation's **contraction sequence was dead code**: the invitation unmounted the instant composing began, so the authored contraction and the CSS rule that partnered it could never play. | The invitation now stays while the Field is empty *including* while composing, so it contracts as writing begins; the now-conflicting CSS opacity rule was removed because GSAP owns that property. |
| CSS transitioned `opacity` on the Speak action button while Motion animates it. | `opacity` removed from the CSS transition. |
| The receding menu had a **second focus-restoration authority**: Base UI's `finalFocus` default is `true` for a trigger-less menu. | `finalFocus={false}` on `Menu.Popup`. |
| `fieldSwitchSequence` also matched the `<p>` inside a Ghost/Recall `TransientTextPresence`, which Motion animates. | Ghosts and recalls are excluded from the Thought stagger. |
| **Focus could escape the modal Settings place with Tab.** `Surface`'s Tab trap counted every control matched by a DOM selector, including buttons inside *inactive* tab panels. The browser skips `hidden`/`inert` subtrees, so the last tabbable element it counted was not the last one a person can actually reach, and Tab walked out of the dialog. | The trap now counts only elements the browser can reach (`element.tabIndex >= 0 && !element.closest('[hidden],[inert]')`), and the inactive panels are no longer kept mounted at all. Found by `hardening.spec.ts` "keyboard menu navigation hands focus to Settings and traps Tab in both directions". |
| Registering GSAP's `Flip` with no call site shipped plugin bytes for a capability nothing used, and the reference audit claimed it implemented the Field-switch sequence. | The import, the registration and the `flipFrom` wrapper were removed, and both the audit and this record now say Flip was studied and not adopted, with the reason (a Field switch remounts the composition root, so there is no before/after pair to interpolate). |
| `emergeThought` matched only `p >`, so the emergence never played on the create-then-edit path (which renders a textarea). | It matches the element carrying the words, `p` or `textarea`. |
| The client re-probed `/api/capabilities` before **every** `respond`, adding a round trip and silently dropping a configured override on timeout. | The capability answer is cached per provider instance; the server remains the authority on what it will accept. |
| Base UI's **Menu is modal by default** and renders a full-screen invisible backdrop (`role="presentation"`, `position: fixed; inset: 0`) that absorbs the first outside press. Measured: `document.elementFromPoint` returned that backdrop, so clicking a Thought while a menu was open did not select it, and the Field stopped being interactive. The previous implementation dismissed on the pointer event itself and let it through. | `modal={false}` on `Menu.Root`. A Diffusion menu is a bounded projection, not a dialog: the Field stays live underneath it. The same audit found this because a test asserting that an outside click leaves focus on the Field began failing. |

The review also changed one product behaviour it found by tracing the dismissal path: dismissing a menu by clicking outside used to hand focus back to the menu's trigger, because the popup library swallows the outside press and therefore the browser never focused what the user clicked. `useTransientFocus` now records the pointer press that dismissed an open menu and focuses that element instead, so **focus follows the gesture**; a keyboard dismissal still returns to the opener. This is asserted by `hardening.spec.ts` "outside click dismisses More and does not steal the new Field focus".

## Still not verified

- **Native Windows Tauri was not run in this pass.** There is no Windows host available to this
  session. Everything the brief lists for that platform — Paper Day / Graphite Night, 125% / 150%
  scaling, high DPI, window resize, Chinese IME, keyboard shortcuts, menus, Settings, Select, dialog
  focus, Field switch, empty state — remains verified only in Chromium at 1440 × 960 (1× DPI).
- Pointer-anchored menus are now positioned by Base UI; their viewport-bounded geometry is asserted
  in Chromium but not across Windows display scaling.
- The capability probe against a real gateway is exercised against an injected `fetch` in unit tests
  and returns `UNKNOWN_CAPABILITIES` in the browser suite (no gateway is running there). No live
  provider was contacted.
