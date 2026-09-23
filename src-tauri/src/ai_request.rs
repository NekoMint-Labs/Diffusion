//! Native provider requests, with the credential never leaving the native layer.
//!
//! A provider API key belongs in the operating system's credential store, so the webview must never
//! hold the plaintext. This module is the part that makes that true: the webview sends the *shape* of
//! a request — url, method, headers, and the auth *scheme* (a header name and a prefix) — and this
//! layer reads the key from the store, injects it, performs the request, and returns only a status
//! and a bounded body.
//!
//! Two properties are the point of the whole exercise, and both are enforced here rather than trusted
//! from the caller:
//!
//!  * A credential only ever travels to a host this module chose. For the four known providers the
//!    host is pinned by a table below; a caller cannot nominate a different one.
//!  * A credential never comes back out. It goes into one outbound header and nowhere else — not into
//!    an [`Answer`], not into a [`Failure`], not into a log, not into an error string.
//!
//! The module is deliberately free of `tauri` and `keyring` references, so it can be compiled and
//! exercised without the desktop shell: the credential lookup arrives as an injected closure, which
//! is what makes the security-critical logic testable outside a real credential store.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT_ENCODING};
use tokio::sync::oneshot;

/// The largest response body this layer will hold, in bytes.
///
/// A provider answer is a small JSON envelope; anything larger is not an answer, and reading it would
/// only widen the private-data surface for no benefit.
pub const MAX_BODY_BYTES: usize = 512 * 1024;

/// How long one provider request may take, end to end, before it is abandoned.
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

/// A url longer than this is not a provider endpoint, it is an attempt to smuggle something.
const MAX_URL_CHARS: usize = 2048;
const MAX_HEADERS: usize = 24;
const MAX_HEADER_NAME_CHARS: usize = 64;
const MAX_HEADER_VALUE_CHARS: usize = 512;
const MAX_PREFIX_CHARS: usize = 32;

/// The only header names a credential may be written into. Any other name would be guessing which
/// header a provider reads, and an incoming request may not use any of them either.
const CREDENTIAL_HEADERS: [&str; 3] = ["authorization", "x-api-key", "x-goog-api-key"];

/// One request, as it arrives from the webview.
///
/// It carries the provider's auth *scheme* — a header name and a prefix — and no credential value.
/// The value is resolved from the operating system's credential store by [`perform`], so a plaintext
/// key exists in neither JavaScript memory nor an IPC payload.
pub struct Payload {
    pub request_id: String,
    pub provider: String,
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub credential_header: Option<String>,
    pub credential_prefix: Option<String>,
    pub body: Option<serde_json::Value>,
}

/// The native layer's answer: a status and a body it already bounded.
///
/// The status is returned verbatim, including 4xx and 5xx, because the caller owns the mapping from a
/// provider status to Diffusion's own failure vocabulary; this layer does not have that opinion.
#[derive(serde::Serialize, Debug)]
pub struct Answer {
    pub status: u16,
    pub body: String,
}

/// Why a request did not produce an answer.
///
/// The variant payload is a `&'static str` on purpose: a rejection reason cannot be assembled from
/// provider text, request text or a credential, because a static string literal has no runtime parts.
#[derive(Debug, PartialEq, Eq)]
pub enum Failure {
    /// The request was refused before any credential was read and before any socket was opened.
    Rejected(&'static str),
    /// The provider could not be reached, or the exchange failed or timed out.
    Unreachable,
    /// The request was abandoned because [`cancel`] was called for its id.
    Cancelled,
}

impl Failure {
    /// One fixed sentence per variant. The inner reason of a [`Failure::Rejected`] is deliberately
    /// not surfaced: the caller gets a sentence it can show, and nothing that could quote a request
    /// or a credential.
    pub fn message(&self) -> String {
        match self {
            Failure::Rejected(_) => "The provider request was rejected.".to_string(),
            Failure::Unreachable => "The provider could not be reached.".to_string(),
            Failure::Cancelled => "The request was cancelled.".to_string(),
        }
    }
}

/// A provider whose endpoint host is fixed. A key for one of these is never sent anywhere else.
fn pinned_host(provider: &str) -> Option<&'static str> {
    match provider {
        "openai" => Some("api.openai.com"),
        "anthropic" => Some("api.anthropic.com"),
        "gemini" => Some("generativelanguage.googleapis.com"),
        "deepseek" => Some("api.deepseek.com"),
        // `compatible` is the one provider whose endpoint the person nominates, so it has no pinned
        // host; its url is still validated below.
        _ => None,
    }
}

/// A request that has passed every check, in a form ready to be sent.
struct Checked {
    url: reqwest::Url,
    method: reqwest::Method,
    headers: HeaderMap,
}

fn has_crlf(value: &str) -> bool {
    value.contains('\r') || value.contains('\n')
}

/// Remove the credential this layer injected from a provider's own body.
///
/// "A credential never comes back out" is this module's promise, and a provider — or a proxy in
/// front of it — may quote the request, including the credential header, back in an error message.
/// The stored key is removed wherever it appears, so `Bearer <key>` loses the key and keeps the
/// scheme word. The replacement is a fixed token: the point is that the secret is gone rather than
/// that the body is unchanged.
fn without_credential(body: String, injected: Option<&str>) -> String {
    match injected.filter(|secret| !secret.is_empty()) {
        Some(secret) => body.replace(secret, "[redacted]"),
        None => body,
    }
}

/// A url host that names this machine: plain http is allowed to reach one, because it never leaves
/// the machine, and a local `compatible` endpoint is a legitimate unauthenticated fixture.
fn is_loopback(url: &reqwest::Url) -> bool {
    // `host_str` serialises an IPv6 host with its brackets, so both spellings are accepted.
    matches!(
        url.host_str(),
        Some("127.0.0.1") | Some("localhost") | Some("::1") | Some("[::1]")
    )
}

/// Validate every part of a request that can be judged without a credential or a socket.
///
/// This runs first, in full, so that a malformed or hostile request never causes a credential read
/// and never opens a connection.
fn check(payload: &Payload) -> Result<Checked, Failure> {
    if payload.provider != "compatible" && pinned_host(&payload.provider).is_none() {
        return Err(Failure::Rejected("provider"));
    }

    if payload.url.chars().count() > MAX_URL_CHARS {
        return Err(Failure::Rejected("url length"));
    }
    let url = reqwest::Url::parse(&payload.url).map_err(|_| Failure::Rejected("url"))?;

    match url.scheme() {
        "https" => {}
        // Plain http is only ever to a loopback address, and only for the provider whose endpoint the
        // person nominates themselves.
        "http" if payload.provider == "compatible" && is_loopback(&url) => {}
        _ => return Err(Failure::Rejected("scheme")),
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(Failure::Rejected("url credential"));
    }
    if url.fragment().is_some() {
        return Err(Failure::Rejected("url fragment"));
    }

    if let Some(host) = pinned_host(&payload.provider) {
        // The host must be exactly the one the table names, and no explicit port may redirect it.
        if url.host_str() != Some(host) || url.port().is_some() {
            return Err(Failure::Rejected("host"));
        }
    }

    let method = match payload.method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        _ => return Err(Failure::Rejected("method")),
    };

    if payload.headers.len() > MAX_HEADERS {
        return Err(Failure::Rejected("headers"));
    }
    let mut headers = HeaderMap::new();
    for (name, value) in &payload.headers {
        if name.is_empty()
            || name.chars().count() > MAX_HEADER_NAME_CHARS
            || value.chars().count() > MAX_HEADER_VALUE_CHARS
            || has_crlf(name)
            || has_crlf(value)
        {
            return Err(Failure::Rejected("header"));
        }
        // A caller may not supply a credential header itself: only this module writes those, so one
        // arriving from the webview is either a mistake or an attempt to shadow the real key.
        if CREDENTIAL_HEADERS
            .iter()
            .any(|c| name.eq_ignore_ascii_case(c))
        {
            return Err(Failure::Rejected("header name"));
        }
        let name = HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| Failure::Rejected("header name"))?;
        let value = HeaderValue::from_str(value).map_err(|_| Failure::Rejected("header value"))?;
        headers.insert(name, value);
    }

    if let Some(header) = &payload.credential_header {
        if !CREDENTIAL_HEADERS
            .iter()
            .any(|c| header.eq_ignore_ascii_case(c))
        {
            return Err(Failure::Rejected("credential header"));
        }
        if let Some(prefix) = &payload.credential_prefix {
            if prefix.chars().count() > MAX_PREFIX_CHARS || has_crlf(prefix) {
                return Err(Failure::Rejected("credential prefix"));
            }
        }
    }

    Ok(Checked {
        url,
        method,
        headers,
    })
}

/// The one HTTP client, built once per process so that its connection pool is reused across requests
/// rather than re-handshaking for each one.
static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| {
        // `reqwest` is built with `rustls-no-provider`, so the pure-Rust `ring` provider must be
        // installed before any TLS connection is attempted. Installing a provider that is already
        // installed is a no-op error, which is exactly the outcome we want there.
        let _ = rustls::crypto::ring::default_provider().install_default();
        reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            // A redirect would carry the injected credential to a host the provider table never
            // authorised, which is the one thing this layer exists to prevent.
            .redirect(reqwest::redirect::Policy::none())
            // No cookie store is enabled at all, so nothing about a session is retained here.
            .build()
            .expect("the native HTTP client could not be built")
    })
}

/// The in-flight requests that can still be cancelled, keyed by their caller's id.
static PENDING: OnceLock<Mutex<HashMap<String, oneshot::Sender<()>>>> = OnceLock::new();

fn pending() -> &'static Mutex<HashMap<String, oneshot::Sender<()>>> {
    PENDING.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Abandon an in-flight request by id. A missing id is a no-op — the request already finished.
///
/// The signal drops the send future in [`perform_with_timeout`], which closes the connection, so a
/// person who stops a request is not billed for one that keeps running.
pub fn cancel(request_id: &str) {
    let sender = pending()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .remove(request_id);
    if let Some(sender) = sender {
        let _ = sender.send(());
    }
}

/// Perform one provider request with the default timeout.
pub async fn perform(
    payload: Payload,
    read_secret: impl Fn(&str) -> Option<String>,
) -> Result<Answer, Failure> {
    perform_with_timeout(payload, read_secret, REQUEST_TIMEOUT).await
}

/// Perform one provider request, injecting the stored credential and racing the send against
/// cancellation.
///
/// Ordering is deliberate: every check runs before the credential is read, and the credential is read
/// before a socket is opened. The request's id is registered before sending and deregistered on every
/// exit path, so a later [`cancel`] for a finished request can never fire into a reused id.
pub async fn perform_with_timeout(
    payload: Payload,
    read_secret: impl Fn(&str) -> Option<String>,
    timeout: Duration,
) -> Result<Answer, Failure> {
    let Checked {
        url,
        method,
        mut headers,
    } = check(&payload)?;

    // The credential slot is derived from the validated provider id, never from the caller.
    let mut injected: Option<String> = None;
    if let Some(header) = &payload.credential_header {
        let slot = format!("ai.{}", payload.provider);
        if let Some(secret) = read_secret(&slot) {
            // A missing or empty credential means "send no credential header at all", which is how an
            // unauthenticated local `compatible` endpoint is allowed to work.
            if !secret.is_empty() {
                let prefix = payload.credential_prefix.as_deref().unwrap_or("");
                let value = format!("{prefix}{secret}");
                // A stored value with a newline or non-ASCII byte would be a header-injection or a
                // corrupt secret; refuse it rather than write it into the wire.
                if !value.is_ascii() || has_crlf(&value) {
                    return Err(Failure::Rejected("credential"));
                }
                let name = HeaderName::from_bytes(header.as_bytes())
                    .map_err(|_| Failure::Rejected("credential header"))?;
                let value =
                    HeaderValue::from_str(&value).map_err(|_| Failure::Rejected("credential"))?;
                injected = Some(secret);
                headers.insert(name, value);
            }
        }
    }

    // Ask for an identity encoding unless the caller already chose one, so no decompression feature is
    // needed to read a provider's answer.
    if !headers.contains_key(ACCEPT_ENCODING) {
        headers.insert(ACCEPT_ENCODING, HeaderValue::from_static("identity"));
    }

    let mut request = client()
        .request(method, url)
        .headers(headers)
        .timeout(timeout);
    if payload.method == "POST" {
        if let Some(body) = &payload.body {
            let encoded = serde_json::to_vec(body).map_err(|_| Failure::Rejected("body"))?;
            request = request.body(encoded);
        }
    }

    let request_id = payload.request_id.clone();
    let (sender, receiver) = oneshot::channel::<()>();
    pending()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .insert(request_id.clone(), sender);

    let sending = async move {
        let response = request.send().await.map_err(|_| Failure::Unreachable)?;
        let status = response.status().as_u16();
        let mut response = response;
        let mut body: Vec<u8> = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(|_| Failure::Unreachable)? {
            if body.len() + chunk.len() > MAX_BODY_BYTES {
                return Err(Failure::Rejected("response size"));
            }
            body.extend_from_slice(&chunk);
        }
        // Lossy on purpose: the caller parses this as JSON and must be able to see a provider's own
        // error type, so a byte that is not valid UTF-8 should not throw the whole answer away.
        let body = String::from_utf8_lossy(&body).into_owned();
        Ok(Answer {
            status,
            body: without_credential(body, injected.as_deref()),
        })
    };

    // Cancellation wins the race only on a real cancel signal. A `oneshot` receiver also resolves
    // with `Err` when its sender is merely dropped, which would happen if another request reused the
    // id; that is not a cancellation, so it must not produce one.
    let cancellation = async move {
        match receiver.await {
            Ok(()) => true,
            Err(_) => std::future::pending::<bool>().await,
        }
    };

    // Dropping the losing `sending` future closes the connection.
    let outcome = tokio::select! {
        answer = sending => answer,
        _ = cancellation => Err(Failure::Cancelled),
    };

    pending()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .remove(&request_id);

    outcome
}
