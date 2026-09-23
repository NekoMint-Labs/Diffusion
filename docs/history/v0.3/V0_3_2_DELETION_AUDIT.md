# v0.3.2 deletion audit — reference evidence

Prove/disprove each removal from the v0.3.2 structural cleanup using references, not intuition. Method:
repo-wide reference search, `git show HEAD:<path>` deltas, and three gates (`npm run typecheck`,
`npm test`, `npm run check:offline`) — all PASS. `git log --oneline -1` = `3494680 chore: initial commit`;
the working tree holds a large uncommitted pass, so **HEAD is older than the pre-cleanup tree** and can
only show a name is absent now, not that this pass removed it.

## (a) Removed items — references and verdicts

| Removed item | Live reference(s) | Verdict |
|---|---|---|
| `--focus-ring` (theme.css) | none in `src/`/`tests/`/`docs/`; only prose at `docs/history/v0.3/V0_3_2_STRUCTURAL_CLEANUP.md:23` | SAFE |
| `--motion-surface` (theme.css) | none live; generated snapshots/logs under `verification/**` only | SAFE |
| `--ease-in-out-ui` (theme.css) | none live; `verification/**` snapshots only | SAFE |
| `.find-results` (field.css) | none; `verification/**` snapshots only | SAFE |
| `.find-preview` (field.css) | none; `verification/**` snapshots only | SAFE |
| `contains` (geometry.ts) | none. The 3 `contains` hits are `Element.contains()` (`Field.tsx:184`, `Speak.tsx:74`, `hardening.spec.ts:70`), never imported from `spatial/geometry.ts` | SAFE |
| `MOTION_EASE_IN_OUT` (motion.ts) | none anywhere; only the audit docs name it | SAFE |
| `glyphs` → `relationGlyphs` | old name gone from `src/`; single consumer updated: `Field.tsx:18` imports `./phenomena/glyph.ts`, `:563` renders `relationGlyphs[p.kind]`, declared `glyph.ts:9` | SAFE |
| `_checkpoints/`, `PRE_FLIGHT.md`, 7 prompts (moves) | one live spec still names two old prompt paths — see (c) | see (c) |

Provenance from generated snapshots (not living evidence):
- `contains` **is** still in `verification/v0.2.{3,4,5}/primitives/modules/field/spatial/geometry.js` (line 2).
  Frozen transpiles of `src/`; the deletion is real and they legitimately keep the old symbol.
- `MOTION_EASE_IN_OUT` is **not** in any `verification/**` snapshot — the archived `modules/` holds only
  `field/`, no `ui/`, so no archived copy exists.

## (b) Six deliberately-kept tokens

All six appear in the stylesheet **only as declarations**; none is read by living CSS, markup, `src/`, or the
primitives harness. All six are named as declared vocabulary in
`docs/specs/02_TECH_STACK_AND_IMPLEMENTATION.md` §12 ("never hardcode theme colors… use semantic tokens").

| Token | (i) referenced by living CSS/markup? | (ii) named in 02 spec? |
|---|---|---|
| `--surface-rest` | no — declared `theme.css:15` | yes, `:297` |
| `--surface-hover` | no — `theme.css:16` | yes, `:298` |
| `--surface-active` | no — `theme.css:17` | yes, `:299` |
| `--ghost-ink` | no — `theme.css:26` | yes, `:307` |
| `--recall-ink` | no — `theme.css:27` | yes, `:308` |
| `--system-danger` | no — `theme.css:29`, `:61` | yes, `:310` |

Defensible from those two facts alone? **Yes.** The spec defines these names as the token contract, so
keeping them preserves authority with no current consumer; deleting them diverges silently from the spec,
worse than an orphan declaration. Honest cost: six declared tokens with no living reader and no test
coverage. Matches `V0_3_2_STRUCTURAL_CLEANUP.md:28-31`.

## (c) References to the old paths

Updated in place (verified by reading):
- `scripts/snapshot.py` — `required` (`:66,67,70,73,76`) uses `docs/history/prompts/POWERFUL_AI_*`;
  `CONTENTS_CHECK` (`:118`) and the proof write (`:125-126`) use `docs/history/checkpoints/`.
  **All 59 `required` paths exist on disk — 0 dead required paths.**
- `README.md:139` routes the archive to `docs/history/` (via `docs/history/README.md`); no old path remains.

Inside an archive (frozen; correct not to rewrite):
- `docs/history/**` — the 7 moved prompts, checkpoint notes, inherited README/STATUS, proof JSON, and the
  new `docs/history/README.md` index that documents the move (`:17`, `:35`).
- `docs/history/v0.1/README.md:119` and `verification/v0.2/README.md:9` (`_checkpoints/`).

WOULD-BREAK (living authority, not an archive):
- `docs/specs/DIFFUSION_EXPLORER_V0_2_1_INHERITED_AUTHORITY.md:12` → `docs/specs/POWERFUL_AI_DIFFUSION_V0_2_REBUILD_PROMPT_EN_REV1.md` (now `docs/history/prompts/`).
- same file `:25` → `docs/specs/POWERFUL_AI_4H_FULL_BUILD_PROMPT_EN_VALUE_CHECKPOINT_SAFE.md` (now `docs/history/prompts/`). Both old paths are confirmed missing.
- Not a break: `docs/specs/06_FULL_BUILD_PROMPT.md:3` mentions a bare `POWERFUL_AI_4H_FULL_BUILD_PROMPT_EN.md` ("if supplied") — a different filename, not a path.

## (d) Weakest evidence

1. **`--focus-ring` before-state is unrecoverable.** `HEAD:src/ui/theme.css` lacks it, so I prove only that
   nothing references it now — not that this pass removed it. Its removal rests on the pass's own record
   (`V0_3_2_STRUCTURAL_CLEANUP.md:23`), not on a diffable before/after.
2. **Harness dependency is searched, not executed.** Zero literal hits for every removed token/class in
   `tests/primitives/`, but the harness was not run (e2e/bench in use), so a string-built dependency would
   be invisible to this method.
3. **"Live authority" is read, not machine-checked.** The two `INHERITED_AUTHORITY` breaks assume
   `docs/specs/` is current truth (from the file plus `README.md:138-139`); no doc-link checker was run, and
   that same file's `:11` target still exists — the breakage is selective, not a wholesale dead spec.
