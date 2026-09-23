//! The child environment for one discovery operation.
//!
//! Two rules live here and both of them are security rules:
//!
//!  * **A provider secret is resolved by the native layer and written straight into the child's
//!    environment.** It never travels through the webview and it is never an argument. The webview
//!    names the sources the person enabled; this module turns those names into the environment the
//!    engine reads, and the value it reads from the credential store goes nowhere else.
//!  * **A source the person did not enable is written *off*, not omitted.** The engine treats
//!    `<SOURCE>_ENABLED` as defaulting to true, so an omitted variable would let an unrelated
//!    ambient key answer for a source the UI shows as disabled. The control and the behaviour have
//!    to be the same claim, and the only way to guarantee that is to write the negative explicitly.
//!
//! The module is deliberately free of Tauri and keyring types: the credential lookup arrives as a
//! function, so the mapping can be compiled and unit-tested on its own (`rustc --test`).

use std::collections::HashMap;

/// One search source: its product id, the credential slot that holds its key, and the two variables
/// the engine reads for it.
///
/// This mapping exists exactly once, here. It used to be duplicated in TypeScript, where the child
/// environment was assembled from secrets the webview had read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Source {
    pub id: &'static str,
    pub credential_slot: &'static str,
    pub key_variable: &'static str,
    pub enable_variable: &'static str,
}

/// The sources Diffusion offers, in the product's own order.
pub const SOURCES: [Source; 3] = [
    Source { id: "exa", credential_slot: "search.exa", key_variable: "EXA_API_KEY", enable_variable: "EXA_ENABLED" },
    Source { id: "tavily", credential_slot: "search.tavily", key_variable: "TAVILY_API_KEY", enable_variable: "TAVILY_ENABLED" },
    Source { id: "brave", credential_slot: "search.brave", key_variable: "BRAVE_API_KEY", enable_variable: "BRAVE_ENABLED" },
];

/// Whether an id names a source Diffusion offers. A webview may only ask for these; anything else is
/// refused rather than ignored, so a request cannot quietly name a source that does not exist.
pub fn is_source(id: &str) -> bool {
    SOURCES.iter().any(|source| source.id == id)
}

/// Build the environment for one operation.
///
/// `enabled` is what the UI asked for. `read_secret` is called at most once per source with its
/// credential slot; the value it returns is placed in the returned map and nowhere else — nothing
/// here logs, formats or reports it. An enabled source whose secret is missing or empty is written
/// off exactly like a source that was never enabled, which is what makes a key removed underneath a
/// running app degrade to "no source configured" instead of to a confusing provider failure.
pub fn child_environment(
    enabled: &[String],
    mut read_secret: impl FnMut(&str) -> Option<String>,
) -> Result<HashMap<String, String>, String> {
    if let Some(unknown) = enabled.iter().find(|id| !is_source(id)) {
        return Err(format!("Unsupported discovery source: {unknown}"));
    }
    let mut environment = HashMap::new();
    for source in SOURCES {
        let wanted = enabled.iter().any(|id| id == source.id);
        let secret = if wanted {
            read_secret(source.credential_slot).filter(|value| !value.is_empty())
        }
        else {
            None
        };
        environment.insert(source.enable_variable.to_string(), if secret.is_some() { "true" } else { "false" }.to_string());
        environment.insert(source.key_variable.to_string(), secret.unwrap_or_default());
    }
    Ok(environment)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn no_secrets(_: &str) -> Option<String> {
        None
    }

    fn every_secret(_: &str) -> Option<String> {
        Some("stored-provider-secret".to_string())
    }

    fn enabled(ids: &[&str]) -> Vec<String> {
        ids.iter().map(|id| id.to_string()).collect()
    }

    #[test]
    fn a_source_the_person_did_not_enable_is_written_off_explicitly() {
        let environment = child_environment(&enabled(&[]), every_secret).unwrap();
        for source in SOURCES {
            assert_eq!(environment[source.enable_variable], "false");
            assert_eq!(environment[source.key_variable], "");
        }
    }

    #[test]
    fn an_enabled_source_with_a_stored_secret_receives_it() {
        let environment = child_environment(&enabled(&["exa"]), every_secret).unwrap();
        assert_eq!(environment["EXA_ENABLED"], "true");
        assert_eq!(environment["EXA_API_KEY"], "stored-provider-secret");
        assert_eq!(environment["TAVILY_ENABLED"], "false");
        assert_eq!(environment["TAVILY_API_KEY"], "");
        assert_eq!(environment["BRAVE_ENABLED"], "false");
        assert_eq!(environment["BRAVE_API_KEY"], "");
    }

    #[test]
    fn an_enabled_source_with_no_stored_secret_is_written_off() {
        let environment = child_environment(&enabled(&["exa", "tavily", "brave"]), no_secrets).unwrap();
        for source in SOURCES {
            assert_eq!(environment[source.enable_variable], "false");
        }
    }

    #[test]
    fn an_empty_secret_counts_as_no_secret() {
        let environment = child_environment(&enabled(&["exa"]), |_| Some(String::new())).unwrap();
        assert_eq!(environment["EXA_ENABLED"], "false");
    }

    #[test]
    fn the_environment_contains_exactly_the_six_variables_of_the_three_sources() {
        let environment = child_environment(&enabled(&["exa", "tavily", "brave"]), every_secret).unwrap();
        let mut names: Vec<&str> = environment.keys().map(String::as_str).collect();
        names.sort();
        assert_eq!(names, ["BRAVE_API_KEY", "BRAVE_ENABLED", "EXA_API_KEY", "EXA_ENABLED", "TAVILY_API_KEY", "TAVILY_ENABLED"]);
    }

    #[test]
    fn a_secret_is_never_read_for_a_source_that_was_not_enabled() {
        let mut read: Vec<String> = Vec::new();
        child_environment(&enabled(&["brave"]), |slot| {
            read.push(slot.to_string());
            Some("stored-provider-secret".to_string())
        })
        .unwrap();
        assert_eq!(read, ["search.brave"]);
    }

    #[test]
    fn an_unknown_source_is_refused_rather_than_ignored() {
        assert!(child_environment(&enabled(&["exa", "made-up"]), every_secret).is_err());
        assert!(!is_source("made-up"));
        assert!(!is_source(""));
        for source in SOURCES {
            assert!(is_source(source.id));
        }
    }

    #[test]
    fn every_source_slot_matches_the_identity_the_credential_store_validates() {
        // `credentials::valid_id` accepts `search.<lowercase alnum or dash>`, at most 24 characters.
        for source in SOURCES {
            let (kind, rest) = source.credential_slot.split_once('.').expect("slot has a kind and a name");
            assert_eq!(kind, "search");
            assert!(!rest.is_empty() && rest.len() <= 24);
            assert!(rest.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-'));
        }
    }
}
