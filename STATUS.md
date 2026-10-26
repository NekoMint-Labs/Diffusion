# Diffusion — current status

## Repository baseline — October 26, 2026

The cleanup was originally based on main `59f1e28c24d9965b756b3a6988bae7635def0f9b` and is now
synchronized with `e0097df20c2f7dc2a1983a0b56c4565e4f9e0291`, including merged #71, #72, #73, #78 and #79.
Source manifests declare `0.3.16`. GitHub published
[v0.3.16 stable](https://github.com/NekoMint-Labs/Diffusion/releases/tag/v0.3.16)
on October 16, 2026, without a pre-release flag. This records publication status; this cleanup
does not rebuild or requalify that installer. The newer
[#78/#79 Windows preview](https://github.com/NekoMint-Labs/Diffusion/releases/tag/pr78-79-preview-20261026-882a1a7)
was published on October 26 from `882a1a7`; it does not contain the subsequent #72/#73 changes.
The subsequent merged #71/#72/#73 changes still need a newly built and qualified installation package.

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

At this checkpoint, [PR #71](https://github.com/NekoMint-Labs/Diffusion/pull/71) (Field deletion),
[PR #72](https://github.com/NekoMint-Labs/Diffusion/pull/72)
(Undo for an unkept generation) and [PR #73](https://github.com/NekoMint-Labs/Diffusion/pull/73)
(native discovery arguments and Python retrieval defaults) are merged into main and inherited
through this synchronization; their behavior changes are not introduced by the cleanup diff.
[PR #77](https://github.com/NekoMint-Labs/Diffusion/pull/77) and its stacked answer-preview
[PR #80](https://github.com/NekoMint-Labs/Diffusion/pull/80) remain separate review work.

This pass uses fixture data and does not exercise stored credentials, live providers, a packaged
sidecar, installation/upgrade, physical input, or long-session native use. Issue closure and a
published stable label do not make this branch's browser/unit checks evidence for those paths.
See the [acceptance map](docs/ACCEPTANCE_MAP.md) for the relevant verification layers.
