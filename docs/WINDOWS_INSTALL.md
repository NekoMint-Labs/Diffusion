# Windows stable installation and acceptance — v0.3.17 candidate

**Release preparation only. v0.3.17 is not published or accepted yet.**
This unsigned Windows x64 NSIS package uses the existing stable identity:
`Diffusion Explorer`, executable `diffusion-explorer.exe`, application/data
identity and native credential service `app.diffusion.explorer`. It upgrades the
stable application; it does not import the separate Preview data or credentials.
Do not rename a Preview installer and treat it as stable.

## Verify this package

Keep all four files together: the `.exe`, `SHA256SUMS.txt`, `source.json` and
this `INSTALL.md`. In PowerShell, run `Get-FileHash -Algorithm SHA256` on the
downloaded `.exe` and compare with **both** the checksum list and `source.json`.
Confirm the receipt records `profile: stable`, `preview: false`, version
`0.3.17`, `appIdentifier: app.diffusion.explorer`, `entryPoint: index.html`, the
full 40-character source SHA and the expected Actions run. The receipt also
records the selected configuration hashes and these instructions' SHA-256.

A package built from the release-preparation PR is an **acceptance candidate**.
After approval and merge, rebuild from the final main SHA and recheck its receipt
and checksum before publishing; do not relabel the PR package as that build.
Packaging success does not prove installation, upgrade, data retention or a live
provider works. Their receipt fields intentionally start at `not-run`.

## Before installing / 安装前

1. In the **currently installed stable** application, export each important
   Field as JSON. Open the exported file to confirm it exists and retain original
   source files separately. JSON excludes credentials, unclaimed Ghosts and
   original attachment bytes; Markdown is not a restorable backup.
2. Record the old app version, install directory, Field names and a few unique
   card texts. For upgrade qualification, first use a disposable Windows account
   with v0.3.16, saved Fields and a test-provider configuration. Keep personal
   data out of test logs and never export or share a credential.
3. Close Diffusion before running the verified installer. Choose the existing
   stable install directory. Do not uninstall with **Delete app data**, clear
   WebView storage or delete credentials as part of an upgrade.

## Acceptance checklist / 按顺序验收

Record **PASS / FAIL / NOT RUN**, OS build, old/new versions, source SHA and
installer checksum for each item. Stop and preserve the old data/backup if a
Field is missing; do not create replacement data and call it retained.

1. **Install/upgrade:** open the installed application, not localhost or Preview.
   Verify the version, executable location and existing Field names/texts. Close
   and reopen; existing Fields and their contents must remain.
2. **Credentials:** existing stable AI settings should still reference the saved
   credential. Verify through Settings/native operations without displaying or
   logging the key. Use a disposable provider entry for create/delete testing;
   do not delete a daily-use key. Preview must remain separate.
3. **Reading and history:** in a test Field, read a long original, Keep the
   suggestion, then read the complete original again. Edit the kept text; check
   the user-edited marker and invalidation of the old point. Undo/Redo must
   restore the matching text and point. Check short and legacy cards too.
4. **Fork/Bring:** Fork a handwritten card and an AI-origin card, then Bring
   them back. Handwritten text must remain handwritten. New cards should avoid
   existing cards without moving those cards or the camera.
5. **JSON recovery:** export the test Field, restore into a separate test Field
   and compare full text, points and edited provenance. Close/reopen and compare
   again. Keep the original Field and backup.
6. **Chinese input:** use a physical Chinese IME in writing, Ask and edit.
   Confirm composition with Enter; it must not submit unfinished text. Check
   keyboard focus, touchpad pan/zoom and the display scaling you use.
7. **Real provider:** after agreeing on a small call budget, use a configured
   provider for Ask → Read → Keep → Continue. Check cancel and unavailable/error
   feedback. Record provider/model, actions and outcomes without credentials.
   Demo/injected-model success does not satisfy this item.

Supply the completed record to the release reviewer. Final code approval,
Windows acceptance, final-main package provenance and separate publication
approval remain required before a GitHub Release. Do not infer acceptance from
a green CI badge.
