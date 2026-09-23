# Diffusion Explorer v0.3.0 — Product interaction maturity

Implementation date: 2026-09-14. In-place pass over v0.2.6. No Core, provider, storage or Field-mechanics rewrite; no new production dependency.

## What this pass is

v0.2.x made the Field quiet and distinctive. v0.3 makes it *deep* behind that surface: one shared command/action model, Field ownership from the title, right-click context menus, user-facing Undo/Redo, a command palette, Find in Field, honest Field export, and a shortcut reference derived from the registry.

Nothing was added to the visible Field: no sidebar, no toolbar, no ribbon, no permanent Undo/Redo icons, no save indicator.

## One command model

`src/ui/commands/types.ts` defines the whole contract:

```ts
interface DiffusionCommand {
  id: string; group: 'think' | 'field' | 'edit' | 'find' | 'view' | 'app';
  label: string;                     // localization source key, never pre-translated
  keywords?: string[];               // discovery aliases, including English terms for the Chinese UI
  shortcuts?: Shortcut[];            // platform-neutral; labels are rendered per platform
  global?: boolean;                  // may supersede another transient owner or a text editor
  available?: (context: CommandContext) => boolean;
  run: (context: CommandContext, origin?: Point) => void;
}
```

- `CommandContext` is explicit and narrow: current Field, selection, editing state, current surface, undo/redo availability. Commands never read the DOM and never carry UI geometry.
- Availability *hides* a command rather than disabling it, so no presentation fills up with dead rows.
- Registry ownership is split by responsibility: `thinking.ts` (THINK), `field.ts` (FIELD), `app.ts` (EDIT/FIND/VIEW/APP), composed by `compose.ts`. Not one god registry.

Presentations are projections of the same definitions:

| Presentation | Projection |
| --- | --- |
| Application menu (top-right `···`) | `APP_MENU` sections |
| Field menu (title) | `FIELD_MENU` sections |
| Thought / multi-selection menu (right-click, Scope Hub `···`) | `SELECTION_MENU` sections |
| Blank Field menu (right-click empty space) | `BLANK_MENU` sections |
| Command palette (`Ctrl/Cmd+K`) | `paletteCommands()` + deterministic group priority |
| Keyboard | the first matching available command's `shortcuts` |
| Shortcut reference | commands that declare `shortcuts` |

Menu sections (and therefore dividers) are declared by the presentation, not derived from groups, so a menu can group `Export`/`Import` together without merging their semantic groups.

## Contextual priority

Deterministic, not a recommendation engine:

- with a selection: `think → edit → find → field → view → app`;
- with no selection: `edit (New thought) → find → field → view → app`.

Unavailable commands are removed *before* ordering, so the top of the palette is always something that can actually run.

## Keyboard ownership

`useWorkspaceKeyboard` is now one router over the registry:

1. IME composition (`isComposing` / keyCode 229) never triggers a command.
2. `Escape` closes exactly one transient owner, in the established order: menu → surface → thought edit → carry → Speak → selection.
3. A shortcut only fires if its command is available in the current context.
4. Commands marked `global` (palette, find, settings, shortcuts) work while a menu or modal owns input, and supersede it — this preserves the existing "shortcut replaces the current owner" behavior.
5. Every other command requires: not typing, no open menu/modal, and focus not inside another surface.

Registered shortcuts: `Ctrl/Cmd+K` palette, `Ctrl/Cmd+F` Find in Field, `Ctrl/Cmd+Z` Undo, `Ctrl/Cmd+Shift+Z` (and `Ctrl+Y`) Redo, `Ctrl/Cmd+,` Settings, `Delete`/`Backspace` delete selection. Labels and `aria-keyshortcuts` are produced per platform; no shared UI hardcodes Windows or macOS spellings. Shortcut hints are `aria-hidden`, so a row's accessible name stays the command label.

## Field ownership vs application ownership

- Top-left title = **this Field**. Clicking it opens Field operations: rename, new, open (recent), duplicate, export archive, export as Markdown, import/restore, history, fork.
- Top-right `···` = **application/view**: command palette, find, keyboard shortcuts, settings, help.
- Undo/Redo, duplicate Thought, copy text and delete live in the selection menu and the palette, not in the chrome.

## Undo / Redo

Architecture is unchanged in kind and now explicitly documented: history is a bounded in-memory stack of canonical `ProjectState` snapshots inside `ProjectController`, next to the mutation boundary. No UI component owns a stack.

- **Transaction boundary = one user dispatch.** A drag dispatches one `thought.move` on pointer-up; an edit session dispatches one `thought.edit` on commit. Pointer moves, keystrokes and animation frames are never entries.
- `controller.batch()` collapses several user dispatches that are one deliberate action (multi-Thought duplicate) into one history step.
- Not history: hover, focus, selection, camera pan/zoom, Scope Hub visibility, Settings state, animation. `camera.commit`/`region.observe`/`lifecycle.tick` are `system` actor commands and are outside the undo set; Undo deliberately preserves the *current* camera and Threads.
- Claiming a Ghost is now fully reversible: the step records the consumed Ghost and Undo restores it as a possibility (Redo removes it again).
- `field.rename` is an ordinary reversible domain event.
- Redo is invalidated by any new user mutation. History is capped at 60 steps.
- Found while verifying: restoring a surface's saved camera scheduled a redundant `camera.commit` even when the camera value had not changed, which dirtied and rewrote the Field for a no-op. `CameraController.set` now treats an identical value as no change. `tests/unit/camera.test.ts` covers that boundary.
- Undo/Redo are unavailable (and therefore absent) when the stack is empty. Deleting a Thought still needs no confirmation dialog because it is one keystroke away from being restored.

Async AI actions are deliberately **not** recorded as history in this pass: a user-triggered Explore that produces transient Ghosts remains reversible by dismissing the Ghosts (they are session-only and never canonical), but there is no "undo the model" entry. Recorded as a limitation below.

## Find in Field

- `Ctrl/Cmd+F` opens a small surface (level `bar`) at the top of the Field. It is **non-modal**: the Field stays visible and interactive, so navigation, selection and clicking an offscreen cue keep working. This changed `isGlobalModal`: find no longer renders the input shield.
- Matching is deterministic and local (`src/ui/find/matching.ts`): normalized case-insensitive substring over user-authored Thought text and their linked Source title/excerpt; ordered by reading position (y, then x, then id). No AI, no network, no semantic Recall.
- Presentation: matching Thoughts stay at full ink, the current match gets a quiet underline, everything else recedes. Closing Find removes all emphasis and never mutates the Field.
- Navigation: `Enter` / `Shift+Enter` step through matches and pan the camera to the match **preserving zoom** (`FieldHandle.reveal`). Offscreen matches render edge cues; clicking one travels to it. Find never moves the camera on its own.

## Export and import

- **Lossless archive** (`Export`, unchanged): `diffusion-project` / version 1 JSON from `exportProjectJSON`. Original file bytes, native paths, API keys, capsules and unclaimed Ghosts are excluded by contract.
- **Human-readable Markdown** (new): `exportFieldMarkdown` writes a flat document: title, Stable commitments, Still open, Set aside, Sources. The header states explicitly that spatial position, relations, Threads and lifecycle are not represented — Markdown is not presented as a full-fidelity format.
- **Import** was already safe and unchanged: `RestoreSurface` validates structure, creates a *new* Field, and never overwrites the current one. A malformed file fails visibly.
- No "Save" command was added. Dexie autosaves; a command implying unsaved work would be dishonest. Save failures already surface through the persistence-error notice and the export affordance beside it.

## Structure

New modules:

```
src/ui/commands/types.ts            45   contract
src/ui/commands/shortcuts.ts        40   platform labels, ARIA shortcuts, matching, IME guard
src/ui/commands/thinking.ts         67   THINK commands
src/ui/commands/field.ts            23   FIELD commands
src/ui/commands/app.ts              41   EDIT/FIND/VIEW/APP commands
src/ui/commands/compose.ts          95   composition, ordering, projections, menu rows
src/ui/commands/CommandPalette.tsx  83   palette presentation
src/ui/commands/useFieldRename.ts   43   inline Field rename session
src/ui/find/matching.ts             14   deterministic matching
src/ui/find/useFindInField.ts       41   find session state
src/ui/surfaces/OpenFieldSurface.tsx 37  stored Fields
src/ui/surfaces/ShortcutsSurface.tsx 18  shortcut reference
```

Touched:

| File | Before | After |
| --- | --- | --- |
| `src/ui/Workspace.tsx` | 339 | 440 |
| `src/field/Field.tsx` | 529 | 576 |
| `src/ui/focus/CommandMenu.tsx` | 57 | 63 |
| `src/ui/surfaces/FindSurface.tsx` | 21 | 26 |
| `src/ui/surfaces/Surface.tsx` | 86 | 87 (new `bar` level) |
| `src/core/controller.ts` | 155 | 206 |
| `src/field/camera/controller.ts` | 31 | 33 (unchanged-value guard) |
| `src/core/reducer.ts` | 248 | 257 |
| `src/core/world.ts` | 109 | 126 |
| `src/ui/workspace/useWorkspaceKeyboard.ts` | 55 | 62 |

Both files above 350 are the composition root and the inherited spatial engine; their growth is the command wiring (Workspace) and presentation-only Find emphasis plus context-menu input resolution (Field). Neither absorbs command *semantics*: those live in `src/ui/commands`. Field's over-350 standing is recorded in `scripts/check-source-size.mjs` with the reason.

Dependencies: **none added.** cmdk and Radix were inspected and rejected (see `REFERENCE_AUDIT.md`); the palette and context menus use the existing `@floating-ui/react` and `motion` dependencies.

## Verification in this pass

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 10 files / 71 tests (new: command model, Find matching, semantic history, camera commit boundary) |
| `npm run build` | PASS — existing Vite chunk-size warning only |
| `npm run test:e2e` | PASS — 58 real React/Chromium tests (new `tests/e2e/interaction.spec.ts`) |
| `npm run check:offline` | PASS — 140 contracts, core typecheck, locale and source-size gates |
| `npm run bench:spatial`, `npm run bench:storage` | PASS — unchanged from v0.2.6 |
| `npm run bench:history` | PASS — 5000-Thought / 60-step history, see below |
| Native Windows Tauri, dev mode | PASS — 19/19 checks driven through the real WebView2 (Edge 152) |
| Native Windows Tauri, packaged build | PASS — 11/11 checks on `http://tauri.localhost` |

The end-to-end gate runs serially with a 10 s assertion timeout. The suite compares exact bounding boxes and opacity while waiting on coalesced camera/rAF boundaries, so parallel workers on a loaded container produced harness-only flakes — a different retrying assertion each run, never reproducible in isolation or with `--workers=1`. Assertion strength is unchanged.

## History at scale (5000 Thoughts, 60 entries)

`scripts/benchmark-history.mjs` (`npm run bench:history`) measures the real controller. Numbers from `verification/v0.3/history-benchmark.json`, Node 24, `--expose-gc`.

**Representation: copy-on-write, not whole-state copies.** The controller pushes the previous `ProjectState` object itself. The reducer replaces the `thoughts` map, the Thoughts that changed, and any other collection it touched; every untouched Thought object and every untouched collection (`relations`, `regions`, `sources`, `threads`, and `history` when the event adds no trajectory entry) is shared by reference. Identity assertions in the benchmark verify each of those.

| Measurement | Value |
| --- | --- |
| Field size | 5000 Thoughts, 1.09 MB serialized |
| One `structuredClone` of the Field | 1.62 MB |
| Retained by 60 history entries | 11.4 MB (0.19 MB/entry) |
| A deep-copy-per-step design would retain | ~97 MB (8.5×) |
| Heap: after 60 entries / after all undos / after all redos | 21.98 / 22.42 / 22.51 MB |
| Mutation (edit or move) | mean 1.72 ms, p95 2.21 ms |
| Undo | mean 8.75 ms, p95 11.34 ms, max 12.33 ms |
| Redo | mean 8.15 ms, p95 9.39 ms |
| History bound | 100 mutations leave exactly 60 undoable entries |

**Conclusion: the snapshot architecture stays.** Memory is healthy (0.19 MB per entry; a full 60-entry history costs ~11 MB at the largest supported Field) and bounded, and undo/redo are well inside an explicit-action budget.

One measurable inefficiency was found and **deliberately not changed**: `restore()` detects which Thoughts changed by running `JSON.stringify` over both states for every key (~7.4 ms of the 8.75 ms mean undo). Comparing object identity instead is semantically equivalent — the reducer replaces a Thought object exactly when its content changes — and measures 0.52 ms (14× faster, no extra memory). At 11 ms p95 for an explicit user action this is not a user-visible problem, so per the evidence gate it is documented rather than optimised. If undo latency ever matters (e.g. 20k+ Thoughts), that identity comparison is the smallest safe change; inverse patches are **not** warranted by these measurements.

## Native Windows acceptance

The frozen source was run in native Windows (Windows 11 26200, WebView2/Edge 152, 183 % display scaling, viewport 1394x808 dev / 1372x856 packaged) and driven through the real WebView2 over CDP. Details and harness: `verification/v0.3/windows/`.

- **Dev mode** (`cargo run`, identical `devUrl` semantics to `npm run tauri dev`, frontend served by Vite): **19/19** — Field title menu with focus restoration, right-click blank Field, right-click Thought, right-click inside a multi-selection, Ctrl+K palette (contextual order, localized alias search, no stale query), palette keyboard navigation, Escape ownership across nested owners, Ctrl+, Settings, Ctrl+F in place with Enter/Shift+Enter navigation, Ctrl+Z / Ctrl+Shift+Z against canonical state, Chinese IME composition, native text selection, clipboard write, window resize at three sizes, both themes, and stale-owner checks.
- **Packaged build** (`cargo build --release` with `devUrl` removed, embedded `dist/`, dev server stopped): **11/11** on `http://tauri.localhost`, which reports `isSecureContext: true` and a present `navigator.clipboard`; Copy Text reports "Copied to the clipboard.".
- **No product regressions were found.** Every failure during the acceptance was in the harness (hardcoded coordinates larger than the real 1394x808 viewport, a temporary Scope Hub absorbing a drag start, an assertion that Shift+Enter must move when only one match exists, comparing a placeholder-rendered text node instead of canonical state, and an unbounded `clipboard.readText` probe). The harness was corrected; **no file under `src/` was changed by this pass.**
- Still unverified natively: a physical trackpad two-finger click, a real Chinese IME candidate window, OS-level focus stealing, and the installer/bundle step. Input was injected over CDP, which exercises the same DOM event paths but is not a human hand.

## Limitations

- Native Windows verification now exists for the dev and packaged app, but not for a second machine/GPU driver, the installer/bundle step, physical trackpad secondary click, or a real IME candidate window.
- Clipboard text copy uses the standard `navigator.clipboard` boundary (verified in both native origins; the platform adapter still has no clipboard capability). WebView2 denies `readText` without a permission grant — the app never reads the clipboard.
- Async AI actions (Explore/Ask producing Ghosts) are not undo entries. A robust semantic boundary for asynchronous AI still needs its own scoped work.
- No recent/pinned commands and no shortcut remapping. The registry is a plain ordered array so both remain additive.
- `Recall` has no manual command: the product semantics of a hand-invoked Recall do not exist yet, so it was not invented.
- Field archive/delete was not added: the repository has no delete operation, and inventing one would have changed persistence semantics.
