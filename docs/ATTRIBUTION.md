# References, dependencies and attribution

This rebuild modifies the supplied application. It does not import a reference product's ontology. The production UI does not copy a reference product's frontend, third-party font files, imagery, or icon library; typography uses system fallbacks. Four attributed React Bits background renderers are the explicit copied-code exception: Topography, Threads, Waves, and Silk are shared by production and the development Material Gallery.

The ordinary runtime packages retain their respective package licenses. Paper Shaders, OGL, Three, and React Three Fiber are production dependencies used by the five approved lazy Field backgrounds; type-only packages remain development dependencies. Exact versions, reachability, copied paths, adaptations, and retained notices are recorded in [`third_party/MATERIAL_GALLERY.md`](third_party/MATERIAL_GALLERY.md).

Diffusion's own discovery engine originated from selected components of `onedotmint/smartsearch` v1.0.3 (MIT, Copyright (c) 2025 GuDaStudio). The code was adapted and is now maintained by Diffusion as its own source under `internal/discovery-engine/`; the engine is bundled rather than separately installed. The retained upstream license text is kept at `internal/discovery-engine/LICENSE.smartsearch`, and `internal/discovery-engine/PROVENANCE.md` lists exactly which upstream modules were retained, adapted and omitted. No Diffusion build or release follows SmartSearch.

Actual inspected paths, available revision identifiers, license checks, copied/adapted/studied distinctions and implementation consequences are recorded in `REFERENCE_AUDIT.md` and, for the isolated material experiment, [`third_party/MATERIAL_GALLERY.md`](third_party/MATERIAL_GALLERY.md). Vercel AI SDK was studied, not installed/adopted. Excalidraw's MIT license was checked; its shape/editor implementation was not copied. Study-only products named in the planning spec are not claimed as used unless those records identify a real inspection.

Except where otherwise noted, Diffusion-owned source is licensed under the Apache License 2.0 (root [`LICENSE`](../LICENSE)). That root license applies to Diffusion's own source and does not replace or alter the terms governing third-party, copied, adapted or vendor-derived material, which remain as recorded below. Supplied historical attribution notes are preserved under `docs/history/v0.1/`.

## License boundary

Three kinds of source exist in this repository, and they do not share one license:

- **Diffusion-owned source** — `src/`, `server/`, `src-tauri/`, `scripts/`, `tests/` and the
  documentation. Except where a file or directory records otherwise, this source is licensed under the
  Apache License 2.0 (root [`LICENSE`](../LICENSE)).
- **Third-party packages** — runtime and development dependencies (for example React, Dexie, Hono,
  Zod, Motion, GSAP, Tauri packages, `@paper-design/shaders-react`). They are used under their own
  published licenses, and those terms apply to those packages only. Package notices that must travel
  with the code are retained under [`docs/third_party/`](third_party/MATERIAL_GALLERY.md).
- **Copied, adapted or vendor-derived source** — the React Bits material renderers vendored under
  `src/ui/fieldBackgrounds/vendor/`, and the discovery engine under `internal/discovery-engine/`
  (MIT, extracted from `onedotmint/smartsearch` v1.0.3). Each carries its own retained license text
  and provenance record, listed in [`third_party/MATERIAL_GALLERY.md`](third_party/MATERIAL_GALLERY.md)
  and [`../internal/discovery-engine/PROVENANCE.md`](../internal/discovery-engine/PROVENANCE.md).

Do not remove or rewrite a third-party notice, license text or provenance record. This section
records what already exists; it makes no compatibility claim beyond the recorded license texts, and
the root Apache-2.0 license does not override them.

## Desktop distribution

This repository is the source of truth for the detailed provenance and attribution records above.
Desktop distributions carry a compact resource set instead, generated from the canonical retained
license files by [`scripts/prepare-distribution-licenses.mjs`](../scripts/prepare-distribution-licenses.mjs)
into `src-tauri/resources/licenses/` and bundled by Tauri: the root Apache-2.0 text, the retained
SmartSearch MIT notice, the React Bits material license, the Paper Shaders license and notice, and a
short `THIRD_PARTY_NOTICES.md` index. The generated copies are not committed and are regenerated on
every packaging run, so they cannot drift from their sources. These are passive bundled files: the
installer shows no license page and asks for no agreement.

The same step derives a runtime dependency inventory from the exact installed graphs — pnpm's
resolved production tree for the JavaScript packages, `cargo metadata` for the Rust crates — and
copies the license text each one ships into the generated `dependencies/` directory. Versions come
from the lockfiles rather than a hand-kept list, so a dependency update regenerates the inventory.
Declarations that are not SPDX identifiers are recorded verbatim and must be reviewed in
[`scripts/lib/dependency-license-rules.mjs`](../scripts/lib/dependency-license-rules.mjs); the
generator fails instead of accepting an unfamiliar term.
A dependency whose published package or crate carries no license text of its own is covered by a
reviewed fallback in
[`third_party/runtime-license-fallbacks/`](third_party/runtime-license-fallbacks/README.md): either
the complete text is extracted deterministically from an installed file, or an upstream text is
committed there from a recorded source, revision and content hash. Fallbacks are pinned to one
exact ecosystem + name + version and to the license expression they were reviewed against, so a
dependency upgrade or a changed declaration fails packaging rather than silently reusing an old
review. Dependencies covered by the Mozilla Public License additionally record where their Source
Code Form can be obtained, because that licence obliges an executable distribution to tell its
recipients; those locations — the exact published version and the upstream revision it was built
from — are stated per dependency in `THIRD_PARTY_NOTICES.md`. Nothing is fetched during a build.
