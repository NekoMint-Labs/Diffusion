# Desktop verification and native boundary

Desktop is a Tauri 2 shell around the exact same React/Vite frontend. There is no second UI, native database, or native AI orchestration layer.

After Web dependencies and the platform's documented Tauri prerequisites are installed:

```sh
npm run typecheck
npm test
npm run build
npm run tauri -- dev
npm run tauri -- build
```

The delivery container has neither Rust/cargo nor WebKit GTK development prerequisites. None of these native commands were run successfully here. The scaffold, capabilities, icons and adapter are source-only/unverified. Resolve npm and Cargo lockfiles on a network-enabled machine and commit them after validation. Do not mistake syntactically valid JSON/TOML for a successful native build.

The file dialog has no artificial file-type filter. The adapter uses asynchronous reads and explicit size budgets. The file-system plugin relies on its app-data scope plus access granted by an explicit file dialog; no `$HOME/**` or filesystem-root grant is added. Verify open/save dialog scope behavior on Windows, macOS and Linux before release. If access is denied, the UI reports Unavailable/Limited or a save error, rather than pretending extraction succeeded.

Opening web originals is supported through the opener adapter with HTTP(S)-only application validation. Arbitrary retained native paths are intentionally **not granted opener permission**. Local original bytes can instead be saved as a copy using the native Save dialog. Opening a retained path in its external default application, global shortcuts, installer signing/notarization and OS-specific packaging polish remain incomplete. Do not add broad path permissions to hide an error.

Tauri disables its built-in drag/drop interception so the shared HTML Field can receive ordinary dropped files. Validate this on each WebView. Native picker fallbacks are available through the Field menu.

The WebView uses a restrictive CSP; the only plaintext external connections permitted by default are the local gateway on port 8787. Remote gateways must use HTTPS. Use an explicit gateway URL in Settings and an exact allowed WebView origin in ALLOWED_ORIGIN on the server. API keys remain in the gateway process; no native keychain implementation is claimed.

Primary references: https://v2.tauri.app/start/frontend/vite/ , https://v2.tauri.app/plugin/dialog/ , https://v2.tauri.app/plugin/file-system/ , https://v2.tauri.app/plugin/opener/ .
