# PR #83：手写卡片 Fork 误判修复与验收边界

日期：2026-10-28。修复前：`d1eb2e74961164923047defbbc948508cba0a35c`。对应复审：[手写内容的 Fork 来源误判](https://github.com/NekoMint-Labs/Diffusion/pull/83#discussion_r4399667874)。本次继续更新 #83，不另开同功能 PR，不自行解决审核者的讨论。

## 用户反馈与当前结论

用户截图可见两条不同切入：教材交叉引用与从已有错题回查前置概念。后者确实改变了观察线索，且列出“卡点来自前置概念而非表述／粗心”“手头有做过的题”等假设；右下候选再次回到教材引用，存在重复方向。截图中多次操作的内容并存，不能根据数量推断本次单步结果，也不能评价未展开全文。可记录为局部有用的真实使用观察，不能作为四动作稳定改进或正式产品验收。

## 根因与修复

`forkProject` 为包括手写内容在内的所有卡片写入 `origin.projectId/thoughtId/note`，Bring 同样更新流转来源。上一修复把项目 ID 和说明当作 AI 生成身份，导致真实画布双击创建的长手写卡片进入 Fork 后被预览化并允许模型提炼。该缺陷成立，不能通过匹配英文 note 修补。

- 用户显式 Keep 非原文提取 AI 候选时，Controller 保存可选 `Thought.generatedBy: 'ai'`；它是生成来源记录，不是因果动作或事实认证。临时 Ghost 仍使用已有 `proposalKind`，用户输入／原文提取／来源按原边界排除。
- 卡片和手动提炼共用 `generatedReading`，持久化 Thought 仅接受明确生成标记。`generationAction` 不再独立作为模型身份，因为 `continuedThought` 的结晶后手写入口也会设置它。
- Fork／Bring 只复制明确标记，不从项目来源说明或因果动作新建身份；没有修改 Fork／Bring 的文字、坐标或流转语义。
- 新值由 Core 命令和完整项目验证器检查；无效值报错，不放宽已有全文、来源或权限验证。Undo/Redo、JSON、Dexie 沿原快照保存字段。
- 不新增数据库表／索引，不改项目 envelope／schemaVersion，不遍历重写旧数据，不调用模型回填。旧版无标记生成内容保守显示原文，已存观点记录仍保留；不保证旧客户端重写时保留新字段。详见 [迁移说明](../MIGRATIONS.md)。这是避免误改手写内容的明确兼容代价。

## 验证及原始失败

1. 新单元回归在旧 helper 上失败：真实 create/edit → `forkProject` 后 `generatedReading` 从 false 变 true。原日志 `D:/DiffusionWork/fork-reading-before.log` 保留。
2. 新浏览器回归在旧生产构建上失败：实际双击写长文并进入 Fork 后，全文预览不再匹配，页面出现“正文预览”。原日志 `fork-browser-before.log` 和 ignored 结果 `fork-before/` 保留。
3. 修复后第一次浏览器运行原27项通过，新增项通过 Fork／刷新／全文阅读，后在 Bring 复选框定位失败。页面实际可访问名称重复了标签；测试改为按该标签前缀定位，没有改产品、增超时、重试或跳过。后续完整28项通过。
4. 进一步去掉因果动作的身份推断，增加结晶后手写续接排除、明确标记无 provider note 的 Continue、无父项 Keep、Undo/Redo、非法 marker、Fork／Bring／JSON 的正负用例。
5. 最终 `pnpm run build` PASS（应用类型＋生产构建），已有大 chunk 提醒保留。
6. 最终 `pnpm exec vitest run --maxWorkers=2`：82 文件、769 项 PASS（27.01秒）。
7. 最终 `pnpm run check:offline` PASS，包含 Core 类型、locale、离线契约及源码体积检查。
8. 最终生产 bundle 的28项阅读／预览／撤销浏览器回归全部通过（58.8秒），零重试，结果保存在 `D:/DiffusionWork/fork-reading-browser-acceptance.log`。用新 browser context 和注入 fixture，不读取用户浏览器资料／凭据，不进行真实模型调用。覆盖有／无观点的普通 Diffuse→Keep→JSON恢复／手动提炼，以及真实画布手写→Fork→刷新→修改→Bring→JSON恢复，全程手写原文直显、无提炼按钮。

日志 `D:/DiffusionWork/fork-reading-{build,unit,offline}-final.log`，浏览器产物位于 ignored 的 `experiments/role-b-focus/results/fork-acceptance/`。不增加自动重试或放宽验证。

## 复审与后续协作

本次可交付的是工程边界修复和可复核回归，不是默认产品采用。先将修复提交到 #83，交原审核者定向复审；待同一候选被确认后冻结完整 SHA。

随后依队员在 #81 的同步，使用 #81 `79a484483e882c0b252b46c09391f7a3cd84f027`＋`readingTrial=1` 与冻结 #83＋两个开关进行同配置公开场景对照。#84 是旧 #80／旧 #83 的第一轮证据，不能覆盖本修复。复用其脚本前需解除旧 SHA 的硬编码，并核对实际加载构建；Angle／Diffuse 必须明确单步单次，不能三步默认运行后再停止来冒充单次。逐条记录原文、卡片、Keep／JSON恢复、模型身份未知项、失败和所有额外请求。

同一冻结候选之后做隔离 Windows Preview 的交叉体验，检查手写 Fork、生成 Keep、编辑、物理 IME、触控板和重启；浏览器模拟 IME 不等于物理输入法验收。此次没有执行付费模型对比、构建／安装 Windows 包或自动合并，也不将本地通过冒充队员已复审。用户目前无需重复既有 Continue 测试。
