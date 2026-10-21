# Diffusion User Guide

[English README](../README.md) · [简体中文指南](USER_GUIDE.zh-CN.md) · [Documentation index](README.md) · [Downloads](https://github.com/NekoMint-Labs/Diffusion/releases)

This guide follows the **current interface and test-backed interaction paths**. Screens and wording can change between preview builds. Where a feature depends on a real provider, network, or native device, that limitation is stated rather than assumed away.

## 1. Your first Field

A **Field** is one local thinking workspace. A **Thought** is something you wrote or explicitly kept. A **Ghost** is a provisional suggestion; selecting or moving it is not acceptance. A **Crystal** is a more settled statement you confirm. A **Source** supplies reference material but is not the center of the workspace.

1. Install a Windows x64 preview from [Releases](https://github.com/NekoMint-Labs/Diffusion/releases), or use the [web development build](../README.md#run-the-web-development-build).
2. On first entry, follow **First Field Tutorial** if offered. It walks through writing, moving, panning, selecting, exploring a simulated suggestion, and keeping it. **No live model is called during the tutorial.**
3. Use the writing area to enter one unfinished statement, then press **Enter**. **Shift+Enter** adds a line break instead. You can also **double-click blank Field space** to create a Thought at a chosen position.
4. Drag the Thought to move it. Drag blank space to pan the camera; scroll to zoom. Spatial location is your choice, not an AI-generated layout.
5. Click a Thought to select it. **Shift-click** more Thoughts, or **Shift-drag** on blank space for a lasso. Press **Esc** or click blank space to clear the selection.

If you skipped the tutorial, open the application's **More → Help** and choose **Restart First Field Tutorial**.

### Basic controls (Windows)

| Action | Control |
| --- | --- |
| Write a Thought on the Field | Writing surface, or double-click blank space |
| Move a Thought / pan the view | Drag the Thought / drag blank space |
| Select more Thoughts / lasso | Shift-click / Shift-drag blank space |
| Command Palette | `Ctrl+K` |
| Find in Field | `Ctrl+F` |
| Settings | `Ctrl+,` |
| Undo / redo | `Ctrl+Z` / `Ctrl+Shift+Z` or `Ctrl+Y` |
| Remove selected Thoughts | `Delete` or `Backspace` |
| Dismiss a surface or clear selection | `Esc` (when not composing with an IME) |

The **More → Keyboard Shortcuts** reference in the app is derived from the actual command registry and is authoritative if bindings change.

## 2. A practical workflow: untangle a question

Try this without treating the application as a chat transcript.

1. Write: *"I want to learn too many things at once."*
2. Add: *"I can realistically spend four hours a week."*
3. Place the second Thought near the first, then select the first Thought.
4. Choose **Continue thinking** or **Another angle** from the selection's contextual actions. The action may open a small run preview; check its scope and settings, then run it.
5. With a real AI provider configured, inspect any returned **Ghost**. Select it to read the suggestion. **Keep** explicitly accepts its wording; **Ignore** dismisses it. Neither your existing words nor the Field layout is silently replaced.
6. Shift-select the original two Thoughts and choose **Find a relation**. A tentative result is not a permanent link. Inspect it and confirm it only if appropriate.
7. If you reach a usable judgment, use **Crystallize** and review/edit the wording before confirming it. A Crystal is a personal commitment, not an objective verdict.
8. Leave and reopen the Field to continue. If you want a different line of exploration, use a **Thread**, **Go deeper**, or a **Fork** instead of rewriting your settled statements.

**With AI Off:** writing, arranging, selecting, editing, Field management, and export still work. The introductory tutorial's proposal is a fixture; it does **not** demonstrate the quality or availability of a real model.

## 3. Understand the thinking actions

| Action | When to use it | What to expect |
| --- | --- | --- |
| **Ask your own question** | You know what you want to ask about the selection | Write your own question with the current selected scope |
| **Add my thoughts** | You want to respond or add your interpretation | Your authored response, not a hidden AI decision |
| **Continue thinking** | You want possibilities for what might come next | A bounded thinking run; AI suggestions remain Ghosts |
| **Another angle** | You want alternatives to the current framing | Scope-based exploration; permission/budget controls belong to the action |
| **Generate a question** | You do not know what to ask next | Possible questions rather than mandatory next steps |
| **Find a relation** | You selected exactly two Thoughts | A tentative phenomenon requiring inspection and explicit confirmation |
| **Open a Thought Thread / Go deeper** | One answer is not enough | A temporary context-preserving discussion surface |
| **Organize thoughts** | You selected at least three Thoughts | An explicit organization action; AI cannot silently take ownership |
| **Crystallize** | You are ready to state a direction | A preview/edit/confirm step before a stable Crystal |
| **Look for evidence** | Your selected Thought needs external verification | An explicit evidence workflow, not background browsing |

Action availability changes with the selection and mode. Use the contextual menu, right-click, or **Command Palette** instead of expecting every action to be permanently visible. Some actions need a configured provider and cannot generate live content in Off mode.

### What becomes permanent?

- Your own Thought and explicit edits are yours.
- A **Ghost** stays provisional until **Keep**. Selection, lasso, and movement alone are not Keep.
- An inferred relation is temporary until you confirm it.
- A **Crystal** requires an explicit person-made confirmation.
- Diffusion does not turn an unread search result into verified evidence or silently commit a decision.

## 4. Manage Fields and find past work

A Field is stored **on this device**. Click the **Field title** to access **Rename Field**, **New Field**, or **Open Field…**. The Field menu's **More** contains **Duplicate Field**, **Export**, **Export as Markdown**, **Import / Restore**, **How did this form?**, and Fork actions. Switching opens another stored Field rather than replacing the current one.

The Field-management button beside the title opens the same **Open Field** list. Use **New Field**
for an independent empty space, or **Duplicate current Field** to copy its saved Thoughts, Crystals,
relations and layout; rename the copy from its title menu. Editing the copy does not edit the original.
Each row also offers **Delete**, followed by a confirmation naming that Field. Deletion is permanent
and cannot be undone: cancel and export the Field first if you need a backup. Other Fields and shared
reference files remain intact; a Fork cannot return to a deleted parent. Deleting the current Field
first enters another stored Field, or creates an empty one if it is the last Field.

Use **Find in Field** (`Ctrl+F`) to locate existing work. If Find or a compact overview has moved the camera to reveal a result, ordinary close stays where you are; use the visible **Return** control when you want the earlier view and selection back. This is not the same as undoing a Thought edit.

If a source, relation, or child is not fully visible at a distant zoom level, use the compact reading or overview controls before assuming the content was deleted. Zoom and branch presentation do not rewrite Thought coordinates.

## 5. Using AI (optional)

Open **More → Settings → AI**, or press `Ctrl+,` and choose the AI section.

- **Off:** only manual Field operations; no live AI provider.
- **Demo:** deterministic example responses for testing; **not** a model and not evidence that a real service works.
- **Direct providers:** OpenAI, Anthropic, Google Gemini, DeepSeek, or **OpenAI compatible**. Choose the provider, enter the provider's key, click **Save**, choose/type an actual model ID, and deliberately click **Test connection**. A compatible endpoint additionally requires its **Base URL**.
- **Diffusion Gateway:** for a separately configured gateway service; this is not the same as an OpenAI-compatible base URL.

**Test connection makes a real bounded provider request and may cost money.** **Refresh models** is optional: you can type a model ID if a list is not available. A failed or untested connection should not be described as Ready.

On the packaged desktop, provider credentials use the operating system's credential store. A browser development build does not have that native security boundary and keeps direct-provider credentials for the browser session instead of persisting them. Do not paste secrets into issues, screenshots, or shared Fields.

Selecting a Thought does not call AI by itself. A user-triggered action defines its scope; generated suggestions still need your judgment. See [Provider contract](PROVIDER_CONTRACT.md) for transport, permissions, failures, and confidentiality boundaries.

## 6. References, search, and evidence

**Add a local reference:** use the app's import/drop affordances to add a Source. The desktop file picker does not artificially restrict file extensions; this is a **best-effort** reader, not a guarantee that every file can be extracted. A Source can show **Processing**, **Ready**, **Limited**, or **Unavailable**. Diffusion is not a full PDF editor or document-annotation suite.

**Search externally:**

1. Open **Settings → Search & Evidence**, turn on external exploration, choose a source such as **Exa**, **Tavily**, or **Brave**, and provide the required source key when needed. Test the connection deliberately.
2. Select a Thought, choose **Look for evidence**, and explicitly initiate web search.
3. Treat returned results as **candidates**. Read/fetch a source before treating its actual passages as evidence. A short search snippet is **not** a verified passage.
4. Optionally request an assessment on genuinely read material, inspect provenance, and **Bring** the chosen Source into the Field deliberately.

A candidate brought before being read remains **Limited**; a later successful read can update it. AI assessments may be inconclusive and never automatically confirm a relation or create a Crystal. External search also depends on native packaging and provider/network availability. The optional Tavily **keyless** path is experimental and has unresolved installed-desktop quality reports; do not assume it works reliably without a key.

More detail: [Evidence adapter and trust contract](EVIDENCE_GATEWAY.md).

## 7. Back up, export, and restore

**Before any version upgrade, export a recovery copy.**

1. Click the **Field title → More → Export** to save a **Diffusion JSON** project export.
2. Save a second copy somewhere outside the application's local storage. Keep imported original files separately.
3. Use **Export as Markdown** when you want readable text to review or share. Markdown is **not** a restorable project archive.
4. To restore a backup, open **Field title → More → Import / Restore**. **Do not use Choose files**: it imports a file as a Source into the current Field, and will not restore archived Thoughts. Instead choose **Restore a project export... → Choose project export**, select your Diffusion JSON backup, and review the preview showing the Field title and contents. Then click **Create restored project and enter it**. This creates and opens a **new Field** without overwriting the current one.

JSON export preserves supported canonical project state, but it **excludes unclaimed Ghosts and original imported file bytes**. Treat local storage as device-specific; there is no automatic cloud synchronization. The older-Field-after-upgrade report remains unresolved, so make a backup *before* opening an important Field in a preview build.

Read [Migrations](MIGRATIONS.md) and [Desktop notes](DESKTOP.md) for technical constraints.

## 8. Appearance, language, and accessibility

**Settings → General** includes language, Thought typography, interface size, and Thought size. **Appearance** separately manages theme and Field style. Field backgrounds and motion are presentation choices: they do not change the canonical Thought data. Where supported, reduced-motion preferences limit ambient motion.

The user interface supports **English and Simplified Chinese**. If an advanced, internal document is English-only, use the bilingual entry points here to find the corresponding user workflow.

## 9. Troubleshooting

| Symptom | What to check |
| --- | --- |
| AI doesn't answer | Did you select an AI provider other than Off/Demo? Save the key, check the model/Base URL, and use **Test connection**; network/rate limits can still fail. |
| The app says AI is Ready but no Ghost appears | Check the action's selection and run configuration. A particular result is not guaranteed; do not assume a live model call from the first tutorial. |
| Search is unavailable or results are poor | External exploration, enabled source, saved key (or the experimental keyless mode), packaged discovery engine, and network are separate dependencies. |
| File import is Limited/Unavailable | The file may be unsupported, unavailable, too large, or unreadable. Best-effort import never guarantees extraction. |
| I can't find a Thought | Use **Find in Field** or the compact overview; content may simply be hidden at the current scale or behind a folded branch. |
| An old Field appears missing after upgrading | **Do not clear app data.** Preserve the installation/storage first and use a prior JSON export if available. The cause of the reported migration issue has not been confirmed. |
| Do I need the AI/API key to start? | No. Manual Field operations work with **AI Off**. |
| Is 0.3.16 a stable release? | No: the available 0.3.16 build is a **preview**. Check the [Releases page](https://github.com/NekoMint-Labs/Diffusion/releases) for the actual state. |

For a reproducible bug, include the app/release version, platform, steps, expected/actual behavior, and relevant non-sensitive logs or screenshots in an [issue](https://github.com/NekoMint-Labs/Diffusion/issues). **Never share provider keys or private content.**

---

Technical references: [Product behavior](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) · [Desktop](DESKTOP.md) · [Provider](PROVIDER_CONTRACT.md) · [Testing](TESTING.md) · [Known limitations](../STATUS.md).
