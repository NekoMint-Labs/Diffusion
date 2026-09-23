# 07 — Full v0.1 Layered Acceptance Checklist

This checklist is layered. Not every item must be complete at the first checkpoint, but every claimed feature must genuinely work. Anything incomplete must be identified in `STATUS.md`.

## A. Product boundary

- [ ] It does not read as a whiteboard, mind map, knowledge graph, or chat app.
- [ ] The Field is primarily Thought, not file/PDF/image cards.
- [ ] Sources remain a reference/evidence layer.
- [ ] No permanent left sidebar / top toolbar / right inspector dominates the Field.
- [ ] Thoughts are not permanent rectangle cards.
- [ ] Relations are not arrow-heavy and do not form edge soup.
- [ ] AI does not silently reorganize/delete/rewrite user space.
- [ ] AI does not silently create permanent relations or Crystals.

## B. Field interaction

- [ ] Double-click blank Field creates and edits a Thought.
- [ ] Click select; Shift+click multi-select; lasso works.
- [ ] Click blank clears selection.
- [ ] Esc unwinds editing / selection / Speak in layers.
- [ ] Direct drag works without handles.
- [ ] Space+drag pans; wheel/trackpad zooms.
- [ ] Selection does not cause text reflow or geometry jumps.
- [ ] Core Thought state survives reload.

## C. Visual / Theme

- [ ] Light is complete.
- [ ] Dark is complete and not a simple inversion.
- [ ] Theme uses semantic tokens.
- [ ] Thought typography feels like content, not a UI label.
- [ ] Selection Halo feels like attention, not an editor bounding box.
- [ ] Ghost/Recall/Source/Crystal are not distinguished by four loud colors.
- [ ] Relations are glyph-first.
- [ ] The Field preserves generous negative space.
- [ ] Reduced-motion fallback exists.

## D. Focus / Relation / Probe

- [ ] Selection creates semantic scope and visual focus.
- [ ] Existing active/confirmed relations wake around selection.
- [ ] Unrelated context gently recedes without disappearing or using a dark modal overlay.
- [ ] Selection alone does not trigger new AI inference.
- [ ] Relation persistence is separate from visibility.
- [ ] Probe proximity feedback is local and immediate.
- [ ] AI Probe results are asynchronous and never block Drag/Camera.

## E. AI / Ghost / Recall / Lifecycle

- [ ] AI communicates through semantic intent into Core, not direct React manipulation.
- [ ] Ghost click/drag claims it.
- [ ] Lasso does not claim Ghosts.
- [ ] Ghost reveal is progressive rather than flooding the Field.
- [ ] Recall resurfaces the original Thought rather than creating a copy.
- [ ] Offscreen Recall does not steal the Camera.
- [ ] Lifecycle supports active/cooling/peripheral/memory semantics.
- [ ] Keep is not Crystal.

## F. Thread / Deep Dive / Context

- [ ] Short responses can remain in the Field.
- [ ] Sustained discourse becomes a Thread split surface.
- [ ] Thread does not use chat bubbles/avatars as the core visual.
- [ ] Thread scope is a snapshot.
- [ ] New selection does not silently enter the Thread.
- [ ] Add current selection is explicit.
- [ ] Deep Dive is a deeper surface, not a permanent chat page.
- [ ] Closing a surface restores the Field return point.
- [ ] Context Compiler does not blindly stuff the entire history into every model call.

## G. Source / Evidence / Web

- [ ] Source exposes Processing/Ready/Limited/Unavailable or equivalent capability states.
- [ ] Source does not become a full Reader/workbench.
- [ ] Provenance is only as precise as truly known.
- [ ] Open original works where supported.
- [ ] Evidence supports support/challenge/inconclusive outcomes, not fake Verified labels.
- [ ] Web Verify is user-triggered outside explicitly-authorized Diffuse mode.
- [ ] Web results do not flood the Field.
- [ ] Provider/custom endpoint boundaries are clear.

## H. Find / History / Semantic Zoom / Atlas

- [ ] Project Find is distinct from Recall/Web Search.
- [ ] Find preview does not steal the Camera; Take me there is user-confirmed.
- [ ] History stores semantic trajectory rather than pointer/click logs.
- [ ] Zoom-out changes representation semantically.
- [ ] Relations/Ghosts/Recalls disappear earlier than Crystals/Regions.
- [ ] Regions are not hard boxes.
- [ ] Atlas centers Regions/Crystals/frontiers rather than node-edge soup.
- [ ] Re-entry restores useful Field context.

## I. Crystal / Carry / Fork / Diffuse / Handoff

- [ ] Crystal requires user confirmation.
- [ ] Crystal is stable and cannot be silently rewritten by AI.
- [ ] Carry moves rather than duplicates.
- [ ] Fork preserves provenance to Main.
- [ ] v0.1 has no black-box automatic merge.
- [ ] Diffuse is explicit and bounded.
- [ ] Diffuse supports Pause/Stop and permission boundaries.
- [ ] User touch claims territory.
- [ ] Handoff exports useful Crystal/context into action.

## J. Architecture / Performance

- [ ] Core does not depend on React.
- [ ] Canonical/transient/surface state are separated.
- [ ] Browser/Tauri capabilities pass through a platform adapter.
- [ ] Storage passes through a repository boundary.
- [ ] Camera/Drag hot paths do not require full React rerender per pointer event.
- [ ] Drag preview does not write persistence every frame.
- [ ] DOM geometry is cached.
- [ ] Viewport culling exists or has a clear replaceable boundary.
- [ ] 100 visible Thoughts remain interactively smooth.
- [ ] AI calls never block the Field.

## K. Build / Delivery

- [ ] Web dev runs.
- [ ] Production build succeeds.
- [ ] Unit/integration tests have real reported outcomes.
- [ ] Critical E2E is run when the environment supports it; otherwise the reason is explicit.
- [ ] Tauri is verified when possible; otherwise the environment limitation is explicit.
- [ ] README is enough for the next developer to install, run, and continue.
- [ ] `STATUS.md` distinguishes Completed / Partial / Not implemented / Unverified.
- [ ] ZIP excludes secrets / node_modules / .git / build junk.
- [ ] ZIP integrity is verified.

## Final human questions

1. Would I willingly place an unfinished thought into this space?
2. Does a Thought look like thought, or like a component?
3. Do drag/pan/zoom feel immediate and trustworthy?
4. Does Selection feel like attention rather than an editor box?
5. Does AI only create possibilities after appropriate user action/permission?
6. Does Source remain evidence and an opening to the external world rather than becoming the product?
7. When Thread/Deep Dive appears, does the Field still feel like home?
8. When zooming out, do I see a thought landscape rather than a knowledge graph?
9. Do Light and Dark still feel like the same product?
10. If development stops now, is the repository still an honest, runnable, continuable artifact?

## Current automated evidence

The stabilization pass from baseline `d4870b5` produced two consecutive complete Playwright runs with 148 passed and 8 intentionally skipped tests per run, one worker, and no retries. Typecheck, offline contracts, unit tests, production build, and discovery-engine tests are also current; exact results are recorded in [`../../STATUS.md`](../../STATUS.md).

These results support the browser/build items above but do not answer the final human-feel questions. Windows/Tauri physical behavior and live AI/discovery remain **UNVERIFIED** where this environment lacks platform prerequisites or credentials.
