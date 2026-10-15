# Diffusion Documentation

[English README](../README.md) · [简体中文 README](../README.zh-CN.md) · [Downloads](https://github.com/NekoMint-Labs/Diffusion/releases) · [Contributing](../CONTRIBUTING.md)

This index separates product usage, active engineering contracts, verification, and historical material. Start with the root README unless you need to work on a specific subsystem.

## Use Diffusion

| Topic | Document |
| --- | --- |
| Product introduction and getting started | [English](../README.md) · [简体中文](../README.zh-CN.md) |
| Windows desktop and build | [DESKTOP.md](DESKTOP.md) |
| Provider setup and permissions | [PROVIDER_CONTRACT.md](PROVIDER_CONTRACT.md) |
| Search and evidence | [EVIDENCE_GATEWAY.md](EVIDENCE_GATEWAY.md) |
| Data migration | [MIGRATIONS.md](MIGRATIONS.md) |
| Actual published installers | [GitHub Releases](https://github.com/NekoMint-Labs/Diffusion/releases) |

## Current product and engineering references

| Topic | Document |
| --- | --- |
| Field, Thought, Ghost, Crystal and authority | [Product contract](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) |
| Code ownership and architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Stack and implementation boundary | [Tech stack](specs/02_TECH_STACK_AND_IMPLEMENTATION.md) |
| Development conventions | [CONVENTIONS.md](CONVENTIONS.md) |
| Performance contract | [Performance spec](specs/04_PERFORMANCE_CONTRACT.md) |
| Localization | [LANGUAGE_CONTRACT.md](LANGUAGE_CONTRACT.md) |
| Visual / interaction design | [Design specification](specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md) |
| Tests and release evidence | [TESTING.md](TESTING.md) · [VERIFICATION.md](VERIFICATION.md) |
| Attribution and third parties | [ATTRIBUTION.md](ATTRIBUTION.md) · [Materials](third_party/MATERIAL_GALLERY.md) |

## Status and historical evidence

- [STATUS.md](../STATUS.md) and [ACCEPTANCE_MAP.md](ACCEPTANCE_MAP.md) contain detailed version-specific integration and verification records. Older dated statements are historical, even if still present in those files.
- [History](history/README.md) preserves earlier phases and provenance, not active implementation authority.
- Dated `ISSUE*`, `ROUND2_*`, `DESKTOP_REVIEW_*`, and exploratory proposals are supporting records, **not** the public getting-started guide and not automatically current behavior.
- [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) is authoritative for what has actually shipped. The latest available Windows installer is a 0.3.16 **preview** until a verified stable release is published.

**Authority:** follow current code and explicit current product/architecture contracts. If implementation and documentation conflict, investigate the discrepancy instead of treating a superseded dated report as authoritative.
