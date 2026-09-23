# 06 — Full v0.1 Build Prompt

The following can be given directly to a coding AI. If a separate `POWERFUL_AI_4H_FULL_BUILD_PROMPT_EN.md` is also supplied, that more detailed time-boxed execution prompt has higher priority for execution mechanics.

---

You are implementing **Diffusion Explorer v0.1**. Your goal is not to stop at a first milestone.

> **Build a stable Thought Field foundation first, then keep implementing the already-designed product toward the complete v0.1. The first vertical slice is a checkpoint, not the finish line.**

Before editing code, read:

- `00_START_HERE.md`
- `01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md`
- `02_TECH_STACK_AND_IMPLEMENTATION.md`
- `03_UI_VISUAL_SYSTEM.md`
- `04_PERFORMANCE_CONTRACT.md`
- `05_REFERENCE_PROJECTS_AND_LINKS.md`
- `07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md`

These are product boundaries, not an inspiration list.

## Implementation order

### 1. Stable foundation

- React + TypeScript + Vite
- Core separated from React
- one frontend for Web + Tauri
- `core / field / ui / ai / evidence / storage / platform`
- Dexie / repository boundary
- semantic Light / Dark themes
- Field Shell
- production build and basic tests

Save a checkpoint once stable, then continue.

### 2. Thought Field

Implement create/edit/select/multi-select/lasso/drag, pan/zoom, layered Esc, Hybrid Thought visuals, Selection Halo, contextual actions, Speak scope, persistence, and basic semantic undo plumbing.

### 3. Focus / Relations / Probe

Implement Focus Field, attention-driven relation visibility, SVG phenomenon layer, glyph-first relations with no default arrows, tentative vs confirmed relations, local proximity Probe, and unified gesture/context/language Probe intent.

### 4. AI semantics / Ghost / Recall / Lifecycle

Add provider abstraction and semantic UI intents. Implement progressive Ghost reveal and Claim, Recall Wake and edge cues, lifecycle states, Keep, and an attention budget. AI must never directly manipulate UI components or user-owned geometry.

### 5. Thread / Deep Dive / Context

Keep short semantic responses in the Field. Escalate sustained discourse into Thread split surfaces and deeper reasoning into Deep Dive. Preserve snapshot scope, explicit Add current selection, Field return points, and a Context Compiler / Thread Capsule boundary.

### 6. Source / Evidence / Web Verify

Sources support Thought; they do not become the product. Add best-effort Source states, provenance, anchored reference UI, Open original, evidence phenomena, WebEvidenceProvider/custom endpoint boundaries, and user-triggered verification. Do not build a full PDF reader/cropper/annotation workbench.

### 7. Find / History / Regions / Atlas

Separate Project Find from Recall/Web Search; require user confirmation before camera travel; store semantic trajectories rather than click logs; implement continuous semantic zoom, emergent Regions, Atlas landmarks/frontiers, and re-entry.

### 8. Crystal / Carry / Fork / Diffuse / Handoff

Implement user-confirmed Crystal formation, Carry as long-distance move, explicit Fork with selective Bring to Main, bounded explicit Diffuse with permissions/Pause/Stop, and Handoff from Crystal into action.

## Permanent product guardrails

- The Field is a Thought Field, not a material board.
- Thoughts are not permanent cards.
- Sources remain subordinate references/evidence.
- Relations usually sleep; persistence is not visibility.
- Do not draw arrows by default.
- Selection does not trigger AI or change geometry.
- AI is never required for pan/zoom/drag.
- AI may not silently move/delete/rewrite user Thoughts.
- AI may not silently create permanent relations or Crystals.
- Conversation must not become a permanent chat sidebar.
- Regions are not folder/group boxes.
- Do not add permanent chrome merely because a feature needs somewhere to live.

## Performance guardrails

- Camera/Drag hot paths do not rerender the entire React tree per pointer event.
- Use transient transform, canonical commit on pointerup.
- Cache geometry; do not scan `getBoundingClientRect()` per frame.
- Add viewport culling.
- DOM Thought Layer + SVG Phenomenon Layer.
- Prefer transform/opacity motion.
- Maintain at least a 100-Thought performance fixture; extend to 500/2000/5000 if time permits.

## Outside current v0.1

Do not expand into multiplayer/realtime collaboration, mobile-first native apps, plugin marketplace, enterprise permissions, a full RAG platform, task management, a coding agent, complete paper management, a full writing editor, project-management software, a graph editor, or automatic graph layout.

## Definition of done

Done means the implemented pieces form one coherent product: the Field is state, Thought is primary, Selection creates Focus, relations wake with attention, AI creates possibilities, Sources bring evidence, sustained discourse becomes Thread/Deep Dive, zoom reveals a thought landscape, and the user can eventually create a Crystal and hand it into action.

If time runs out, ship the strongest stable checkpoint and precisely document what remains. Never sacrifice the whole deliverable for one more feature.
