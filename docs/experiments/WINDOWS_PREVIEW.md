# Windows package profiles and isolated previews

Preview packages are for hands-on review before merging a feature.
They are not stable v0.3.16 updates. Native install/launch, persistence and physical
IME acceptance must be recorded separately from browser tests and packaging.

## Build and provenance

**Windows Package** accepts a fixed `profile` choice on manual dispatch. The
default remains `stable`, with the same base config and NSIS build as before.
This replaces the old `preview` checkbox; select `preview` for the same Next
trial. The workflow uploads artifacts only; it does not publish a release.

| Profile | Config under `src-tauri/` | Packaged entry | App identifier |
| --- | --- | --- | --- |
| `stable` | `tauri.conf.json` (no override) | `index.html` | `app.diffusion.explorer` |
| `preview` | `tauri.preview.conf.json` | `next/explore?locale=zh` | `app.diffusion.explorer.preview` |
| `field` | `tauri.field-preview.conf.json` | `index.html?locale=zh&readingTrial=1&propositionTrial=1` | `app.diffusion.explorer.preview` |
| `free-links` | `tauri.free-links.conf.json` | Field entry plus `freeLinksTrial=1` | `app.diffusion.explorer.freelinks` |

PR builds read `src-tauri/windows-preview-profile.json`, for example
`{"profile":"field"}` for #88. Without this file they use `preview`. PRs cannot
select `stable`. Only the four names above are accepted; a config path, command
or custom URL is not an input. The selected config must exist and match its
fixed identity and entry. #94 can reuse its existing Free Links config by
bringing in this tooling and setting the manifest to `free-links` when ready;
selecting it on #88, where that config is absent, fails without a fallback.

For a local build from the exact reviewed commit, install locked dependencies
and build the discovery sidecar as described in `docs/TESTING.md`. Then run
(substitute the selected fixed config for a different preview):

```powershell
pnpm run tauri build --config src-tauri/tauri.field-preview.conf.json --bundles nsis
```

Native packaging/profile/tooling changes on a PR automatically run **Windows
Package** at the exact PR head. For manual dispatch, select the intended branch
or tag and profile. Each `diffusion-windows-<profile>-<SHA>` artifact includes
one Windows x64 NSIS `.exe`, `SHA256SUMS.txt`, `source.json` and this `INSTALL.md`.
Download and extract the artifact from the run's Summary before installing.
`source.json` records the measured checkout SHA (checked before/after building),
profile, config hashes, entry, identifier, run URL, installer size and SHA-256.
Missing, empty or multiple installers fail the recording step. CI uses a fresh
bundle directory; local users must move any previous installer out first.

Verify the `.exe` with `Get-FileHash -LiteralPath '.\<installer>.exe' -Algorithm SHA256`
and compare with both receipt files. Check that `sourceCommit` equals the
intended PR head; old-head successes do not validate a newer head. A GitHub release
using this installer must be marked **pre-release**, with the SHA, hashes and
actual acceptance results in its notes. CI green alone does not qualify it.

## Isolation

| Item | Stable | Preview |
| --- | --- | --- |
| Installer/app name | Diffusion Explorer | Diffusion Preview |
| Application identifier | `app.diffusion.explorer` | `app.diffusion.explorer.preview` |
| Main executable | `diffusion-explorer.exe` | `diffusion-preview.exe` |
| Default Windows WebView storage | `%LOCALAPPDATA%\app.diffusion.explorer` | `%LOCALAPPDATA%\app.diffusion.explorer.preview` |
| OS credential service | `app.diffusion.explorer` | `app.diffusion.explorer.preview` |

Native credentials use the configured app identifier for all reads, writes,
presence checks and deletion. Stable retains its existing service name. The
preview starts empty and does not import stable Fields, settings or API keys.
Use the default **Diffusion Preview** install directory; do not choose the stable
app's directory or override the WebView data folder. No backup, migration or
automatic copying of private data is part of this preview.

The bundled discovery executable and licenses are inherited from the normal
packaging configuration. Provider access is optional; the Next trial starts in
an authored demo and makes no model request until explicitly configured.

`field` and `preview` share the Preview name, binary, data and credential service.
They replace each other and reuse existing Preview data; back it up before
switching. They do not provide side-by-side comparison. `free-links` uses
**Diffusion Free Links**, `diffusion-free-links.exe` and its separate identifier
for data and credentials, so it can coexist with stable and Preview. Use each
app's own default installation directory. No credentials are copied.

The Field and Free Links entries do not enable `plainAnswerTrial`. That wording
experiment remains off by default. Packaging does not start an app or make a
live-model request. The receipt marks feature, installed-Windows and live-model
acceptance as `not-run`, independently of packaging success.

## Reviewer smoke checks

1. Verify the installer hash, install **Diffusion Preview** alongside stable and
   confirm the distinct name, path and running executable.
2. Launch it and check the entry against `source.json`. For `preview`, the window
   opens `/next/explore?locale=zh`; run a disposable demo step, close/reopen, and
   verify the notebook/checkpoint persist. For `field`, it opens Field directly
   with reading/proposition trials; check original text, Keep and Fork/Bring on
   disposable Demo data, then close/reopen and verify persistence. Wording
   guidance must remain off. For `free-links`, first verify its distinct app
   name, then follow `FREE_LINKS_TRIAL.zh-CN.md` from that feature's checkout.
3. Use **Return to the Field**. With disposable demo data, check Field and Thread
   opening previews and full-text reading; Keep and exports retain the original
   answer. Close/reopen and verify the Field persists. The `preview` profile
   returns to Next on restart; `field` returns to Field.
4. Confirm the installed resources contain the discovery sidecar. Record its
   offline protocol/version check separately from any live search trial.
5. Confirm stable still opens its own existing Fields and connections. Report
   pass/fail/not-run for each item; do not include API keys or private exports.

Installers are unsigned unless their handoff explicitly records a verified
signature. Live-model quality, live search, installed Windows operation and IME
behavior remain open until directly exercised. The small answer preview is an
opening excerpt, not a verified summary. Full answers remain the stored source.
