# Diffusion

**让想法在成为结论之前，有一个可以停留、探索和继续生长的地方。**

[English](README.md) · [使用指南](docs/USER_GUIDE.zh-CN.md) · [下载](https://github.com/NekoMint-Labs/Diffusion/releases) · [文档导航](docs/README.md) · [参与贡献](CONTRIBUTING.md)

[![CI](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml/badge.svg)](https://github.com/NekoMint-Labs/Diffusion/actions/workflows/ci.yml) [![License: Apache-2.0](https://img.shields.io/github/license/NekoMint-Labs/Diffusion)](LICENSE)

Diffusion 是一个开源、**本地优先的桌面思考工作台**。你可以在空间化的 **Field（思绪场）** 中写下还不成熟的想法，逐渐整理它们之间的关系，并自己决定什么值得保留、什么已经可以形成结论。AI 可以参与探索，但不能替你擅自整理、改写或确定答案。

它**不是**以聊天为中心的 AI 助手，也不是一键生成思维导图或管理待办事项的软件。这里首先容纳的是你的思考，而不是要求你先写出一条完美的提示词。

## 一段真实的使用过程

假设你现在只有一个模糊的问题：*「我想学的东西很多，却不知道先做什么。」*

1. **先记下来。** 输入一句话，它会成为 Field 中的一个 **Thought（思绪）**。你可以把它拖到自己觉得合适的位置。
2. **补充约束。** 再写一个 Thought：*「每周真正能投入的时间很有限。」* 选中一个或两个 Thought，决定本次想关注什么。
3. **尝试探索。** 使用「继续思考」「换个角度」「提问」或「寻找关联」。配置了 AI 后，Diffusion 可能给出暂时性的 **Ghost（建议）**，但它们不会自动变成你的想法。
4. **自己决定。** 看完建议后，选择「留下」或「忽略」。觉得两个想法确实有关，再主动确认它们的关系。
5. **之后再回来。** 继续已有思路（Thread），或者在判断逐渐明确时，亲自确认形成一个 **Crystal（结晶）**。

这就是 Diffusion 最重要的过程：**写下想法 → 选定范围 → 探索可能性 → 由你判断。**

## Diffusion 可以做什么

| 场景 | 具体能力 |
| --- | --- |
| 捕捉和整理想法 | 写入、编辑、拖动、选择和摆放 Thought，通过缩放查看局部与全局。 |
| 围绕几个想法继续探索 | 选择一个或多个 Thought，继续思考、自己提问、打开 Thread 或进入更深入的讨论。 |
| 审阅 AI 建议 | Ghost 在你主动「留下」前只是临时提议，「忽略」也完全可以。 |
| 发现关联 | 尝试分析两个 Thought 的联系；持久关系必须由你确认。 |
| 形成阶段性结论 | 通过明确的编辑与确认形成 Crystal；它代表你的判断，不是 AI 保证的事实。 |
| 引入外部资料 | 添加 Source（来源），或者明确发起联网证据检索；搜索摘要不能直接算作已核验的证据。 |
| 保存与迁移 | 管理多个本地 Field、撤销/重做、导出 JSON 备份或可阅读的 Markdown。 |

**不配置 AI、不购买搜索服务，也能正常进行手动思考。** 首次使用教程中的建议演示是确定性的模拟结果，并不会调用真实模型。

## 五分钟快速上手

1. **下载安装：** 打开 [GitHub Releases](https://github.com/NekoMint-Labs/Diffusion/releases)，选择对应的 **Windows x64** 预览版资源。先确认发布说明和 **Pre-release** 标记，目前尚未正式公布稳定安装包。
2. **进入 Field：** 新建一个 **Field**，也可以直接使用启动时的空白 Field。首次教程可以跟随操作，也可以跳过。
3. **写入思绪：** 在底部输入区输入内容，或双击 Field 的空白位置创建 Thought。拖动 Thought 可改变位置，拖动空白区域可平移视野。
4. **选择范围：** 单击选中 Thought，按住 **Shift 再单击** 可多选。仅仅选中不会自动调用 AI；随后可打开上下文操作继续思考或分析联系。
5. **决定是否保留：** Ghost 出现后，先阅读内容，再选择「留下」或「忽略」。原有 Thought 不会被 AI 偷偷覆盖。

更多操作步骤、完整功能说明、AI/搜索配置、数据备份和故障排查，见 **[中文使用指南](docs/USER_GUIDE.zh-CN.md)**。

## AI 与联网检索是两件独立的事

在 **设置 → AI** 中，可以选择 **Off（仅手动）**、**Demo（确定性演示，不是真实模型）**、OpenAI、Anthropic、Google Gemini、DeepSeek、OpenAI 兼容接口或 Diffusion Gateway。使用真实模型时，按所选服务商填写密钥及模型，再主动点击「测试连接」。测试会发送真实请求，可能产生费用；填了模型名称不意味着已经连接成功。

联网能力在单独的 **设置 → Search & Evidence（搜索与证据）** 中管理。桌面发现引擎支持配置 Exa、Tavily、Brave 等来源，实际使用取决于密钥、网络和当前安装包。搜索候选、真正读取的原文片段、模型判断是不同层级的信息，不能直接混为一谈。Tavily 的免密钥实验模式目前也不等同于可靠可用的正式搜索能力。

[查看 AI 配置步骤](docs/USER_GUIDE.zh-CN.md#五配置-ai可选) · [查看资料与证据流程](docs/USER_GUIDE.zh-CN.md#六资料搜索与证据)

## 下载、存储与预览版提醒

- **当前官方提供的下载：** [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) 中的 Windows x64 预览版。开源代码可用，不代表 macOS/Linux 安装包已完成官方验收。
- **本地优先不等于云同步：** Field 保存在本设备，跨设备使用需要自己导出和恢复。
- **升级前务必备份：** 将 Field **导出为 JSON**，并另外保存重要的原始资料。JSON 不包含尚未留下的 Ghost，也不包含导入文件的原始字节；Markdown 是阅读导出，**不能当成恢复备份**。
- **已知升级风险：** 旧版本 Field 在升级后不可见的反馈尚未查清。建议先用非重要数据体验预览版，详见 [桌面说明](docs/DESKTOP.md) 和 [迁移说明](docs/MIGRATIONS.md)。
- **验收边界：** CI 和浏览器测试通过，不等于所有 Windows 真机、真实模型、旧版升级和长时间使用场景都已验证。

## 从源码运行 Web 开发环境

需要 **Node.js 22.12+** 与 **pnpm 12.4.2**。在仓库根目录执行：

~~~sh
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
~~~

这会启动 **Web 开发环境**，不会产生 Windows 安装包。Tauri 桌面端开发还需要 Rust 和对应平台依赖；打包时也需要内置发现引擎的构建资源。

[贡献与本地开发](CONTRIBUTING.md) · [桌面构建](docs/DESKTOP.md) · [测试说明](docs/TESTING.md)

## 文档导航

| 我想了解 | 应该阅读 |
| --- | --- |
| 每个功能的实际操作方法 | [中文使用指南](docs/USER_GUIDE.zh-CN.md) |
| 所有文档从哪里找 | [文档索引](docs/README.md) |
| 产品定位、行为和权限边界 | [产品架构](docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) |
| 模型接口、安全与兼容性 | [Provider 契约](docs/PROVIDER_CONTRACT.md) |
| 搜索结果为什么不等于证据 | [Evidence 说明](docs/EVIDENCE_GATEWAY.md) |
| 如何参与开发、测试和验收 | [贡献指南](CONTRIBUTING.md) · [架构文档](docs/ARCHITECTURE.md) · [测试文档](docs/TESTING.md) |
| 当前已验证和未验证的部分 | [状态记录](STATUS.md) · [验收映射](docs/ACCEPTANCE_MAP.md) |

## 项目与正式发版状态

截至本次文档修订（2026 年 10 月 14 日），`main` 的整合基线为 `bd9cc766`，相应 CI/E2E 已通过。源码版本字段仍是 `0.3.0`，而 `0.3.16` 是 Windows **预览包标记**，并不代表稳定版 `v0.3.16` 已发布。正式版仍需统一版本号、构建产物并完成独立发布验收。实际可下载内容以 [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) 为准。

欢迎提交可复现的问题和改进建议，参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。Diffusion 自有代码使用 [Apache-2.0](LICENSE)，第三方依赖与素材遵循各自许可，详见 [来源与致谢](docs/ATTRIBUTION.md)。
