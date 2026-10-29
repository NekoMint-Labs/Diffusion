# 第二轮浏览器真实模型对比准备

日期：2026-10-29。此目录只增加实验工具和回归，不修改生产行为；候选产品仍固定为 #88 的 5e4f979，不能将工具提交 SHA 冒充产品 SHA。

## 比较对象

| 角色 | 精确产品源码 | 开关 | 专用地址 |
| --- | --- | --- | --- |
| 基线 | 79a484483e882c0b252b46c09391f7a3cd84f027（#81） | readingTrial=1 | http://127.0.0.1:4192/ |
| 候选 | 5e4f979c5c210246577280ac91fd58d2631d8920（#83 + #88） | readingTrial=1&propositionTrial=1 | http://127.0.0.1:4191/ |

#83 的 8f9d621 已于 2026-10-29 获队员独立复审批准，#88 的上述增量亦已交叉审核；此处固定的是待实验产品版本，不是正式发布或默认采用。#85 后续 a340324 仅删除两处文档末尾空行，没有改变产品候选。

使用同一组公开合成 Field：Ask、Continue、Another Angle、Diffuse、前提纠正、不确定性，计划每边六次主生成，共十二次。每次一候选，Angle/Diffuse 一步；不搜索、不补提炼、不自动重试。记录观察到的请求而不是凭候选数推断次数。HTTP 200、结构合法和观点出现均不代表质量通过。

DeepSeek、请求模型 deepseek-v4-pro、Standard 与上轮保持一致；实际模型只取服务响应，缺失写未知。若供应商不支持该模型或连接失败，保留错误并停止，不擅自换模型/加预算/重试。工具预检不会验证密钥、模型可用性或 CORS。

## 文件与执行边界

- options.mjs / capture.mjs：默认仅打印计划，不连接浏览器、不导入产品模块、不写输出。执行必须明确 --execute、--session、完整产品 SHA、角色、开关、专用地址和新目录；运行目录排他创建，失败结果保留。
- seal-build.mjs：构建完成后，核对产品 checkout HEAD 及 src/public/构建输入未修改，记录完整 Git tree 和 dist 资产 SHA-256。采集前逐一核对服务实际返回的文件；同时核对页面已加载的脚本名称，避免仅依赖命令行版本标签。
- launch.mjs：拒绝复用已有浏览器资料目录，用独立 Chromium 打开两个专用 origin，预置公开测试项目并停在 AI 设置。不会读取、复制或填写用户密钥，不按 Test connection 或生成。会在首次设置前重载页面，因此密钥应在准备完成后由人填写。
- flow.mjs：通过现有界面操作。普通 Diffuse 暂无空闲设置入口，先用 AI Off 的一候选 Angle 建立范围，再在现有 Run settings 里核对一步、来源/搜索关闭；恢复选定供应商后明确 Run。AI Off 准备步骤断言零请求，不消费真实模型 warmup，不改产品默认步数。
- capture.mjs：核对 launcher 回执与本机监听端口所属 Chrome 进程的 user-data-dir，确认使用独立测试实例。只读这个进程的启动元数据，不读取进程内存或密钥。记录请求模型/预算、响应实际模型/usage/finish reason/正文，不读取请求头或认证信息。
- fixtures.mjs：同一输入分别装入两个 origin，固定 ID 和时间；执行前逐字核对完整 fixture 哈希。已经改动/执行过的输入不能重新冒充首次样本。
- verify-capture.mjs：独立无头浏览器，用明确假的会话 key 和拦截的 DeepSeek 响应，验证完整脚本链路。该结果是注入响应，不是真实模型输出。

切换 Field 要等 active ID 和标题都改变；恢复要等新项目 ID 与 restored 标题出现，再核对实际恢复项目。完整原文、画布文本、阅读器、Keep 后文本、原生浏览器下载、界面 JSON 恢复分别记录。生成请求始终单独计数；Read/Keep/导出恢复不应发出额外请求。导出只含该公开测试项目。

## 本地准备与命令

从此工具 checkout 使用锁定依赖。为两个精确源码建立独立 checkout，按各自锁文件安装依赖并完成生产构建，再为每个 dist 执行 seal-build.mjs。用 Vite preview 分别服务 4191 和 4192，保留运行日志；不能复用用户 4175 页面或修改它的 localStorage/数据。

seal-build.mjs 参数为 --root <产品checkout> --source <完整SHA> --role baseline|candidate --flags <对应开关>。

launch.mjs 参数为 --profile <尚不存在的独立目录> --receipt <新回执JSON> --executable <Chromium绝对路径> --port 9239。

人分别在两个标签的 AI 设置填写并保存 DeepSeek key，保留设置页打开。会话 key 不跨页面复制，刷新会丢失；无需将 key 发到聊天或写入命令。

候选预检例（PowerShell）：

~~~powershell
node experiments/role-b-comparison/capture.mjs --source 5e4f979c5c210246577280ac91fd58d2631d8920 --role candidate --flags 'readingTrial=1&propositionTrial=1' --url http://127.0.0.1:4191/ --out <新的结果目录>
~~~

正式执行需另加 --session <launcher回执JSON> --port 9239 --execute。基线替换源码、角色、开关和地址；必须使用另一全新目录。两边顺序执行，不同时请求，不拿单次耗时比较速度。

## 已验证与原始失败

- 两次生产构建完成；候选主 bundle 为 index-m-C7LP2v.js，SHA-256 57b05ee01619345c0196e0211aeed5956bfec55af839c3841b173d4d29d52395，与 #85 记录的同源构建一致。基线独立构建并封存各资源哈希。
- 应用类型检查通过。首次新增 .mjs helper 缺少 TypeScript 声明，补显式 flow.d.mts 后通过，没有放宽编译规则。Vite 保留既有大 chunk 警告。
- 新增离线参数/请求计数两项通过；默认预检另作实际执行检查。
- 候选生产 bundle 挂载单步回归 4/4，基线 2/2，1 worker、0 retries；均使用注入网关响应，非真实模型。首次候选 2/4：复选框可访问名称重复导致脚本精确匹配失败，改为名称前缀后 4/4；断言/超时未削弱，首轮 JSON 保留。
- 完整采集管线用注入传输检查 Angle/Diffuse 两场景。原生 CDP 不提供 Browser.getBrowserCommandLine，改为核对监听端口对应 OS 进程；首次按命令行枚举时包含继承同参数的子进程，改为唯一监听进程。之后发现 Field 切换未等待新身份，修正等待并保留失败；首次跑通后再加强恢复新 ID/实际全文和输入哈希核对。
- 最终加强后的完整管线 2/2 通过：实际恢复为新项目 ID，恢复库内的逐字正文与原文一致，恢复后卡片与 Keep 后显示一致；共两次注入传输、零真实供应商请求。完整记录保留 capture-pipeline-final。
- 本轮没有真实模型请求，没有 Windows 安装/原生输入法验收；不能拿浏览器版代替原生证据。

本机日志、首轮/最终 JSON、封存 manifest 和 launcher 回执位于 D:/DiffusionWork/reviews/20261029-b/。公开工具不包含该目录里的浏览器 profile、key、用户旧 Field 或私人资料。历史 #84 文件不修改。

## 后续判读

按逐字输出判断 Ask 是否直答、Continue 新增了什么、Angle 是否换了维度、Diffuse 是否给出不同且有用的可能性；单独审查观点是否丢掉条件/不确定性。保留超时、空正文、无观点回退、重复及无价值输出；不为获得好样例而重试。

浏览器连接若因 CORS/网络失败，不算模型质量失败；真实调用与浏览器传输问题分别记。浏览器数据只支持该受测路径，后续仍需同候选的 Windows 交叉体验。跨版本有多处变化，单样本不证明因果效果或稳定提升。
