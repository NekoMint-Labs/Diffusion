# Provenance

Diffusion's internal discovery engine originated from **selected components of
`onedotmint/smartsearch` v1.0.3**, then became independently maintained by
Diffusion.

| | |
|---|---|
| Source repository | `https://github.com/onedotmint/smartsearch` |
| Source tag | `v1.0.3` |
| Source commit | `a6e310d8c51d1fb9eb454d27afbbc3f81cc2e61a` |
| Source distribution name | `smart-search` (import package `smart_search`) |
| Extraction date | 2026-09-15 |
| Upstream license | MIT — see `LICENSE.smartsearch` (Copyright (c) 2025 GuDaStudio) |
| Extracted into | `internal/discovery-engine/` (distribution `diffusion-discovery`, import package `diffusion_discovery`) |

The pinned commit was the only authority for this extraction. The unrelated PyPI
project also named `smart-search` (which publishes only `0.0.x`) was never
inspected, installed, or used in any form.

Nothing in Diffusion follows SmartSearch releases. There is no version check, no
download, no clone, no requirement entry, and no compatibility shim. Future
synchronization is **not** automatic: an upstream change reaches Diffusion only
if someone reads it, decides it is worth having, and ports it deliberately.

## What was retained

The retained set is exactly the code that Diffusion's `search` and `read`
operations execute. Modules copied without behavioural change:

| Source path (v1.0.3) | Retained as | Why |
|---|---|---|
| `src/smart_search/security.py` | `diffusion_discovery/security.py` | Secret and URL-credential redaction for everything the engine prints; stable safe-message vocabulary per error type |
| `src/smart_search/core/models.py` | `diffusion_discovery/core/models.py` | Candidate / FusedCandidate / RankedCandidate / Evidence / RetrievalPolicy records |
| `src/smart_search/core/normalizers.py` | `diffusion_discovery/core/normalizers.py` | `normalize_exa` / `normalize_tavily` / `normalize_brave` |
| `src/smart_search/core/ranking.py` | `diffusion_discovery/core/ranking.py` | URL canonicalization, duplicate collapse, reciprocal rank fusion |
| `src/smart_search/evidence/fetch.py` | `diffusion_discovery/evidence/fetch.py` | Ordered reader fallback, URL validation, `max_chars` bounding, challenge-page rejection |
| `src/smart_search/providers/jina.py` | `diffusion_discovery/providers/jina.py` | The anonymous reader that makes a found page into a bounded passage |
| `src/smart_search/providers/exa_reader.py` | `diffusion_discovery/providers/exa_reader.py` | Exa's contents endpoint as the second reader |
| `src/smart_search/runtime_cache.py` | `diffusion_discovery/runtime_cache.py` | Request client and retry-delay helpers used by every adapter |

## What was adapted

| Source path (v1.0.3) | Adapted as | What changed |
|---|---|---|
| `src/smart_search/cli.py` | `diffusion_discovery/cli.py` | Only `search` and `read` remain. `setup` and `research` subcommands, `run_setup` and `run_research` are gone, so the engine has no interactive path and no code that can write configuration. `_known_secrets()` now reads the process environment instead of a config-file snapshot, so no command touches disk. The version-1 envelope, the attempt classification, the error codes and the exit codes are byte-for-byte the same contract. `serialize()` was split into `_search_data()` / `_read_data()` producing the identical `data` shape. |
| `src/smart_search/config.py` | `diffusion_discovery/config.py` | Config-file support removed entirely: no `config.json`, no config directory, no `SMART_SEARCH_CONFIG_DIR`, no `LOCALAPPDATA` lookup, no `set_config_value`, no `refresh`, no `get_config_info`. Settings are read from the process environment only, and the module performs no filesystem access at all. The retry budget became module constants rather than environment variables. |
| `src/smart_search/providers/registry.py` | `diffusion_discovery/providers/registry.py` | Kept the ordered role registry, the `ProviderAttempt` record and the source-order catalog. Removed the Firecrawl reader, the Jina reranker, the rerank role, the setup-metadata catalog, the `search_providers=` / `reader_providers=` constructor aliases and the `eligibility()` diagnostic. The `try/except ModuleNotFoundError` guards around each transport were removed: every retained transport is a required dependency, and silently omitting a source because its module was missing would have been a lie. |
| `src/smart_search/providers/base.py` | `diffusion_discovery/providers/base.py` | Kept `ProviderError`, `ProviderResult`, `classify_provider_exception`, `read_response_bounded` and `BaseSearchProvider`. Removed the unused `ProviderTimeoutError`, `SearchResult` and `coerce_provider_result`. |
| `src/smart_search/providers/exa.py` | `diffusion_discovery/providers/exa.py` | Removed `find_similar` (unused by any Diffusion operation), the unused `_error_payload` helper, and the debug-logging calls. Transport, retry and error classification are unchanged. |
| `src/smart_search/providers/tavily.py`, `src/smart_search/providers/brave.py` | same paths under `diffusion_discovery/` | Removed the debug-logging calls. Transport, payload shape, retry and classification are unchanged. |
| `src/smart_search/core/retrieval.py` | `diffusion_discovery/core/retrieval.py` | Removed the rerank stage and the `warnings` field of `RetrievalOutcome` (both were only ever populated by the Jina reranker, which is not configured by Diffusion, so RRF order was already the only order produced). Provider fan-out, attempt classification and fusion are unchanged. |
| `src/smart_search/evidence_budget.py` | `diffusion_discovery/evidence_budget.py` | Kept only `DEFAULT_FETCH_TRANSPORT_LIMIT` (5 MiB), which the reader path uses. |

## What was deliberately omitted

Each of these was verified unreachable from Diffusion's `search` and `read`
paths at the pinned commit.

| Source path (v1.0.3) | Why it is not here |
|---|---|
| `src/smart_search/cli.py` `run_setup`, `build_parser` setup subcommand, `_setup_*` helpers | Interactive credential setup. Diffusion Settings and the OS credential store own configuration; an interactive prompt inside a frozen sidecar is unreachable and would be a second source of truth for credentials. |
| `src/smart_search/skill_installer.py` | Installs agent skills. Not imported by any module in the `search`/`read` path, and unrelated to a desktop product. |
| `src/smart_search/logger.py` | File and console logging including a log directory under the config directory. Diffusion sets the child's stderr to `/dev/null` and never reads it, and the engine must not create files, so the whole module is inert here. |
| `src/smart_search/research/*` | The `research` operation. Diffusion composes reasoning itself and never asks the engine to research. |
| `src/smart_search/evidence/select.py` | Only caller was `research/runner.py`. |
| `src/smart_search/providers/firecrawl.py` | A third-party reader Diffusion does not ask for; it was never constructed because no Firecrawl key is ever supplied. |
| `src/smart_search/providers/jina_rerank.py` | The reranker was never constructed because no Jina key is ever supplied. |
| `src/smart_search/skill_installer` packaged assets, `npm/`, `integrations/`, `skills/`, `benchmarks/`, `scripts/`, `tests/`, `.github/` | Release tooling, agent integrations, the npm wrapper, the evaluation framework and the benchmark corpus. None of it is runtime behaviour Diffusion uses. |

## Future synchronization

The extracted engine is now Diffusion's own code. If an upstream improvement is
ever wanted, the change is evaluated against Diffusion's contract and ported by
hand, with the test suite in `tests/` as the gate. `diffusion_discovery` is not
a fork that tracks upstream, and it must not be described as "SmartSearch" in
Diffusion's source, UI, packaging or documentation — that name appears only
here, in `LICENSE.smartsearch`, and in historical records that were true when
they were written.
