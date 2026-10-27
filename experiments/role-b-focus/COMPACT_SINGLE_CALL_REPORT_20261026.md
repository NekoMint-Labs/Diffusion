# 精简卡片与一次生成报告

日期：2026-10-26，Asia/Shanghai。工作区：trial-continuation-20261026；原HEAD a0b2a8a；保留并继续已有未提交试用代码。

## 用户反馈与评估

四图记录了同一学习工具话题：返回内容涉及四小时、小范围验证与真实作业。用户实际观察新主题没有串线，本轮不把串题列为首要修复。旧重点模型通常能保留主题和部分前提，但把原文较短地改写后又列相同条件，使卡片和阅读器重复。第三幅还把“答案质量可以后置”重复列为条件；结构合法不能证明这种建议合理，更不能用作通用事实。

因此，本轮把摘要降为长文的可选阅读辅助，短文不重复总结；重点中必须自带必要前提，全文始终为原始记录。没有重新宣称已验收所有条件继承、长期隔离或模型质量。

## 实现

- readingFocus.ts / ThoughtView.tsx：120 Unicode字符预算。短文完整显示；长文只显示point；移除point+conditions的卡片拼接。
- FocusReading.tsx：原文默认展开；关联问题及卡片重点默认收起；仅长文缺少重点时提供显式手动提炼。
- readingResponse.ts：复用现有provider.structured，通过field-answer一次生成intents[].text与可选reading.point。动作解析保持原parseSemantics及AIRuntime permissionFor、semanticQualityAllowed、重复过滤和范围复核。
- runtime.ts：用可选响应策略替代生成后追加摘要钩子；一次尝试只记一次requestCount。展示附着发生在发出候选前，停止、编辑范围后迟到结果不发布。
- contracts.ts / schemas.ts / direct.ts / gateway.ts：加入field-answer；保留用户选定思考深度。其他structured抽取任务仍遵守原上限。服务返回的模型身份保留到正文provenance；Gateway未报告实际模型时继续未知，不冒认。
- readingFocusStore.ts：24条内存缓存沿用原边界。没有改项目Schema、凭据或用户持久化数据。

## 验证

- 最初5文件53项相关单元测试通过；覆盖原文、缓存、上下文与有界祖先。
- 中间完整单元套件77文件710项通过。
- 深度修正增加5项直连/Gateway客户端/真实本地服务路由的注入验证，73项相关检查通过。确认完整回答保留deep预算，摘要任务仍降到standard；未调用外部网络。
- 第一次浏览器检查10项通过（20.6秒）：长卡片仅重点、短卡片无重复提炼、原文直达、关联默认收起、Keep保存全文、继续想使用全文、无自动额外请求、非法展示元数据降级、手动取消迟到结果、原非试用路径回归。深浅主题和390px阅读器均无溢出。实际打开3张截图核对。
- 最终全量单元：78文件715项通过（--maxWorkers=2，19.93秒），没有修改断言、testTimeout或自动重试。
- 最终浏览器：10项通过（18.0秒），零skip/flaky/unexpected，runner errors为空；输出为results/compact-single-call-final。最终构建已更新4175服务目录dist。
- 应用TypeScript检查与生产构建通过；check:offline通过（包含Core类型、locale、315项离线测试和源码大小）；git diff --check通过。

## 原始失败与修正

- 初次check:offline误扫描了本轮备份中的.ts/.tsx快照，报告缺失相对依赖。为不将备份当生产代码扫描，保留每个备份并改为.snapshot扩展；未改检查脚本或屏蔽生产校验。
- 第一轮浏览器结果目录因相对config目录解释而嵌套，记录仍保留在experiments/role-b-focus/experiments/role-b-focus/results/compact-single-call。最终使用绝对输出目录纠正位置。
- 新增wire单元模拟第一次缺HttpSend.kind，第二次误写fetch（允许值为webview/native），导致两次构建类型检查失败；补齐合法webview值后第三次构建通过。保留final/final2/final3日志，不修改生产传输契约。
- 随后全量单元运行在一次异常长的执行/模块加载窗口内，原始记录3文件失败、707项通过：relationCommit与surfaceMotion为worker模块fetch超时，mockRelations一项计时超时；耗时3736.85秒。记录保留于compact-single-call-unit-final.log。未改变产品逻辑、断言或timeout，降低maxWorkers=2重查后715项全通过。不能把原失败记作初次绿。
- 生产构建沿用既有大包提醒；本轮不扩展为打包拆分任务。

## 用户继续试用

先Keep想保留的临时建议，再刷新同一地址。新运行一次Continue：短回答应完整显示；长回答应只显示一句重点，点击阅读原文直接看到全文。旧Keep卡片刷新后不会自动重扫和收费摘要；长文可显式提炼一次。原文窗口里的“关联问题”只有点击才展开。不新增搜索、多分支或对照实验。

当前只更新本地试用构建。未自动提交/推送本轮或修改PR。测试为fixture证明工程流程，真实新模型语义质量尚未验收。


## 后续缺陷修复：留下后的阅读全文入口

用户试用发现短回答“留下”后没有“阅读原文”。入口原先依赖提炼重点或截断状态，短文完整显示时条件不成立。试用模式现在对所有已选卡片显示阅读入口，包括刷新后重新选中的卡片。

验证：pnpm run build通过；Playwright定向套件10/10通过（23.4秒，零skip/flaky/unexpected，runner errors为空）。覆盖长文Keep后可读，短文候选和Keep后可读、Keep后刷新仍可读、键盘Enter打开，浅色/深色均覆盖。请求计数确认阅读没有增加模型调用。浅色/深色截图已目视确认。git diff --check通过。浏览器响应为人工注入，不代表真实模型质量。构建沿用既有大包提醒。

证据：results/kept-reader-build.log、results/kept-reader-browser.log及results/kept-reader/截图。4175服务所用dist已更新；未操作用户页面刷新和用户存储。

文档更新首次经PowerShell管道调用apply_patch因UTF-8参数要求失败，文件未改变；随后用Node UTF-8读写完成。


## PR交付基线复验（2026-10-26）

用户确认修复后授权提交PR。为避免携带本地集成历史，以最新origin/feat/b-field-answer-preview（5ab6b20，PR 80）建立独立交付分支feat/b-compact-reading-single-call，仅移植本轮阅读试用改动。保留上游生成撤销、替换候选恢复逻辑及当前useThinkingService参数；原4175试用目录和用户数据未切换。

- pnpm install --offline --frozen-lockfile：通过。
- pnpm run build：应用类型检查及生产构建通过；保留既有大包提示。
- pnpm test -- --maxWorkers=2：79文件729项通过（6.33秒）；此处记录实际命令，不依赖它是否将workers选项传递给runner。
- pnpm run check:offline：通过。
- ROLE_B_BASE_URL=http://127.0.0.1:4187，pnpm exec playwright test --config experiments/role-b-focus/playwright.trial.config.ts --reporter=list,json：阅读/预览10项通过（23.3秒）。
- 同一配置按tests/e2e/generationUndo.spec.ts筛选：生成撤销4项通过（12.7秒）。两次均0 skip/flaky/unexpected，runner errors为空。
- git diff origin/feat/b-field-answer-preview --check：通过，包含新增文件。

只声称定向浏览器验证；完整浏览器套件交给PR CI。交付浏览器使用独立4187 origin与注入响应，没有读取用户凭据或调用真实模型，没有进行原生打包验收。截图按Playwright标准info.outputPath生成，CI运行后由既有工作流上传到诊断artifact；本地日志、备份及用户反馈图片未提交。当前试用默认关闭，保留readingTrial=1启用方式。

交付过程原始问题：新文件首次进入Git后发现一处行末空格并修正；移植时runtime和Workspace出现两处文本冲突，按最新基线保留撤销及hook签名，完成上述复验。浏览器首次命令误用不存在的--test-match参数，在启动测试前退出，随后使用已有config正常运行，未调整断言或增加重试。应用内managed worktree工具因聊天根目录不在Git仓库而失败，改用仓库内git worktree add建立独立交付目录。
