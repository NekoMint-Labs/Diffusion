# Provider contract / v0.2

The AI and evidence seams remain replaceable. Manual Field interaction is independent of all providers. The UI default is Off; Demo is an explicit deterministic test fixture, and Gateway is an explicit remote/local connection. Provider mode does not change ownership rules.

## AI semantic path

`UI intent -> ContextPacket -> gateway validation -> wire adapter -> semantic validation -> Core gate -> session possibilities or permitted surface request`

The packet contains a bounded user-owned scope, frozen Thread wording where relevant, bounded history and genuinely read Source context. It excludes unclaimed Ghosts and unread web candidates as evidence. Source and transcript text is untrusted content, not executable instructions. Selection alone makes no provider call.

For the existing scoped `respond` path, the server sends at most one model request per Normal-mode explicit intent. Models return a JSON object containing at most three semantic intents. They do not return coordinates, UI commands, SQL, executable code, canonical updates or arbitrary tools. See `src/ai/schemas.ts` for the exact discriminated variants and limits, and `src/core/semantics.ts` for authority checks. Unknown/extra mutation fields, malformed JSON, refusal and incomplete output fail closed.

Phase 3A adds a separate `structured` provider channel for unscoped authored input. It reuses the same transport/security boundary but has its own Zod-validated contracts: Thought extraction first, relation inference second, and at most one narrow repair attempt for an invalid stage. Exact evidence quotes must resolve to the durable original input before a proposal is surfaced. Structured results are session proposals, never direct canonical mutations.

Supported wire adapters:

- `AI_PROTOCOL=chat-completions`: `/chat/completions`, message content envelope.
- `AI_PROTOCOL=responses`: `/responses`, explicit instructions/input and actual output-text parts, `store:false`.
- `anthropic-messages` (Phase 2.8B-1): `/v1/messages`, `x-api-key` + `anthropic-version`, mandatory `max_tokens`, text parts only (thinking blocks are the model's working, not the answer).
- `gemini-generate-content` (Phase 2.8B-1): `/models/{model}:generateContent`, `x-goog-api-key`, `systemInstruction`/`contents`/`generationConfig`, text read from `candidates[0].content.parts[].text`.

`AI_JSON_MODE=json-object|none` is explicit; JSON mode is not schema validation. Custom bases remain configurable. Automatic protocol probing, streaming and a full SDK abstraction are not implemented. The Vercel AI SDK source comparison and the decision to keep a thin adapter are in `PROVIDER_DECISION.md`.

## Direct provider layer (Phase 2.8B-1)

A person with a provider account no longer needs a gateway. `src/ai/providers.ts` is an inspected table of providers — base URL, auth header, model-list path, model-list shape, the protocol's own JSON-output field and its own max-token field — and `src/ai/direct.ts` is one table-driven adapter over it. The abstraction normalizes Diffusion's semantic intent; it never pretends the protocols are one shape wearing four names.

`AIProvider` additionally carries `listModels?()` and `testConnection?()`. Both are deliberate actions owned by a person pressing a control, never side effects of editing configuration. `testConnection` makes the smallest *real* bounded model request, because a probe that only proves a metadata route answered is not a verification; the UI says out loud that it costs a request. `capabilities()` for a direct provider makes no request at all.

Model identity is reported, not assumed: `AIResponse.model` is `{ requested, effective }`, and `effective` is `null` when the provider does not say. A substitution is disclosed in provenance rather than absorbed.

Failures are bounded. `src/ai/errors.ts` maps statuses and provider error *type tokens* onto a fixed vocabulary — `authentication-failed`, `rate-limited`, `model-not-found`, `timeout`, `provider-unreachable`, `malformed-provider-response` and the rest — each with an actionable sentence and one remedy. The provider's own message and body never reach a surface, a log or a diagnostic. Anthropic overloads with 529; that is back-pressure, not a broken deployment.

## Credentials (Phase 2.8B-1)

A provider key is not a permission: it is a secret the user owns, so it lives in the operating system's credential store and is read only inside the native layer, at the moment of use. The webview is told whether a key exists, never what it is: a discovery key is resolved by the discovery launcher and written only into the discovery child's environment, and an AI provider key is resolved by the native provider transport, which signs and performs that request itself. Settings records *presence*. Nothing writes a provider or search key to IndexedDB, localStorage, the settings record, an export, a log, a diagnostic or a process argument. A web build reports `directProviders: false` and keeps any credential session-only rather than persisting a third-party secret in browser storage; there the session value does stay in JavaScript, because a browser has no native boundary to hide behind.

The gateway session token keeps its own identity and its own lifetime (memory only). It is never reinterpreted as a provider key, and a legacy gateway URL is never re-read as a provider address.

## Evidence

See `EVIDENCE_GATEWAY.md`. Search -> candidate -> fetched/extracted matching passages -> optional scoped reasoning -> explicit Bring. No outcome inferred from a search snippet can become retained evidence. The server re-fetches before reasoning. The gateway has one normalized HTTP discovery backend (`SEARCH_BASE_URL`/`SEARCH_API_KEY`); the desktop's discovery backend is Diffusion's own bundled engine. Both cross this same boundary.

## Configuration and safety

Only the operator configures upstream bases and credentials. The browser uses an exact Diffusion gateway URL and session token. `ALLOWED_ORIGIN` contains exact trusted origins; wildcard/null are forbidden. Non-loopback binding requires a token of at least 24 characters and trusted HTTPS termination. Request bodies are limited to 192 KiB and gateway concurrency to four active requests. Upstream JSON is bounded to 512 KiB; the discovery engine's stdout is bounded to 1 MiB and its stderr is discarded. No raw private error bodies/commands are exposed.

Model calls have a 40-second upstream deadline, evidence operations 22 seconds and assessment an overall 60-second signal. Client limits are 45 seconds for AI, 25 seconds for individual evidence operations and 65 seconds for assessment. Source read/fetch+extract UI flows additionally retain an overall stop/timeout boundary. Signals propagate and late responses cannot resurrect a deleted Source.

Diagnostics: server-generated request ID, fixed stage/provider kind, elapsed time, response/upstream status and safe error code. Full prompts, answers, snippets, source URLs, API keys and raw subprocess stderr are not logged. These controls are not a production multi-user authentication, rate-accounting or distributed cancellation system.

## Tests

Pure wire, evidence pipeline, source validation, CLI envelope/process-boundary and authority fixtures were executed by the offline suite. Hono/Zod mocked-route tests were authored but not executed without dependencies. Neither a fixture nor `/health` proves live connectivity. Real provider verification must include valid/invalid output, refusal, partial/empty evidence, cancellation, timeout and missing configuration, not only a happy response.
