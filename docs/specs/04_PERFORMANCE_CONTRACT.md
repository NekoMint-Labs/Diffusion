# 04 — Performance Contract

> **Status: current performance contract.** These rules are architectural constraints, not
> phase guidance. Measured results and reproducibility live in [`PERFORMANCE.md`](../PERFORMANCE.md);
> the hot-path module ownership is in [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## 1. Performance is an architectural constraint

Diffusion is a continuous pan / zoom / drag spatial product. Performance is not a late optimization.

Core rule:

> **React owns “what happened”; the Realtime Interaction Layer owns “how this frame moves.”**

Alongside the product rule:

> **AI never sits on the critical interaction path.**

## 2. Pointer-frequency hot paths must not require a React-tree render

Hot paths include:

- pan
- zoom
- drag
- lasso preview
- Probe proximity
- pointer hover hit testing

Do not implement every pointer event as:

`set Zustand → rerender whole Field → remeasure DOM → redraw all relations`

## 3. Camera

During interaction, an independent camera controller owns transforms.

```text
wheel / pointer
→ camera controller
→ requestAnimationFrame
→ world.style.transform = translate(...) scale(...)
```

Synchronize stable camera state to app state / persistence at appropriate boundaries, not on every wheel tick.

## 4. Drag

```text
pointerdown
→ pointer capture
→ transient transform
→ pointerup
→ commit final world position as domain event
```

Do not write Dexie, History and every relation calculation for each pixel of movement.

## 5. Viewport culling

A project containing 3000 Thoughts must not imply 3000 mounted DOM Thought components.

```text
Canonical project
→ spatial index
→ viewport + overscan
→ visible render set only
```

The first implementation may use a simple grid / bucket. Keep the interface replaceable by an R-tree/RBush later.

## 6. Semantic Zoom is also a performance mechanism

As the user zooms out, representation becomes cheaper:

- Ghost disappears early
- relation disappears early
- Thought full text → shortened → gone
- Crystal → landmark
- Region → label / landmark

Atlas must not render every project detail simultaneously.

## 7. Relations

Render only:

> visible + relevant + attention-activated relations

Confirmed relation persistence does not mean permanent SVG mounting.

## 8. Geometry cache

Do not repeatedly call `getBoundingClientRect()` across the Field inside a frame loop.

Cache per Thought:

```text
world x/y
measured width/height
visual bounds
```

Update through `ResizeObserver` or explicit edit-completion events.

Lasso / Probe / relation layout should use cached geometry.

## 9. CSS / Motion

Prefer:

- `transform`
- `opacity`
- compositor-friendly transitions

Use caution with:

- blur filters
- large shadows
- continuously animated gradients
- width/height/top/left layout animation
- many simultaneous Motion layout animations

Ghost softness should come primarily from contrast/clarity, not continuous blur.

## 10. Persistence

High-frequency transient state does not go to Dexie.

Persist on semantic commits such as:

- Thought created
- Thought move committed
- edit committed/debounced
- Ghost claimed
- Recall wake when it creates persistent change
- relation confirmed
- Crystal formed
- meaningful semantic History event

## 11. AI / Source work

AI networking, source parsing, PDF/image extraction must not block the Field UI.

If the model takes five seconds, the user must still be able to pan, zoom, move, edit and select.

The Probe `?` cue is always local and immediate.

## 12. Suggested v0.1 budgets

| Scenario | Target |
|---|---|
| Pan / Zoom | 60fps baseline target |
| Drag Thought | pointer feels 1:1, no obvious lag |
| Select | immediate |
| Focus Field | no obvious frame drop |
| 100 visible Thoughts | smooth on an ordinary laptop |
| 500+ total Thoughts | culling prevents linear slowdown of current viewport |
| AI request | zero blocking of Field interaction |
| Light ↔ Dark | no obvious long frame |
| Atlas zoom | continuous, no sudden freeze |

This is an engineering budget, not a UI goal to keep 100 Thoughts active at once.

## 13. Performance harness

Create a `/perf` or dev-only fixture early:

- 100 Thoughts
- 500 Thoughts
- 2000 Thoughts
- 5000 Thoughts
- varying long text
- relations
- Ghosts
- Crystals

Exercise:

- pan
- zoom
- drag
- select
- lasso
- focus
- semantic zoom transition

Do not wait for “it feels slow” before measuring.

## 14. Tauri

Tauri does not change the core renderer; it hosts the same UI in the system WebView.

Avoid:

- synchronous filesystem work on the UI thread
- large Source parsing in the renderer
- blocking native round-trips in pointer hot paths

Desktop capabilities must stay behind the Platform Adapter.
