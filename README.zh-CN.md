# Diffusion

**让想法在成为结论之前，自由地生长。**

[**English**](README.md) · [下载](https://github.com/NekoMint-Labs/Diffusion/releases) · [文档](docs/README.md) · [参与贡献](CONTRIBUTING.md)

[![CI](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml/badge.svg)](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml) ![License](https://img.shields.io/github/license/NekoMint-Labs/Diffusion)

Diffusion 是一个开源、本地优先的桌面思考空间。你可以在 **Field** 中记录、摆放和组织自己的 **Thought**，选中需要思考的问题，查看 AI 提供的可能性，再由自己决定哪些内容值得保留、哪些联系值得建立。

它不是以聊天为中心的应用，也不是自动排版的思维导图。**你的思考是主体，AI 只提供可能性，不替你作出承诺和判断。**

## 能做什么

- **在空间中思考。** 自由创建、编辑、移动、组织和连接 Thought，不必一开始就确定结构。
- **用选择界定范围。** 选中一个或多个 Thought，决定下一次思考关注什么。
- **审阅 AI 建议。** Ghost 是临时提议，只有你主动 Keep 后才成为正式内容；也可以 Ignore。
- **探索想法间的联系。** 利用关系、Thread 和 Deep Dive 从不同角度继续思考。
- **形成自己的判断。** Crystal 可以承载你逐渐确认、更稳定的结论。
- **保有控制权。** Field 是本地工作状态的核心。AI 模型和联网发现服务都是可选能力。

## 下载安装

**Windows x64：** [前往 GitHub Releases 下载](https://github.com/NekoMint-Labs/Diffusion/releases)。

请注意发布页的标记：**Pre-release** 是预览版，不等于稳定版。目前不要默认其他操作系统已有官方安装包。

安装后新建 Field，创建你的第一个 Thought。手动使用 Field 不需要 AI API Key；如需使用 AI 或联网证据，请在设置中配置兼容的服务商、凭据和必要授权。

**升级提醒：** 建议先备份重要的本地数据。此前曾有旧版本 Field 升级后不可见的反馈，原因尚未得到确认。预览版本宜先用可丢弃数据体验。参阅 [桌面说明](docs/DESKTOP.md) 和 [数据迁移](docs/MIGRATIONS.md)。

## 从源码运行

需要 **Node.js 22.12+** 和 **pnpm 12.4.2**。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

以上命令启动本地 Web 开发环境。原生桌面构建还需要 Rust/Tauri 平台依赖，以及构建内置发现引擎所需的工具；安装包用户不需要自行安装 Python。详见 [贡献指南](CONTRIBUTING.md) 和 [桌面文档](docs/DESKTOP.md)。

## 文档导航

| 想了解 | 文档 |
| --- | --- |
| 产品概念与交互 | [产品架构与边界](docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) |
| 桌面端与本地数据 | [Desktop](docs/DESKTOP.md) · [Migrations](docs/MIGRATIONS.md) |
| AI 与搜索证据 | [Provider](docs/PROVIDER_CONTRACT.md) · [Evidence](docs/EVIDENCE_GATEWAY.md) |
| 开发与测试 | [贡献指南](CONTRIBUTING.md) · [架构](docs/ARCHITECTURE.md) · [测试](docs/TESTING.md) |
| 验收和已知限制 | [状态记录](STATUS.md) · [验收映射](docs/ACCEPTANCE_MAP.md) |
| 更多内容 | [完整文档索引](docs/README.md) |

## 项目和发版状态

截至 2026 年 10 月 14 日，主要开发工作已整合至 `bd9cc766`，该版本的 CI / E2E 检查通过。项目负责人已经接受这一轮体验并关闭相关 Issue，但这不意味着 Windows 物理环境、真实模型、旧版升级和长时间运行的每个场景都经过完整测试。

**版本说明：** 目前源码的版本字段仍是 `0.3.0`，最新 Windows 预览包标记为 `0.3.16`。正式 `v0.3.16` 还需要统一版本、重新构建和验证，不能直接将预览版改成稳定版。请以 [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) 的实际发布为准。

## 贡献与许可

欢迎提交可复现的问题与改进建议。参与开发请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

Diffusion 自有源码使用 [Apache-2.0](LICENSE) 许可证。第三方素材和依赖保留各自的许可与声明，详见 [来源与致谢](docs/ATTRIBUTION.md)。
