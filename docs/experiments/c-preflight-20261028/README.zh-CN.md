# C 侧非实机验收准备：Field 观点与固定阅读栏

核对时间：2026-10-28 20:35（Asia/Shanghai）。本记录固定描述下列源码与远端证据；后续提交变化时需重新核对。

## 当前结论

PR #83 的最新 Fork 修复在静态调用链上成立，关联的 8 项远端检查全部成功。正式复审、修复后真实模型对比以及同一候选的 Windows 体验仍未完成，当前不能宣布产品验收通过或冻结发布候选。

本轮 C 工作只做仓库核查、既有 CI 证据审计、采集工具防误用准备和编译交付准备。未启动应用、连接用户实例、读取个人 Field/密钥、调用真实模型、安装或执行实机验收。

## 版本与依赖

| 对象 | 精确提交 | 用途 |
| --- | --- | --- |
| #81 | `79a484483e882c0b252b46c09391f7a3cd84f027` | 下一轮模型对比基线，开启 readingTrial |
| #82 | `827fb65bc926fc1eca25827ffe9abbc944632864` | 已有交互提案；文档批准不代表产品验收 |
| #83 | `8f9d62130516201b0b6a471edb3312728cd1981f` | 本轮工程核查对象，开启 readingTrial 与 propositionTrial |
| #84 | `26943792abf7d5c25d6f4b25944e8c6cbf8d3328` | 第一轮历史模型材料，产品候选仍是旧 86b072b |

依赖为 #77 → #80 → #81 → #82 → #83；#84 保存历史证据。原型功能修复继续集中在 #83，避免 C 同时修改同一套产品行为。

[团队后续安排](https://github.com/NekoMint-Labs/Diffusion/pull/81#issuecomment-6467266432)与[最新修复说明](https://github.com/NekoMint-Labs/Diffusion/pull/83#discussion_r4400118157)分别记录复审、候选固定、同配置模型对比和 Windows 交叉体验的顺序。

## 已完成的工程核查

### Fork 修复的静态复核

- `generatedReading.ts` 只用明确的 `generatedBy: 'ai'` 判断已保留生成内容，不再根据项目 ID、来源说明或因果动作推断。
- Fork/Bring 复制既有标记，不给手写内容新增标记。
- 非原文提取 AI 候选 Keep 时保存标记，普通 Diffuse 不需要伪造 generationAction。
- JSON 验证检查标记的合法值，恢复保留合法记录。
- 已有回归覆盖真实画布手写入口 → Fork → 重载 → 编辑 → Bring → JSON 恢复，以及普通 Diffuse 有/无观点的 Keep/恢复。

本轮没有独立运行这些产品用例。浏览器中的 JSON 恢复用例不能代替原生文件选择器、安装升级或 Windows 重启验收。无标记的旧 AI 卡保守显示全文是已记录的兼容行为，不能误写为正文丢失。

依据：[显示资格](https://github.com/NekoMint-Labs/Diffusion/blob/8f9d62130516201b0b6a471edb3312728cd1981f/src/ui/thought/generatedReading.ts#L5)、[Keep](https://github.com/NekoMint-Labs/Diffusion/blob/8f9d62130516201b0b6a471edb3312728cd1981f/src/core/controller.ts#L202)、[Fork/Bring](https://github.com/NekoMint-Labs/Diffusion/blob/8f9d62130516201b0b6a471edb3312728cd1981f/src/core/world.ts#L21)、[浏览器回归](https://github.com/NekoMint-Labs/Diffusion/blob/8f9d62130516201b0b6a471edb3312728cd1981f/tests/e2e/readingFocusTrial.spec.ts#L315)。

### 远端检查及归档

| 工作流 | 结果 | 证据 |
| --- | --- | --- |
| CI | 2 项检查成功，attempt 1 | [run 40681643037](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40681643037) |
| Playwright E2E | 4 个执行任务和最终 gate 成功，attempt 1 | [run 40681643224](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40681643224) |
| Native discovery argument contracts | 1 项检查成功，attempt 1 | [run 40681643039](https://github.com/NekoMint-Labs/Diffusion/actions/runs/40681643039) |

E2E 日志合计 **504 passed、12 skipped**：三个 interaction 分片分别为 168、151、154 passed，production backgrounds 为 31 passed；第二分片记录 12 skipped。配置为 1 worker、0 retries。

运行关联的 head 是 8f9d621，实际 checkout 是 GitHub 合成合并提交 `5effb5948285f93bbc1c56602b586c2d06d6c333`。两个提交的完整 Git 树均为 `7d9240b8efff134e1baf95d5c32b511e87044aa9`，因此本次源码内容一致。

四个有效附件的 SHA-256、大小和 ZIP CRC 已核对，共 329 张 PNG；没有 HTML/JSON 结果报告，**本轮未检查到 errors 数组，不能记录为 errors == []**。两次截断下载已被排除，完整重下载才计入证据。详细摘要与附件哈希见 [evidence.json](evidence.json)。

本次补齐 E2E 工作流的 JSON reporter，沿用原有任务、断言、超时、1 worker、0 retries 和 always 上传路径。后续每个分片与背景任务应提供 `playwright-report/results.json`，核对 errors、stats、测试结果和重试；新报告不能回填为旧运行的证据。

## 下一轮真实模型采集前置条件

当前 #84 的 native-comparison.ts 会把版本写成旧基线/旧候选，固定输出目录可能覆盖历史；无参数会连接默认端口并改写测试项目。diffuse-keep-repro.tsx 也写死旧提交。旧 Angle/Diffuse 路径采用多步配置，首个可见结果后停止不能算单步单次。

因此下一轮运行必须满足：

1. 显式记录完整源码 SHA、实验开关、实际模型和深度，基线使用 #81；不从 baseline/candidate 角色推断版本。
2. 每次使用全新输出目录，历史 JSON、逐字输出和失败记录原样保留。
3. 默认只预检；执行需要明确开关。预检不能连接 CDP、改数据或请求模型。
4. 将“申报源码”“检查的 checkout”“实际运行实例”分别记录；传入 SHA 或拥有 source.json 均不能单独证明当前进程身份。
5. 在 Angle/Diffuse 真正单步入口适配前，拒绝把旧多步采集作为新轮次合格证据。
6. 保留卡片、完整原文、Keep、恢复后的显示及全部额外请求；超时、空正文和未采到卡片分别记录。

这些条件属于采集准备；真实模型质量仍需 A/B 在修复后候选上给出结果。

## 安装包准备与放行条件

截至本次远端快照，8f9d621 只有上述三个工作流，没有对应 Windows Package 运行。旧 #80 安装包不能作为 #83 功能验收包。

针对本提交的本地编译包应作为**待复审工程包**交付，附以下材料：

- 完整源码 SHA、跟踪源码哈希清单、构建前后源码一致性；
- 保留 Preview 的应用/凭据标识 `app.diffusion.explorer.preview`；
- Field 启动配置与 `readingTrial=1&propositionTrial=1` 原文，完整构建日志；
- 安装器 SHA-256、签名状态、资源清单和构建工具版本；
- 明确“未安装、未启动、未实机验收”，构建失败时保留错误并停止交付可安装结论。

源码固定、正式复审和工程构建是不同状态。C 可先编译准备，最终候选需在复审后重新核对完整提交与构建配置。

## 留给实机验收的记录表

以下均为 **NOT RUN**。执行前先填实际安装器哈希、源码 SHA、开关、Windows 版本、缩放比例和输入设备；不能用当前日常安装推定版本。

| 编号 | 操作 | 预期与应记录内容 |
| --- | --- | --- |
| W01 | 打开 Field、选卡、显式 Read | 选择不自动展开；观点和完整原文对应 |
| W02 | 阅读时拖卡、平移、缩放后松手 | 阅读区让位；相机不跳回；松手不重开 |
| W03 | 中文组合输入中按 Enter/Escape | 不误提交、不误关闭；普通键盘路径正常 |
| W04 | 普通 Diffuse → Keep → 重启/导出恢复 | 全文保留；合法观点可读；没有观点时回退可读 |
| W05 | 手写长文 → Fork → 编辑 → Bring → 重启 | 保留用户措辞，不出现 AI 提炼资格 |
| W06 | 编辑/结晶、Undo/Redo | 旧观点按合同失效/恢复，全文始终一致 |
| W07 | 小窗口、常用缩放、深浅主题 | 阅读入口和关闭入口可达；记录右侧卡片被裁切的实际影响 |
| W08 | 原生导出/导入、关闭重开 | 对话框可用，正式内容恢复；临时 Ghost 不误变为承诺 |
| W09 | 一个真实问题的完整使用过程 | 记录 AI 有用/无用之处、忽略/保留的原因及最终判断 |

每个问题记录：版本、步骤、预期、实际、是否稳定复现。验收材料不包含密钥或私人项目导出。

## 责任与下一步

- A/B：完成最新修复复审，明确候选与内容合同；补同配置真实模型对比。
- C：核对来源、检查与构建对应关系，准备验收包和可追溯记录；报告未覆盖项。
- 操作者：在已确认候选上完成上述物理输入和真实体验。
- 合并/发布：依赖顺序、review 与实机证据满足后另行处理；本次没有合并或发布稳定版。
