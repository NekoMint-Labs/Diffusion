# Diffusion — Phase 3E Implementation Report

> Phase 3E — AI Behavior & Result Semantics
>
> 本轮严格围绕一次用户动作后的 AI 行为、结果语义、空间呈现与 proposal lifecycle；未进入 Phase 4 的长会话编排。

## 1. Files changed

与用户上传的原始源码包逐文件比较，本轮改动 28 个路径：

### AI / semantic pipeline
- `server/app.ts`
- `src/ai/context.ts`
- `src/ai/diffuse.ts`
- `src/ai/direct.ts`
- `src/ai/mock.ts`
- `src/ai/prompt.ts`
- `src/ai/runtime.ts`
- `src/ai/schemas.ts`
- `src/core/controller.ts`
- `src/core/demo.ts`
- `src/core/model.ts`
- `src/core/semantics.ts`

### Field / presentation / lifecycle
- `src/field/Field.tsx`
- `src/field/phenomena/StructureOverlay.tsx` — new
- `src/field/spatial/placement.ts`
- `src/ui/Workspace.tsx`
- `src/ui/resultSemantics.css` — new
- `src/ui/scope/ScopeHub.tsx`
- `src/ui/surfaces/OrganizeSurface.tsx`
- `src/ui/surfaces/surfaces.css`
- `src/ui/theme.css`
- `src/ui/thought/ThoughtView.tsx`
- `src/locales/zh.ts`

### Regression / dogfood
- `tests/offline/ai.test.mjs`
- `tests/offline/phase3c-spatial-grammar.test.mjs`
- `tests/offline/phase3e.test.mjs` — new
- `scripts/phase3e-dogfood.mjs` — new
- `docs/language/runs/phase-3e.md` — new

## 2. Existing AI action architecture discovered

原实现的真实链路不是五套独立动作：

- **Continue**：Action Preview → `Workspace.runPreviewAction()` → 多次 `runtime.run('diffuse', ...)` → generic semantic output → generic Ghost。
- **Generated Ask**：和 Continue 一样走 `runtime.run('diffuse', ...)`，只是传入的 prompt 文案不同。
- **Another Angle**：Action Preview → `DiffuseSession` → generic `diffuse` step grammar。
- **Relation**：`runtime.run('probe')` → `surface_relation` → transient `Phenomenon`，这一条原本已经比较清楚。
- **理一理**：`OrganizeSurface` → generic `runtime.run('diffuse')` → 从结果里只保留 Relation candidate；没有真正的 Structure proposal identity。

因此 Phase 3D.1 已经把“入口”分清，但 AI 后半条链路仍发生语义塌缩。

## 3. Prompt / contract ownership before the change

变更前：

- `CORE_CONTRACT` 提供通用 AI 边界。
- `src/ai/prompt.ts` 主要是一份通用 JSON output contract。
- Direct provider 和 server provider 都使用相同的 generic semantic instructions。
- Continue / generated Ask 的差别主要来自 `Workspace` 拼出来的一段 prompt 文本，而 runtime 本身不知道结果应该是 Continue 还是 Question。
- Another Angle 的步进差异来自 generic Diffuse 的 angle list，并没有 action-level semantic boundary。

结果是：provider 即使返回了“合法”的 generic possibility，也很难保证它是用户点击的那个动作真正应该产生的东西。

## 4. Continue implementation

Continue 现在是独立 `UserIntent.kind = 'continue'`：

- runtime 只允许 `surface_possibility`。
- provider instruction 明确要求“沿现有轨迹向前一步”。
- 禁止默认总结、改写、提问、挑战、换 framing。
- 1 / 3 / 5 直接成为单次 generation 的 `maxCandidates`，不再循环调用 generic diffuse。
- 结果带 `proposalKind: 'thought'` + `proposalAction: 'continue'`。
- spatial placement 使用 `continue` mode，优先延伸现有 scope 的轨迹。
- waiting activity 使用已有 `unfold` grammar。

## 5. Another Angle implementation

Another Angle 继续复用成熟的 `DiffuseSession` 多步执行壳，但加入了明确的 `mode: 'angle'`：

- 每一步 runtime kind 变成 `angle`，而不是 generic `diffuse`。
- runtime 只允许 `surface_possibility`。
- prompt contract 要求改变 framing，而不是换句话说。
- 多结果用轮换 reframing axes：assumption reversal / opportunity cost / time horizon / alternative path / optimization target。
- 每一步只接受 1 个 result，因此 `steps = 1 / 3 / 5` 就是真正的不同 framing 数量。
- 结果带 `proposalAction: 'angle'`。
- placement 使用 `branch` mode；activity 保留 `radiate`。

## 6. Ask implementation

这里保留了 Phase 3D.1 已经正确的产品区别：

- 主菜单 **Ask** 仍然表示“用户自己写一个问题”，继续走已有 composer。
- 次级 **Ask a question / 让 AI 提问** 才进入 Phase 3E 的 generated-question path。

Generated Ask 现在：

- 使用独立 `question` intent。
- runtime 只接受 `surface_question`。
- schema / permission / runtime 都认识 question semantic type。
- 结果带 `proposalKind: 'question'` + `proposalAction: 'question'`。
- static rendering 有问号和 question proposal label，不依赖动画识别。
- placement 使用 question/orbit-like candidate order。
- next actions 为 **回答 / 留下 / 忽略**。
- “回答”复用原有 scoped writing composer，不创建 chat subsystem。

## 7. Relation implementation

Relation 保持原有 proposal-first bridge model，而不是被重写：

- `probe` runtime 现在严格只接受 `surface_relation`。
- relation contract 明确要求短、具体、可扫读；优先 4–12 个中文字符或很短自然短语。
- runtime 不再接受 probe 中额外的 generic possibility。
- candidate 仍然是 transient `Phenomenon`，确认前不会进入 canonical relations。
- 原来的确认 / 修改 / 忽略 lifecycle 继续使用。

## 8. 理一理 implementation

“理一理”从“跑 diffuse 后捞几条 relation”改成真正的 transient structure proposal：

- 使用独立 `organize` intent。
- generation 只允许一个 `surface_structure`。
- structure 可以包含：
  - supported groups
  - supported relation overlays
  - short note
- groups 可以遗漏不适合分组的 Thought。
- 如果没有稳定结构，可以返回空 groups / relations + restrained note。
- `StructureOverlay` 只根据已有 Thought geometry 画局部虚线轮廓和 label；不会移动 Thought。
- `OrganizeSurface` 提供 **应用 / 换一种 / 取消**。
- “换一种”先 dismiss 旧 proposal，再发新 request；旧 proposal 不 commit。
- “取消”删除 transient structure 和它关联的 candidate phenomena。

## 9. Result semantic model

没有把四种 proposal 都升级成新的永久数据库对象，而是采用最小 discriminated model：

- Thought proposal → transient `Ghost` + `proposalKind: 'thought'` + `proposalAction`。
- Question proposal → transient `Ghost` + `proposalKind: 'question'`。
- Relation proposal → existing transient `Phenomenon`。
- Structure proposal → new transient `SessionState.structures` / `StructureProposal`。

semantic protocol 新增：

- `surface_question`
- `surface_structure`

runtime 再使用 action → allowed result type 的白名单进行第二层约束。

## 10. Whether any new types were introduced and why

新增了：

- `AIProposalKind`
- `AIProposalAction`
- `StructureGroup`
- `StructureProposal`
- `ResultPlacementMode`
- `surface_question` / `surface_structure` semantic intent variants

理由：这些类型描述的是 **transient result identity / presentation lifecycle**，不是新的 canonical project ontology。

没有新增永久 Question、Structure、Cluster 数据库实体。

## 11. Spatial behavior changes

- Continue → trajectory / forward placement。
- Another Angle → branch placement。
- Ask → question/orbit-like placement。
- Relation → existing bridge candidate。
- 理一理 → local transient group outlines + relation overlays。

placement 仍走原有 collision / viewport scoring；没有强制水平布局，也没有 global auto-layout。

## 12. Motion changes

没有创建新动画系统：

- Continue → existing `unfold`
- Another Angle → existing `radiate`
- Generated Ask → existing `radiate`
- Relation → existing `bridge`
- 理一理 → existing `bridge`

Phase 3C 的 motion grammar 被保留；只更新了旧测试中“diffuse 才能 radiate”的历史假设，使它符合新的 action identity。

## 13. Reduced-motion handling

语义识别不依赖 motion：

- Continue：静态 solid left rule + label。
- Another Angle：静态 dashed left rule + label。
- Question：静态 `?` + question label。
- Relation：existing tentative relation style。
- Structure：静态 dashed group outline + label。

`prefers-reduced-motion: reduce` 下 proposal animation 被禁用，但上述 data-driven static identity 保留。

Phase 3E 样式放在独立 `src/ui/resultSemantics.css`，避免把已经很大的 `field.css` 推到 source-size 上限附近。

## 14. Proposal lifecycle changes

关键行为变化：

- 以前点击普通 Ghost 会自动 claim；Phase 3E generated result 现在**单击只选择 / inspect**。
- explicit Keep、drag、edit、Enter 等才表达 ownership / commit。
- Continue / Angle proposal 可：留下 / 继续想 / 换个角度。
- Question proposal 可：回答 / 留下 / 忽略。
- Structure proposal 只有 Apply 才能把当前架构真正支持的 relation primitive 确认进 canonical state。
- transient group label / grouping outline 不会偷偷变成永久项目结构。

## 15. Result next-action behavior

结果 surface 没有 action explosion：

- Thought proposal：3 个 contextual actions。
- Question proposal：3 个 contextual actions。
- Relation：沿用现有 concise relation controls。
- Structure：3 个 controls。
- AI proposal scope 不再额外显示 generic More，因此不会把所有可能动作堆在结果上。

## 16. Quiet Realism implementation

Quiet Realism 从文档进入真实 generation contract：

- shared language contract 明确 concrete > abstract。
- 明确保留“可能 / 好像 / 我觉得 / 有点 / 其实 / 说不上来 / 不太确定”等不确定性。
- 禁止自动心理解释、formal prose upgrade、over-summary、fake profundity。
- 高风险模板词作为 warning pattern，而不是 keyword filter。
- role-specific contract 继续约束每个动作自己的语言工作。

Deterministic Demo 也补了真实中文场景，避免用英文 generic output 假装做中文 regression。

## 17. Prompt architecture changes

没有造一份巨大的“一切都管” system prompt。

现在是：

`CORE_CONTRACT`
+
`shared JSON + Quiet Realism contract`
+
`action-specific contract`

Action-specific contract 分别拥有 Continue / Angle / Question / Relation / Organize 的行为边界。

Direct provider 和 server gateway 都调用同一个 `semanticInstructions(intent)`，避免两条 provider path 漂移。

## 18. Context assembly changes

- `maxCandidates` 上限从 3 调到 5，以真实支持 1 / 3 / 5。
- context tool vocabulary 加入 `surface_question` / `surface_structure`。
- action-scoped source permission 只在相关动作显式启用。
- Continue / Angle / Question 主要使用当前 owned selection；不会默认把整个 Field 塞给模型。
- Relation 仍围绕 selected pair。
- Organize 使用完整 selected set。

## 19. 1 / 3 / 5 semantics

- Continue：一次 provider request 返回 N 个 distinct continuation proposals。
- Generated Ask：一次 provider request 返回 N 个 distinct question proposals。
- Another Angle：DiffuseSession 的 `steps = N`，每 step 一个不同 reframing axis。
- Relation：没有被硬塞 1 / 3 / 5 semantics。
- 理一理：只返回一个 Structure proposal；“换一种”是用户主动再次生成，不是一次生成 N 套结构。

Action Preview 的 local 1 / 3 / 5 state 从 Settings default 初始化，但不写回 Settings。

## 20. Regression corpus results

新增 `scripts/phase3e-dogfood.mjs`，读取现有 `docs/language/regression.zh.json`，通过真实 `AIRuntime` + deterministic Demo provider 跑 action result pipeline。

生成：`docs/language/runs/phase-3e.md`

覆盖 6 个 one-Thought 中文主题：

- graduate school uncertainty
- graduate school exploration time / three-year cost
- HCI interest vs employment
- not wanting coding-heavy work
- project complexity increasing
- exploration vs stable direction

另覆盖：

- 2 Thoughts Relation
- 5 Thoughts 理一理

所有 transient-result 场景的 canonical-state check 均为 **YES**。

注意：这是真实 runtime pipeline 的 deterministic provider dogfood，**不是 live model benchmark**。

## 21. Representative before / after examples

使用未修改的原上传源码，实际复现旧 Demo runtime：

Input：

> HCI 我挺喜欢的，就是不知道以后工作怎么样

**BEFORE — Continue**

> Which part of "HCI 我挺喜欢的，就是不知道以后工作怎么样" is still an open question?

**BEFORE — Generated Ask**

> Which part of "HCI 我挺喜欢的，就是不知道以后工作怎么样" is still an open question?

两者实际可以完全相同，因为都进入 generic `diffuse`。

**AFTER — Continue**

> 如果岗位确实比较少，接下来可能就得看你愿不愿意为了喜欢的方向接受更窄的选择。

**AFTER — Another Angle**

> 也许真正要比较的不是 HCI 好不好找工作，而是你愿意用多窄的就业面换一个更想做的方向。

**AFTER — Ask**

> 如果就业完全不是问题，你还会犹豫 HCI 吗？

这组 before / after 来自实际 deterministic pipeline output，不是手写营销示例。

## 22. Dogfood scenarios

### One Thought
逐一执行：

- Continue × 3
- Another Angle × 3
- Ask × 3

### Two Thoughts

- HCI 我挺喜欢。
- 我又担心以后不好找工作。

Relation output：

> 喜欢，但不敢完全押上去

### Five Thoughts

- HCI 我挺喜欢。
- 我不太喜欢一直写代码。
- 我担心 HCI 以后不好就业。
- 读研可能让我多一点时间探索。
- 三年时间又挺长的。

Structure proposal：

- 想靠近 / 想避开的工作：前两条
- 现实压力：就业担心 + 三年时间
- “读研可能让我多一点时间探索”被**故意留在分组外**
- candidate relation：喜欢，但不敢完全押上去
- note：想继续探索，但又怕探索太贵

## 23. Dogfood findings

1. Continue / Angle / Ask 的实际 output 已经不能原样互换。
2. Generated Ask 有独立 question identity，不再伪装成普通 Thought。
3. Relation output 可以保持短 label，不需要 mini essay。
4. 理一理现在可以显出结构，同时允许“不把所有东西分组”。
5. AI result 出现后 canonical Field 保持不变。
6. Structure Apply 只提交架构已经支持的 relation primitive；不会把 transient grouping 偷偷变成永久 truth。
7. 当前最重要的未验证项不是逻辑，而是 **live model quality + browser visual dogfood**，原因见 Blocked gates。

## 24. Tests added / changed

### `tests/offline/ai.test.mjs`
新增行为测试：

- Continue / Question result identity 与 counts。
- generated proposal 出现时 canonical project 不变。
- Organize transient before Apply。
- dismiss / Cancel 等价路径 canonical 不变。
- Apply 只确认 supported relation。

### `tests/offline/phase3e.test.mjs`
新增：

- action semantic boundary。
- 1 / 3 / 5 preview wiring。
- local preview 不写回 Settings defaults。
- main Ask vs generated Ask entry separation。
- contextual next-action surface。
- reduced-motion static semantic identity。
- Continue / branch / question placement identity，且 source geometry 不动。

### `tests/offline/phase3c-spatial-grammar.test.mjs`
只更新旧源码接线断言，使 Phase 3C grammar 与 3E 新 action wiring 同时成立；没有降低 motion contract。

## 25. Commands run

成功执行：

```text
node --experimental-strip-types --test tests/offline/ai.test.mjs tests/offline/phase3e.test.mjs
node --experimental-strip-types scripts/phase3e-dogfood.mjs
npm run test:offline
npm run check:locales
npm run check:source-size
node scripts/offline-check.mjs
```

另外实际尝试：

```text
npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=10000
npm ci --offline --ignore-scripts
npm run typecheck
npm run typecheck:core
npm test
npm run build
npm run test:e2e
npm run check:discovery
npm run test:discovery
```

并使用未修改的上传源码单独执行 old-runtime reproduction，获取第 21 节的 BEFORE output。

## 26. Passed gates

最终 runnable gates：

- **PASS** — `npm run test:offline`: **194 / 194**
- **PASS** — `npm run check:locales`
  - dictionary keys: 749
  - missing: 0
  - unwrapped JSX: 0
  - unlocalized: 0
- **PASS** — `npm run check:source-size`
- **PASS** — `node scripts/offline-check.mjs`
  - 222 TS/TSX files syntax-transpiled
  - JSON valid
  - local imports resolve
- **PASS** — Phase 3E dogfood script
  - 6 one-thought cases
  - 1 relation case
  - 1 structure case
  - all canonical-state-before-commit checks true

## 27. Failed gates

**没有仍然失败的、能够在当前依赖环境中完整执行的产品 gate。**

开发过程中出现过两类回归，均已修复后重新跑绿：

- `Field.tsx` 曾超过历史 600-line regression guard → 压回 598，随后又把 Phase 3E CSS 独立出去；最终 Field 仍 598。
- Phase 3C test 曾假设只有 generic diffuse 才会 radiate → 更新为 3E 后真实 action grammar；最终全套 offline tests 194/194。

## 28. Blocked gates and exact reasons

### Dependency installation — BLOCKED

在线：

```text
npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=10000
```

在当前执行环境 30 秒 tool timeout 内仍未完成；此前 120 秒尝试同样未完成。

离线：

```text
npm ci --offline --ignore-scripts
```

明确失败：

```text
npm error code ENOTCACHED
npm error request to https://registry.npmjs.org/zustand/-/zustand-5.0.15.tgz failed:
cache mode is 'only-if-cached' but no cached response is available.
```

### Typecheck — BLOCKED by missing project dependencies

`npm run typecheck`：

```text
TS2688 Cannot find type definition file for 'node'.
TS2688 Cannot find type definition file for 'vite/client'.
```

`npm run typecheck:core` 还显示缺 `zod`；`ImportMeta.env` 类型也因 Vite type 缺失无法解析。

### Vitest — BLOCKED

```text
npm test
sh: 1: vitest: not found
```

### Build — BLOCKED

`npm run build` 首先进入 typecheck，并因上述 missing type packages 停止，因此没有假报 Vite build passed。

### Playwright / E2E — BLOCKED

项目的 `@playwright/test` 未安装。环境 PATH 中存在另一个 Python `playwright` CLI，因此 `npm run test:e2e` 错误解析为：

```text
error: unknown command 'test'
```

这不是项目 E2E 执行结果。

### Discovery gates — BLOCKED / unrelated environment artifact

`npm run check:discovery`：

```text
Diffusion's bundled discovery engine is missing.
Run: npm run build:discovery
```

`npm run test:discovery`：

```text
The discovery engine's tests need Python 3 with httpx and tenacity installed.
```

本轮没有改 discovery subsystem。

### Live-provider regression — BLOCKED / not claimed

没有在当前环境做 live provider quality run；缺少 dependency-complete install，且没有把任何 provider key 当作可假定存在的条件。

因此本报告只把 deterministic Demo pipeline dogfood 标成 PASS，不把真实模型质量写成已验证。

## 29. Remaining known problems

1. 仍需在正常安装依赖的开发机跑：full TypeScript typecheck / Vitest / Vite build / Playwright。
2. 仍需至少一次真实 provider 的中文 regression review，确认 action-specific prompt 在真实模型上达到与 deterministic dogfood 相同的边界感。
3. 仍需浏览器视觉 dogfood，实际观察多个 3 / 5 result 同时出现时是否有局部拥挤；当前 placement algorithm / static style 已有 offline coverage，但没有截图型浏览器验证。
4. Structure group 本轮是 transient presentation；Apply 只提交 relations。这是故意的最小架构选择，不是“分组保存功能”。

## 30. Anything intentionally deferred to Phase 4

明确没有实现：

- 20–50 次交互后的 Field evolution
- long-session convergence
- days-later return / session memory
- autonomous chaining
- personal voice learning
- preference learning
- scheduler / background agent
- automatic final conclusions
- global auto-layout

这些仍属于后续 Phase 4 或其他独立阶段。

## 31. Confirmation that no unrelated feature expansion occurred

确认。

本轮新增内容都直接服务于：

`Action → distinct AI behavior → distinct result identity → spatial presentation → proposal lifecycle`

没有新增 onboarding、agent、scheduler、chat system、global layout、new project ontology 或其他无关功能。

## 32. Confirmation that no commit / push was performed

确认：**没有执行 git commit，也没有执行 git push。**

上传包中本身没有可用 git metadata；本轮交付为修改后的源码文件与报告。
