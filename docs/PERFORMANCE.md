# Performance measurements - v0.2

Measured in this container on 2026-09-13. Reports and reproducible scripts are included. These are separate measurement layers, not a blanket 60fps claim.

## Snapshot, Find and queue

Node 22.16.0; 10 warm-up iterations plus 80 measured samples per operation. The writer is held in memory, not Dexie/IndexedDB. Source update and Thread append fixtures are asserted to mutate the intended records.

| Thoughts | JSON bytes | Serialize p95 ms | Reload + validate p95 ms | Migration p95 ms | Find scan p95 ms |
|---|---:|---:|---:|---:|---:|
| 500 | 109663 | 0.446 | 1.277 | 1.821 | 0.172 |
| 2000 | 436356 | 2.443 | 4.562 | 6.193 | 0.621 |
| 5000 | 1094554 | 4.973 | 13.671 | 17.562 | 1.704 |

The measured fixture supports retaining snapshot storage and the existing Find scan for now, rather than adding premature normalization or MiniSearch. This is a provisional decision: long source bodies, long Threads, real quota behavior and actual IndexedDB I/O can change the result. One deliberately held save followed by 100 edits produces one active writer, one latest pending state and two writes, not a backlog of 101 obsolete snapshots.

Reports also separate clone, edit, drag commit, lifecycle, Source update and Thread append costs. The tiny Source/Thread reducer cost is not a save-latency measurement. Retest the full save/reload path on ordinary target hardware before claiming storage responsiveness.

## Actual source primitives in Chromium

An authored DOM harness runs the real camera, geometry/grid index, semantic label disclosure and CSS at 1440 x 960. Nodes are reconstructed at sampled culling boundaries with a forced layout. This does not mount React or time React reconciliation.

| Thoughts | Max local DOM | Atlas labels | Layout p95 ms | rAF p95 ms | Intervals >33 ms |
|---|---:|---:|---:|---:|---:|
| 100 | 18 | 4 | 15 | 16.7 | 1 |
| 500 | 42 | 14 | 3.2 | 16.8 | 0 |
| 2000 | 42 | 44 | 5.8 | 16.7 | 0 |
| 5000 | 42 | 44 | 3.8 | 16.7 | 1 |

All four scales preserved zero canonical camera commits during the sampled pan and one explicit final gesture commit. Local density stays capped at 240, Atlas at 64; the observed counts are lower because of viewport culling and semantic collision disclosure. Atlas Crystal text retained an 18px screen size. The samples include occasional long intervals and are not advertised as stable application 60fps.

## Index-only benchmark

The existing grid index was separately measured at 100 / 500 / 2000 / 5000 Thoughts over 1,000 queries per scale. `verification/v0.2/spatial-benchmark.json` (local evidence; the whole `verification/` tree is gitignored) records exact build/query results. Index query speed proves neither rendering performance nor persistence latency.

## Reproduce and extend

Run `pnpm run bench:spatial`, `pnpm run bench:storage`, and the two Chromium commands in `TESTING.md`. For the real app, install dependencies and inspect `/perf?count=100`, `500`, `2000`, `5000` during drag, pan, selection, source updates, long Threads and pending AI. Measure events-to-pixels latency, actual mounted DOM and IndexedDB writes separately. These routes are explicitly nonpersistent fixtures.

The container blocked native browser IndexedDB probing through file/loopback navigation. No browser policy was changed. Actual disk save latency, queue pressure under a slow database, reload and multi-tab editing remain unverified.

## Runtime cost, measured against the production bundle — v0.4 Phase 2.7

The review that opened this pass reported that starting the development app made the machine run
hot, so development and runtime cost were measured separately rather than assumed. Measured in this
container (3 vCPU, Linux, headless Chromium 1243 through Playwright, CDP `Performance` metrics,
25-second windows, three repeats). CDP metrics are per-renderer and therefore immune to other load on
the machine; wall-clock frame timing is not, and is quoted as such.

### Development (development-only)

| measurement | value |
|---|---|
| Vite `ready in` (its own log) | 148 ms |
| first HTTP 200 from `pnpm run dev` | 0.563 s (includes node/npm boot), 0.85 CPU-seconds |
| dev server CPU while idle afterwards | 0.00297 core ≈ **0.30 % of one core** |
| dev server RSS | node/vite 250 MB + npm 70 MB + esbuild 19 MB, 4 processes |
| `pnpm run typecheck` (tsc) | 6.80 s wall, 12.80 CPU-s, 622 MB peak RSS |
| `vite build` (rollup) | 4.43 s wall, 6.64 CPU-s |
| `pnpm run build` (both, sequential) | **10.12 s wall**, 17.29 CPU-s, 641 MB peak RSS |

`tsc` is ~67 % of a production build. No duplicate watchers or processes exist: `vite.config.ts`
already ignores `src-tauri/target/**`, `tauri dev` starts exactly one frontend server
(`beforeDevCommand: pnpm run dev`, `devUrl: 127.0.0.1:40000`), and the application starts **zero**
filesystem watchers. Rust is compiled once per `tauri dev` session, never per frontend edit. The
full first-run `cargo build` could not be timed here — GTK/glib development libraries are absent, so
it fails at `glib-sys` — and remains measured on a Windows host instead. **The fan spike is
development-only compilation.**

### Idle runtime (production bundle)

| window | main-thread task time | share of one core | style recalculations | frames |
|---|---:|---:|---:|---:|
| `about:blank` (harness baseline) | 0.517 s | 2.07 % | 0 | 60.0 fps |
| the app, idle | 0.725–0.746 s | 2.90–2.98 % | ~1150 | 46 fps |
| the app, idle, `.atmosphere::before` animation stopped | 0.540 s | **2.16 %** | **0** | 60.0 fps |

Run-to-run noise is ±0.05 pp, so the difference is real: **the product's entire idle cost is the
ambient drift — ≈0.8 % of one core — and with it stopped the app is indistinguishable from a blank
page.** There is no idle JavaScript loop: instrumented `requestAnimationFrame`, `setTimeout` and
`setInterval` record zero calls over a 5-second idle window; the attention tick is one `setInterval`
of 60 s; the seven ResizeObservers and zero MutationObservers fire only on resize. The 46 fps figure
is an artifact of headless **software** rendering of a 1.83 Mpx transform-only layer
(`will-change: transform` was tried and changed nothing); a real GPU compositor is expected to take it
off the main thread, which this container cannot verify.

### Interaction (per gesture, atmosphere suppressed to isolate the pointer path)

| gesture | wall | main-thread task time | share of one core | p50 / p95 frame |
|---|---:|---:|---:|---|
| drag a Thought (40 moves) | 0.91 s | 0.189 s | 20.7 % | 16.7 / 16.8 ms |
| pan (Space + drag) | 0.71 s | 0.078 s | 10.9 % | 16.7 / 16.7 ms |
| wheel zoom (25 steps) | 2.10 s | 0.106 s | 5.0 % | 16.7 / 16.8 ms |
| marquee drag | 0.74 s | 0.129 s | 17.5 % | 16.7 / 16.7 ms |
| open Settings | 1.33 s | 0.284 s | 21.4 % | 16.7 / 50.0 ms |

`ScriptDuration` stays at 5–6 % of one core and style recalculation tracks presented frames, which is
what the imperative, rAF-coalesced pointer path predicts — and what a React render per pointer event
would not produce. The two p95 outliers are a single frame each (the drag-start store patch, and the
Settings entrance animation), not sustained stalls.

**Recommended workflow.** `pnpm run dev` for frontend visual iteration (~0.5 s cold start, ~0.3 % of
one core); `pnpm run tauri dev` only for desktop-specific validation (native dialogs, fs/opener
plugins, WebView2 CSP, packaging), which is the only path that compiles Rust and only once. Never
both: each binds `127.0.0.1:40000` with `strictPort`.

## Production bundle warning

A production build before the approved Field-background migration emitted a **1,254.18 kB minified / 417.85 kB gzip** main JavaScript chunk and **114.15 / 20.79 kB** CSS. With all five promoted backgrounds, the eager shell is **1,257.71 / 419.10 kB** JavaScript and **114.88 / 20.90 kB** CSS: an eager delta of about **+3.53 / +1.25 kB JS** and **+0.73 / +0.11 kB CSS**. Worker and platform chunks remain separate and small.

The promoted renderers remain optional chunks: Waves **5.32 / 2.53 kB**, Threads **7.74 / 3.10 kB**, Topography **8.43 / 3.39 kB**, the shared OGL Triangle chunk used by Threads/Topography **44.37 / 12.91 kB**, Paper Texture **63.21 / 31.57 kB**, and Silk/Three/R3F **857.84 / 231.23 kB** (all minified/gzip). The large Silk payload is paid only after selecting Silk; it is intentionally visible as a risk rather than folded into the initial shell.

Removing the superseded Quiet, Terrain, Flow, Dust, Relief, tiled-SVG, and camera-presentation paths reduces the eager shell to **1,240.71 / 413.41 kB JavaScript** and **100.39 / 18.61 kB CSS**. Relative to the five-background build above, that cleanup removes about **17.00 / 5.69 kB JS** and **14.49 / 2.29 kB CSS** without changing the lazy renderer chunks.

A temporary package-group `manualChunks` build predating this migration was used only to estimate eager composition. Its approximate minified/gzip groups were: React/runtime 412/133 kB, application 442/148 kB, Motion 128/42 kB, Dexie 96/32 kB, GSAP 77/31 kB, Zod 54/13 kB, and UI primitives 38/14 kB. Rollup reported cross-group cycles in that diagnostic layout, so these are composition evidence, not a shippable chunk plan.

No eager production split was added. The application shell needs React, storage, core state, spatial interaction, and primary primitives at startup; manually separating them would mostly turn one transfer into multiple eager requests. The five approved Field backgrounds are genuine lazy boundaries. Keep the existing warning visible. Revisit the Silk payload when selection/startup traces show a user-facing delay; do not merely raise `chunkSizeWarningLimit`.
