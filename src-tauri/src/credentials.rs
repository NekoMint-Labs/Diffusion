//! OS-backed credential storage for the desktop build.
//!
//! A provider API key is a secret the user owns, so it is kept in the operating system's own
//! credential mechanism — the same place the system uses for its own secrets — and never in
//! IndexedDB, localStorage, an ordinary settings record, an export, a log or a diagnostic report.
//!
//! The webview is only ever told *whether* a credential exists, never what it is. That is now true
//! without exception on Desktop: a discovery key is resolved by the discovery launcher and an AI key
//! by the provider transport (`native_ai.rs`), both of which read the store in this process and write
//! the value into the request they are making. `credential_get` therefore refuses every identity, so
//! "the webview cannot read a stored secret" is a property of this layer rather than a convention in
//! the UI that a later change could undo.

use keyring::Entry;

/// One fixed service name, so a Diffusion credential is distinguishable from anything else the user
/// has stored and can be removed cleanly.
const SERVICE: &str = "app.diffusion.explorer";

/// Credential identities are a small, closed vocabulary (`ai.<provider>`, `search.<source>`), not
/// arbitrary keys. Validating them here means a compromised webview cannot use this command to
/// probe or overwrite unrelated entries in the user's credential store.
fn valid_id(id: &str) -> bool {
    match id.split_once('.') {
        Some((kind, rest)) => {
            matches!(kind, "ai" | "search")
                && !rest.is_empty()
                && rest.len() <= 24
                && rest.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        }
        None => false,
    }
}

fn entry(id: &str) -> Result<Entry, String> {
    if !valid_id(id) {
        return Err("Unusable credential identity.".into());
    }
    Entry::new(SERVICE, id).map_err(|_| "The operating system credential store is unavailable.".to_string())
}

/// Read one credential for the native layer's own use.
///
/// Deliberately not a command. The discovery launcher resolves a provider secret here and writes it
/// into the child process environment itself, so the plaintext value has no reason to exist in the
/// webview — and a webview cannot reach this function, because the only caller supplies an identity
/// from its own closed table rather than one from JavaScript.
///
/// A missing entry is `None`: most sources have no key, and that is a normal answer.
pub fn read_secret(id: &str) -> Option<String> {
    entry(id).ok()?.get_password().ok()
}

/// Presence only. The value is read and discarded so the answer can never be mistaken for a secret.
#[tauri::command]
pub async fn credential_has(id: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || match entry(&id)?.get_password() {
        Ok(_) => Ok(true),
        // A missing entry is a normal answer, not a failure: most providers have no key.
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Ok(false),
    })
    .await
    .map_err(|_| "The credential check did not complete.".to_string())?
}

/// Present for interface completeness only, and deliberately answers nothing on Desktop.
///
/// No desktop surface needs a stored secret any more: an AI provider's request is performed by
/// `native_ai.rs`, which resolves the key itself, and a discovery credential is resolved by the
/// discovery launcher. Refusing every identity here — rather than only refusing the ones today's UI
/// happens not to ask for — is what keeps the boundary a property of this layer instead of a
/// convention that a future surface could quietly break.
#[tauri::command]
pub async fn credential_get(id: String) -> Result<Option<String>, String> {
    if id.starts_with("search.") || id.starts_with("ai.") {
        return Err("Stored credentials are resolved by the native layer.".into());
    }
    tauri::async_runtime::spawn_blocking(move || match entry(&id)?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("The stored credential could not be read.".to_string()),
    })
    .await
    .map_err(|_| "The credential read did not complete.".to_string())?
}

#[tauri::command]
pub async fn credential_set(id: String, secret: String) -> Result<(), String> {
    // A key is never empty and never unbounded; both are signs the caller is confused.
    if secret.is_empty() || secret.len() > 4096 {
        return Err("That credential cannot be stored.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        entry(&id)?
            .set_password(&secret)
            .map_err(|_| "The operating system refused to store the credential.".to_string())
    })
    .await
    .map_err(|_| "The credential write did not complete.".to_string())?
}

#[tauri::command]
pub async fn credential_delete(id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || match entry(&id)?.delete_credential() {
        // Removing something that is not there is success: the desired state is reached either way.
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("The operating system refused to remove the credential.".to_string()),
    })
    .await
    .map_err(|_| "The credential removal did not complete.".to_string())?
}
