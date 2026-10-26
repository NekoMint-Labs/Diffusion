# Acceptance map

This map identifies where a current change must be verified. It is not a cumulative list of
passes from older versions. Exact revision-specific outcomes belong in the pull request and
[STATUS.md](../STATUS.md); commands and evidence limits are in [TESTING.md](TESTING.md).

As checked on October 26, 2026, [#11](https://github.com/NekoMint-Labs/Diffusion/issues/11) and
[#12](https://github.com/NekoMint-Labs/Diffusion/issues/12) are closed as completed, and
[v0.3.16](https://github.com/NekoMint-Labs/Diffusion/releases/tag/v0.3.16) is published as stable.
The earlier acceptance journal is preserved [unchanged](history/checkpoints/ACCEPTANCE_BEFORE_BASELINE_2026_10_21.md).
Its dated instructions and unverified markers describe those revisions, not current issue state.

| Contract | Automated verification | Additional evidence when the change affects it |
|---|---|---|
| User authority; transient AI proposals; explicit Keep/commit | Core and thinking unit tests, offline contracts, mounted thinking flows | Real-model action quality and real-task use |
| Camera, selection, drag, geometry, and hierarchy | Spatial/camera unit tests and mounted interaction E2E | Physical trackpad/mouse, native scaling and long-session use |
| Focus, Escape, menus, Thread and surface return | Keyboard and focus/return E2E | WebView2 accessibility, native interruption and IME |
| Materials, motion, localization, and readability | Locale checks, motion/material unit and browser tests, fixed-camera captures | Rendered visual review, Reduced Motion, target GPU/driver and screen sizes |
| Persistence, migration, import/export, and recovery | Repository/migration tests and browser persistence flows | Actual old-data upgrade, OS dialogs, native close/reopen and crash recovery |
| Provider and evidence boundaries | Fake-upstream transport tests, credential contracts, Python discovery tests | Operator-authorized live query/read, credentials, cancellation and network failures |
| Native process and filesystem boundaries | Rust tests plus offline frontend/native contract checks | Cargo/Tauri compilation, sidecar packaging, installer and OS permission behavior |
| Source and maintenance tooling | Strict TypeScript checks, offline source checks, Python snapshot fixtures | Review newly introduced exports, dynamic references, dependency/license changes |
| Browser delivery | Full production Playwright suite with one worker and no retries | Other browser engines and installed WebView2 behavior |

Keep each claim attached to its input revision and environment. A passed fixture test does not
establish provider availability; a browser run does not establish a Windows installer; a release
label does not replace per-change verification. Do not weaken or skip a failing assertion to
manufacture a baseline.
