# Isolated Windows preview for #77 and #80

This is a release candidate for hands-on review before merging the two PRs.
It is not a stable v0.3.16 update. Native install/launch, persistence and physical
IME acceptance must be recorded separately from browser tests and packaging.

## Build and provenance

From the exact reviewed #80 commit, install locked dependencies and build the
discovery sidecar as described in `docs/TESTING.md`. Then run:

```powershell
pnpm run tauri build --config src-tauri/tauri.preview.conf.json --bundles nsis
```

Native packaging changes on a PR automatically run **Windows Package** in preview
mode at the exact PR head. Alternatively dispatch it with **preview** enabled.
Its artifact includes the NSIS installer, `SHA256SUMS.txt` and `source.json`.
Check that the source SHA equals the final checked PR head. A GitHub release
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

## Reviewer smoke checks

1. Verify the installer hash, install **Diffusion Preview** alongside stable and
   confirm the distinct name, path and running executable.
2. Launch it. The packaged window opens `/next/explore?locale=zh` directly.
   Enter a disposable question, run a demo step, close and reopen, and verify
   the notebook and checkpoint persist.
3. Use **Return to the Field**. With disposable demo data, check Field and Thread
   opening previews and full-text reading; Keep and exports retain the original
   answer. Close/reopen and verify the Field persists. Restart to return to Next.
4. Confirm the installed resources contain the discovery sidecar. Record its
   offline protocol/version check separately from any live search trial.
5. Confirm stable still opens its own existing Fields and connections. Report
   pass/fail/not-run for each item; do not include API keys or private exports.

Installers are unsigned unless their handoff explicitly records a verified
signature. Live-model quality, live search, installed Windows operation and IME
behavior remain open until directly exercised. The small answer preview is an
opening excerpt, not a verified summary. Full answers remain the stored source.
