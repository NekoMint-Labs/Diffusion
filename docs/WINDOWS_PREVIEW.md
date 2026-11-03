# Windows Field Preview

PR packages use an isolated Preview identity: `app.diffusion.explorer.preview`,
`diffusion-preview.exe`, and a separate default WebView data profile and native
credential service. Stable retains `app.diffusion.explorer`. Preview does not
migrate stable Fields or credentials. Normal Preview and Field profiles share
one identity and replace each other; they cannot be installed side by side.

Both profiles open the existing Field at `index.html?locale=zh`. No Next page,
notebook or separate storage is included. The optional Free Links profile keeps
its own identity and requires its separately reviewed configuration; it is not
part of this change. Stable packaging remains a manual workflow choice.

Download the complete artifact from Windows Package. Verify the installer
against `SHA256SUMS.txt` and check `source.json` for the complete source SHA,
profile, configuration hashes and entry point. Install the unsigned Windows x64
NSIS `.exe` into the Preview directory. Preserve a portable backup of existing
Preview Fields before replacing another Preview build.

On the actual downloaded package, check:

1. Stable/Preview executable, data and credential isolation; credential
   create/read/delete through the configured native adapter.
2. Older saved Fields and absent/invalid proposition metadata remain readable.
3. Read original, Keep, edit, Undo/Redo, manual and generated Fork/Bring.
4. JSON export/recovery and close/reopen preserve full wording and valid points.
5. Cancel/close during extraction never commits a late result.
6. Chinese IME, physical keyboard/trackpad and relevant DPI settings.

Packaging success is not installed acceptance. `source.json` records installed,
feature and live-model checks as `not-run` at build time; record later tests
separately against the same SHA and installer hash. No paid-model acceptance is
implied by deterministic tests or this package.
