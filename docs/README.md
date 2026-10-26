# Diffusion Documentation / 文档导航

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [English User Guide](USER_GUIDE.md) · [中文使用指南](USER_GUIDE.zh-CN.md) · [Downloads / 下载](https://github.com/NekoMint-Labs/Diffusion/releases)

**New to Diffusion?** Start with the README and follow the hands-on user guide. Product use, engineering contracts, verification evidence, and historical records are intentionally separated.

**第一次使用？** 先阅读中文 README，再按中文使用指南进行实际操作。用户教程、开发契约、验收记录和历史方案分开整理，避免误把旧文档当成当前操作说明。

## 1. Use the application / 使用软件

| I want to… / 我想了解 | English | 简体中文 |
| --- | --- | --- |
| Understand the product / 了解产品定位 | [README](../README.md) | [README](../README.zh-CN.md) |
| Learn controls and a complete workflow / 操作入门与完整示例 | [User Guide](USER_GUIDE.md) | [使用指南](USER_GUIDE.zh-CN.md) |
| Install the current build / 下载当前版本 | [GitHub Releases](https://github.com/NekoMint-Labs/Diffusion/releases) | [下载页](https://github.com/NekoMint-Labs/Diffusion/releases) |
| Configure AI and understand credentials / 配置模型与安全 | [User guide: AI](USER_GUIDE.md#5-using-ai-optional) | [中文指南：AI](USER_GUIDE.zh-CN.md#五配置-ai可选) |
| Import sources or search for evidence / 资料、搜索、证据 | [User guide: Evidence](USER_GUIDE.md#6-references-search-and-evidence) | [中文指南：证据](USER_GUIDE.zh-CN.md#六资料搜索与证据) |
| Export, restore, and upgrade safely / 导出、恢复、升级 | [User guide: Backup](USER_GUIDE.md#7-back-up-export-and-restore) | [中文指南：备份](USER_GUIDE.zh-CN.md#七导出备份恢复与升级) |
| Troubleshoot / 常见问题 | [FAQ](USER_GUIDE.md#9-troubleshooting) | [常见问题](USER_GUIDE.zh-CN.md#九常见问题) |

The user guides explain **what to click and why**. Technical documents below explain boundaries and implementation and are not required to use the app.

## 2. Current product and engineering references / 当前规范

| Topic | Source |
| --- | --- |
| Product authority, Field / Thought / Ghost / Crystal | [Product architecture and boundaries](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) |
| Architecture and component ownership | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Development workflow | [CONTRIBUTING.md](../CONTRIBUTING.md) · [CONVENTIONS.md](CONVENTIONS.md) |
| Stack and implementation rules | [Tech stack](specs/02_TECH_STACK_AND_IMPLEMENTATION.md) |
| Desktop runtime, packaging, native boundary | [DESKTOP.md](DESKTOP.md) |
| Local data and migrations | [MIGRATIONS.md](MIGRATIONS.md) |
| Provider modes, model transport, secrets | [PROVIDER_CONTRACT.md](PROVIDER_CONTRACT.md) |
| Search, candidate vs passage vs assessment | [EVIDENCE_GATEWAY.md](EVIDENCE_GATEWAY.md) |
| Languages and interface wording | [LANGUAGE_CONTRACT.md](LANGUAGE_CONTRACT.md) |
| Performance and test contracts | [PERFORMANCE.md](PERFORMANCE.md) · [Performance spec](specs/04_PERFORMANCE_CONTRACT.md) |
| Design reference | [Visual redesign specification](specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md) |
| Third-party notices | [ATTRIBUTION.md](ATTRIBUTION.md) · [Materials](third_party/MATERIAL_GALLERY.md) |

## 3. Testing, evidence and release status / 验收与发布

- [TESTING.md](TESTING.md) — verification commands and what each test layer can establish.
- [VERIFICATION.md](VERIFICATION.md) — how to distinguish portable evidence from local screenshots, logs, and artifacts.
- [STATUS.md](../STATUS.md) — current source baseline and verification limits; [ACCEPTANCE_MAP.md](ACCEPTANCE_MAP.md) — which verification layers each contract requires.
- [GitHub Actions](https://github.com/NekoMint-Labs/Diffusion/actions) — CI results for each **specific commit**.
- [GitHub Releases](https://github.com/NekoMint-Labs/Diffusion/releases) — the source of truth for **published installers and release labels**. [v0.3.16 stable](https://github.com/NekoMint-Labs/Diffusion/releases/tag/v0.3.16) was published October 16, 2026; this records its release label, not new installer verification by this documentation pass.

A passing browser E2E test is not proof of physical Windows acceptance, live-model availability, or safe migration from every old version. Do not turn dated success reports into a blanket claim.

## 4. Historical and exploratory records / 历史材料

- [History index](history/README.md) preserves previous project phases.
- [C desktop writing and tutorial polish](C_DESKTOP_POLISH_2026_10_25.md) records the October 25 review scope and pending interaction/native acceptance.
- Dated `ISSUE*`, `ROUND2_*`, `DESKTOP_REVIEW_*` and exploratory proposals are background evidence, **not** current end-user instructions.
- Current source and explicit active contracts take precedence when an old report conflicts with today's behavior. Investigate discrepancies rather than silently guessing.

**Writing new docs:** Put ordinary instructions in the bilingual user guides; put durable semantics in active contracts; put temporary test findings in dated records. Keep English and Chinese entry points in sync without translating internal historical reports by default.
