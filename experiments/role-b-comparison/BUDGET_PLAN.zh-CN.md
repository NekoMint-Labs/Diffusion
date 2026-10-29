# DeepSeek V4 有上限预算实验

冻结日期：2026-10-29；产品仍为 5e4f979，两个公开场景为 Ask 与 Continue。生产默认请求、界面与提示不改。

四臂：enabled/high/1600，enabled/high/4000，enabled/low/1600，disabled/1600。Ask 顺序如上；Continue 反向。共最多 8 次生成，累计 max_tokens 上限 17600，无模型重试，无搜索/额外提炼，沿用 45 秒产品请求超时。

同一场景每臂从专用公共项目的相同快照开始。每次前先切到持有页，备份已有结果，再只重置本工具新建且拥有的 comparison-budget-* 项目；不碰已有六情境、旧导出或日常 4175 数据。逐次比较完整请求的规范化哈希，只排除本次 trace requestId 与三个实验参数；其他差异立即中止。

实验路由只修改 DeepSeek V4 Pro 请求的 max_tokens/thinking/reasoning_effort；不读取认证头或密钥。正式调用依旧通过浏览器原来的 transport，记录传给 route.continue 的确切正文与服务 usage。control 显式 enabled/high，等价于官方文档当前默认，不是旧请求逐字重放。

官方依据（2026-10-29 核对）：https://api-docs.deepseek.com/guides/thinking_mode 及 https://api-docs.deepseek.com/api/create-chat-completion/ 。V4 支持 enabled/disabled，enabled 支持 low/high/max；max_tokens 包括推理及最终可见输出。当前产品只设置总 cap，未传 thinking/reasoning_effort。未知模型不得套用这些专用参数。

验证：budget-policy 离线三项通过；verify-budget 八臂注入全流程通过、零真实请求，检查配对提示哈希、8 次上限、原文读取、Keep、下载及新项目恢复。结果只有在实际运行后才能填写，不把注入结果写成真实模型表现。

默认：node experiments/role-b-comparison/budget-run.mjs --out <新目录> 仅打印计划。正式执行另加 --session <单候选 launcher 回执> --port 9239 --execute。--injected 仅用于独立 injected profile，明确标为模拟。

本机首次后台服务组合启动被自动审批以“策略阻止”拒绝，改为分开保存脚本、前台 preview 与浏览器 launcher；没有重复启动隐藏后台服务。窗口关闭时会话 key 失效，用户在新单候选窗口重新配置；不迁移/读取旧密钥。

续跑规则（2026-10-29）：首次真实执行 Ask/high-1600 已发出并完成空正文；下一配置在切换 Field 时超时，零请求。保留 live-v1 原始记录，只允许 --resume <原目录> 到新输出目录；核对原计划、快照、构建、提示哈希、逐次记录及累计请求上限，不重跑已消耗臂。剩余为 7 次、16000 max_tokens。切换先等待 Open Field 窗口完成关闭，再验证项目 ID 和标题；短时诊断两次切换均正常，最初延迟原因未确证，不把它记作模型失败或已修复的产品缺陷。5 项预算/续跑离线检查通过；独立注入验证 8 臂全流程及 7 臂续跑通过，零真实供应商请求。
