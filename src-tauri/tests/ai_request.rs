//! Behaviour of the native provider request: the one desktop path that holds a plaintext AI key.
//!
//! These run without Tauri and without a credential store, because the module deliberately has no
//! dependency on either: `read_secret` arrives as a closure. Every test here is about the boundary
//! rather than about HTTP — which host a key may be sent to, which header it may be written into,
//! what may come back, and what may never appear anywhere.
//!
//! The module under test is pulled in by path instead of through the library's public API. It is a
//! private module of the application, and widening the crate's surface only so a test could reach it
//! would be a worse trade than compiling it a second time here.
#![allow(dead_code)]

#[path = "../src/ai_request.rs"]
mod ai_request;

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use crate::ai_request::{cancel, perform, perform_with_timeout, Failure, Payload, MAX_BODY_BYTES};

// ---------------------------------------------------------------------------------------------
// A tiny one-connection HTTP/1.1 server. It records the raw request it received, optionally waits,
// and answers with a canned status and body. Plain std threads keep the async tests uncluttered.
// ---------------------------------------------------------------------------------------------

struct Server {
    port: u16,
    seen: Arc<Mutex<String>>,
}

impl Server {
    fn url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}{}", self.port, path)
    }

    fn request(&self) -> String {
        self.seen.lock().unwrap().clone()
    }
}

fn spawn_server(status: u16, body: Vec<u8>, delay: Duration) -> Server {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    let seen = Arc::new(Mutex::new(String::new()));
    let seen_out = seen.clone();
    thread::spawn(move || {
        let (mut stream, _) = match listener.accept() {
            Ok(pair) => pair,
            Err(_) => return,
        };
        let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));

        let mut data = Vec::new();
        let mut buf = [0u8; 8192];
        loop {
            match stream.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    data.extend_from_slice(&buf[..n]);
                    if let Some(head_end) = find(&data, b"\r\n\r\n").map(|i| i + 4) {
                        let head = String::from_utf8_lossy(&data[..head_end]).to_string();
                        if data.len() - head_end >= content_length(&head) {
                            break;
                        }
                    }
                }
                Err(_) => break,
            }
        }
        *seen_out.lock().unwrap() = String::from_utf8_lossy(&data).to_string();

        if !delay.is_zero() {
            thread::sleep(delay);
        }

        let head = format!(
            "HTTP/1.1 {} {}\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n",
            status,
            reason(status),
            body.len()
        );
        let _ = stream.write_all(head.as_bytes());
        let _ = stream.write_all(&body);
        let _ = stream.flush();
        // Give the peer a moment to drain before the socket closes.
        thread::sleep(Duration::from_millis(50));
    });
    Server { port, seen }
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn content_length(head: &str) -> usize {
    for line in head.lines() {
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("content-length") {
                return value.trim().parse().unwrap_or(0);
            }
        }
    }
    0
}

fn reason(status: u16) -> &'static str {
    match status {
        200 => "OK",
        401 => "Unauthorized",
        429 => "Too Many Requests",
        _ => "Status",
    }
}

// ---------------------------------------------------------------------------------------------
// Payload builders.
// ---------------------------------------------------------------------------------------------

fn compatible(url: &str) -> Payload {
    Payload {
        request_id: "r-1".to_string(),
        provider: "compatible".to_string(),
        url: url.to_string(),
        method: "GET".to_string(),
        headers: HashMap::new(),
        credential_header: None,
        credential_prefix: None,
        body: None,
    }
}

fn none(_: &str) -> Option<String> {
    None
}

// ---------------------------------------------------------------------------------------------
// 1. Real injection: the credential reaches the wire, and never comes back.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn injects_bearer_header_and_never_echoes_the_secret() {
    let server = spawn_server(200, br#"{"content":"hello"}"#.to_vec(), Duration::ZERO);
    let mut payload = compatible(&server.url("/v1/chat/completions"));
    payload.credential_header = Some("Authorization".to_string());
    payload.credential_prefix = Some("Bearer ".to_string());

    let answer = perform(payload, |_| Some("super-secret-value".to_string()))
        .await
        .expect("the request should complete");

    assert_eq!(answer.status, 200);
    assert!(
        server
            .request()
            .to_lowercase()
            .contains("authorization: bearer super-secret-value"),
        "the injected header did not reach the server: {:?}",
        server.request()
    );
    assert!(
        !answer.body.contains("super-secret-value"),
        "the secret leaked into the returned body"
    );
    assert!(
        !format!("{answer:?}").contains("super-secret-value"),
        "the secret leaked into Answer debug output"
    );
}

// ---------------------------------------------------------------------------------------------
// 2. The credential slot is derived from the provider id.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn slot_is_ai_compatible() {
    let server = spawn_server(200, b"{}".to_vec(), Duration::ZERO);
    let armed = Arc::new(Mutex::new(Vec::<String>::new()));
    let observed = armed.clone();
    let mut payload = compatible(&server.url("/v1"));
    payload.credential_header = Some("Authorization".to_string());
    payload.credential_prefix = Some("Bearer ".to_string());

    let _ = perform(payload, move |slot| {
        observed.lock().unwrap().push(slot.to_string());
        None
    })
    .await;

    assert_eq!(*armed.lock().unwrap(), vec!["ai.compatible".to_string()]);
}

#[tokio::test]
async fn slot_is_ai_provider_for_each_pinned_provider() {
    // For a pinned provider the url must be its real host, so these make a real (unauthenticated)
    // request. The empty secret means no credential header is sent; only the slot is under test.
    let cases = [
        (
            "openai",
            "https://api.openai.com/v1/chat/completions",
            "Authorization",
            Some("Bearer "),
        ),
        (
            "anthropic",
            "https://api.anthropic.com/v1/messages",
            "x-api-key",
            None,
        ),
        (
            "gemini",
            "https://generativelanguage.googleapis.com/v1beta/models/m:generateContent",
            "x-goog-api-key",
            None,
        ),
        (
            "deepseek",
            "https://api.deepseek.com/chat/completions",
            "Authorization",
            Some("Bearer "),
        ),
    ];

    let armed = Arc::new(Mutex::new(Vec::<String>::new()));
    for (provider, url, header, prefix) in cases {
        let observed = armed.clone();
        let payload = Payload {
            request_id: format!("slot-{provider}"),
            provider: provider.to_string(),
            url: url.to_string(),
            method: "POST".to_string(),
            headers: HashMap::new(),
            credential_header: Some(header.to_string()),
            credential_prefix: prefix.map(str::to_string),
            body: Some(serde_json::json!({ "probe": true })),
        };
        let _ = perform_with_timeout(
            payload,
            move |slot| {
                observed.lock().unwrap().push(slot.to_string());
                Some(String::new())
            },
            Duration::from_secs(5),
        )
        .await;
    }

    assert_eq!(
        *armed.lock().unwrap(),
        vec![
            "ai.openai".to_string(),
            "ai.anthropic".to_string(),
            "ai.gemini".to_string(),
            "ai.deepseek".to_string(),
        ]
    );
}

// ---------------------------------------------------------------------------------------------
// 3. No stored credential: no credential header at all, and the request still runs.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn compatible_without_a_stored_credential_sends_no_auth_header() {
    let server = spawn_server(200, br#"{"ok":true}"#.to_vec(), Duration::ZERO);
    let mut payload = compatible(&server.url("/v1/models"));
    payload.credential_header = Some("Authorization".to_string());
    payload.credential_prefix = Some("Bearer ".to_string());

    let answer = perform(payload, none)
        .await
        .expect("the request should complete");

    assert_eq!(answer.status, 200);
    assert_eq!(answer.body, r#"{"ok":true}"#);
    assert!(
        !server.request().to_lowercase().contains("authorization"),
        "an Authorization header was sent with a missing credential"
    );
}

#[tokio::test]
async fn compatible_with_an_empty_stored_credential_sends_no_auth_header() {
    let server = spawn_server(200, b"{}".to_vec(), Duration::ZERO);
    let mut payload = compatible(&server.url("/v1/models"));
    payload.credential_header = Some("x-api-key".to_string());

    let answer = perform(payload, |_| Some(String::new()))
        .await
        .expect("the request should complete");

    assert_eq!(answer.status, 200);
    assert!(!server.request().to_lowercase().contains("x-api-key"));
}

// ---------------------------------------------------------------------------------------------
// 4. A provider status is returned verbatim, not turned into a Failure.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn provider_error_statuses_come_back_as_answers() {
    let unauthorized = spawn_server(
        401,
        br#"{"error":{"type":"authentication_error"}}"#.to_vec(),
        Duration::ZERO,
    );
    let answer = perform(compatible(&unauthorized.url("/v1")), none)
        .await
        .expect("4xx is not a Failure");
    assert_eq!(answer.status, 401);
    assert!(answer.body.contains("authentication_error"));

    let limited = spawn_server(
        429,
        br#"{"error":{"type":"rate_limit_error"}}"#.to_vec(),
        Duration::ZERO,
    );
    let answer = perform(compatible(&limited.url("/v1")), none)
        .await
        .expect("4xx is not a Failure");
    assert_eq!(answer.status, 429);
    assert!(answer.body.contains("rate_limit_error"));
}

// ---------------------------------------------------------------------------------------------
// 5. The body budget is enforced.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn an_oversized_body_is_rejected() {
    let big = vec![b'x'; MAX_BODY_BYTES + 1024];
    let server = spawn_server(200, big, Duration::ZERO);
    let result = perform(compatible(&server.url("/v1")), none).await;
    assert!(
        matches!(result, Err(Failure::Rejected(_))),
        "expected Rejected, got {result:?}"
    );
}

#[tokio::test]
async fn a_body_at_the_budget_is_accepted() {
    let exact = vec![b'y'; MAX_BODY_BYTES];
    let server = spawn_server(200, exact.clone(), Duration::ZERO);
    let answer = perform(compatible(&server.url("/v1")), none)
        .await
        .expect("exactly the budget is fine");
    assert_eq!(answer.body.len(), MAX_BODY_BYTES);
}

// ---------------------------------------------------------------------------------------------
// 6. Timeout.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn a_short_timeout_gives_up_and_a_normal_one_completes() {
    let slow = spawn_server(200, b"{\"ok\":true}".to_vec(), Duration::from_secs(2));
    let result = perform_with_timeout(
        compatible(&slow.url("/v1")),
        none,
        Duration::from_millis(300),
    )
    .await;
    assert!(
        matches!(result, Err(Failure::Unreachable)),
        "expected Unreachable, got {result:?}"
    );

    let slow_again = spawn_server(200, b"{\"ok\":true}".to_vec(), Duration::from_secs(2));
    let answer = perform_with_timeout(
        compatible(&slow_again.url("/v1")),
        none,
        Duration::from_secs(10),
    )
    .await
    .expect("a normal timeout should outlast the delay");
    assert_eq!(answer.status, 200);
}

// ---------------------------------------------------------------------------------------------
// 7. Cancellation.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn a_cancelled_request_returns_promptly() {
    let slow = spawn_server(200, b"{}".to_vec(), Duration::from_secs(2));
    let mut payload = compatible(&slow.url("/v1"));
    payload.request_id = "cancel-me".to_string();

    let handle = tokio::spawn(perform(payload, none));

    // Let the request reach the wire and register itself before cancelling.
    tokio::time::sleep(Duration::from_millis(150)).await;
    let started = Instant::now();
    cancel("cancel-me");

    let result = handle.await.expect("the task should not panic");
    assert!(
        matches!(result, Err(Failure::Cancelled)),
        "expected Cancelled, got {result:?}"
    );
    assert!(
        started.elapsed() < Duration::from_millis(500),
        "cancellation took {:?}, well over the server delay it should have beaten",
        started.elapsed()
    );
}

// ---------------------------------------------------------------------------------------------
// 8. The full validation matrix.
// ---------------------------------------------------------------------------------------------

async fn rejected(payload: Payload) -> bool {
    matches!(perform(payload, none).await, Err(Failure::Rejected(_)))
}

#[tokio::test]
async fn validation_rejects_everything_it_must() {
    let good = "http://127.0.0.1:9/v1";

    // Unknown provider id.
    let mut p = compatible(good);
    p.provider = "openai-x".to_string();
    assert!(rejected(p).await, "unknown provider was accepted");

    // A pinned provider pointed at another host.
    let mut p = compatible("https://evil.example/v1/chat/completions");
    p.provider = "openai".to_string();
    assert!(
        rejected(p).await,
        "openai was allowed to talk to another host"
    );

    // A pinned provider with an explicit port (which would redirect it off the pinned host).
    let mut p = compatible("https://api.openai.com:8443/v1");
    p.provider = "openai".to_string();
    assert!(rejected(p).await, "openai was allowed an explicit port");

    // Plain http for a pinned provider.
    let mut p = compatible("http://api.openai.com/v1");
    p.provider = "openai".to_string();
    assert!(
        rejected(p).await,
        "plain http was allowed for a pinned provider"
    );

    // Plain http for `compatible` at a non-loopback host.
    let mut p = compatible("http://example.com/v1");
    p.provider = "compatible".to_string();
    assert!(rejected(p).await, "plain http to a remote host was allowed");

    // A scheme that is neither https nor loopback http.
    let p = compatible("ftp://127.0.0.1/v1");
    assert!(rejected(p).await, "ftp was allowed");

    // Unparseable url.
    let p = compatible("not a url");
    assert!(rejected(p).await, "an unparseable url was allowed");

    // Over-length url.
    let p = compatible(&format!("https://api.example.com/{}", "a".repeat(2100)));
    assert!(rejected(p).await, "an over-length url was allowed");

    // A url with a username / password / fragment.
    let p = compatible("https://user@127.0.0.1/v1");
    assert!(rejected(p).await, "a url username was allowed");
    let p = compatible("https://user:pass@127.0.0.1/v1");
    assert!(rejected(p).await, "a url password was allowed");
    let p = compatible("http://127.0.0.1/v1#fragment");
    assert!(rejected(p).await, "a url fragment was allowed");

    // A method that is not GET or POST.
    let mut p = compatible(good);
    p.method = "DELETE".to_string();
    assert!(rejected(p).await, "DELETE was allowed");

    // An incoming credential header.
    let mut p = compatible(good);
    p.headers
        .insert("Authorization".to_string(), "Bearer stolen".to_string());
    assert!(
        rejected(p).await,
        "a caller-supplied Authorization header was allowed"
    );
    let mut p = compatible(good);
    p.headers
        .insert("X-Api-Key".to_string(), "leak".to_string());
    assert!(
        rejected(p).await,
        "a caller-supplied x-api-key header was allowed"
    );

    // Header injection in a value.
    let mut p = compatible(good);
    p.headers
        .insert("x-custom".to_string(), "a\r\nx-evil: 1".to_string());
    assert!(rejected(p).await, "a CRLF header value was allowed");

    // Too many headers.
    let mut p = compatible(good);
    for i in 0..25 {
        p.headers.insert(format!("x-{i}"), "v".to_string());
    }
    assert!(rejected(p).await, "more than 24 headers were allowed");

    // An over-length header name.
    let mut p = compatible(good);
    p.headers.insert("x".repeat(65), "v".to_string());
    assert!(rejected(p).await, "an over-length header name was allowed");

    // An over-length header value.
    let mut p = compatible(good);
    p.headers.insert("x-long".to_string(), "v".repeat(513));
    assert!(rejected(p).await, "an over-length header value was allowed");

    // A credential header that names some other header.
    let mut p = compatible(good);
    p.credential_header = Some("x-exfiltrate".to_string());
    assert!(
        rejected(p).await,
        "an arbitrary credential_header was allowed"
    );

    // A credential prefix that is too long or contains CRLF.
    let mut p = compatible(good);
    p.credential_header = Some("Authorization".to_string());
    p.credential_prefix = Some("x".repeat(33));
    assert!(
        rejected(p).await,
        "an over-length credential prefix was allowed"
    );
    let mut p = compatible(good);
    p.credential_header = Some("Authorization".to_string());
    p.credential_prefix = Some("Bearer\r\n".to_string());
    assert!(rejected(p).await, "a CRLF credential prefix was allowed");
}

#[tokio::test]
async fn loopback_http_is_accepted_for_compatible() {
    let server = spawn_server(200, b"{}".to_vec(), Duration::ZERO);
    let payload = compatible(&server.url("/v1/chat/completions"));
    assert!(payload.url.starts_with("http://127.0.0.1:"));
    let answer = perform(payload, none)
        .await
        .expect("plain http to loopback is allowed");
    assert_eq!(answer.status, 200);
}

// ---------------------------------------------------------------------------------------------
// 9. A credential that cannot be a header value is rejected, not written and not panicked on.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn a_credential_that_cannot_be_a_header_is_rejected() {
    let bad_secrets = ["line\nbreak", "carriage\rreturn", "café", "emoji-🔑"];
    for secret in bad_secrets {
        let mut payload = compatible("http://127.0.0.1:9/v1");
        payload.credential_header = Some("Authorization".to_string());
        payload.credential_prefix = Some("Bearer ".to_string());
        let result = perform(payload, |_| Some(secret.to_string())).await;
        assert!(
            matches!(result, Err(Failure::Rejected(_))),
            "the secret {secret:?} was not rejected: {result:?}"
        );
    }
}

// ---------------------------------------------------------------------------------------------
// The failure vocabulary is fixed and carries nothing sensitive.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn real_https_works_with_the_pure_rust_provider() {
    // Proves the probe dependency set performs real TLS using the ring provider installed at client
    // build, with no system OpenSSL and no bundled crypto provider in reqwest.
    let answer = perform_with_timeout(
        compatible("https://example.com/"),
        none,
        Duration::from_secs(15),
    )
    .await
    .expect("a real HTTPS request should reach example.com");
    assert!(
        (200..400).contains(&answer.status),
        "unexpected status {}",
        answer.status
    );
}

#[test]
fn failure_messages_are_fixed_sentences() {
    assert_eq!(
        Failure::Rejected("anything").message(),
        "The provider request was rejected."
    );
    assert_eq!(
        Failure::Unreachable.message(),
        "The provider could not be reached."
    );
    assert_eq!(Failure::Cancelled.message(), "The request was cancelled.");
}

// ---------------------------------------------------------------------------------------------
// 10. A provider that quotes the credential back cannot make it leave this layer.
// ---------------------------------------------------------------------------------------------

#[tokio::test]
async fn a_provider_that_echoes_the_credential_gets_it_redacted() {
    let echoed = br#"{"error":{"message":"Incorrect API key provided: super-secret-value. Try again."}}"#;
    let server = spawn_server(400, echoed.to_vec(), Duration::ZERO);
    let mut payload = compatible(&server.url("/v1/chat/completions"));
    payload.method = "POST".to_string();
    payload.credential_header = Some("Authorization".to_string());
    payload.credential_prefix = Some("Bearer ".to_string());
    payload.body = Some(serde_json::json!({ "model": "a-model" }));

    let answer = perform(payload, |_| Some("super-secret-value".to_string()))
        .await
        .expect("4xx is not a Failure");

    assert_eq!(answer.status, 400);
    assert!(
        !answer.body.contains("super-secret-value"),
        "the credential came back out of this layer: {:?}",
        answer.body
    );
    assert!(
        answer.body.contains("[redacted]"),
        "the credential was removed without saying so: {:?}",
        answer.body
    );
    // The provider's own failure type still travels, which is what the caller classifies on.
    assert!(answer.body.contains("error"));
}

#[tokio::test]
async fn a_body_without_the_credential_is_returned_unchanged() {
    let server = spawn_server(200, br#"{"content":"hello"}"#.to_vec(), Duration::ZERO);
    let mut payload = compatible(&server.url("/v1/chat/completions"));
    payload.credential_header = Some("Authorization".to_string());
    payload.credential_prefix = Some("Bearer ".to_string());

    let answer = perform(payload, |_| Some("super-secret-value".to_string()))
        .await
        .expect("the request should complete");

    assert_eq!(answer.body, r#"{"content":"hello"}"#);
}
