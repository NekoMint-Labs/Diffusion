# Diffusion Explorer Kickoff Pack (English)

> Version: Kickoff v0.1  
> Date: 2026-09-13  
> Purpose: unified context for building the complete currently-designed v0.1 with a human developer or coding AI.

## Reading order

1. `01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md` — what the product is, what it must not become, and which boundaries references must never override.
2. `02_TECH_STACK_AND_IMPLEMENTATION.md` — Web + Desktop stack, module boundaries, Field implementation, storage, AI and platform adapters.
3. `03_UI_VISUAL_SYSTEM.md` — Light/Dark, Thought Field, Selection, Focus, Relations, Ghost/Recall/Source/Crystal, Thread/Deep Dive, Zoom/Atlas.
4. `04_PERFORMANCE_CONTRACT.md` — hot paths, DOM/SVG rules, culling, geometry cache, and performance budgets.
5. `05_REFERENCE_PROJECTS_AND_LINKS.md` — what may be borrowed, what must not be borrowed, and official links.
6. `06_FULL_BUILD_PROMPT.md` — implementation prompt for the complete currently-designed v0.1.
7. `07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md` — layered acceptance checklist for the full build.

## Authority

This pack is based on the frozen `Diffusion Explorer — Product Architecture v0.1` and incorporates the UI / Interaction / Runtime / Performance refinements confirmed afterward.

If implementation convenience conflicts with a product boundary:

> **The product boundary wins. It is better to build less than to accidentally turn Diffusion into an existing category.**

Especially:

- Do not let tldraw / Excalidraw turn it into a whiteboard.
- Do not let Kumu turn it into a knowledge graph.
- Do not let Allume / Fabric turn the Field into a material desk.
- Do not let AI turn it into chat + canvas.
- Do not let Desktop create a second UI codebase.

## One sentence

**Diffusion Explorer is a responsive thinking medium for the stage before an idea is fully formed. The Field is primarily made of thoughts, not files, cards, or graph nodes; AI creates possibility, while the user creates commitment.**

## Five rules to keep visible while building

1. `Field is state; messages are history.`
2. `Selection defines scope.`
3. `Gesture creates relation; language creates intent.`
4. `AI creates possibility; user creates commitment.`
5. `AI never sits on the critical interaction path.`

## v0.1 execution model

Do not treat the first working vertical slice as the final scope.

First make the Thought Field **look right, feel right, and run fast**. Then continue through the already-designed Focus / Probe / Ghost / Recall / Thread / Deep Dive / Source / Evidence / Find / History / Region / Atlas / Crystal / Fork / Diffuse / Handoff capabilities until time or resource constraints require delivery.

Still do not expand v0.1 into multiplayer realtime collaboration, a mobile-first native app, plugin marketplace, enterprise permissions, a full RAG platform, task management, a coding agent, a full paper manager, a full writing editor, or a project-management suite.
