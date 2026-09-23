//! Runs Diffusion's bundled discovery engine.
//!
//! The engine ships inside the application as a single self-contained executable, built from
//! Diffusion-owned source in `internal/discovery-engine/`. The user installs Diffusion and discovery
//! is present: no Python, no separate install, no PATH edit. A build that still needed any of those
//! would not be "built in", and pretending otherwise would be the dishonest kind of done. The
//! artifact's provenance is recorded in `internal/discovery-engine/PROVENANCE.md`.
//!
//! Two boundaries matter here:
//!
//!  * **Credentials travel in the environment, never in argv, and the webview never holds one.**
//!    An argument list is readable by other processes on the same machine; an environment handed to
//!    one child is not. The webview names the sources the person enabled and nothing more, so the
//!    plaintext secret is read from the operating system's credential store here and written
//!    straight into the child's environment (`discovery_env.rs`).
//!  * **The webview is not trusted to pick the executable, or to set arbitrary variables.** The
//!    path is resolved from the application's own resources, environment keys are allowlisted, and
//!    arguments are checked against the engine's two known shapes.

use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

use crate::credentials::read_secret;
use crate::discovery_env::child_environment;

/// One search is bounded by its slowest source; a read is bounded by the slowest page.
const SEARCH_BUDGET: Duration = Duration::from_secs(30);
const READ_BUDGET: Duration = Duration::from_secs(60);
/// The engine's own envelope contract already caps its output; this is the belt to that braces.
const MAX_OUTPUT_BYTES: u64 = 1024 * 1024;
const POLL_INTERVAL: Duration = Duration::from_millis(20);

/// Only variables the engine actually reads. A leaked or unexpected name cannot be smuggled in,
/// and Diffusion never forwards its own process environment to the child.
const ALLOWED_ENV_PREFIXES: [&str; 4] = ["EXA_", "TAVILY_", "BRAVE_", "JINA_"];

fn env_allowed(key: &str) -> bool {
    ALLOWED_ENV_PREFIXES.iter().any(|prefix| key.starts_with(prefix))
}

/// The engine's two machine operations, checked as shapes rather than as loose tokens: every flag
/// must be one Diffusion itself emits, and the payload must follow the `--` delimiter so user text
/// can never become an option.
const ALLOWED_FLAGS: [&str; 8] = ["--mode", "--format", "json", "fast", "balanced", "research", "--max-chars", "--query"];

fn args_valid(args: &[String]) -> bool {
    if args.len() < 2 || args.len() > 12 {
        return false;
    }
    if args[0] != "search" && args[0] != "read" {
        return false;
    }
    if args.iter().any(|arg| arg.contains('\0') || arg.contains('\n') || arg.contains('\r') || arg.len() > 4096) {
        return false;
    }
    let Some(delimiter) = args.iter().position(|arg| arg == "--") else {
        return false;
    };
    // Exactly one payload argument, and nothing after it.
    if delimiter + 2 != args.len() {
        return false;
    }
    args[1..delimiter].iter().all(|arg| ALLOWED_FLAGS.contains(&arg.as_str()))
}

/// Resolves the bundled engine. A missing resource is reported honestly rather than as a crash: an
/// unpackaged development run has no bundled engine, and the UI must be able to say so.
fn engine_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let name = if cfg!(windows) { "resources/discovery/diffusion-discovery.exe" } else { "resources/discovery/diffusion-discovery" };
    app.path()
        .resolve(name, BaseDirectory::Resource)
        .ok()
        .filter(|path| path.exists())
        .ok_or_else(|| "The bundled discovery engine is not present in this build.".to_string())
}

/// One operation, one process.
///
/// A short-lived process was chosen over a resident one deliberately: there is no daemon to
/// supervise, no idle cost while a Field is being written in, and no lifecycle to leak. The price
/// is process startup per operation, which is measured rather than assumed.
///
/// The webview supplies the argument list and the *identifiers* of the sources the person enabled.
/// It neither supplies nor can obtain a credential value: each source's secret is read from the
/// operating system's credential store in this process, and it exists only in the environment of
/// the child below. An enabled source with no stored secret is written off, so a key that went
/// missing degrades to the engine's own configuration answer instead of to a provider failure.
#[tauri::command]
pub async fn discovery_run(app: AppHandle, args: Vec<String>, sources: Vec<String>) -> Result<String, String> {
    if !args_valid(&args) {
        return Err("The discovery engine was asked for an unsupported operation.".into());
    }
    let environment = child_environment(&sources, read_secret)?;
    let program = engine_path(&app)?;
    let operation = args[0].clone();
    tauri::async_runtime::spawn_blocking(move || run(&program, &args, &environment, &operation))
        .await
        .map_err(|_| "The discovery operation did not complete.".to_string())?
}

fn run(program: &std::path::Path, args: &[String], env: &std::collections::HashMap<String, String>, operation: &str) -> Result<String, String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        // The engine's own diagnostics are not the user's business and may mention a URL or a key.
        // Nothing from stderr is ever returned or logged.
        .stderr(Stdio::null())
        .env_clear()
        // The map is built from a closed vocabulary in `discovery_env`, and this filter restates the
        // allowlist as the last gate before the child: two independent reasons a name outside the
        // engine's own variables cannot reach it.
        .envs(env.iter().filter(|(key, _)| env_allowed(key)));
    // A child process must not flash a console window in front of the user on Windows.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = command.spawn().map_err(|_| "The bundled discovery engine could not be started.".to_string())?;
    // Read on a separate thread: a result larger than the pipe buffer would otherwise block the
    // child while this thread waited for it to exit, and the two would deadlock until the timeout.
    let stdout = child.stdout.take().ok_or_else(|| "The discovery engine returned nothing.".to_string())?;
    let reader = std::thread::spawn(move || {
        let mut text = String::new();
        let mut limited = stdout.take(MAX_OUTPUT_BYTES + 1);
        let _ = limited.read_to_string(&mut text);
        text
    });
    let budget = if operation == "read" { READ_BUDGET } else { SEARCH_BUDGET };
    let deadline = Instant::now() + budget;
    let mut timed_out = false;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    timed_out = true;
                    break;
                }
                std::thread::sleep(POLL_INTERVAL);
            }
            Err(_) => break,
        }
    }
    let output = reader.join().unwrap_or_default();
    if timed_out {
        return Err("External search did not answer in time.".into());
    }
    if output.len() as u64 > MAX_OUTPUT_BYTES {
        return Err("External search returned more than Diffusion will read.".into());
    }
    if output.trim().is_empty() {
        return Err("External search returned nothing usable.".into());
    }
    Ok(output)
}

/// Whether this build actually carries the engine. Asked by Settings before it offers a control, so
/// a missing capability is visible before someone presses Explore rather than after.
#[tauri::command]
pub fn discovery_available(app: AppHandle) -> bool {
    engine_path(&app).is_ok()
}

/// The bundled engine's version, read from the engine's own version file. Reported so an
/// installation can be identified in a support conversation without interrogating the process.
#[tauri::command]
pub fn discovery_version(app: AppHandle) -> Option<String> {
    let path = app.path().resolve("resources/discovery/VERSION", BaseDirectory::Resource).ok()?;
    std::fs::read_to_string(path).ok().map(|value| value.trim().to_string())
}
