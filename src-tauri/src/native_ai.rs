//! The desktop provider request: the one place a plaintext AI credential exists.
//!
//! A directly configured provider is reached from this process rather than from the webview. The
//! webview supplies the destination, the method, the body and every non-credential header; it also
//! names the *scheme* the provider authenticates with (a header name and a prefix, from Diffusion's
//! provider table). It never supplies, receives or can obtain the value: that is read from the
//! operating system's credential store here, written into the outbound request by
//! [`crate::ai_request`], and dropped with the request.
//!
//! Why the request moves instead of the secret: somebody has to hold the key to sign the request, and
//! the whole point of an OS-backed store is that the place holding it is the native layer. Moving the
//! request keeps one credential boundary instead of two, and it removes the browser's CORS and
//! origin policy from the path at the same time.
//!
//! Everything that decides whether a request may be made — the provider's pinned host, the URL
//! scheme, the header allowlist, the body budget, the timeout, the cancellation — lives in
//! `ai_request.rs`, which has no Tauri dependency so it can be compiled and tested on its own.

use crate::ai_request::{self, Answer, Failure, Payload};
use crate::credentials::read_secret;

/// One provider request, performed on behalf of the webview.
///
/// The credential is resolved in this process and written straight into the outbound request. It is
/// never returned to the caller, never logged, and never included in the error — a failure crosses
/// this boundary as one of a few fixed sentences and nothing else.
#[tauri::command]
pub async fn native_ai_request(
    request_id: String,
    provider: String,
    url: String,
    method: String,
    headers: std::collections::HashMap<String, String>,
    credential_header: Option<String>,
    credential_prefix: Option<String>,
    body: Option<serde_json::Value>,
) -> Result<Answer, String> {
    ai_request::perform(
        Payload {
            request_id,
            provider,
            url,
            method,
            headers,
            credential_header,
            credential_prefix,
            body,
        },
        read_secret,
    )
    .await
    .map_err(|failure: Failure| failure.message())
}

/// Abandons an in-flight request and closes its connection, so a person who stops a request is not
/// billed for one that keeps running. An unknown id is not an error: the request may already have
/// finished.
#[tauri::command]
pub fn native_ai_cancel(request_id: String) {
    ai_request::cancel(&request_id);
}
