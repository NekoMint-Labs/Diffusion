# PR #17 Windows 复验记录

本轮对应[维护者的 12 项反馈](https://github.com/NekoMint-Labs/Diffusion/pull/17#issuecomment-5965659276)。源代码、自动检查与 Windows 人工体验分开记录；自动检查通过不等于最终体验通过。PR #17 不合并，Issue #11 不关闭。

## 问题对照表

| 评论 | 复现方式 | 修复 | 回归入口 | 验收结果 |
|---|---|---|---|---|
| 1 AI 设置 | 中文设置切换 OpenAI、Anthropic、兼容服务、网关 | 提供商→API 密钥及帮助→模型→主动测试；协议及输出上限置于高级；仅适配器支持推理的服务显示思考深度 | `friction`、`phase25`、`nativeAcceptance` | 自动回归通过；原生范围见下表 |
| 2 搜索设置 | 开启搜索，切换配置来源，再返回之前的来源 | 主页面只配置所选来源；不重置其它已启用来源；自定义地址和额外来源归入高级；固定查询主动测试 | `phase28b`、`friction`、`nativeAcceptance` | 自动回归通过；原生范围见下表 |
| 3 中文架构 | 中文逐一查看各服务密钥说明及失败状态 | 元数据只保存名称、网址、能力等事实；新增稳定语义键及 EN/ZH 映射；保留旧翻译入口；检查器覆盖动态元数据 | `check-locales`、`nativeAcceptance`、`surfaceReadability` | 自动回归通过；原生范围见下表 |
| 4 汇总点击区域 | 点击待处理建议/根节点汇总最右端，再用 Enter/Space | 触发按钮占满整行；内部保留、忽略按钮独立 | `nativeAcceptance`、`feedbackRepairs` | 自动回归通过；原生范围见下表 |
| 5 缩放与层级 | 生成建议，缩远；折叠子分支，再折叠/打开父分支 | 统一显示投影；Local 完整、Neighborhood 摘要、Atlas 汇总；完整卡片与汇总互斥；会话折叠进入现有撤销栈；普通滚轮不记撤销 | `nativeAcceptance` 单元/E2E、`hierarchyDisclosure`、`hierarchyPresentation`、`remainingFeedback` | 自动回归通过；原生范围见下表 |
| 6 左上角 | 缩放、多层内容、演示状态下查看标题附近 | 常驻只保留身份；层级短暂提示及紧凑入口；演示通知使用已预留通知区 | `field`、`hierarchyPresentation`、`noticeLayout` | 自动回归通过；原生范围见下表 |
| 7 空间与定位 | 适应内容、居中、搜索、根节点定位；打开面板 | 实测控件/面板占用，统一安全区域；隐藏后代排除普通适应边界与新操作；不改写想法坐标；长搜索结果独立滚动 | `nativeAcceptance`、`hierarchy`、`find`、`remainingFeedback` | 自动回归通过；原生范围见下表 |
| 8 More 菜单 | 四边四角，水平/斜向进入子菜单；点击固定、Esc 返回 | Base UI 原生子菜单及定位/翻转/移动/垂直回退；使用其内部 safePolygon；删除手写角落偏移；复用焦点协调 | `remainingFeedback`、`hotfix`、`surfaceOwnership` | 自动回归通过；原生范围见下表 |
| 9 来源/归属 | 对深层想法查看来源并修改归属，再撤销、重开 | 来源列表 + 可搜索 Combobox；独立/恢复来源归属；排除自身和后代；来源/坐标保持不变 | `hierarchy`、相关控制器单元测试 | 自动回归通过；原生范围见下表 |
| 10 设置密度 | 1280×720 下切换设置分组 | 决策分组、精简说明、减少分隔；未增加全局设置搜索 | `surfaceReadability`、`visual` | 自动回归通过；原生范围见下表 |
| 11 同类排查 | 设置、菜单、对话框、历史、查找、Thread/Deep Dive、空/加载/错误状态 | 统一术语和选择可见性；校验焦点/返回/空列表/失败/请求过期；以完整 E2E 为门禁 | 完整 Playwright、离线及单元套件 | 自动回归通过；原生范围见下表 |
| 12 复用边界 | 对照依赖、实现与分发许可证 | 使用现有组件；未引入新依赖，未复制外部项目代码；参考与运行时复用见下表 | 分发许可证生成、依赖/差异检查 | 自动回归通过；原生范围见下表 |

## 行为契约与兼容

- `DisclosureProjection` 同时提供可见、符合层级、隐藏、汇总对象。渲染、框选、碰撞、新操作范围、普通适应内容消费同一规则；当前编辑/明确定位只临时显示目标及必要祖先。
- 显式折叠状态属于当前会话，和内容变更共享撤销顺序；不进入数据库和导出格式。关闭父分支保留子分支自己的选择。已选但被隐藏的对象不加入新操作。
- 相机避让使用实际界面矩形，内容坐标仍归用户所有。提交后关闭的预览不挤占新对象落点；小窗口优先搜索安全区域的边缘空位。搜索保持原缩放和返回语义；超长当前结果限制阅读高度。屏外子项不等于被折叠，撤销后分支按钮即时刷新。
- AI 适配器及公开协议未扩展。只有现有 Anthropic 推理参数映射对应思考深度；其它支持的长度控制仍使用原请求映射，改称高级“输出长度上限”。
- 搜索只在点击测试时请求固定 `Diffusion connection test`，不包含想法文本、不写入项目；自定义 HTTP 请求 limit=1；内置引擎遵守现有最小 fast 预设（线上请求 3 条，本地最多读取 1 条），没有扩展协议。修改来源/配置使旧结果失效；失败与空结果都不宣称验证通过。
- 网关测试只证明配置端点可连接，界面明确说明模型响应尚未验证；不把能力声明冒充真实模型验证。修改密钥草稿会立即使旧结果失效。
- 凭据仍走原存储边界；没有读取用户密钥用于测试。测试请求使用 fixture。原始来源、组织关系、旧设置、多来源配置及导出兼容性保留。
- 本地既有 `src-tauri/Cargo.toml` 状态保留，不纳入本轮提交。

## 参考与实际复用

| 来源 | 本轮用途 | 代码/许可证处理 |
|---|---|---|
| [Base UI Menu](https://base-ui.com/react/components/menu) / Combobox | 实际运行时复用：Menu.Root/SubmenuRoot/SubmenuTrigger/Positioner/Popup，模型与归属 Combobox | 已安装 `@base-ui/react`；本地 LICENSE 为 MIT；由现有分发许可证脚本收集 |
| [Floating UI useHover](https://floating-ui.com/docs/usehover) | Base UI 子菜单内部 safePolygon 跨间隙移动；其余浮层未新增手写 hover 几何 | 已安装依赖 MIT；未复制实现 |
| [React Flow viewport bounds](https://reactflow.dev/api-reference/utils/get-viewport-for-bounds) | 边界适应思路参考；在现有 CameraController 上独立实现安全区域 | 没有安装 React Flow 或复制其算法源码 |
| [AFFiNE mindmap view](https://github.com/toeverything/AFFiNE/blob/canary/blocksuite/affine/gfx/mindmap/src/view/view.ts) | 点击响应区域与分支折叠交互参考 | 仅行为参考，未复制代码 |
| [Markmap fold](https://markmap.js.org/api/interfaces/markmap-common.IPureNode.html) | 局部分支与嵌套折叠行为参考 | 仅行为参考，未复制代码 |
| [Jan custom endpoint](https://www.jan.ai/docs/desktop/remote-models/custom-endpoint) | 提供商/密钥/模型/高级选项的信息组织参考 | 仅文档/信息架构参考 |
| [Cherry Studio providers](https://cherryai.com/docs/en/mobile/providers-and-models/) | 密钥帮助、手动模型、主动连接测试的信息组织参考 | 仅信息架构参考；没有复制 AGPL 项目组件代码 |

## 验收结果

验证结果与对应安装包由交付包 `manifest.json` 绑定提交和 SHA-256。全部 E2E 使用 1 worker、0 retries；结果由一次完整运行与修复后的定向复测组成，原始失败日志和每次复测均保留。没有新增 skip 或降低断言标准。

| 检查 | 结果 |
|---|---|
| TypeScript / core / 静态导入 | 通过 |
| locale / source-size | 935 个词条，缺失/未包裹/动态元数据遗漏均为 0；体积门禁通过 |
| 离线契约 / 单元测试 | 266 / 344 通过；46 个单元文件 |
| 完整 E2E + 修复后定向复测 | 最终 274 项均有通过证据，0 未解决失败、0 跳过；包含 12 项开发界面测试 |
| 浏览器显示矩阵 | 24 组合通过：1280×720 / 1440×900 × DPR 1/1.25/1.5 × 明暗 × 正常/减少动态媒体模拟 |
| Windows Rust 测试 | 25 通过；本轮未修改 Rust 实现；不代表真实 AI/搜索服务资格认证 |
| 生产构建 / NSIS 安装包 | 通过；既有主 chunk 大于 500 kB 警告保留 |
| 搜索资源 / 分发许可证 | 引擎源码哈希匹配；1000 个许可证文件、5 个 MPL 源代码记录、0 个未解决项；无新依赖或外部复制代码 |
| Windows WebView2 原生程序 | 系统 DPI 144（150%），1440×880 / 1280×720，明暗及减少动态媒体模拟共 8 组合；折叠/撤销/More/设置通过并截图 |
| 修复前后截图 | 同一无隐私测试内容；基线是先前已有原生包，修复后是交付安装包对应的 release 程序；未将旧包伪称为重新构建的 `943fd8e` |
| 系统 100% / 125%，真实中文输入法 | 待人工体验；浏览器 DPR/媒体模拟不能替代系统设置 |

### 同类界面复验

| 界面/状态 | 复现与检查 | 对应修复或保留规则 | 回归结果 |
|---|---|---|---|
| 设置与连接 | 切换来源、空模型列表、保存拒绝、错误、过期响应 | 分组/术语/状态语义、凭据草稿隔离与旧结果失效 | friction / phase25 / nativeAcceptance 通过 |
| 菜单与对话框 | 四边四角、斜向、点击固定、Esc、焦点返回 | 原生子菜单、统一浮层归属、每次点击执行一次 | remainingFeedback / hotfix / surfaceOwnership 通过 |
| 历史与查找 | 撤销折叠、查找隐藏深层、长文本滚动、关闭返回 | 现有撤销顺序、安全区定位、原始坐标不变 | hierarchy / find / nativeAcceptance 通过 |
| Thread / Deep Dive | 加入当前选择、打开/关闭辅助界面 | 新操作只取可见范围，冻结范围与相机返回规则保留 | field / quietJourney / 相关 Thread 与 Diffuse 套件通过 |
| 空白/加载/错误 | 无提供商、请求等待、模型失败、搜索空结果 | 不虚报成功，不丢输入，不自动写入思绪场 | friction / phase28b / refinement 通过 |
| 开发检查界面 | 全部 Motion Lab 与材质组合 | 使用项目已有图标补齐 favicon，启动开发服务后实跑原有断言 | lab / materialGallery 共 12 项通过 |

Field 公共类型独立为 `src/field/contracts.ts`，保留原导出兼容入口，既有 650 行离线门禁未放宽。本次没有合入 #10/#11 整合分支；修复提交位于 PR #17 分支，可作为整合中的 #11 部分。

人工复验还应覆盖：100%/125%/150% 系统缩放、1280×720 与常用窗口、明暗主题、减少动态、中文输入法、系统文件对话框、真实凭据保存/删除、打包搜索引擎实际调用。未完成的项目保持待验，不以模拟或静态检查冒充。

重新体验通过前保持 PR #17 未合并、Issue #11 开放。
