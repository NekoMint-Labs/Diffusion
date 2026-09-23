# Historical archive

This directory holds **provenance**, not product authority. Nothing here defines current
behaviour, and archived files are kept as they were rather than maintained. For current truth use
[README.md](../../README.md) (the documentation index), [ARCHITECTURE.md](../ARCHITECTURE.md) and
[STATUS.md](../../STATUS.md).

Everything historical lives under this one root, grouped by the version it belonged to.

| Group | Path | What it is |
|---|---|---|
| v0.1 | `v0.1/` | The supplied v0.1 README/STATUS/ARCHITECTURE/TESTING and related docs the v0.2 rebuild superseded, plus `v0.1/kickoff-pack/`: the numbered v0.1 kickoff reading order, UI/visual system, reference list, full-build prompt and layered acceptance checklist. |
| v0.2 | `v0.2/` | The v0.2/v0.2.1 README and STATUS snapshots frozen when the next pass began, the v0.2 pre-flight record, and the v0.2.x audit/verification journals. |
| v0.3 | `v0.3/` | The v0.3 interaction-maturity record and the v0.3.1/v0.3.2 refinement, extraction-review and structural-cleanup journals. |
| v0.4 | `v0.4/` | The Stage A→G redesign journals, the per-phase reports (Phase 1–4, including the motion-contract era), and [STATUS_JOURNAL_V0_4.md](v0.4/STATUS_JOURNAL_V0_4.md), the append-only phase journal moved out of `STATUS.md`. |
| Checkpoint notes and proofs | `checkpoints/*.md`, `checkpoints/*.proof.json` | Per-pass notes from the v0.1/v0.2 build (`00_`…`09-`, `FINAL.md`) and the external `snapshot.py` proofs (SHA-256 and integrity checks for each archived source ZIP). |
| Supplied/historical build prompts | `prompts/` | The build/refinement prompts supplied for the v0.2 rebuild and the v0.2.1–v0.2.5 passes. |

## Notes

- There is exactly one history root. The former `docs/historical/` tree was merged into
  `docs/history/` (its `v0.1/` contents are now `docs/history/v0.1/`), and the superseded
  `docs/V0_*.md`, `docs/V0_2_2_MOTION_CONTRACT.md` and root `PHASE-*-REPORT.md` files were moved
  under the matching version here.
- Path references *inside* these archived files are left as the original authors wrote them
  where they are part of the historical record. Proof JSON under `checkpoints/` records earlier
  archive contents, including the older `_checkpoints/` location as it existed at the time;
  those files are not rewritten.
- The durable product and architecture contracts that remain **authoritative** stay in `docs/specs/`:
  `01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md`, `02_TECH_STACK_AND_IMPLEMENTATION.md`,
  `04_PERFORMANCE_CONTRACT.md` and `DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md`.
- Superseded phase material was moved here rather than deleted: the v0.1 kickoff pack
  (`v0.1/kickoff-pack/`) and the v0.2.1 inherited-authority run note (`v0.2/`). Those files are left
  unedited, so references *inside* them still name their original `docs/specs/` location. The files moved
  out of the pack — `00`, `03`, `05`, `06`, `07` — were the phase-specific ones.
