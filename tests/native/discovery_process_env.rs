#[path = "../../src-tauri/src/discovery_process_env.rs"]
mod discovery_process_env;

#[cfg(windows)]
#[test]
#[ignore = "requires DIFFUSION_TEST_ENGINE pointing to the packaged executable"]
fn packaged_search_starts_with_cleared_environment_and_returns_a_candidate() { run_fixture(false); }

#[cfg(windows)]
#[test]
#[ignore = "requires DIFFUSION_TEST_ENGINE pointing to the packaged executable"]
fn packaged_keyless_search_returns_a_candidate_without_authorization() { run_fixture(true); }

#[cfg(windows)]
fn run_fixture(keyless: bool) {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};

    let engine = std::env::var_os("DIFFUSION_TEST_ENGINE").expect("packaged engine path");
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let endpoint = format!("http://{}", listener.local_addr().unwrap());
    listener.set_nonblocking(true).unwrap();
    let server = std::thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(20);
        loop {
            match listener.accept() {
                Ok((mut socket, _)) => {
                    socket.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
                    let mut request = Vec::new();
                    let mut buffer = [0; 4096];
                    while !request.windows(4).any(|part| part == b"\r\n\r\n") {
                        let size = socket.read(&mut buffer).unwrap();
                        assert!(size > 0);
                        request.extend_from_slice(&buffer[..size]);
                    }
                    assert!(request.starts_with(b"POST /search HTTP/1.1"));
                    let headers = String::from_utf8_lossy(&request).to_lowercase();
                    if keyless {
                        assert!(headers.contains("x-tavily-access-mode: keyless"));
                        assert!(!headers.contains("authorization:"));
                    }
                    let body = r#"{"results":[{"title":"Local search fixture ™ 🐈","url":"https://example.com/search-fixture","content":"A bounded search result."}]}"#;
                    write!(socket, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body).unwrap();
                    return;
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    assert!(Instant::now() < deadline, "packaged engine never sent the search request");
                    std::thread::sleep(Duration::from_millis(20));
                }
                Err(error) => panic!("fixture listener failed: {error}"),
            }
        }
    });
    let mut command = Command::new(engine);
    command.env_clear().stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null());
    discovery_process_env::configure(&mut command);
    command.env("TAVILY_ENABLED", "true").env("EXA_ENABLED", "false").env("BRAVE_ENABLED", "false")
        .env("TAVILY_API_KEY", "fixture-only-not-a-credential").env("TAVILY_API_URL", endpoint)
        .args(["search", "--mode", "fast", "--format", "json", "--", "Diffusion connection test"]);
    if keyless { command.env("TAVILY_KEYLESS", "true").env("TAVILY_API_KEY", ""); }
    let mut child = command.spawn().unwrap();
    let deadline = Instant::now() + Duration::from_secs(25);
    loop {
        if child.try_wait().unwrap().is_some() { break; }
        if Instant::now() >= deadline { let _ = child.kill(); panic!("packaged search exceeded its deadline"); }
        std::thread::sleep(Duration::from_millis(20));
    }
    let output = child.wait_with_output().unwrap();
    assert!(output.status.success(), "packaged search failed before returning a usable result");
    let json = String::from_utf8(output.stdout).unwrap();
    assert!(json.contains("\"status\": \"complete\""));
    assert!(json.contains("https://example.com/search-fixture"));
    assert!(json.contains("™ 🐈"), "the native JSON pipe must preserve UTF-8 results");
    assert!(!json.contains("fixture-only-not-a-credential"));
    server.join().unwrap();
}
