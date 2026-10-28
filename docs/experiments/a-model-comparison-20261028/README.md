# A 方向真实模型对比（2026-10-28）

先读 [A真实模型对比报告](A真实模型对比报告.md)，再用 [完整对照原文](完整对照原文.md) 和 [配对清单](comparison-manifest.json) 核对证据。

本次材料对比 #80 (`5ab6b209924828127b10528044d05debc9dcceda`) 与 #83 (`86b072bba153526350d0c4f1d481d21ef727b65a`)，作为 #83 的探索证据提交。它没有修改生产功能，也不代表团队已批准采用。

六组配对包含 14 次原生生成请求。普通 Diffuse 已有服务正文，但没有采到可见卡片；早期观测故障、无效夹具和超时也原样保留。`empty-or-failed` 是脚本分类，不等同于模型空回答。报告末尾的“未向 GitHub 发消息”描述本地测试结束时的状态；本目录随后作为证据 PR 上传。

## 复现脚本

脚本位于仓库根目录的 `experiments/role-a-audit/`，需从仓库根目录运行并使用仓库锁文件安装依赖。

本次工具修复以 #84 的历史证据分支为基底，其产品源码仍来自旧候选，不能作为修复后 #83 的产品构建。复测前须把工具补丁应用或同步到实际要测试的源码，再核对所启动的原生构建。SSR 的 HEAD 检查只核验当前 checkout 与传入声明一致，不证明该 checkout 已包含最新 #83，也不验证原生应用的运行版本。

- `diffuse-keep-repro.tsx`：运行真实 Controller 与 ThoughtView 的 SSR 合成样例，检查 Keep 后观点显示资格。保存的旧结果属于当时版本，不是完整浏览器验收。现在默认只输出计划；执行前要求声明的完整 SHA 与脚本所在 checkout 的 HEAD 一致，且 checkout 干净。
- `native-comparison.ts`：通过 Playwright CDP 连接已启动的隔离 Windows 原生测试应用。现在默认只输出计划，不导入 Playwright 或应用模块、不连接 CDP、不写文件。必须显式提供完整源码 SHA、角色、开关与新输出目录；角色不再推断版本或开关。只有追加 `--execute` 才会执行。

以下命令只做预检，先创建输出目录的父目录，将 `<完整候选SHA>` 换成实际待验收版本：

```powershell
pnpm exec tsx experiments/role-a-audit/native-comparison.ts --source <完整候选SHA> --role candidate --flags readingTrial=1,propositionTrial=1 --out verification/capture-candidate-new --port 9224 --scenarios ask,continue,correction,uncertainty
```

新基线使用其完整 SHA、`--role baseline --flags readingTrial=1` 和另一新目录；历史无阅读开关的基线可显式用 `--flags none`。`--help` 显示参数说明。旧的位置参数调用已停止支持。

Angle/Diffuse 的旧采集路径尚未完成单步请求控制适配，执行会在连接前拒绝包含这两项的场景。原 Diffuse 入口配置三步，首个候选后点击停止不等于单步；Angle 选择一个候选也不能证明只调用一次。可预检全部六项，但不能把当前脚本当作下一轮完整四动作验收工具。其余场景同样保留实际请求数和 `singleStepVerified: false`，不预先宣称通过。

原生记录使用 `declaredSource`，明确标为操作者声明。`source.json` 的源码声明和安装包 SHA-256 可用于核对构建材料，但脚本没有验证 CDP 连接的运行实例就是该构建，也没有验证数据目录隔离。执行前仍需核对真实运行程序、构建来源、实验开关及独立 WebView 数据目录；不得把一个命令行 SHA 当作完成了这些核验。

SSR 也使用相同的必填 `--source/--role/--flags/--out` 参数，默认预检，追加 `--execute` 才渲染合成样例。它不连接原生应用或真实模型；其结果只证明所记录 checkout 的 Controller 与静态渲染行为。

原生脚本会重写测试应用的本地夹具和设置，并使用应用配置的供应商进行真实、可能计费的生成。务必使用独立 WebView 数据目录及公开合成输入；不要连接日常使用的应用实例。先按仓库说明构建指定提交并启动原生应用，再连接 CDP。脚本不会安装应用或配置凭据。

旧脚本曾输出到 `../../outputs/A-first-round-20261028/live-v3`。新调用必须指定尚不存在的运行目录，执行时排他创建；目录已存在或父目录不存在均拒绝执行，失败运行也须保留。每次运行首先写入 `preflight.json`，其后只更新该次运行的结果。历史 v1/v2/v3 文件及失败记录不随工具修复改写，当前脚本不能逐字重放随机模型响应。

无需安装项目依赖的离线验证：`node --experimental-strip-types --test tests/offline/capture-provenance.test.mjs`。该检查只运行参数、文件和临时 Git 夹具，以及不会连接应用的入口失败路径，不调用真实模型或执行原生验收。

`targeted-unit-tests.txt` 为 42 项既有目标测试的结果；`native-build-hashes.json` 只记录隔离构建的摘要。上传材料不含安装包、截图或凭据。单次样例、SSR 和构建结果不能替代独立使用者的真实交互验收。
