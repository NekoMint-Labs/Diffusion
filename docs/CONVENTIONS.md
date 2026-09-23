# Conventions

These are the conventions the current repository actually uses. They were read out of the code, not
decided in advance; where the code is **not** uniform, this document says so instead of pretending
otherwise. Nothing here is enforced by a formatter or linter yet — review enforces it. Do not
mass-rename existing code to create artificial consistency.

For architecture and ownership, see [`ARCHITECTURE.md`](ARCHITECTURE.md). For which verification
layer to use, see [`TESTING.md`](TESTING.md). For how to propose a change, see
[`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## TypeScript and React

| Thing | Convention | Example in this repo |
|---|---|---|
| React component | `PascalCase`, one per file | `Workspace`, `Surface`, `ScopeHub`, `AISettings` |
| Component file | `PascalCase.tsx`, named after the component | `src/ui/surfaces/SettingsSurface.tsx` |
| Hook | `useXxx`, in a file of the same name | `useWorkspaceSettings`, `useTransientFocus` |
| Function, variable, property, parameter | `camelCase` | `describeRelations`, `fieldStyle`, `enabledSources` |
| Boolean | a plain adjective, or an `is`/`has`/`can` predicate | `reduced`, `composing`, `isDirectProvider`, `canRetry` |
| Type / interface | `PascalCase`, **no `I` prefix** | `Thought`, `SourceRecord`, `FieldStyleId` |
| Zod schema | `camelCase` + `Schema` | `packetSchema`, `evidenceCandidateSchema` |
| Exported constant set / lookup table | `SCREAMING_SNAKE_CASE` | `FIELD_STYLE_IDS`, `MOTION_DURATION`, `DISCOVERY_SOURCES` |
| Ordinary exported value | `camelCase` | `resolveLocale`, `defaultAppearance` |

Practical rules that follow from the code:

- **`interface` for object shapes, `type` for unions and aliases.** Both are used; the mix is
  deliberate, not drift.
- **No `enum`.** Closed sets are a `type` union derived from an `as const` array
  (`FIELD_STYLE_IDS` → `FieldStyleId`) or a `Record` (`DISCOVERY_SOURCES`). Add the new id to that
  single array or record; do not scatter string literals across call sites.
- **Discriminated unions carry a discriminant.** Domain events use `type`
  (`{ type: 'thought.create', ... }`); domain objects use `kind` (`ThoughtKind`, `RelationKind`).
- **Named exports are the norm.** `export default` appears only where it is the loading contract:
  the root `App` component and the lazy Field background renderers under
  `src/ui/fieldBackgrounds/` (plus the vendored renderers there).
- **Relative imports carry the explicit extension** — `./model.ts`, `../shared/i18n.ts`. This is
  not stylistic: the offline contract tests run the same modules under Node's type-stripping loader.
  Keep it when adding an import.
- **Indentation: 4 spaces in TypeScript/TSX**, 2 spaces in CSS.
- Comments explain *why* and state invariants, not what the next line does. Several modules open
  with a short rationale block; keep that habit when a decision is not self-evident.

## Files and directories

- Lowercase directory names for capability groups: `commands/`, `surfaces/`, `workspace/`, `motion/`,
  `thread/`, `tutorial/`, `scope/`, `primitives/`.
- `camelCase` for a multi-word UI group (`src/ui/fieldBackgrounds/`), `kebab-case` for the dev lab
  (`src/dev/material-gallery/`). Match whichever the directory you are joining already uses.
- `index.ts` is used **only where a directory is a module boundary** with a deliberate public
  surface: `src/platform/`, `src/credentials/`, `src/field/spatial/`, `src/field/phenomena/`,
  `server/`. It is not a barrel added to every folder.
- **There is no `utils/` or `helpers/` bucket.** The small genuinely cross-cutting layer is
  `src/shared/` (`http.ts`, `i18n.ts`, `manuscript.ts`). Anything else belongs beside the subsystem
  that owns the behaviour.

## Module ownership

A name should name the owner. Put a new module where its behaviour is owned:

| Path | Owns |
|---|---|
| `src/core/` | Canonical model, events, reducer, controller, attention, worlds, semantics, validation |
| `src/field/` | Camera, geometry, grid index, culling, pointer/context classification, DOM Thoughts, SVG phenomena |
| `src/ui/` | Product shell, surfaces, commands, settings, focus, scope, thread, motion, Appearance, Field backgrounds |
| `src/ai/` | Provider registry, wire protocols, transport, runtime, context compiler, semantic validation |
| `src/discovery/`, `src/evidence/` | Discovery transport seam and envelope; evidence read/extract/assessment pipeline |
| `src/storage/` | Dexie repository, migration, save queue, recovery |
| `src/platform/`, `src/credentials/` | Browser/native adapters; credential store contract and session handling |
| `src/shared/` | The few cross-cutting primitives (i18n, http, manuscript parsing) |
| `src/locales/` | The ZH dictionary |
| `server/` | Protected Hono gateway and wire adapters |
| `src-tauri/` | Native shell, credential store, native AI/discovery transport |
| `internal/discovery-engine/` | The Diffusion-owned Python discovery engine |
| `scripts/`, `tests/` | Repository tooling and verification |

If a helper is only used by one subsystem, it goes in that subsystem — not in `shared/`, and not in
a new generic directory. A repo-wide "utils" file is the thing this convention exists to prevent.

## CSS

Inspect the nearby file before adding a rule. The practical conventions:

- **Class names are `kebab-case`.** The repo does **not** use BEM or any other methodology: there
  are no `block__element` or `block--modifier` classes. A multi-word role is a flat class
  (`identity-rename-shell`, `scope-hub`, `material-gallery-stage`).
- **State and modifiers are `data-*` attributes, not modifier classes**: `data-level`, `data-state`,
  `data-phase`, `data-reduced-motion`, `data-scope-active`, `data-surface`. A modifier class like
  `.is-open` is not the pattern here.
- **Element hooks for tests are `data-testid="kebab-case"`** (see below); do not select on copy.
- **Custom properties are `--kebab-case` and name a role, never a literal colour.** Existing
  families: ink (`--ink-primary`, `--ink-secondary`, `--ink-tertiary`, `--ink-helper`), surfaces
  (`--surface-1`, `--surface-2`, `--surface-hover`, `--surface-active`), accents/semantics
  (`--attention`, `--trace`, `--ghost-ink`, `--recall-ink`, `--crystal-mark`), stacking
  (`--layer-field` … `--layer-surface`), timing (`--motion-*`, `--ease-*`), sizing
  (`--control-md`, `--radius-control`).
- **Light is the `:root` default; Dark and profiles override it.** `:root[data-theme="dark"]`,
  `:root[data-style-profile="studio-slate"]`, `:root[data-thought-typography="sans"]`. Never
  hardcode a theme colour inside a component — pick a semantic token ([spec 02 §12](specs/02_TECH_STACK_AND_IMPLEMENTATION.md)).
- **CSS lives beside its owner.** `src/ui/theme.css` holds the tokens and imports the others;
  the Field is `src/ui/field.css`, surfaces are `src/ui/surfaces/surfaces.css`, motion is
  `src/ui/motion/spatialActivity.css`, the tutorial is `src/ui/tutorial/firstFieldTutorial.css`, and
  a lab is `src/dev/*.css`. Do not add a new global stylesheet when a subsystem file owns the rule.
- **Animation ownership is exclusive.** One visual property has one animation owner at a time:
  React/Motion owns ordinary component animation; GSAP is imported by exactly one module
  (`src/ui/motion/signature.ts`) and owns authored sequences only; CSS owns pointer-frequency
  micro-states. `transition: all` is prohibited. Reduced Motion collapses a role to zero duration
  rather than hiding the state change. The full rule is in
  [`ARCHITECTURE.md`](ARCHITECTURE.md#motion-ownership-contract-motion-gsap-and-the-future-gpu-layer).

## Product identifiers

Every externally meaningful identifier is lowercase `kebab-case` unless the row says otherwise, and
has one definition site:

| Identifier | Shape | Defined in |
|---|---|---|
| Command id | `kebab-case` verb phrase — `new-thought`, `rename-field`, `deep-dive`, `export-markdown` | `src/ui/commands/*.ts` (one registry) |
| Domain event type | `noun.verb`, dotted lowercase — `thought.create`, `thought.move`, `relation.confirm`, `source.add`, `input.record` | `src/core/events.ts` |
| DOM test hook | `data-testid="kebab-case"`, feature-prefixed and stable — `field`, `scope-hub`, `provider-key`, `discovery-missing-key` | the owning component |
| State marker attribute | `data-<kebab-name>="<kebab-value>"` — `data-level`, `data-phase`, `data-reduced-motion` | the owning component |
| Locale key | the **English source string itself**, with `{placeholder}` interpolation — `t('Rename Field')` | call site; translations in `src/locales/zh.ts` |
| Provider id | lowercase word — `openai`, `anthropic`, `gemini`, `deepseek`, `compatible` | `src/ai/providers.ts` |
| Field Style id | `kebab-case` material noun — `paper-texture`, `topography`, `threads`, `waves`, `silk` | `FIELD_STYLE_IDS`, `src/ui/appearance.ts` |
| Theme/Profile id | `kebab-case` — `editorial-warm`, `studio-slate`, `quiet-forest`, `graphite-night` | `STYLE_PROFILE_IDS`, `src/ui/appearance.ts` |
| Accent id | `kebab-case` — `oxide`, `amber`, `moss`, `slate`, `plum`, `custom` | `ACCENT_IDS`, `src/ui/appearance.ts` |
| Discovery source id | lowercase word — `exa`, `tavily`, `brave` | `DISCOVERY_SOURCE_IDS`, `src/discovery/contracts.ts` |

Two consequences worth stating plainly:

- **Locale keys are English copy, not invented symbols.** Adding UI text means adding the English
  key and, for ZH, an entry in `src/locales/zh.ts`; `pnpm run check:locales` enforces coverage.
  User text, fetched passages and model replies are never rewritten for localization.
- **Storage names are compatibility, not branding.** The Dexie database stays
  `diffusion-explorer-v1` and the portable project stays `schemaVersion: 1`; see
  [`MIGRATIONS.md`](MIGRATIONS.md). Do not rename them to match a new product name.

## Tests

File placement and naming:

| Layer | Runner | File | What belongs there |
|---|---|---|---|
| `tests/unit/` | Vitest (`pnpm test`) | `*.test.ts` (one Node-only file is `*.test.mjs`) | Pure logic: reducers, model/validation, geometry, migration functions, parsers, schemas, UI state modules |
| `tests/offline/` | Node `node --test` (`pnpm run test:offline`, inside `check:offline`) | `*.test.mjs` | Module boundaries and contracts with no network or installed dependency: provider/gateway wire shapes, credential boundary, discovery envelope, locale/source-size policy |
| `tests/e2e/` | Playwright (`pnpm run test:e2e`) | `*.spec.ts` | Real mounted application behaviour: gestures, camera commits, focus/Escape handoff, persistence through the UI, visual/material contracts, Reduced Motion. `selects.ts` is a shared helper, not a spec |
| `tests/primitives/` | Python harness | `*.py`, `harness.html` | Authored camera/geometry and typography measurement, not a gate |

Rules:

- **Name a new regression test by the product behaviour it protects** — `pointerTarget.test.ts`,
  `appearanceMigration.test.ts`, `materialState.spec.ts` — not by a phase or version number.
- **Legacy phase-named files stay until they are naturally touched.**
  `tests/offline/phase3a-runtime.test.mjs`, `tests/unit/phase3aIngestion.test.ts` and
  `tests/e2e/phase28b.spec.ts` are historical and mixed in deliberately. Do not mass-rename them in
  this or any unrelated change; rename one only when you are already editing it for a real reason.
- **Put the test in the lowest layer that can fail for the right reason.** See
  [`TESTING.md`](TESTING.md#which-layer-owns-a-test) for the decision table.
- **Do not add a test merely to raise a number.** A regression test for a bug fix is expected when
  the fix is feasible to test; a test that asserts nothing real is worse than no test.

## Repository-wide conventions

- **Physical size is a review signal, not a rule to game.**
  `pnpm run check:source-size` fails a handwritten production file over **700** physical lines and
  flags anything over **350** for review; **500** is the normal split point. Exemptions are declared
  with a written reason in `scripts/check-source-size.mjs` (currently `src/locales/zh.ts`) — that
  list is where a justified exception is recorded, not a place to silence a failure.
- **No formatter or linter gate exists yet**, and this task deliberately does not add one (ESLint,
  Prettier, Biome, Stylelint, commitlint, Husky, lint-staged). Match the file you are editing and let
  review catch the rest. `pnpm run format:source` edits files and is not a verification step.
- **Docs describe current behaviour.** When a change alters a contract, update the owning document
  rather than editing historical material under `docs/history/`.
