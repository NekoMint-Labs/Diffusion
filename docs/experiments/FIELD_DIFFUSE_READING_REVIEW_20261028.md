# PR #83：Diffuse 阅读资格修复与用户反馈

日期：2026-10-28。修复前提交：`86b072bba153526350d0c4f1d481d21ef727b65a`。本轮针对 `fill-silence` 的未解决 P2 评审及两项文档意见，继续更新同一 PR，不合并其他分支、不代表团队验收。

## 本次用户反馈的证据范围

用户在 `readingTrial=1&propositionTrial=1` 下提交了新的 Field 截图。可见一张未留下的候选，观点逐字为：

> 翻后面章节的例题，看它调用前面哪一章的结论，被调用最多的先复习——前提是章节顺序大致等于依赖顺序。

它回应了“先复习哪一章”，没有回到完成标准或恢复时间上限，并在卡片中保留了前提。但截图没有完整原文或提供方／模型身份，无法评价全文是否忠实或把这一张归为某个已验证模型样本。左下角显示“建议 2”，它是待审建议入口，可能包含不在当前视野或来自其他请求的候选；不能凭单张图宣称本次单数请求已经通过，亦不能认定该请求必定生成两条。现有截图不是四动作的成组对照。

## 缺陷与最小修复

普通 Diffuse 的 Ghost 有 `proposalKind` 和项目／提供方 provenance，但没有 `proposalAction`；Keep 后没有 `generationAction`。原显示条件将该字段误当成所有生成内容的必要身份，因此观点记录虽保留，卡片却不再使用它，手动提炼也不可达。

新增 `ui/thought/generatedReading.ts` 作为卡片和阅读入口共用的展示资格判断。普通 Diffuse 的持久化记录由既有项目／提供方 provenance 识别；Continue 等现有动作仍沿用原资格。排除用户输入身份／范围、原文提取候选、来源身份／URL、Source 和 Crystal；不根据没有项目身份的任意旧 note 猜测。它只控制展示，不证明事实或作者身份。

没有新增 canonical 字段、数据库迁移、因果动作或后台模型请求。原文、观点绑定、权限、Keep、Undo/Redo 和恢复验证维持原所有权。

## 自动验证与原始失败

- 最初“启动隔离服务并运行测试”的组合命令被自动审批拒绝，未执行。改用已在监听的 4175 服务与全新 Playwright browser context，测试不接触用户浏览器的存储、凭据和未留下候选。
- 第一轮因所选 C 盘 Chromium 报 `spawn UNKNOWN`，两项均未启动页面，不能算产品复现。换用项目此前记录的 D 盘 Chromium 后可启动。
- 第一版测试只打开 Angle 预览，没有进入普通 Diffuse；两项在等待 Ghost 时失败。修正测试操作：一次明确的空 Angle fixture 后，从详情／本次设置运行一步普通 Diffuse，断言请求动作确为 `diffuse`。每个用例两次生成 fixture（一次空 Angle、一次 Diffuse），不计为真实模型请求。
- 同一新测试在旧生产构建上两项失败，分别复现 Keep 后已有观点不显示、缺失观点的预览标签消失。保留 `D:/DiffusionWork/diffuse-review-reproduce-final.log`，没有增加重试、超时或跳过。
- 修复后 `pnpm run build` PASS，包含应用类型检查和生产构建；已有大 chunk 提醒保留。
- `pnpm exec vitest run --maxWorkers=2`：82 文件、766 项 PASS。新增四项覆盖生成内容资格、Keep／完整 JSON 恢复及用户／来源排除边界。
- `pnpm run check:offline` PASS，含 Core 类型、locale、离线契约和源码体积检查。
- 生产构建 Playwright 阅读／答案预览／撤销回归：27/27 PASS（56.2 秒），零重试，包含原25项及新增两个 Diffuse 用例。有观点时 Keep／JSON 恢复后仍显示；无观点时恢复后可手动提炼并持久化、重载。始终逐字保留完整原文。
- `git diff --check` PASS。日志保留在 `D:/DiffusionWork/diffuse-review-*.log`，浏览器产物在 ignored 的 `experiments/role-b-focus/results/diffuse-review-fixed/`。

## 后续门槛

内容合同第5节已区分旧 #80/#81 行为对照与本 #83 原型，并要求实际运行时记录 baseline／candidate 完整 SHA、开关、范围、模型、逐字全文与卡片、回退、空结果、失败和所有请求次数。原型已提交，四动作真实对比、内容约定共同确认及同提交 Windows 体验仍待完成。历史报告保留原日期和当时状态。

本次零真实模型请求。用户下一次有价值的主观体验是比较同一起点的 Continue 与 Another Angle：是否改变观察维度，还是只是换句话重复；随后再补 Ask 和单步 Diffuse。机械持久化和排除边界由自动回归承担，避免反复要求用户重测同一条链。
