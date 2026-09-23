# Runtime license-text fallbacks

Reviewed license text for dependencies whose published package or crate ships no usable license text
of its own.

## When this directory is used

`pnpm run prepare:licenses` resolves every runtime dependency to exactly one state:

| State | Meaning |
|---|---|
| `local` | The installed package or crate carries the license text; it is copied byte for byte. |
| `extracted` | The installed artifact carries the complete text inside another file (for example a README section); `registry.json` pins the markers and the expected content hash of the extraction. |
| `fallback` | Nothing usable is in the installed artifact, so the committed upstream text below is bundled instead. |
| `special-case` | The retained Diffusion / discovery-engine / React Bits / Paper Shaders material is authoritative. |
| `unresolved` | Nothing could be resolved; packaging fails and names the dependency. |

This directory is only for the exceptional cases. A dependency whose installed artifact already
contains its license text never appears here.

## Rules this directory follows

- **Exact version.** An entry matches one ecosystem + package name + exact version. A dependency
  upgrade does not inherit the old review: it fails packaging until a human adds the new entry.
- **Exact declaration.** The entry records the license expression it was reviewed against. If the
  dependency changes what it declares, packaging fails.
- **Exact bytes.** Every committed file is verified against the SHA-256 recorded for it in
  `registry.json` on every run, so a silently edited or truncated text is a hard error.
- **Upstream text only.** Texts are copied byte for byte from an upstream repository at a recorded
  revision, from the license steward, or — when the dependency publishes no license file anywhere —
  from the official terms page it names itself. Nothing is paraphrased, reconstructed or templated.
- **No network.** Preparation is offline. The one-time upstream research that produced these files is
  recorded in `registry.json` (source URL, revision, fetch date, content hash); nothing is fetched
  during a build.

## MPL Source Code Form availability

The Mozilla Public License 2.0 requires anyone distributing MPL-covered code in executable form to
tell recipients how they can obtain the corresponding Source Code Form. The `sourceCodeForm` list in
`registry.json` records that location for every MPL-covered runtime dependency in the shipped binary
— currently `cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext` and `selectors`, which
arrive transitively through Tauri's styling stack — and `THIRD_PARTY_NOTICES.md` states it for each
of them.

Each record is pinned to one exact version and holds at least one absolute `https` location: the
immutable published package for that version (`crates.io` serves the exact source that was compiled)
and, where the crate records one, the upstream repository tree at the revision the published package
was built from. A record whose dependency no longer declares MPL fails the generator, and an
MPL-covered dependency without a record fails too — so a new or upgraded MPL dependency cannot ship
silently. Two records pointing at one dependency is never a claim that anything else in this
distribution is MPL-licensed: Diffusion's own source stays under Apache-2.0.

## Layout

```
registry.json          exact-version review records: fallback groups/entries + MPL source locations
<group>/*              the reviewed upstream texts, shared by the entries that reference the group
```

`registry.json` records, per group: the upstream repository, why a fallback is necessary and which
files belong to it, plus per file the source URL, upstream revision(s), fetch date and SHA-256.
Entries additionally record the group and which of its files apply to that dependency, and the
`sourceCodeForm` list records MPL source-availability locations.

## Notes on individual sources

- **objc2 family (19 crates):** the crates ship no license files, and the upstream repository carried
  only its `LICENSE.md` pointer document at the revisions the published crates were built from. That
  document is bundled from those revisions, and the MIT / Apache-2.0 / Zlib texts are bundled from a
  later commit of the same repository, which the project added afterwards. `LICENSE.md` also records
  that these crates are derived from Apple SDKs and that using them requires Xcode and its license.
- **gsap and @gsap/react:** neither the packages nor the upstream repository carry license text;
  both declare the terms only by URL. The bundled text is the complete *Standard "No Charge" GSAP
  License* from the official licensing page, converted from the page HTML without rewording. "No
  charge" is the title of that license, not a condition in it: the retained text grants commercial
  and non-commercial use for the defined Permitted Uses, and its substantive restriction is the
  defined *Prohibited Uses* concerning no-code tools that compete with Webflow's visual
  animation-building capabilities. The retained text contains no requirement about what an end
  product may charge its users, and this repository does not read one into it. GSAP is not MIT,
  Apache-2.0 or open source, and no compatibility conclusion is drawn here.
- **selectors (MPL-2.0):** neither the crate nor the mirrored upstream repository carries a license
  file. The bundled text is Mozilla's own published copy of the Mozilla Public License 2.0.
- **r-efi:** upstream publishes no license file; the crate's own `AUTHORS` file carries the complete
  MIT text and the project's copyright holders, which is what the extraction bundles. The crate
  declares a triple license, but the Apache-2.0 and LGPL-2.1 texts are not published as text by
  upstream.
- **winapi target crates and rustls-platform-verifier-android:** these packages publish no vcs
  revision. Their texts come from the revision of the same project published with the sibling
  `winapi 0.3.9` crate (verified byte-identical to the files that package ships), and from the
  upstream default-branch commit resolved and recorded on the review date, respectively.
