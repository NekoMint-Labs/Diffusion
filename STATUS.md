# Diffusion — current status

## Repository baseline — October 21, 2026

The cleanup branch starts from main `59f1e28c24d9965b756b3a6988bae7635def0f9b`.
Source manifests declare `0.3.16`. GitHub published
[v0.3.16 stable](https://github.com/NekoMint-Labs/Diffusion/releases/tag/v0.3.16)
on October 16, 2026, without a pre-release flag. This records publication status; this cleanup
does not rebuild or requalify that installer.

[Field acceptance #11](https://github.com/NekoMint-Labs/Diffusion/issues/11) and
[Windows / real-task acceptance #12](https://github.com/NekoMint-Labs/Diffusion/issues/12)
were closed as completed on October 15. The previous status and acceptance journals are preserved
unchanged in the [history index](docs/history/README.md), including their original failures,
unverified items and then-current issue states.

## Scope of this baseline

- Remove unused helpers, an unused evidence adapter and relation-glyph table, obsolete motion
  aliases, unused CSS/localization entries, and dead Python provider interfaces.
- Enforce unused TypeScript locals/parameters in the normal typecheck; run Python discovery and
  source-export tests in a separate CI job.
- Repair source checking on Windows and exclude generated evidence/build trees. Make appearance
  captures independent of a private local image; archive the obsolete visual-capture script.
- Export source snapshots from Git's tracked-file list and current working-tree contents, with
  version-derived names and the existing integrity/restore proofs.
- Separate current documentation from dated delivery journals. No dependencies or data schemas
  are changed by this cleanup.

The audit covered application/Core/Field/UI/storage/provider/discovery code, native and Python
boundaries, maintenance scripts, workflows, and current documentation. Only confirmed unused
code and demonstrated tooling defects were changed. Compatibility interfaces, migrations,
third-party notices and historical evidence remain.

## Verification

Commands and layer boundaries are documented in [TESTING.md](docs/TESTING.md).
This branch's local results and exact-head CI links are recorded in its pull request.
The required gates are application/Core types, locales, offline contracts, unit tests, production
build, Python discovery/tooling tests, and the full production-browser suite.

TypeScript now rejects unused locals and parameters. This is not an exhaustive dead-export or
CSS usage detector; dynamically constructed references still require review. The Vite main-chunk
size warning remains visible.

## Separate changes and acceptance limits

At this checkpoint, [PR #71](https://github.com/NekoMint-Labs/Diffusion/pull/71) (Field deletion)
and [PR #72](https://github.com/NekoMint-Labs/Diffusion/pull/72) (Undo for an unkept generation)
are open and are not part of this cleanup branch. The audit's native discovery-argument and
Python retrieval-default fixes are delivered separately so their behavior changes can be reviewed.

This pass uses fixture data and does not exercise stored credentials, live providers, a packaged
sidecar, installation/upgrade, physical input, or long-session native use. Issue closure and a
published stable label do not make this branch's browser/unit checks evidence for those paths.
See the [acceptance map](docs/ACCEPTANCE_MAP.md) for the relevant verification layers.
