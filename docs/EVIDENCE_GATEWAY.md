# Evidence adapters and trust boundary

The gateway has one operator-configured adapter — a normalized HTTP endpoint. The desktop app instead runs Diffusion's own bundled discovery engine. Both feed the same validated Diffusion evidence pipeline. UI callers never select an upstream host or executable. The browser talks only to the protected Hono gateway. Inputs and outputs are bounded by `src/evidence/schemas.ts`; Core validates retained Source records again.

## Normalized HTTP adapter (default)

```dotenv
SEARCH_BASE_URL=https://your-evidence-service.example/normalized
SEARCH_API_KEY=
```

The base URL is operator-controlled, HTTPS for remote hosts (HTTP only on loopback), without credentials/query/fragment. Requests are POST JSON, with `Authorization: Bearer <SEARCH_API_KEY>` only when configured. Redirects are rejected. The upstream must enforce its own destination/redirect/SSRF policy; this application is not a generic browser-selected HTTP proxy.

| Upstream route | Input | Required response |
|---|---|---|
| `/search` | `{query,limit}`; query <=3000 chars, limit 1..10 | `{candidates:[{id,title,url,excerpt,inspected}]}`; <=10 |
| `/fetch` | `{url}` | `{url,title,text,inspected}`; text <=50000 chars |
| `/extract` | `{url,query?}` | `{chunks:[{text,locator?,inspected}]}`; <=10 chunks <=6000 chars each |
| `/metadata` | `{url}` | `{url,title,mime?}` |

Use credential-free HTTP(S) URLs. IDs <=200 chars, titles <=500, inspection statements <=2000, locators <=500. Output objects are strict. Legacy search `outcome` may be accepted at the HTTP boundary for compatibility, but it is discarded; it never survives as a judgment. `stage:judged` and supplied passages are not valid discovery output.

Example candidate, deliberately not evidence:

```json
{"candidates":[{"id":"candidate-1","title":"A source","url":"https://example.org/article","excerpt":"A discovery snippet","inspected":"Search snippet only"}]}
```

Fetch must return the actual bounded reader text. Extract must return verbatim passages from that text, not a summary or stance. Diffusion normalizes whitespace only for matching, requires meaningful text, keeps at most four passages/6000 total characters, and records actual locators/retrieval times/provider. No matching passage is an honest insufficiency, not a positive assessment.

## Discovery engine (desktop, bundled)

The desktop app does not ask its user for Python or a separate installation. Diffusion's discovery
engine is Diffusion-owned source under `internal/discovery-engine/`, frozen into one self-contained
`diffusion-discovery` executable by `pnpm run build:discovery` and copied into
`src-tauri/resources/discovery/` as a Tauri resource. The native layer resolves its path from the
application's own resources, so a desktop user sets nothing, installs nothing and edits no PATH.
Verified by running the packaged engine with a `PATH` containing no Python and driving it through
Diffusion's own argument and environment builders. Its provenance is recorded in
`internal/discovery-engine/PROVENANCE.md`.

The environment is built natively by `src-tauri/src/discovery_env.rs` from the source identifiers the
Settings record already holds, and three properties of it are load-bearing:

- a source the user did not enable is written `<SOURCE>_ENABLED=false` rather than omitted, because
  the engine treats `*_ENABLED` as defaulting to **true** — omission would let an unrelated ambient key
  answer for a source the UI says is off;
- the provider secret is read from the operating system's credential store inside the native layer and
  written straight into the child environment, so a plaintext discovery key never reaches the webview,
  never enters React state, and never crosses IPC; `credential_get` refuses a `search.` identity
  outright, so the webview cannot obtain one even by mistake;
- credentials travel in the child process environment and never in `argv`, because an argument list is
readable by other processes on the machine. Stdin is `/dev/null` and stderr is never read: engine
diagnostics may mention a URL or a key and are not telemetry.

Diffusion never invokes the engine's interactive `setup`. Settings is Diffusion's experience, and
`setup` is the engine's own.

The engine emits the version-1 envelope `{version,operation,status,data,attempts,warnings,error}`.
Search maps `data.candidates`; read maps `data.evidence`. Complete and degraded responses may provide
usable data; failed envelopes report safe errors. Discovery never reads a page. Exact paths/blobs and
provenance are recorded in `REFERENCE_AUDIT.md` and `internal/discovery-engine/PROVENANCE.md`.

The bridge invokes the bundled executable using `execFile`, `shell:false`, a 22-second deadline and 1 MiB output budget. Arguments are arrays; a `--` delimiter keeps user text positional. Native `.cmd` wrappers may not run without a shell on Windows: use a directly executable launcher rather than weakening the no-shell boundary.

- Search uses `search --mode fast|balanced|research --format json -- QUERY`; `research` here is a search preset for a larger result limit, **not the autonomous research command**.
- Read uses `read --max-chars 50000 --format json -- URL`.
- The bridge never invokes setup, autonomous research, a legacy command, schema flags, or answer-generation flags.

Fetch output is retained only in a bounded in-memory, 30-second, maximum-16-entry pairing cache so the following extract can use the same reader body. Extract consumes that entry and selects up to four bounded verbatim blocks with reader-text character locators. These are not fabricated document page numbers. Metadata uses a bounded read because the engine has no standalone metadata operation. Every fetch (including assessment verification) refreshes the source rather than trusting a client's stage flag.

No search aggregation, reranking providers, credential configuration or full research engine is
duplicated in the product layer. The engine's adapters, retry policy, normalization, deduplication and
pooling are its own: Diffusion owns exactly one copy of its *output* contract
(`src/discovery/envelope.ts`), because that envelope is the integration seam and the bundled engine
and the gateway must read it identically. The bundled artifact is a build output, gitignored like
`dist/`. Tests cover envelope parsing, stage boundaries, bounded extraction, argument safety,
environment translation, degradation and provenance.

Diffusion's discovery engine originated from selected components of `onedotmint/smartsearch` v1.0.3
(commit `a6e310d8c51d1fb9eb454d27afbbc3f81cc2e61a`) and is now independently maintained by Diffusion.
SmartSearch compatibility is not a product contract and no Diffusion build or release follows
SmartSearch; see `internal/discovery-engine/PROVENANCE.md`.

**Product states are capability states, measured.** Zero enabled sources, a source enabled without a
key, and a single failing source each produce an honest "external search is unavailable" while
AI-only exploration continues. One failing source beside a working one produces `status: degraded`
with the useful candidate preserved — verified end-to-end through the real bundled engine — so a
partial failure is reported as partial rather than as failure or as an empty success.

**Discovery is its own section of Settings, and the engine is not one of the choices.** The user
enables *sources* (Exa / Tavily / Brave) and an *external exploration* switch; the engine is internal.
Offering the engine beside "Exa" would ask a person to choose an implementation. The capability
state is computed before any search is attempted, so a control can never look available and then fail
on first use.

The invoked process is cancelled on timeout/abort; wrappers must not leave detached descendants. The binary path cannot be supplied by a UI request.

## Scoped assessment

The Diffusion route `/api/evidence/reason` is **not** forwarded blindly to the search service. It requires a nonempty claim and at most four previously read passages, with unique IDs and at most two source URLs. The server re-fetches those URLs through the configured adapter and rechecks passage content before a separate model request. The output contains one of support/challenge/partial/prior-art/inconclusive/conflicting, a bounded rationale and actual passage IDs. The client attaches the claim/time/provider and Core revalidates it.

A forged/unmatched passage returns HTTP 422 with `degraded:true`; it does not trigger the model call. Unconfigured providers return 503. Contract or transport failures return safe request-visible IDs/codes, not raw private upstream responses. An inconclusive result is valid. No evidence request moves a Thought, creates a Crystal or confirms a relation.

## Limits and verification

Search/read/extract and assessment are explicit UI actions. A candidate brought before reading stays Limited and excluded from model evidence. Later Bring/Update upgrades the same chosen Source without duplicating its Thought or changing geometry. Undoing/deleting during an asynchronous read does not resurrect the Source.

The optional Diffuse search remains discovery-only: it may expose candidates, but un-read snippets are not injected into its model context. This implementation does not silently perform arbitrary web research to fill missing evidence.

HTTP transport, Hono routing and Zod integration tests are authored but dependency-blocked. Pure pipelines and the discovery envelope mapping were executed offline. Actual external content, redirects, keys, timeouts and provider-specific behavior require an operator smoke test. Do not treat the read-stage marker as a cryptographic proof or this local gateway as a multi-tenant provenance authority.
