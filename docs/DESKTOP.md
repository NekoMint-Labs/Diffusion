# Desktop verification and native boundary

Desktop is a Tauri 2 shell around the exact same React/Vite frontend. There is no second UI, native database, or native AI orchestration layer.

After Web dependencies and the platform's documented Tauri prerequisites are installed:

```sh
pnpm run typecheck
pnpm test
pnpm run build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm run tauri -- dev
pnpm run tauri -- build
```

The repository tracks both `pnpm-lock.yaml` and `src-tauri/Cargo.lock`. During the current stabilization pass, Rust 1.97.1 and Cargo 1.97.1 were available, but `cargo test --manifest-path src-tauri/Cargo.toml` stopped before compiling the application because this Linux/WSL2 environment lacks the required `glib-2.0` and `gobject-2.0` development packages. A Linux discovery sidecar was built and checked separately; that is not a Tauri runtime or Windows package pass. Native runtime, package, and Windows behavior remain **UNVERIFIED**. Run the commands above on a machine with the platform's Tauri prerequisites, then record the OS and actual result.

The file dialog has no artificial file-type filter. The adapter uses asynchronous reads and explicit size budgets. The file-system plugin relies on its app-data scope plus access granted by an explicit file dialog; no `$HOME/**` or filesystem-root grant is added. Verify open/save dialog scope behavior on Windows, macOS and Linux before release. If access is denied, the UI reports Unavailable/Limited or a save error, rather than pretending extraction succeeded.

Opening web originals is supported through the opener adapter with HTTP(S)-only application validation. Arbitrary retained native paths are intentionally **not granted opener permission**. Local original bytes can instead be saved as a copy using the native Save dialog. Opening a retained path in its external default application, global shortcuts, installer signing/notarization and OS-specific packaging polish remain incomplete. Do not add broad path permissions to hide an error.

Tauri disables its built-in drag/drop interception so the shared HTML Field can receive ordinary dropped files. Validate this on each WebView. Native picker fallbacks are available through global More -> Import/Restore.

The WebView uses a restrictive CSP; the only plaintext external connections permitted by default are the local gateway on port 8787. Remote gateways must use HTTPS. Use an explicit gateway URL in Settings and an exact allowed WebView origin in ALLOWED_ORIGIN on the server. In a browser deployment the gateway process is where a team's keys should live, and Settings says so; a browser build has no native boundary to hide behind, so a provider key entered there is held in JavaScript for that session only and is never written to browser storage (see [provider contract](PROVIDER_CONTRACT.md#credentials-phase-28b-1)). On desktop they live in the operating system's credential store (`src-tauri/src/credentials.rs`), and no stored secret is read by the WebView: a discovery key is read only by the native discovery launcher and an AI provider key only by the native provider transport, which signs and performs that request itself.

Primary references: https://v2.tauri.app/start/frontend/vite/ , https://v2.tauri.app/plugin/dialog/ , https://v2.tauri.app/plugin/file-system/ , https://v2.tauri.app/plugin/opener/ .
