# 05 — Reference Projects and Links

> **Borrow local solutions, never inherit a reference product’s product boundary.**

## A. Engineering references

### Excalidraw — source-level reference, MIT

- Repo: https://github.com/excalidraw/excalidraw
- Study: camera math, screen/world coordinates, pointer capture, selection geometry, lasso, keyboard interaction, local-first interaction.
- Do not embed `<Excalidraw />` or inherit its whiteboard / shape / arrow product model.

### tldraw — architecture textbook, not runtime dependency

- Docs: https://tldraw.dev/
- License: https://tldraw.dev/community/license
- Examples: https://tldraw.dev/examples
- Study: editor architecture, camera, hit testing, bindings, tools, history, geometry.
- Boundary: the current tldraw SDK is not a traditional permissively licensed open-source runtime and production use requires an appropriate license. Do not lock Diffusion’s core model into the SDK / shape ontology.

### d3-zoom — camera input

- https://d3js.org/d3-zoom
- Borrow pan/zoom behavior only. Do not let D3 own the Field data model or React lifecycle.

### Floating UI — contextual / anchored surfaces

- https://floating-ui.com/docs/react
- For Selection actions, Source Reference Surface and light popover positioning.
- Useful because it offers primitives without imposing visual style.

### Motion for React

- https://motion.dev/docs/react
- For Ghost emergence, Focus redistribution, Crystal settling and Field ↔ Thread layout transitions.
- Do not put pointer-frequency drag/camera hot paths behind declarative React animation.

### Zustand

- https://zustand.docs.pmnd.rs/learn/getting-started/introduction
- For runtime UI state. Do not treat the canonical project database as one Zustand store.

### Dexie

- https://dexie.org/docs/Tutorial/React
- v0.1 local-first IndexedDB adapter.

### Hono

- https://hono.dev/docs
- Web Standards: https://hono.dev/docs/concepts/web-standard
- For AI/Search gateway, CORS and secret boundaries; Core must not depend on Hono.

### Tauri 2

- Frontend configuration: https://v2.tauri.app/start/frontend/
- Vite integration: https://v2.tauri.app/start/frontend/vite/
- Desktop shell around the same Web UI; never a second UI implementation.

### React / Vite

- React TypeScript: https://react.dev/learn/typescript
- Vite: https://vite.dev/guide/

### Zod / Vitest / Playwright

- Zod: https://zod.dev/
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/

## B. UI / interaction references

### Allume (formerly Muse)

- https://allume.com/
- Borrow: Field dominance, low chrome, negative space, quiet spatial thinking.
- Do not borrow: files/PDFs/mixed media as the main Field content; Diffusion is not a material workspace.

### Are.na / Sander

- Are.na: https://www.are.na/
- Sander: https://www.are.na/editorial/introducing-sander-our-new-web-client
- Borrow: UI recession, content authority, responsiveness, Light/Dark consistency, restrained interaction.
- Do not borrow: collection / archive mental model.

### Kumu

- Focus docs: https://docs.kumu.io/guides/focus
- Borrow: selected context wakes while unrelated structure recedes.
- Do not borrow: network-graph worldview, permanent edges, node ontology.

### Linear

- Contextual command menu: https://linear.app/changelog/2019-10-07-contextual-command-menu
- Borrow: actions near their trigger, context-sensitive actions, precise hit areas.
- Do not borrow: project-management information architecture.

### Notion

- Side Peek / Center Peek / Full Page: https://www.notion.com/help/views-filters-and-sorts
- Borrow: deeper work receives more actual screen area; inspiration for Field → Thread → Deep Dive.
- Do not borrow: block/document editor mental model.

### Fabric Canvas — negative boundary + Source reference only

- https://fabric.so/features/canvas
- Borrow: how external material can appear as a light reference / preview.
- Do not borrow: a mixed-media canvas centered on `files + PDFs + links + arrows + shapes`. Diffusion’s Field is Thought-first.

### Kinopio / Milanote

- Kinopio: https://kinopio.club/
- Milanote: https://milanote.com/
- Borrow: direct manipulation and relaxed spatial placement.
- Do not borrow: colorful card networks or connector-heavy UI.

## C. Reference filter

Before copying any design or code pattern, ask:

1. Does it solve a real Diffusion problem now?
2. Does it silently introduce a whiteboard / graph / material-management / chat / document mental model?
3. Can we borrow a primitive instead of a full framework?
4. Does it preserve `AI creates possibility; user creates commitment`?

If questions 2 or 4 are risky, prefer a thin custom implementation.
