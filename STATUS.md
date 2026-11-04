# Diffusion — current status

## Release preparation — November 4, 2026

Main includes [Field consolidation #96](https://github.com/NekoMint-Labs/Diffusion/pull/96),
merge commit `5b6be7dbbdc5747c435d886cf9dba0ed2ecaf14e`. This focused follow-up
prepares source version **0.3.17** for final review and Windows acceptance under
[issue #97](https://github.com/NekoMint-Labs/Diffusion/issues/97).

**v0.3.17 is not published.** The latest published stable remains
[v0.3.16](https://github.com/NekoMint-Labs/Diffusion/releases/tag/v0.3.16), October 16,
2026. Internal Preview builds are not the intended stable deliverable.

The [previous status](docs/history/checkpoints/STATUS_BEFORE_V0_3_17_2026_11_04.md)
is retained unchanged as a dated record. Its candidate states and test results
must not be treated as current release acceptance.

## Included source and preparation

- Existing Field: optional compact points plus full originals, fixed reading,
  explicit Keep/Ignore/Fork/Bring, durable provenance and edit invalidation,
  persistence/JSON recovery, Undo/Redo and Bring clearance.
- One provider response entry and independent `field-reading` extraction;
  120-character opening guidance is scoped to Field, not Thread/Deep Dive.
- Historical AI origin is preserved after a user edit; current wording is
  marked as edited. Handwritten Fork/Bring remains handwritten.
- Release manifests agree on 0.3.17. Stable packaging retains the stable app,
  data and credential identity and includes stable installation instructions.
  PR builds still use isolated Preview. No schema migration or feature expansion.

The standalone Next workflow and plain-answer experiment are excluded. Free
Links [#94](https://github.com/NekoMint-Labs/Diffusion/pull/94) remains a separate
Draft; issues #75/#76 remain deferred. Superseded stacked PRs close without being
merged. [Historical closeout recommendations](docs/releases/v0.3.17-closeout.md)
preserve useful material from #84–#86 and earlier B experiments.

## Verification and remaining release blockers

Exact final-commit commands, results, CI links and package receipt/checksum belong
in the release-preparation PR and #97. Do not reuse #96 or historical branch test
counts as proof for a changed release-preparation commit. Verification commands
and their scope are in [TESTING.md](docs/TESTING.md).

1. Final-commit CI, full production E2E, native tests and Windows packaging must
   pass. A successful build is not actual installation or feature acceptance.
2. The exact stable-identity candidate needs Windows install/upgrade acceptance:
   retained Fields and credentials, restart, JSON recovery, reading/Keep,
   Fork/Bring, Undo/Redo, Chinese IME and a bounded live-provider workflow. The
   generated receipt leaves installed/feature/liveModel as `not-run`.
3. Final review, separate merge approval, a rebuild from final main and separate
   publication approval remain required. No release or stable qualification is
   implied by source version numbers or Ready for Review.

Historical semantic limitations, earlier upgrade/search reports, large-bundle
warnings and untested physical-input/DPI/long-session paths remain visible; this
preparation does not claim to solve them. See the [draft release notes](docs/releases/v0.3.17.md)
and [Windows acceptance checklist](docs/WINDOWS_INSTALL.md).
