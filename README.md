# Diffusion

**A quiet space to think, before ideas become decisions.**

[**简体中文**](README.zh-CN.md) · [Downloads](https://github.com/NekoMint-Labs/Diffusion/releases) · [Documentation](docs/README.md) · [Contributing](CONTRIBUTING.md)

[![CI](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml/badge.svg)](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml) ![License](https://img.shields.io/github/license/NekoMint-Labs/Diffusion)

Diffusion is an open-source, local-first desktop workspace for exploring ideas. Write and arrange **Thoughts** on a spatial **Field**, select what you want to consider, explore optional AI suggestions, and decide for yourself what becomes part of your work.

It is not a chat-first application or an automatically arranged mind map. **Your thinking is primary; AI offers possibilities rather than making commitments.**

## What you can do

- **Think spatially.** Create, edit, move, group, and connect Thoughts without forcing a rigid structure.
- **Choose the scope.** Selecting one or several Thoughts determines what a thinking action focuses on.
- **Review AI possibilities.** Ghosts are temporary proposals until you explicitly Keep them; you can also Ignore them.
- **Explore connections.** Relations, Thread, and Deep Dive help examine a question from different angles.
- **Form a judgment.** A Crystal marks a more stable conclusion that you chose to form.
- **Keep control.** The Field holds the canonical work state locally. AI providers and discovery services are optional.

## Download

**Windows x64:** [Get Diffusion from GitHub Releases](https://github.com/NekoMint-Labs/Diffusion/releases).

Check the release label and notes: **Pre-release** builds are previews, not stable releases. Other platform installers are not currently advertised as official downloads.

After installing, create a Field and add your first Thought. You can explore the Field without an AI API key. To use AI or online evidence, configure a compatible provider and its required credentials and permissions in Settings.

**Before upgrading:** Back up important local data. An earlier report of an older Field becoming invisible after upgrading has not been conclusively explained. The current preview is best tried with expendable data first. See [Desktop](docs/DESKTOP.md) and [Migrations](docs/MIGRATIONS.md).

## Build from source

Requirements: **Node.js 22.12+** and **pnpm 12.4.2**.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

These commands start the local web development environment. Native desktop builds also need Rust/Tauri prerequisites and the build-time tooling for the bundled discovery engine; installed users do not need Python. See [Contributing](CONTRIBUTING.md) and [Desktop](docs/DESKTOP.md).

## Documentation

| Topic | Reference |
| --- | --- |
| Product concepts and interactions | [Product architecture and boundaries](docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) |
| Desktop and data | [Desktop](docs/DESKTOP.md) · [Migrations](docs/MIGRATIONS.md) |
| AI and discovery | [Provider contract](docs/PROVIDER_CONTRACT.md) · [Evidence gateway](docs/EVIDENCE_GATEWAY.md) |
| Development | [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Testing](docs/TESTING.md) |
| Verification and limitations | [Status](STATUS.md) · [Acceptance map](docs/ACCEPTANCE_MAP.md) |
| All documentation | [Documentation index](docs/README.md) |

## Project and release status

The current integrated development baseline is `bd9cc766` (October 14, 2026); its CI and E2E checks passed. The maintainer accepted the current iteration and closed the related issues. That decision should not be confused with exhaustive physical Windows, live-model, upgrade, or long-session verification.

**Versioning:** The source manifests still report `0.3.0` while the latest Windows preview is labeled `0.3.16`. A stable `v0.3.16` needs a coordinated version update, matching new build, and release verification. Consult [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) for the actual published artifacts.

## Contributing and license

Contributions and reproducible bug reports are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the code.

Diffusion-owned code is distributed under [Apache-2.0](LICENSE). Third-party materials retain their respective notices and licenses; see [Attribution](docs/ATTRIBUTION.md).
