# Diffusion 使用指南

[中文 README](../README.zh-CN.md) · [English guide](USER_GUIDE.md) · [文档索引](README.md) · [下载地址](https://github.com/NekoMint-Labs/Diffusion/releases)

这份指南按照**当前界面与已有交互测试**整理。不同预览包的界面和文案可能有所不同；需要真实模型、联网或原生 Windows 环境的功能，会明确说明限制，不把测试模拟当成正式能力。

## 一、从第一个 Field 开始

先认识四个概念：

- **Field（思绪场）：** 一个保存在本设备上的思考空间，可以有多个。
- **Thought（思绪）：** 你亲自写下，或明确决定「留下」的内容。
- **Ghost（建议）：** AI 提供的临时可能性；选中或拖动不等于接受。
- **Crystal（结晶）：** 由你亲自确认的相对稳定的判断。**Source（来源）** 则是辅助思考的资料，不是 Field 的中心。

第一遍可以这样操作：

1. 从 [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) 下载 Windows x64 预览包；开发者也可以使用 [Web 开发环境](../README.zh-CN.md#从源码运行-web-开发环境)。
2. 首次进入时，按提示完成 **First Field Tutorial（新手教程）**：写下想法、移动、平移视野、选择、查看模拟建议并确认留下。**教程不会调用真实模型。**
3. 在输入区写一句尚未想明白的话，按 **Enter** 提交；**Shift+Enter** 用于换行。也可以**双击 Field 空白处**在指定位置创建 Thought。
4. 拖动 Thought 改变位置；拖动空白区域平移整个视野；滚轮用于缩放。软件不会未经允许自动整理你的布局。
5. 单击选中 Thought；**Shift+单击**可以多选，在空白处**Shift+拖动**可进行框选。按 **Esc** 或单击空白处取消选择。

如果跳过了教程，可以通过应用的 **More（更多）→ Help（帮助）→ Restart First Field Tutorial** 重新开始。

### 常用操作（Windows）

| 目的 | 操作 |
| --- | --- |
| 新建 Thought | 在输入区写入，或双击 Field 空白处 |
| 移动 Thought / 平移视野 | 拖动 Thought / 拖动空白处 |
| 多选 / 框选 | Shift+单击 / Shift+拖动空白处 |
| 命令面板 | `Ctrl+K` |
| Field 内查找 | `Ctrl+F` |
| 设置 | `Ctrl+,` |
| 撤销 / 重做 | `Ctrl+Z` / `Ctrl+Shift+Z` 或 `Ctrl+Y` |
| 删除选中内容 | `Delete` 或 `Backspace` |
| 关闭面板 / 清除选择 | `Esc`（输入法正在组词时除外） |

界面里的 **More → Keyboard Shortcuts（快捷键）** 直接来自实际命令注册表。如果以后快捷键有变化，以应用中的说明为准。

## 二、一个完整例子：把模糊问题慢慢想清楚

不需要把 Diffusion 当作一条持续对话。你可以这样试：

1. 写下第一个 Thought：*「想学的内容太多，不知道怎么选择。」*
2. 写下第二个 Thought：*「每周实际只能拿出四小时。」*
3. 把两个 Thought 拖到彼此附近，先单击选择第一个。
4. 在选择后的上下文操作中找到 **Continue thinking（继续思考）** 或 **Another angle（换个角度）**。部分操作会打开本次运行的设置或确认面板，检查范围后再执行。
5. 配置了真实 AI 后，可能出现 **Ghost**。点击阅读建议，觉得有价值才选择 **Keep（留下）**；否则 **Ignore（忽略）**。Ghost 不会直接覆盖原有 Thought。
6. 按住 Shift 选中最初的两个 Thought，执行 **Find a relation（寻找关联）**。出现的关系先是临时的，阅读解释并主动确认后，才成为持久关联。
7. 如果有了明确判断，执行 **Crystallize（凝结）**，先编辑、检查表述，再确认生成 Crystal。它是你的阶段性结论，并非客观真理。
8. 下次打开相同 Field，可以在原来的位置继续。若想保留不同思路，可尝试 **Thread（思路讨论）**、**Go deeper（深入探索）** 或 **Fork（分叉）**。

**AI 关闭时也能使用：** 写入、摆放、选择、编辑、管理 Field 和导出备份。新手教程的建议只用于演示交互，不证明真实 AI 的质量或连通性。

## 三、不同思考操作应该怎么选

| 功能 | 适合什么时候用 | 要注意什么 |
| --- | --- | --- |
| **Ask your own question（主动提问）** | 你已有一个明确问题，想围绕选中的 Thought 提问 | 由你亲自写问题，不会因为选中就自动发问 |
| **Add my thoughts（补充想法）** | 你希望记录回应、反驳或自己的解释 | 记录你的内容，不等于 AI 的隐式判断 |
| **Continue thinking（继续思考）** | 希望获得下一步思考的可能性 | AI 的结果依然是临时 Ghost |
| **Another angle（换个角度）** | 想考虑不同立场、方向或假设 | 使用选中范围和本次运行的限制 |
| **Generate a question（生成问题）** | 不知道接下来该问什么 | 生成供你选择的问题，不是强制任务 |
| **Find a relation（寻找关联）** | 恰好选中了两个 Thought | 关系先是待确认的现象 |
| **Open a Thought Thread / Go deeper** | 一次回应不够，想继续讨论 | 在保留 Field 上下文的临时界面中展开 |
| **Organize thoughts（整理思绪）** | 至少选中了三个 Thought | 操作需要明确触发，AI 不会静默接管 |
| **Crystallize（凝结）** | 已经准备形成阶段性判断 | 必须由你预览、编辑和确认 |
| **Look for evidence（查找证据）** | 想为某个判断寻找外部依据 | 明确触发的检索，不是后台自动上网 |

功能会根据选中数量和当前状态显示或隐藏。可以使用 Thought 的上下文菜单、右键菜单，或者 **Ctrl+K 命令面板** 查找，不必期待所有按钮一直占据屏幕。需要模型的操作在 Off 模式下不会产生真实 AI 结果。

### 哪些事情会永久改变 Field？

- 自己写下和主动修改的 Thought 属于你。
- Ghost 只有执行 **Keep** 才算接受；选中、框选和移动都不是 Keep。
- 语义关联需要你确认才会长期保留。
- Crystal 必须经过你的明确确认。
- 未读取的网络搜索结果不会自动变成证据，AI 也不会替你完成最终判断。

## 四、管理多个 Field、查找以前的内容

Field 是**本机保存**的。点击界面中的 **Field 标题**，可找到 **Rename Field（重命名）**、**New Field（新建）** 和 **Open Field（打开）**；Field 菜单中的 **More** 还包含 **Duplicate Field（复制）**、**Export（导出）**、**Export as Markdown**、**Import / Restore（导入/恢复）**、**How did this form?（形成历程）** 与 Fork 等操作。切换到另一个 Field 不会用它覆盖当前 Field。

按 **Ctrl+F** 在当前 Field 中查找已存在的内容。当查找或概览为了显示目标移动过视野时，普通关闭会保留当前位置；如果要回到此前的视野与选择，请使用可见的 **Return（返回）** 控件。返回视野不等同于撤销内容编辑。

如果缩放很远后看不到完整 Thought、关联或后代，先尝试概览、紧凑阅读入口或展开分支，而不是认定内容已被删除。显示层级的收起不会修改原始坐标。

## 五、配置 AI（可选）

打开应用的 **More → Settings（设置）→ AI**，或者按 `Ctrl+,` 后切换到 AI 标签。

- **Off：** 不使用真实 AI，保留手动 Field 功能。
- **Demo：** 确定性的测试回复，**不是真实模型**。
- **直连服务商：** OpenAI、Anthropic、Google Gemini、DeepSeek 和 **OpenAI compatible（OpenAI 兼容）**。选择服务商，输入对应 API Key，点击 **Save（保存）**，选择或手动输入模型 ID，再按 **Test connection（测试连接）**。兼容接口需要另外填写正确的 **Base URL**。
- **Diffusion Gateway：** 连接单独部署配置的 Diffusion 网关；它和「OpenAI 兼容接口」不是一回事。

**测试连接会发起真实、有限的模型请求，可能产生费用。** 「Refresh models（刷新模型列表）」不是必需步骤：列表无法读取时仍可以手工输入模型 ID。未经测试或测试失败，不应把状态当成已连接。

桌面安装包使用操作系统的凭据存储；Web 开发环境没有相同的原生安全边界，浏览器中的直连密钥只保留在当前会话，不会被保存为长期浏览器凭据。不要在 Issue、截图或公共 Field 中公开密钥。

仅选中 Thought 不会自动调用 AI。模型操作总是以用户明确选择的范围和指令为起点，最终是否留下建议仍由用户决定。更详细的安全与实现边界见 [Provider 契约](PROVIDER_CONTRACT.md)。

## 六、资料、搜索与证据

**导入本地资料：** 通过应用提供的导入或拖放入口，把文件作为 **Source（来源）** 引入。桌面文件选择器没有人为设置扩展名白名单，但这是**尽力解析**，不等于任何文件都能读懂。Source 可能显示 **Processing（处理中）/ Ready（可用）/ Limited（受限）/ Unavailable（不可用）**。Diffusion 不是 PDF 阅读器、批注工具或文档编辑器。

**使用联网检索：**

1. 进入 **Settings → Search & Evidence（搜索与证据）**，打开外部探索开关，选择并启用 **Exa / Tavily / Brave** 等来源，根据需要保存密钥，再主动测试连接。
2. 选中需要考察的 Thought，使用 **Look for evidence（查找证据）**，由你自己启动网络搜索。
3. 搜索结果首先只是**候选来源**。需要继续获取和阅读原文，得到真正的片段之后，才能将其视作可供核查的证据；搜索摘要本身不等于原文。
4. 可以基于已经读取的材料请求进一步评估，检查来源，再主动把合适的 Source **Bring（带入）** Field。

只检索到、尚未读取的候选来源，即使带入 Field，也仍是 **Limited**，之后成功读取可更新来源。模型评估允许给出不确定的结论，不能自动确认语义关联或生成 Crystal。

外部搜索还取决于安装包中的发现引擎、密钥、网络与服务商状态。**Tavily 免密钥模式为实验性选项**，已有 Windows 安装版搜索质量问题尚未解决，不应认为它能可靠替代正式密钥配置。

技术说明：[Evidence 边界与流程](EVIDENCE_GATEWAY.md)。

## 七、导出备份、恢复与升级

**安装新版本之前，建议先做一次可恢复的 JSON 备份。**

1. 通过 **Field 标题 → More → Export** 导出 **Diffusion JSON**。
2. 在应用存储目录之外另存一份副本；重要的原始导入资料也要单独保留。
3. **Export as Markdown** 适合阅读、整理或分享文字，但 Markdown **不是**可恢复的完整项目备份。
4. 需要恢复备份时，进入 **Field 标题 → More → 导入 / 恢复（Import / Restore）**。**不要点击「选择文件」（Choose files）**：它只会将文件作为 Source 导入当前 Field，无法恢复原有的 Thought。请改为点击 **「恢复已导出的项目…」→「选择项目导出文件」**，选择之前保存的 Diffusion JSON，并核对显示的 Field 标题和内容摘要，然后点击 **「创建恢复项目并进入」**。系统会创建并打开一个**新的 Field**，不会覆盖当前 Field。

JSON 包含受支持的正式项目状态，但**不包含尚未 Keep 的 Ghost，也不包含原始导入文件的字节内容**。本地保存不是自动云同步。已有旧版 Field 升级后不可见的反馈仍未查明，因此预览版升级前尤其应该备份。

参阅 [数据迁移](MIGRATIONS.md) 与 [桌面端说明](DESKTOP.md)。

## 八、界面风格、语言与可访问性

在 **Settings → General（通用）** 可以调整语言、Thought 文字排版、界面尺寸和 Thought 尺寸。**Appearance（外观）** 提供主题与 Field 风格等设置。背景和动效是显示层的个性化选择，不改变项目实际保存的 Thought 结构；系统减少动画的偏好也会限制环境动效。

软件界面支持**简体中文与英文**。部分内部技术规范仍只有英文版本，普通使用优先阅读本指南即可。

## 九、常见问题

| 问题 | 建议检查 |
| --- | --- |
| AI 没有回应 | AI 是否处于 Off/Demo？密钥是否保存？模型、Base URL 和网络是否正确？先主动测试连接；还可能受到限流影响。 |
| 教程出现了 Ghost，代表模型已经连通？ | **不是。** 新手教程采用确定性模拟，不会请求真实模型。 |
| 搜索不可用、结果乱码或质量很差 | 依次检查外部探索开关、启用的来源、密钥/实验性免密钥模式、内置引擎与网络；实验模式的质量并未通过完整验收。 |
| 导入文件显示 Limited/Unavailable | 文件可能无法读取、超出限制、格式不支持或来源失效。无需假设导入成功就等于完全理解文档。 |
| 缩放后找不到某个 Thought | 使用 Field 查找、概览或分支展开，内容可能只是暂时未完整显示。 |
| 升级后旧 Field 看不见 | **先不要清空应用数据。** 保存现有环境，并尝试用之前的 JSON 备份恢复；升级异常原因尚未确认。 |
| 开始使用必须有 API Key 吗？ | **不需要。** 手动 Field 功能在 AI Off 下也能用。 |
| 0.3.16 已经是稳定版吗？ | **不是。** 当前 0.3.16 是预览包，实际状态以 [Releases](https://github.com/NekoMint-Labs/Diffusion/releases) 为准。 |

如果要反馈问题，请在 [GitHub Issues](https://github.com/NekoMint-Labs/Diffusion/issues) 中写明软件/预览版版本、操作系统、复现步骤、预期与实际表现，并附上**不含隐私和密钥**的必要截图或日志。

---

技术参考：[产品行为与权限](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) · [桌面](DESKTOP.md) · [AI Provider](PROVIDER_CONTRACT.md) · [测试](TESTING.md) · [已知限制](../STATUS.md)。
