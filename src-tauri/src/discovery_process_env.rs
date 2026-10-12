//! Minimal operating-system context required by the frozen engine after `env_clear`.
//! Provider credentials remain a separate, source-scoped allowlist.

use std::process::Command;

pub fn configure(command: &mut Command) {
    #[cfg(windows)]
    {
        // PyInstaller's one-file executable must unpack into a writable temporary directory.
        // Windows networking/SSL also needs SystemRoot; without it startup or DNS fails.
        let temporary = std::env::temp_dir();
        command.env("TEMP", &temporary).env("TMP", &temporary);
        if let Some(system_root) = std::env::var_os("SystemRoot") {
            command.env("SystemRoot", system_root);
        }
    }
    #[cfg(not(windows))]
    let _ = command;
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn only_windows_runtime_context_is_added() {
        let mut command = Command::new("unused");
        command.env_clear();
        configure(&mut command);
        let environment: std::collections::HashMap<_, _> = command.get_envs().collect();
        assert_eq!(environment.len(), 3);
        assert_eq!(environment[std::ffi::OsStr::new("TEMP")], Some(std::env::temp_dir().as_os_str()));
        assert_eq!(environment[std::ffi::OsStr::new("TMP")], Some(std::env::temp_dir().as_os_str()));
        assert_eq!(environment[std::ffi::OsStr::new("SystemRoot")], std::env::var_os("SystemRoot").as_deref());
    }
}
