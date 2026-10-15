# Diffusion

**A quiet space to think before ideas become decisions.**

[简体中文](README.zh-CN.md) · [User guide](docs/USER_GUIDE.md) · [Downloads](https://github.com/NekoMint-Labs/Diffusion/releases) · [Documentation](docs/README.md) · [Contributing](CONTRIBUTING.md)

[![CI](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml/badge.svg)](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml) [![License: Apache-2.0](https://img.shields.io/github/license/NekoMint-Labs/Diffusion)](LICENSE)

Diffusion is an open-source, **local-first desktop thinking workspace**. Put unfinished ideas into a spatial **Field**, explore them at your own pace, and decide what deserves to stay. AI can offer possibilities, but it does not silently organize your work or turn suggestions into conclusions.

It is **not** a chat-first assistant, an automatic mind-map generator, or a task manager. The starting point is your thought—not a prompt asking an AI to do everything.

## From a thought to a direction

Imagine starting with: *"I want to learn more, but I can't decide what to focus on."*

1. **Write it down.** A Thought appears in your Field. Move it somewhere that makes sense to you.
2. **Add what's missing.** Place another Thought: *"I only have a few hours each week."* Select either or both to define a temporary scope.
3. **Explore.** Use Continue thinking, Another angle, Ask, or Find a relation. With AI configured, the app may return provisional **Ghosts**, not new facts or commitments.
4. **Decide.** Keep a useful Ghost, Ignore the rest, and confirm a relation only if it reflects your judgment.
5. **Return later.** Revisit the Field, continue a Thread, or explicitly form a **Crystal** when a direction feels stable enough to act on.

This is the core loop: **your words → a chosen scope → possibilities → your decision**.

## What you can do

| Work with your ideas | What Diffusion provides |
| --- | --- |
| Capture and arrange | Write, edit, move, select, and spatially organize Thoughts. Zoom between local detail and the larger Field. |
| Think with context | Select one or several Thoughts before continuing, asking a question, opening a Thread, or going deeper. |
| Review, don't auto-accept | Ghost suggestions stay provisional until you explicitly Keep them. Ignoring them is a valid outcome. |
| Notice relationships | Explore a possible relation between two Thoughts; a lasting relation requires your confirmation. |
| Make a commitment | Create or edit a Crystal through an explicit confirmation step. A Crystal is *your* conclusion, not an AI-certified truth. |
| Bring in references | Add Sources or deliberately look for outside evidence. A search snippet is not proof that a source was read. |
| Keep your work portable | Manage several local Fields, use undo/redo, and export JSON archives or readable Markdown. |

You can use the manual Field **without an account, AI provider, or search API key**. The first-Field tutorial uses a deterministic demonstration, not a live model.

## Get started in five minutes

1. **Download:** open [GitHub Releases](https://github.com/NekoMint-Labs/Diffusion/releases) and choose the appropriate **Windows x64** preview asset. Check the release notes and the **Pre-release** label; there is no officially announced stable installer yet.
2. **Open Diffusion:** create a **New Field**, or continue in the empty Field shown at startup. Follow the optional first-Field tutorial.
3. **Write:** use the writing area or double-click empty Field space to create a Thought. Drag the Thought to move it; drag empty space to pan.
4. **Choose a scope:** click one Thought, or **Shift-click** additional Thoughts. A selection by itself does not call AI. Open the contextual actions to continue or examine a connection.
5. **Keep what matters:** when a Ghost appears, inspect it and choose **Keep** or **Ignore**. Your original Thoughts remain yours.

For precise instructions, see the **[complete user guide](docs/USER_GUIDE.md)**, including controls, practical workflows, Field management, AI setup, search, backup, and troubleshooting.

## AI and external evidence are optional

Open **Settings → AI** to choose **Off**, **Demo** (deterministic fixture), OpenAI, Anthropic, Google Gemini, DeepSeek, an OpenAI-compatible endpoint, or a Diffusion Gateway. For a direct provider, supply its key and model and deliberately run **Test connection**. A real test can make a billable provider request; setting a model name alone does not verify the connection.

External discovery is a **separate** choice under **Settings → Search & Evidence**. It supports configurable Exa, Tavily, and Brave sources in the desktop discovery path, subject to credentials, reachability, and the actual build. Search candidates, read passages, and AI assessments have different trust levels; nothing is silently promoted into verified evidence. An experimental Tavily keyless option exists, but its usefulness on an installed Windows build is not established.

[Read the setup walkthrough](docs/USER_GUIDE.md#using-ai-optional) · [Evidence and sources](docs/USER_GUIDE.md#references-search-and-evidence)

## Downloads, storage, and preview cautions

- **Official downloads currently advertised:** Windows x64 previews via [Releases](https://github.com/NekoMint-Labs/Diffusion/releases). Source availability does not mean a macOS/Linux installer has been qualified.
- **Local-first, not cloud sync:** Fields are kept on this device. Moving to another installation requires an explicit export/restore workflow.
- **Back up before upgrading:** export the Field as **JSON** and retain any original source files separately. The export does **not** include unclaimed Ghosts or original file bytes. Markdown is for reading, **not** a restorable project backup.
- **Upgrade limitation:** a report of an older Field not appearing after an update remains unresolved. Try previews with nonessential data first; see [desktop notes](docs/DESKTOP.md) and [migrations](docs/MIGRATIONS.md).
- **Verification limitation:** successful CI and browser tests do not prove all real Windows devices, live providers, migrations, or long-running sessions are accepted.

## Run the web development build

Prerequisites: **Node.js 22.12+** and **pnpm 12.4.2**. From the repository root:

~~~sh
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
~~~

This starts the **web development environment**, not a packaged desktop installer. Native Tauri development additionally needs Rust and the platform's Tauri prerequisites; desktop packaging also needs the bundled discovery build resources.

[Developer setup and contribution workflow](CONTRIBUTING.md) · [Native desktop instructions](docs/DESKTOP.md) · [Testing](docs/TESTING.md)

## Documentation

| I want to… | Read |
| --- | --- |
| Learn the interface and everyday actions | [User guide](docs/USER_GUIDE.md) |
| See every available document | [Documentation index](docs/README.md) |
| Understand the product's authority boundaries | [Product architecture](docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) |
| Configure models or understand provider security | [Provider contract](docs/PROVIDER_CONTRACT.md) |
| Understand search results and evidence | [Evidence gateway](docs/EVIDENCE_GATEWAY.md) |
| Develop, test, or verify a change | [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Testing](docs/TESTING.md) |
| Inspect known acceptance gaps | [Status](STATUS.md) · [Acceptance map](docs/ACCEPTANCE_MAP.md) |

## Release and project status

As of this documentation update (October 14, 2026), the integrated baseline on `main` was `bd9cc766` and its CI/E2E gates passed. Source manifests still say `0.3.0`, while `0.3.16` is a **Windows preview label**, not an officially published stable `v0.3.16`. A stable release requires coordinated versioning, a matching build, and independent release checks. Always use the [actual Releases page](https://github.com/NekoMint-Labs/Diffusion/releases) for current artifacts.

Contributions and reproducible bug reports are welcome: [CONTRIBUTING.md](CONTRIBUTING.md). Diffusion-owned code is licensed under [Apache-2.0](LICENSE); third-party assets and code retain their own terms ([attribution](docs/ATTRIBUTION.md)).
