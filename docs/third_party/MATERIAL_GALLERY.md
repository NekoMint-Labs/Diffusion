# Field background and Material Gallery provenance

`/dev/material-gallery` remains a private comparison environment guarded by `import.meta.env.DEV`. Five reviewed renderers—Paper Texture, Topography, Threads, Waves, and Silk—also ship through the shared `src/ui/fieldBackgrounds/` production boundary. Perlin remains gallery-only. These notices do not license Diffusion's own source: that source is licensed under the Apache License 2.0 (root [`LICENSE`](../../LICENSE)), and the third-party terms recorded here are unchanged by it.

## Paper Shaders

- Package: `@paper-design/shaders-react@0.0.81` (Apache-2.0), with `@paper-design/shaders@0.0.81`.
- Upstream: https://github.com/paper-design/shaders
- Audited source revision: `43cd68db79fa0b1759f72ffc941b3238e2a3954c`.
- Used public implementations: production Paper Texture and gallery-only Perlin Noise.
- Integration: consumed through the published package API; no Paper Shaders source is copied into Diffusion.
- Local adaptation: restrained Diffusion token colors and parameters, `speed={0}` static mode, `minPixelRatio={1}`, and a 1920×1080 backing-pixel cap.
- Required notice and license: [`PAPER_SHADERS_NOTICE.md`](PAPER_SHADERS_NOTICE.md), [`PAPER_SHADERS_LICENSE.txt`](PAPER_SHADERS_LICENSE.txt).

## React Bits

- Upstream: https://github.com/DavidHDev/react-bits
- Audited and copied revision: `9481af758aae6cfb34c3652ec40a1c099360331f` (`main` at inspection time).
- License: MIT + Commons Clause License Condition v1.0; Diffusion uses the components as part of an application and does not sell, sublicense, or redistribute the components themselves.
- Retained license: [`REACT_BITS_MATERIALS_LICENSE.md`](REACT_BITS_MATERIALS_LICENSE.md).

Copied from the TypeScript/default implementations and adapted at these paths:

| Diffusion file | Reachability | Exact upstream source | Adaptations |
|---|---|---|---|
| `src/ui/fieldBackgrounds/vendor/Topography.tsx` | Production + gallery | `src/ts-default/Backgrounds/Topography/Topography.tsx` | Diffusion parameter wrapper, static Motion 0, 30fps moving cap, CSS-pixel resolution cap, hidden pause, pointer-inert styling |
| `src/ui/fieldBackgrounds/vendor/Threads.tsx` | Production + gallery | `src/ts-default/Backgrounds/Threads/Threads.tsx` | Speed/static control, 30fps moving cap, true hidden pause, CSS-pixel resolution cap, pointer interaction disabled |
| `src/ui/fieldBackgrounds/vendor/Waves.tsx` | Production + gallery | `src/ts-default/Backgrounds/Waves/Waves.tsx` | Deterministic seed, static/hidden pause, CSS-pixel resolution cap, pointer input removed |
| `src/ui/fieldBackgrounds/vendor/Silk.tsx` | Production + gallery | `src/ts-default/Backgrounds/Silk/Silk.tsx` | Demand rendering at Motion 0/when hidden, CSS-pixel DPR, low-noise neutral wrapper |

Production wrappers accept only palette, effective motion, and detail. They remain outside canonical state and camera ownership. The gallery imports those same wrappers for its six-way comparison; it does not maintain duplicate copies.

## Renderer dependencies

`@paper-design/shaders-react@0.0.81`, `ogl@1.0.11`, `three@0.180.0`, and `@react-three/fiber@9.3.0` are runtime dependencies because approved Field Styles can reach them in production. `@types/three@0.180.0` remains development-only. The production renderers are lazy chunks, so choosing an existing legacy Field Style does not eagerly execute them.
