//! The two argument shapes emitted by the frontend's discovery envelope adapter.
//! Kept independent of Tauri so the native process boundary can be tested directly.

pub fn args_valid(args: &[String]) -> bool {
    if args.len() != 7
        || args.iter().any(|arg| {
            arg.contains('\0') || arg.contains('\n') || arg.contains('\r') || arg.len() > 4096
        })
    {
        return false;
    }
    // The delimiter has a fixed position, followed by exactly one nonempty payload. A query
    // beginning with a hyphen is still data; it cannot add or replace a process option.
    if args[3] != "--format" || args[4] != "json" || args[5] != "--" || args[6].trim().is_empty() {
        return false;
    }
    match args[0].as_str() {
        "search" => {
            args[1] == "--mode" && matches!(args[2].as_str(), "fast" | "balanced" | "research")
        }
        "read" => args[1] == "--max-chars" && args[2] == "50000",
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::args_valid;

    fn args(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| value.to_string()).collect()
    }

    #[test]
    fn accepts_every_search_mode_emitted_by_the_frontend() {
        for mode in ["fast", "balanced", "research"] {
            assert!(args_valid(&args(&[
                "search",
                "--mode",
                mode,
                "--format",
                "json",
                "--",
                "attention"
            ])));
        }
    }

    #[test]
    fn accepts_the_frontends_bounded_read_request() {
        assert!(args_valid(&args(&[
            "read",
            "--max-chars",
            "50000",
            "--format",
            "json",
            "--",
            "https://example.org/page",
        ])));
    }

    #[test]
    fn leading_hyphens_in_a_query_remain_positional_data() {
        for query in [
            "--",
            "--mode research",
            "-something not yet clear",
            "中文查询",
        ] {
            assert!(args_valid(&args(&[
                "search", "--mode", "fast", "--format", "json", "--", query
            ])));
        }
    }

    #[test]
    fn rejects_altered_or_incomplete_operation_shapes() {
        for values in [
            vec![],
            vec!["search"],
            vec!["search", "--mode", "fast", "--format", "json", "attention"],
            vec![
                "search",
                "--mode",
                "fast",
                "--format",
                "json",
                "--",
                "attention",
                "extra",
            ],
            vec![
                "search",
                "--mode",
                "deep",
                "--format",
                "json",
                "--",
                "attention",
            ],
            vec![
                "search",
                "--query",
                "fast",
                "--format",
                "json",
                "--",
                "attention",
            ],
            vec![
                "search",
                "--format",
                "json",
                "--mode",
                "fast",
                "--",
                "attention",
            ],
            vec![
                "search",
                "--mode",
                "fast",
                "--format",
                "text",
                "--",
                "attention",
            ],
            vec![
                "search",
                "--mode",
                "fast",
                "--format",
                "json",
                "--query",
                "attention",
            ],
            vec![
                "read",
                "--mode",
                "fast",
                "--format",
                "json",
                "--",
                "https://example.org",
            ],
            vec![
                "read",
                "--max-chars",
                "50001",
                "--format",
                "json",
                "--",
                "https://example.org",
            ],
            vec![
                "research",
                "--mode",
                "fast",
                "--format",
                "json",
                "--",
                "attention",
            ],
            vec!["search", "--mode", "fast", "--format", "json", "--", "   "],
        ] {
            assert!(!args_valid(&args(&values)), "accepted {values:?}");
        }
    }

    #[test]
    fn preserves_the_argument_byte_and_control_character_limits() {
        for operation in ["search", "read"] {
            let (option, value) = if operation == "search" {
                ("--mode", "fast")
            } else {
                ("--max-chars", "50000")
            };
            let mut request = args(&[
                operation, option, value, "--format", "json", "--", "payload",
            ]);
            request[6] = "x".repeat(4096);
            assert!(args_valid(&request));
            for payload in [
                "x".repeat(4097),
                "中".repeat(1366),
                "a\0b".into(),
                "a\nb".into(),
                "a\rb".into(),
            ] {
                request[6] = payload;
                assert!(!args_valid(&request));
            }
        }
    }
}
