# Issue #10 / #11 整合预检与交接

日期：2026-10-03（Asia/Shanghai）。下面先记录当前整合候选，再保留等待 #17 新提交时的历史预检。

## 最新双方输入同步（2026-10-03）

- #11 输入：PR #17 `639818ad6c2a9123c9f92989f6f2bcba81936b98`，产品修复为 `9377a95c8161e127623401f0db9e14637abe5c98`。
- #10 输入：草稿 PR #18 `c9a3cc6dfe5091af158e6837a9544b2441e3309c`，包含 `533c3ee` 局部字面去重、`a94b5f7` 受控连接测试与 `c9a3cc6` 无上下文 Ask 开场过滤。
- 整合产品提交：`fc3fd199d782c71fb5e9216d62d8cd53cc5d11c7`；继续使用独立分支 `codex/integration-issue10-11` 与草稿 [#19](https://github.com/NekoMint-Labs/Diffusion/pull/19)。双方完整提交均为候选祖先。

依赖顺序仍为 `#13 → #14 → #15 → #16 → #17`；#17 已包含前置改动。同步 #17 自动合并；同步 #18 唯一文本冲突为 `tests/e2e/friction.spec.ts`。合为一条受控 `/v1/responses` 401 route，同时保留请求模型、刚保存的夹具密钥、身份验证错误与未保存新密钥的“Configuration changed”断言。没有削弱断言、添加重试或跳过。

运行时仍同时传递 `visibleIds` 和实测 `measurements`，保留初次/后续尺寸变化修正、低缩放阅读/回应与稳定相机；前端 continuation 和网关 schema 保持同步，来源仍使用 `derivedFrom`。局部去重只比较本请求上下文、相关 pending Ghost 和本批结果；它不证明同义复述已消除。

#17 的 custom discovery 独立就绪/测试与 Source 分支 Atlas 锚点修复现已纳入；没有将 #10 改动写回 #17。最新整合的 TypeScript/core、生产构建、54 文件/411 单元、266 离线、960 文案和源码大小检查通过，既有大块体积警告保留。

整合产品 `fc3fd19` 的远端 [CI](https://github.com/NekoMint-Labs/Diffusion/actions/runs/37134333211) 和 [完整 E2E](https://github.com/NekoMint-Labs/Diffusion/actions/runs/37134333208) 全部通过。读取四个执行 job 的日志：Interaction 1/3 为 94 passed，2/3 为 91 passed / 12 skipped，3/3 为 81 passed，production backgrounds 为 31 passed；合计 **297 passed / 12 既有开发用例 skipped / 0 failed**，六个 job 全绿，各 runner 单 worker、零重试。远端完整通过后停止重复本地全量运行，其部分日志保留且不宣称完整本地全绿。

当前生产构建的 1280×720 浅色/减少动态与深色/普通动态复核全部通过，并查看四张截图。设置显示“直接连接 OpenAI API。”与“输出长度上限”，密钥帮助为中文；建议汇总容器 560×38px、按钮 558×36px，右端点击与 Space/Enter 作用一致；Atlas 完整 Ghost 数为 0，仅保留汇总入口；受控生成前后原想法样式坐标和相机完全相同。低缩放回应入口为 80×32 屏幕像素，页面没有未捕获错误。证据为忽略目录 `verification/integration-preflight/integration-sync-visual-result.json`、`integration-sync-ai-{light,dark}.png` 和 `integration-sync-atlas-{light,dark}.png`，脚本为 `.tmp/integration-sync-visual-probe.mjs`；这些不代替真实模型或 Windows 原生证据。

验证命令沿用仓库入口的底层 CLI：`node node_modules/typescript/bin/tsc --noEmit`、`node node_modules/vite/bin/vite.js build`、`node node_modules/vitest/vitest.mjs run`，以及 `check:offline` 的五个原始命令。Windows 英文 fixture 使用 `NODE_OPTIONS=--no-experimental-global-navigator`。Playwright 适配仅更换 Windows 启动语法、隔离端口和证据路径，不改套件/断言/worker/retries。最初 esbuild 受到沙箱父目录读取权限阻断，完整测试没有启动；授权运行后构建通过。旧解压诊断 trace 被离线扫描误当作源码，已移出仓库并保留，随后原检查完整通过。

本轮未生成新安装包。#12 继续负责 Windows 原生验收，#10 的真实模型 A2/A3/A5 仍待对应试用。草稿 #19 和 Issue #10/#11 保持开放；没有合并 PR。

共同本地试用应先记录候选 SHA，再覆盖下面历史清单中的动作/停止/Keep/Ignore/归属/阅读/缩放/重开路径。使用 `git fetch origin`、`git switch codex/integration-issue10-11`、`git pull --ff-only`、`pnpm install --frozen-lockfile`、`pnpm run dev`；已有分支先处理自己的未提交修改，勿覆盖私人项目或凭据。当前整合没有新安装包，旧 Release `05c4144` 不用于本候选验收。

## 历史整合候选（33bd1a7 + 38eab8a）

- #11 输入：PR #17，`33bd1a7fdf19c9b0f5f54571fc1842d2bc3707e7`；在 Windows 验收反馈修复 `19bbd42` 上追加已独立验证的菜单修复。
- #10 输入：草稿 PR #18，`38eab8a09ee008aa50270a136a3ac4bedd1dfa37`。
- 共同基线：`fd09d6b298aae080ff5552f2b648738cf3823e40`。
- 独立分支：`codex/integration-issue10-11`，从 #17 新头合入 #18；不写入原 Windows 验收工作区。
- 已确认依赖顺序为 `main → #13 → #14 → #15 → #16 → #17`；#17 已包含前四个 PR，不重复应用它们。整合候选以 #17 为审查基线，最终入 main 的方式仍由维护者决定。
- 新输入出现 15 个文本冲突：历史表中的 14 个文件，加上 `src/ui/workspace/useThinkingIntents.ts`。下方 14 文件清单只代表旧输入。

冲突处理同时保留 #17 的可见层级、首次及后续尺寸修正、中文编辑稳定宽度、语义翻译、整行点击、菜单与焦点边界，以及 #18 的动作契约、Angle 去重、Continue 近源放置、完整阅读和作者回应。

接缝修复包括：运行时同时传递当前可见集合和实测卡片尺寸；继续建议同时避让固定 UI 并为阅读动作留出空间；每次卡片尺寸变化仍可以修正未手动放置的建议；阅读/回应动作尺寸只参与 Hub 布局，不写入卡片碰撞缓存、正式坐标或框选；新请求过滤隐藏选择，已保存的作者回应草稿仍保留其冻结引用。

选中内容优先，`derivedFrom` 来源与 `organizingParentId` 归属分开。AI 输出仍在临时状态，只有用户 Keep/Ignore/Apply 才作决定；生成、纠正建议、阅读和回应均不自动移动原想法或相机。

TypeScript、266 项离线检查、54 文件 / 400 项单元测试和生产构建通过，既有大块体积警告保留。首次完整浏览器运行为 273 通过 / 18 失败 / 12 既有开发界面跳过；修复后完整复跑所有失败所属套件及相关焦点/几何用例，93 项全部通过。逐项标题核对后的最终证据覆盖 307 个不同用例：295 通过、12 既有跳过、0 未解决失败。这是完整运行加受影响套件复验的结果，不宣称一次最终全量运行全绿；原始失败、环境错误和最终日志均保留在忽略目录。

断言适配保留用户边界：空结果采用 #18 精确中文文案，保留零输出、单次请求和项目不变；operation-feedback 使用唯一语义定位；新增层级归属文案后，正文精确断言定位 `.thought-preview p` 和稳定 ID；取消回应比较完整持久化项目，而非旧演示的硬编码 6 张挂载卡片；重开前等实际 IndexedDB 提交；关系流程使用明确的公开作者夹具，不恢复 #10 已删除的泛化演示关系。新增分支按钮的高度单独核对，正文完整边界、卡片锚点和宽度仍精确相等。Atlas 用真实选择后缩小视图，不强制穿透已有 frontier 标签。新增三档阅读/回应回归和一项悬停/固定菜单回归。没有新增跳过、重试或宽泛匹配。

整合专属修复使阅读/回应按钮在低缩放下保持 32 屏幕像素高；动作尺寸只影响 Hub 避让，Continue 为其预留底部 64 屏幕像素；保存作者回应明确保留相机。独立 #17 菜单后续修复已推送至 `33bd1a7`，独立生产构建、344 项单元、266 项离线和 11 项浏览器回归通过；详见 [NATIVE_UX_ACCEPTANCE](NATIVE_UX_ACCEPTANCE.md#整合复核发现的独立后续修复)。

三项渲染复核在当前整合生产构建、1280×720、浅色/减少动态和深色/普通动态通过：设置显示“直接连接 OpenAI API。”及“输出长度上限”；建议汇总实际按钮宽 558px / 容器 560px，右端点击及 Space/Enter 可展开；Atlas 的 Ghost 数量为 0，只保留汇总入口，原卡片坐标和相机在受控生成过程中保持不变。当前截图与尺寸记录保留在忽略的验证目录。Windows Playwright 脚本仅适配 shell、工作目录、隔离端口和证据路径，worker 为 1、重试为 0。

草稿整合 PR [#19](https://github.com/NekoMint-Labs/Diffusion/pull/19) 的首轮远端 CI 在 `92b6830` 基础检查通过，但交互 2/3 分片暴露 `objectLanguage` 的“重做后忽略”定位问题。本地保留追踪复现：DOM 第一张剩余 Ghost 在边缘被裁切，自动点击卡片的可见中心落到其移除按钮，建议先被移除，随后等待不存在的 Ignore 按钮超时。测试现在使用稳定 ID，选择屏幕内正文中心未受遮挡的建议，普通点击正文后明确断言 selected 和 ghost 状态，再操作 Ignore。全部原有原位保留、完整持久化记录、撤销/重做和重开边界保留；普通/减少动态各 3 轮共 6 项通过，零重试。原始 CI 日志、诊断失败追踪与通过日志均保留；没有因此修改产品行为或提高超时。最终远端完整检查以 PR #19 当前头的 Actions 结果为准。

这里的浏览器验证使用公开受控响应，不能代替真实模型质量、Windows 系统缩放、IME、凭据及安装包运行验收。#12 同学继续负责原生验收；本候选不合并 PR、不关闭 Issue。

## 历史预检：等待 #17 原生修复提交

以下是旧 #17 `943fd8e` 的独立预检，并非新整合候选的结果。历史记录中的“本轮”、草稿状态、14 文件冲突和三项缺陷均只适用于该输入。

## 本轮状态

- #11 已发布输入：PR #17，`943fd8eddab19f0878c811e64deaf28cefb3fded`。
- #10 已发布输入：草稿 PR #18，`38eab8a09ee008aa50270a136a3ac4bedd1dfa37`。
- 共同基线及当前 main：`fd09d6b298aae080ff5552f2b648738cf3823e40`。
- 隔离工作区分支：`codex/integration-issue10-11-preflight`，从 #17 已发布输入创建；没有合入 #18。
- #11 的 Windows 验收修复仍在原工作区本地修改中，计划提交到 #17，尚未提交或推送。它属于本次整合的 #11 输入，不改动 #10 模型质量逻辑。
- 用户要求：正式冲突处理等待这批修复的新提交；继续完成不依赖新代码的复核与反馈。
- 未改动原工作区的产品源码或未提交修改；PR #17/#18 保持草稿、未合并，Issue #10/#11 保持开放。

维护者在 [#17 的原生验收反馈](https://github.com/NekoMint-Labs/Diffusion/pull/17#issuecomment-5965659276) 中要求原生修复完成并再次试用 Windows 构建后才合并 #17。

## 顺序与正式整合输入

逻辑依赖及后续审查顺序是：

`main → #13 → #14 → #15 → #16 → #17（包含待提交的原生修复）`。

Git 祖先关系已逐项核对。#17 头已包含 #13–#16，不应在整合分支中再次重复应用前四个 PR。

正式整合时，从完成提交和推送后的 #17 最新头创建独立分支，再合入 #18 的约定提交。先记录双方完整 SHA 和共同基线，重新计算冲突，再开始处理。当前 14 文件清单只适用于上述旧输入，不能推断新 #17 仍恰好有 14 个冲突。

这个顺序不表示现在合入 main。最终如何合并堆叠 PR 由维护者选择；如果前序采用 squash/rebase，后序需更新 base 并检查差异，避免把旧祖先的改动重复引入。

## 已复现的 14 个文件冲突

使用只计算合并树的命令，未改变工作区或进入未完成的 merge：

```powershell
git merge-base 943fd8e 38eab8a
git merge-tree --write-tree --name-only 943fd8e 38eab8a
```

命令报告冲突属于预期结果。生成的树含冲突标记，不能用于构建或试用。

| 文件 | 共同处理时必须保留的内容 |
|---|---|
| `docs/ACCEPTANCE_MAP.md` | 保留双方按提交区分的证据，以及真实模型/Windows 尚未完成的验收项；加入整合后的新证据 |
| `docs/ARCHITECTURE.md` | 合并来源/归属边界、用户回应和完整阅读入口的职责；保持单一相机和单一焦点协调 |
| `src/ai/runtime.ts` | #18 动作输出契约、Angle 去重及空结果反馈；#11 请求状态/反馈；禁止借空结果重发请求或提交正式状态 |
| `src/field/Field.tsx` | #11 层级、查找/中文编辑修复和可见投影；#18 阅读/回应入口及独立动作尺寸；使用一个测量/修正流程 |
| `src/field/interactionHygiene.ts` | #11 初次绘制及后续尺寸变化时的避让；#18 视口约束；手动放置的 Ghost 不再自动修正 |
| `src/field/spatial/collision.ts` | 合并严格 UI 排除区域和视口包含要求，明确参数；保留用户主动拖动的独立重叠规则 |
| `src/field/spatial/placement.ts` | 合并实测尺寸、继续思考的距离/阅读动作空间，以及 #11 当前可见层级与安全区；不自动移动已有想法或相机 |
| `src/locales/zh.ts` | 保留双方用户可见文案；接入 #11 待提交的语义翻译键，防止恢复动态英文说明 |
| `src/ui/Workspace.tsx` | 同时接入 connectionStyle、阅读/回应、归属、原生修复；保留 #18 延后菜单的取消保护 |
| `src/ui/field.css` | 合并 #11 语义缩放、材料与完整点击范围；保留 #18 阅读/回应动作空间，不把动作尺寸并入正式卡片几何 |
| `src/ui/surfaces/surfaces.css` | 同时保留 #11 设置/子菜单/中文布局和 #18 完整阅读/异步 Organize 面板的视口约束 |
| `src/ui/thought/ThoughtView.tsx` | 合并层级、展开/折叠、编辑稳定宽度、首次测量、阅读/回应；远景禁止由 ghost/selected 无条件恢复全部细节 |
| `src/ui/transient.ts` | Surface 联合类型同时保留 `lineage` 和 `thought-reader`；沿用 transientEpoch 和统一焦点协调 |
| `tests/unit/scopePlacement.test.ts` | 保留双方几何断言，并覆盖合并后的动作尺寸、菜单和视口约束；不删断言或用重试/跳过掩盖失败 |

无文本冲突也需要联查的接缝：

- #18 `ContextPacket.continuations` 是可选的新请求字段；严格旧网关可能拒绝。前端、`packetSchema` 与部署网关必须匹配。
- 上下文继续使用 `derivedFrom` 表示原始来源；不得用可变的 `organizingParentId` 替换它。选中回应仍是主体，来源只是有界背景。
- #18 `useThoughtMeasurements` 的一次修正策略不能取代 #11 后续 ResizeObserver 的修正，否则异步长结果可能再次重叠。
- #18 `deferMenu` 的后续 pointer/key 取消保护，需要与 #11 子菜单、焦点返回、中文组合输入一起验证。
- #18 的阅读/回应入口可能给远景重新加动作和标签，需要遵守 #11 的语义缩放规则。

## 三项体验复核

本轮在已发布 #17 的生产构建上使用隔离 Chrome 配置、1280×720、减少动态和公开受控响应，未使用凭据或真实模型。#18 未修改 AISettings、SuggestionReview、RootReview 和 hierarchyDisclosure，因此它不会单独修复这些 #17 问题。以下不代表待提交的原生修复结果，也不代表两分支合并后的结果。

| 项目 | 实测/源码事实 | 整合后复验目标 |
|---|---|---|
| AI 设置措辞 | 中文显示“直接使用你的 OpenAI 账户”，密钥说明仍是英文 `Create a key at platform.openai.com...` | 改为准确的 API 连接措辞；提供商元数据保存网址等事实，显示文案走稳定语义键；普通路径保留提供商/密钥/模型/主动测试；输出上限不冒充思考深度 |
| 建议汇总整行点击 | 容器 560×42px，按钮约 121×32px；最右端点击不展开；聚焦按钮后 Enter 展开、Space 收起 | 整个可见横条由同一按钮拥有；指针、hover、focus、Enter/Space 作用范围一致；展开后的保留/忽略按钮独立 |
| 远景建议细节 | Atlas 同时出现一张建议卡片和一个汇总入口；卡片有正文、层级/上级、AI 标签和删除控件；源码让 scopeIds 对象绕过层级过滤 | Local 完整、Neighborhood 摘要、Atlas 汇总；完整卡片与汇总互斥；只允许明确编辑/查找/定位目标临时显示；隐藏对象不加入框选、普通适应或不适当的碰撞计算 |

RootReview 的按钮同样没有占满其容器，已列入整行命中范围的共同复验；本轮未另造密集根节点 UI 样本，不将其称为浏览器实测。

同一受控生成中，原卡片位置和相机均未变化，页面没有未捕获错误。局部通过不能替代完整产品边界验收。

#11 的本地原生修复已在处理这三类问题。其提交前，不复制或替它提交，也不重复修同一处；之后按新 SHA 验证。

本地证据位于 `verification/integration-preflight/`：`probe.mjs`、`review-result.json`、`ai-settings.png`、`atlas-suggestions.png`。生成内容保持 gitignored，本记录不发布用户的私有附件或录屏。

## 已完成验证与后续门禁

- #18 在 `38eab8a` 的 GitHub Actions 已核对：CI、三个 interaction 分片、production backgrounds、E2E gate 六个 job 都是 success。
- 本轮 #17 TypeScript 检查和生产构建通过，保留现有 bundle-size 警告；交接文档 `git diff --cached --check` 通过。
- 三项浏览器复核完成，截图已查看；这不是 Windows 系统缩放、IME 或真实模型资格认证。
- 正式合并尚未开始，因此没有“整合版六项检查通过”的结论。

正式整合完成后，先运行 typecheck、check:offline、unit、build、完整 E2E 和 diff --check；使用仓库声明的工具链，Windows 离线英文 fixture 必要时沿用已知 `NODE_OPTIONS=--no-experimental-global-navigator`。不改断言、不新增跳过或重试。

共同试用至少覆盖：选中回应后的 Continue/Angle/Ask/Relation/Organize/Diffuse、Keep/Ignore、停止与迟到结果、修改归属后原始来源保留、完整阅读/回应草稿、异步长 Organize、中文编辑/Find、菜单四边四角、逐层缩放、重开持久化。比对已有想法坐标和相机，只有用户明确操作允许改变它们。

#12 同学继续负责 Windows 原生与实际使用验收。真实模型质量、原生系统缩放/IME/凭据/打包运行等，只由对应真实证据升级状态。检查和共同体验完成前保留草稿 PR 与开放 Issue。

## 反馈交付

已通过正常登录的 GitHub 网页向 C 同学发布反馈，并通过评论读取确认作者 `fill-silence`、正文及链接：[PR #18 反馈](https://github.com/NekoMint-Labs/Diffusion/pull/18#issuecomment-5968395203)。反馈说明正式冲突处理等待 #17 新提交。本轮没有合并或关闭 PR/Issue。
