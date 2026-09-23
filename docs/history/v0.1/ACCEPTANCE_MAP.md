# Acceptance map - source versus demonstrated behavior

The original checklist remains unchanged at `docs/specs/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md`. Its boxes are not bulk-ticked here because the full application has not run. This map distinguishes source coverage from evidence.

| Original group | Main implementation | Available evidence | Required next acceptance |
| --- | --- | --- | --- |
| A. Product boundary | Core permissions; text-first UI; transient relations/candidates; explicit Crystal; minimal shell. | Offline permission tests and source checks. | View the actual Field; confirm it does not read as a graph/card/chat product. |
| B. Field interaction | Field.tsx, camera, ThoughtView, controller, Dexie. | Geometry/controller/camera primitive tests. | Execute create/edit/IME/select/lasso/drag/pan/zoom/Escape/reload E2E and manual input checks. |
| C. Visual/theme | theme.css, field.css, ThoughtView, contextual surfaces. | Eight isolated browser checks include same geometry across selection/themes and reduced motion. | Real app Light/Dark, large text, viewport sizes, accessibility and context surfaces. |
| D. Focus/relation/Probe | focus.ts, Field.tsx, RelationSurface, AIRuntime. | Focus filter/permission tests; local geometry tests. | Pointer hold/drop Probe, sleeping relations, unrelated visibility and UI responsiveness during requests. |
| E. AI/Ghost/Recall/lifecycle | semantics, runtime, controller, lifecycle reducer. | Single-call/cancellation/Claim/Recall/source-permission tests. | Real provider output, progressive placement, selected Ghost cap behavior, original-ID Recall edge cues. |
| F. Thread/Deep Dive/context | context.ts, ThreadSurface, Workspace return points. | Bounded context and source restrictions tested; E2E source supplied. | Snapshot/Add selection/return camera and sustained discourse in rendered app. |
| G. Source/evidence/web | Source worker/importer/reference, EvidenceSurface, gateway. | UTF-8/limited extraction, URL and config guards tested. | Actual worker/Dexie/original save plus real normalized service; PDF/image content remains unimplemented. |
| H. Find/history/Atlas | Find/History surfaces, spatial Region observer, semantic LOD, re-entry. | Index benchmark; source/canonical tests. | No camera movement on preview; meaningful History; continuous zoom and real 5000-object culling. |
| I. Crystal/Carry/Fork/Diffuse/Handoff | world.ts, surfaces, scheduler, Field Carry. | World/Continue/Fork/Bring and seven scheduler tests. | End-to-end export, viewport-attached Carry, Fork switching, provider cancellation and budget display. |
| J. Architecture/performance | Independent Core, platform/repository, camera, cache and grid. | Strict independent-module typecheck; algorithm metrics; isolated camera RAF test. | Full installed typecheck; actual 100-visible/5000-total frame/persistence profile; native adapter validation. |
| K. Build/delivery | Config/scripts/tests/docs/native scaffold; verified archives. | ZIP CRC/extraction/byte/SHA verification, offline tests and config syntax. | npm resolution, full app typecheck/build/dev, 19 Vitest tests, 12 E2E cases, Cargo/Tauri target build. |

## Representative manual run after the build passes

Use a new test project/profile so failures cannot corrupt important work. Place two thoughts; confirm text does not jump on selection, the camera responds during a delayed request, lasso does not claim a Ghost, and clicking one does. Select related/unrelated content and inspect attention weights without layout changes. Open a Thread, change Field selection and verify the scope does not change until Add selection. Open Deep Dive and return to the same viewport. Create a Crystal only through its confirmation preview and Continue without changing the original. Drop one small text file and one unsupported PDF, inspect the truthful Source states, then export and restore into a new project. Finally inspect Fork Bring and bounded Diffuse against their explicit permission prompts.

Run the perf routes separately. Never treat sample relations, Demo suggestions or mock upstream tests as live AI/evidence.
