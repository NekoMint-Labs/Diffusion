mod ai_request;
mod credentials;
mod discovery;
mod discovery_env;
mod native_ai;

/// The native shell hosts the same React/Vite UI and local IndexedDB repository.
/// Native permissions are restricted in capabilities/main.json.
///
/// Two capabilities are added here beyond the plugins:
///
///  * `credentials` keeps provider and discovery keys in the operating system's own credential
///    store, and the webview is only ever told whether one exists. No desktop surface reads one: a
///    discovery key is resolved by the discovery launcher and an AI key by the provider transport
///    (`native_ai.rs`), so `credential_get` refuses both identities.
///  * `discovery` runs the engine that ships inside the application, so external exploration needs
///    no Python and no separate install on the user's machine.
///  * `native_ai` performs a direct provider request itself, so a provider key never enters the
///    webview. It also keeps the browser's origin policy out of a desktop request.
///
/// None of them adds a shell plugin: the discovery engine is a resource whose path this process
/// resolves itself, so no command supplied by a webview can decide what runs.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            credentials::credential_has,
            credentials::credential_get,
            credentials::credential_set,
            credentials::credential_delete,
            discovery::discovery_run,
            discovery::discovery_available,
            discovery::discovery_version,
            native_ai::native_ai_request,
            native_ai::native_ai_cancel,
        ])
        .run(tauri::generate_context!())
        .expect("Diffusion Explorer could not start its native shell");
}
