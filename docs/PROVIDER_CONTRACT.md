# Provider contract / v0.2

The AI and evidence seams remain replaceable. Manual Field interaction is independent of all providers. The UI default is Off; Demo is an explicit deterministic test fixture, and Gateway is an explicit remote/local connection. Provider mode does not change ownership rules.

## AI semantic path

`UI intent -> ContextPacket -> gateway validation -> wire adapter -> semantic validation -> Core gate -> session possibilities or permitted surface request`

The packet contains a bounded user-owned scope, frozen Thread wording where relevant, bounded history and genuinely read Source context. It excludes unclaimed Ghosts and unread web candidates as evidence. Optional `continuations` supplies direct lineage mappings for explicit Field selections; linked texts are in scope/local, at most four new background texts. These mappings are provenance, never a semantic relation or evidence of agreement. Selection stays primary and Thread snapshots are not expanded. The optional field is validated by the gateway and forwarded through the existing direct/native paths; old request packets remain valid. A gateway serving the older strict packet schema must be updated before receiving requests with this field. Source and transcript text is untrusted content, not executable instructions. Selection alone makes no provider call.

Continue and Angle retain at most six bounded prior surfaced suggestions for local literal-repeat rejection within unchanged compiled scope/background/permissions. Ignore retains that session-only exclusion; context changes reset it. Previous wording is not appended to model instructions and never enters ContextPacket owned scope, evidence, provenance or durable state. Thread and Diffuse remain separate. Lexical filtering does not prove semantic diversity or reliable model adherence.

Authored Ask uses an explicit direct-answer contract. It accepts answer cards (`respond_in_field`), inspected evidence and explicitly requested recall, while generic `surface_possibility` output belongs to the separate thinking actions. Every returned answer contributes to the authored question; one answer is valid and the count is a ceiling. Authored wording does not automatically switch to Relation or Deep Dive based on keywords; those actions have explicit commands.

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

Ordinary and structured direct responses both reject provider-declared truncation before parsing semantic output, even when the partial text happens to be valid JSON. They report `response-truncated`; explicit provider refusal reports `provider-refused`. Cancellation and timeouts remain distinct during response-body reads. No implicit retry is introduced.

The deliberate connection probe applies the same completion/refusal checks. Gemini non-streaming text is accepted only with `STOP`; `MAX_TOKENS` is truncation and explicit safety/blocking reasons are refusal. Other, unknown or missing finish reasons are unreadable provider responses, even when their text is parseable JSON. They cannot establish a successful connection or emit semantic output.

Failures are bounded. `src/ai/errors.ts` maps statuses and provider error *type tokens* onto a fixed vocabulary — `authentication-failed`, `rate-limited`, `model-not-found`, `timeout`, `provider-unreachable`, `malformed-provider-response` and the rest — each with an actionable sentence and one remedy. The provider's own message and body never reach a surface, a log or a diagnostic. Anthropic overloads with 529; that is back-pressure, not a broken deployment.

## Credentials (Phase 2.8B-1)

A provider key is not a permission: it is a secret the user owns, so it lives in the operating system's credential store and is read only inside the native layer, at the moment of use. The webview is told whether a key exists, never what it is: a discovery key is resolved by the discovery launcher and written only into the discovery child's environment, and an AI provider key is resolved by the native provider transport, which signs and performs that request itself. Settings records *presence*. Nothing writes a provider or search key to IndexedDB, localStorage, the settings record, an export, a log, a diagnostic or a process argument. A web build reports `directProviders: false` and keeps any credential session-only rather than persisting a third-party secret in browser storage; there the session value does stay in JavaScript, because a browser has no native boundary to hide behind.

The gateway session token keeps its own identity and its own lifetime (memory only). It is never reinterpreted as a provider key, and a legacy gateway URL is never re-read as a provider address.

## Evidence

See `EVIDENCE_GATEWAY.md`. Search -> candidate -> fetched/extracted matching passages -> optional scoped reasoning -> explicit Bring. No outcome inferred from a search snippet can become retained evidence. The server re-fetches before reasoning. The gateway has one normalized HTTP discovery backend (`SEARCH_BASE_URL`/`SEARCH_API_KEY`); the desktop's discovery backend is Diffusion's own bundled engine. Both cross this same boundary.

## Configuration and safety

Only the operator configures upstream bases and credentials. The browser uses an exact Diffusion gateway URL and session token. `ALLOWED_ORIGIN` contains exact trusted origins; wildcard/null are forbidden. Non-loopback binding requires a token of at least 24 characters and trusted HTTPS termination. Request bodies are limited to 192 KiB and gateway concurrency to four active requests. Upstream JSON is bounded to 512 KiB; the discovery engine's stdout is bounded to 1 MiB and its stderr is discarded. No raw private error bodies/commands are exposed.

Model calls have a 40-second upstream deadline, evidence operations 22 seconds and assessment an overall 60-second signal. Client limits are 45 seconds for AI, 25 seconds for individual evidence operations and 65 seconds for assessment. Source read/fetch+extract UI flows additionally retain an overall stop/timeout boundary. Signals propagate and late responses cannot resurrect a deleted Source. AI runtime deadlines settle as failed/timeout, while an explicit Stop settles as cancelled; deadline or Stop responses cannot emit late proposals or replace a newer operation.

Diagnostics: server-generated request ID, fixed stage/provider kind, elapsed time, response/upstream status and safe error code. Full prompts, answers, snippets, source URLs, API keys and raw subprocess stderr are not logged. These controls are not a production multi-user authentication, rate-accounting or distributed cancellation system.

## Tests

Pure wire, evidence pipeline, source validation, CLI envelope/process-boundary and authority fixtures were executed by the offline suite. Hono/Zod mocked-route tests were authored but not executed without dependencies. Neither a fixture nor `/health` proves live connectivity. Real provider verification must include valid/invalid output, refusal, partial/empty evidence, cancellation, timeout and missing configuration, not only a happy response.

## Selected Field lineage (Round 2)

Ask answers keep their actual `ask` action and surviving causal `derivedFrom` IDs only when a person chooses Keep. Provenance is not agreement, confirmed evidence or an organizing relation; legacy thoughts without lineage remain valid.

Explicit Field context preserves selection as the subject and supplies up to four direct background parents, then at most two ancestors. Traversal follows only `derivedFrom`, at most four edges deep and 32 visited subject/node pairs, with at most four outgoing parents considered per node. Authored ancestors with a surviving Input identity (or plain authored roots without model/source provenance) take priority, nearest first; unknown/model material is fallback background. `authored` is an authorship hint, never a truth/endorsement flag.

The six-thought local budget stays at 6400 characters. Each ancestor uses at most 800 characters, reserved before allocating the remaining budget evenly across direct background parents (each at most 1600). Optional `ancestry` paths record selected ID → direct parent → ancestor; they neither fetch omitted text nor expand source permissions. In-flight changes to supplied ancestor wording, existence or path edges invalidate the response. Current selected wording and explicit intent take priority; nearer user-authored redirection overrides an older goal. These are bounded prompt/context rules, not a guarantee of live-model quality. Frozen Threads and unselected Field context retain their existing contracts. No extra provider request is introduced.
