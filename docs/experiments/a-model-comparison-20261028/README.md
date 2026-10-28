# A 方向真实模型对比（2026-10-28）

先读 [A真实模型对比报告](A真实模型对比报告.md)，再用 [完整对照原文](完整对照原文.md) 和 [配对清单](comparison-manifest.json) 核对证据。

本次材料对比 #80 (`5ab6b209924828127b10528044d05debc9dcceda`) 与 #83 (`86b072bba153526350d0c4f1d481d21ef727b65a`)，作为 #83 的探索证据提交。它没有修改生产功能，也不代表团队已批准采用。

六组配对包含 14 次原生生成请求。普通 Diffuse 已有服务正文，但没有采到可见卡片；早期观测故障、无效夹具和超时也原样保留。`empty-or-failed` 是脚本分类，不等同于模型空回答。报告末尾的“未向 GitHub 发消息”描述本地测试结束时的状态；本目录随后作为证据 PR 上传。

## 复现脚本

脚本位于仓库根目录的 `experiments/role-a-audit/`，需从仓库根目录运行并使用仓库锁文件安装依赖。

- `diffuse-keep-repro.tsx`：运行真实 Controller 与 ThoughtView 的 SSR 合成样例，检查 Keep 后观点显示资格。使用 `pnpm exec tsx experiments/role-a-audit/diffuse-keep-repro.tsx`。保存的结果是当时版本的已知缺口，不是完整浏览器验收。
- `native-comparison.ts`：通过 Playwright CDP 连接已启动的隔离 Windows 原生测试应用。调用格式为 `pnpm exec tsx experiments/role-a-audit/native-comparison.ts candidate 9224 ask,continue,angle,diffuse,correction,uncertainty`；基线参数为 `baseline`。端口须对应测试应用，CDP 仅监听本机。

原生脚本会重写测试应用的本地夹具和设置，并使用应用配置的供应商进行真实、可能计费的生成。务必使用独立 WebView 数据目录及公开合成输入；不要连接日常使用的应用实例。先按仓库说明构建指定提交并启动原生应用，再连接 CDP。脚本不会安装应用或配置凭据。

当前脚本输出位置为从仓库根目录解析的 `../../outputs/A-first-round-20261028/live-v3`；复用前应检查此目录以免覆盖已有实验。v1/v2 文件记录的是更早脚本版本产生的失败与部分有效结果，当前脚本不能逐字重放随机模型响应。

`targeted-unit-tests.txt` 为 42 项既有目标测试的结果；`native-build-hashes.json` 只记录隔离构建的摘要。上传材料不含安装包、截图或凭据。单次样例、SSR 和构建结果不能替代独立使用者的真实交互验收。
