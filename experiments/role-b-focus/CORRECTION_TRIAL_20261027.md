# 纠正续接与克制输出试用（2026-10-27）

## 本轮目标与依据

用户反馈三轮阅读、留下、刷新及换话题试用均可接受，本轮样例未发现串线。截图中的重点把“更像是”加强成“说明”，且明确要求一个方向时出现三条候选。这些是有限样例，不作为所有模型或长期使用的保证。

按DEVELOPMENT_B关于用户控制、有限历史和有价值探索的方向，本轮只升级当前readingTrial=1路径：让已关联的用户纠正进入有界上下文优先级，减少凑数候选，保留不确定性，并允许没有新发现时解释原因。沿用当前原画布与4175 origin，未引入搜索、多Agent、跨Field、持久化摘要或额外审核面板。

## 实现及边界

- thinkingGuidance.ts从已有ContextPacket.scope/local及continuations/ancestry建立每条所选因果路径上的authored节点和距离。没有全局“最后一句获胜”、没有读取邻近卡片或其他Field；相同距离或独立分支的冲突留给模型条件化说明。原文只在原packet中出现，guidance只传引用和距离。
- readingResponse.ts在原有一次field-answer请求中附带上述提示，要求较近用户纠正优先、旧限制中未被改变的部分继续适用，并在有用时说明旧建议为何需重新考虑。Keep不等于认同模型建议。实际是否理解自然语言变化仍需真实模型试用。
- 候选数量是上限。对当前Ask文本或唯一选中authored卡片中的明确中英文“给我一个/两个方向”等独立短句，解析1至5的较低上限；一条输入多个直接数量要求以最后一个为准，并受界面上限约束。引用、否定、含糊或不匹配表达不猜测，交由模型理解。旧祖先的数量要求和模型/来源文本不作为硬上限。
- 模型返回的整个语义列表先按原schema/action校验，再保留排在前面的至多指定条数；无需额外排序或摘要请求。不靠关键词判断哪条建议在科学上更好；模型被要求把最有用的排在前面。
- 重点生成要求保留“更像是/可能/may”等限定语；一条保守的语言检查发现原文含明确限定而重点完全没有时，忽略展示重点，继续显示原文预览。手动提炼同样拒绝此类重点。该检查不是语义等价证明，不能保证所有否定、条件和不确定性都未丢失；不自动重试，不改原文。
- 空intents可选pause.reason（240 Unicode字符上限），仅作为提示行显示，绝不作为Thought保存；非空结果中的pause和无效pause被忽略。若结果被原权限/质量/重复过滤清空，不借用模型pause解释过滤原因。
- Workspace的继续想请求改为up to，明确可以更少或零条。原始Core/project schema和手工回应保存机制不变，旧卡片保持全文。

## 试用步骤

1. 先留下想保留的临时候选，再刷新http://127.0.0.1:4175/?locale=zh&readingTrial=1。
2. 选中一张已留下的学习工具建议，点“补充我的想法”（若是问题卡片，入口为“回应这个问题”）。
3. 输入：我改变主意了，不做作业辅助，改成考前复习；每周投入从四小时改为两小时。不接触学生私人资料这一点保留。请给我一个方向。
4. 点“保存回应”。这是本地保存，不会自动调用模型。然后选中新产生的回应卡片，再点“继续想”并开始。
5. 检查是否只出现一条，是否围绕考前复习/两小时，是否保留隐私限制，是否仍坚持旧作业方案。旧卡片应仍可阅读完整原文。
6. 在回应上再补充：我刚才只是设想，还没确认学生有这个问题。请给我一个方向。检查新回答是否继续把猜测当事实。
7. 再次继续想时观察是否带来新内容，或在缺少依据时说明暂停原因。不是每次都必须暂停，也不保证一次就能触发空结果。

用户只需反馈：做到了第几步、有没有沿用旧前提、条数是否符合要求、有没有把猜测说成事实；附图即可。

## 验证

- pnpm exec vitest run --maxWorkers=2：79文件736项通过（24.81秒）。
- pnpm run build：应用typecheck与生产构建通过。最终仅澄清提示中Keep是保留而非用户纠正/事实确认，随后重新构建当前预览。
- pnpm run check:offline：通过，包含Core类型、locale、离线契约及source-size。
- ROLE_B_CHROMIUM使用本地Chromium，ROLE_B_BROWSER_OUTPUT使用绝对输出路径，pnpm exec playwright test --config experiments/role-b-focus/playwright.trial.config.ts --reporter=list,json：最终14/14通过（41.2秒），0 skip/flaky/unexpected，runner errors为空。浅色/深色的纠正卡片与单候选截图已实际打开核对。
- 检查包括旧10项阅读回归、补充回应后保存/刷新/继续的两种主题、原文不改、只发一次生成请求、原文不确定而重点绝对化时降级、空结果停止原因显示。新单元还覆盖恶意多余语义不能藏在数量上限后面、独立分支无全局新旧优先、引用/否定语句不当成数量指令等。
- git diff --check通过；新增文件另查行末空白。当前仅为本地试用升级，未更新PR 81或自动推送。

所有自动化provider/browser检查使用注入响应和独立浏览器上下文，无用户凭据读取或收费模型调用。测试可证明上下文传递、硬上限、原文保存和反馈显示，不能证明真实模型已稳定理解纠正。

## 原始问题与修正

- 初次Node写入正则时模板字符串吞掉反斜杠，立即检查源码发现，执行构建/测试前已用String.raw修正。
- 第一次定向单元4文件55项通过，typecheck/build通过。
- 第一次浏览器14项中13通过、1失败：空结果原因已显示在role=status中，但新测试getByText exact把提示行的既有关闭按钮也算入整行文字而定位失败。error-context保留了原因全文；改为对role=status断言完整原因，不放宽等待、不加重试、不改产品反馈。原日志correction-browser.log保留。

- 第二次浏览器同样13通过、1失败：角色status还包括既有空间操作状态，新的role定位产生strict-mode多匹配。依据实际DOM精确限定.notice[role=status]后重跑；不更改产品逻辑。原日志correction-browser-final.log保留。


## 用户真实反馈与提交决定（2026-10-27）

用户截图显示：已保存的用户纠正从作业辅助转到考前复习、四小时改两小时、隐私限制保留；可见新候选仅一条，正文预览提到每周两小时、考前复习和不碰私人资料。旧建议仍在。这是一次真实交互的正向样例；截图没有展开新候选全文，不能据此验收完整内容、语义忠实性或长期可靠性。“正文预览 · 尚未提炼”可能来自缺失/非法重点或保守限定语检查，仅凭图片无法确定是哪一种。

用户授权提交，由本对话决定追加原PR或新开。当前PR 81仍OPEN、未有review，本轮属于相同readingTrial的后续完善，决定追加PR 81并更新其标题与说明。提交前在独立交付工作树复验；原4175用户页面及持久化数据保持原位。后续可选试验是再补充“尚未确认学生有这个问题”，观察是否避免将假设当事实；不要求重复本次已成功例子才能提交。


## PR 81交付分支复验（2026-10-27）

从原试用提交8055feb移植到原PR 81分支，产生0581b74。无冲突，保留上游generation Undo和既有PR文档。

- pnpm run build：typecheck及生产构建PASS，既有大包提示保留。
- pnpm exec vitest run --maxWorkers=2：80文件750项PASS（27.08秒）。数量高于本地736是交付分支含上游generation Undo等既有检查，不能混作同一套件。
- pnpm run check:offline：PASS。
- ROLE_B_BASE_URL=http://127.0.0.1:4187，ROLE_B_CHROMIUM为本地Chromium，ROLE_B_BROWSER_OUTPUT为交付树下绝对results/correction-delivery目录；pnpm exec playwright test --config experiments/role-b-focus/playwright.trial.config.ts --reporter=list,json：18/18 PASS（39.1秒），0 skip/flaky/unexpected，runner errors=[]。包括14项阅读/纠正检查及4项上游generation Undo。
- git diff origin/feat/b-field-answer-preview --check：PASS。

本地完整E2E未重跑；新提交完整CI由GitHub触发。原PR的全绿结论只对应此前94cb595，不能沿用为新头结论。当前用户试用页面4175仍来自原集成目录，未操作刷新和存储。本轮发布只追加原PR 81，不合并。日志保存D:/DiffusionWork/b-correction-delivery-{build,unit,offline,browser}.log；浏览器截图在ignored results/correction-delivery下，CI亦会生成并上传诊断artifact。
