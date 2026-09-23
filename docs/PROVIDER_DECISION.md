# Provider boundary decision / v0.2

## Spike actually performed

Inspected Vercel AI SDK's `packages/openai/src/openai-provider.ts` (blob and lines in REFERENCE_AUDIT.md), including separate Chat/Responses model factories, custom baseURL and injected fetch. Compared this with the existing single `/chat/completions` adapter. Wrote and **executed offline fixtures** for the replacement pure wire module `server/provider.ts`.

An SDK implementation/install/bundle-size benchmark was **not possible**: npm registry DNS is unavailable. No unmeasured dependency weight or SDK execution is claimed.

## Decision

Keep the existing gateway, semantic contracts and injected fetch. Add explicit `AI_PROTOCOL=chat-completions|responses`, independently test both envelopes, and expose `AI_JSON_MODE=json-object|none` for compatible custom endpoints that do not accept JSON mode. The default remains Chat Completions for backward compatibility. Responses disables storage with `store:false`. No auto-probing or hidden retries multiply calls.

JSON mode does not guarantee the schema. Zod still validates all semantic intent variants, bounded arrays/strings and forbidden extra mutation fields. Malformed, refused, incomplete or unrecognized outputs fail closed. The adapter never knows the canonical Field or camera.

| Concern | Existing adapter | Current decision | Larger SDK tradeoff |
|---|---|---|---|
| Custom endpoints | One operator base, Chat wire assumed | Preserve explicit trusted HTTPS/loopback base, add explicit protocol/JSON mode | Inspected source supports baseURL/fetch; integration remains untested |
| Responses evolution | Unsupported | Separate body and output parser, refusal/incomplete handling | SDK could absorb future protocol churn |
| Native Anthropic/Google | Unsupported | **Implemented** in Phase 2.8B-1 as two named wire protocols over one table-driven adapter; see `PROVIDER_CONTRACT.md` | SDK would remove the per-protocol glue, at the cost of bundle weight and a protocol layer that churns under us |
| Structure | JSON object plus Zod | Zod remains authority for all semantic output | Schema tooling may reduce glue, not eliminate Core validation |
| Abort/timeouts | Route-local | Shared bounded transport; 40s model, 22s evidence, 60s reasoning total; client signal propagated | SDK abort interoperability must be checked |
| Streaming | Not used | No streaming required by current semantic response contract | Do not adopt streaming dependencies without a user-visible need |
| Bundle/dependency cost | Existing Hono/Zod | No added dependency, small pure module | Not measured, no numeric claims |
| Tests | Mostly Chat success/failure | Pure fixtures executed; Hono/Zod route fixtures authored but dependency-blocked | SDK comparison execution deferred |

## SDK decision re-examined (Phase 2.8B-1)

No provider SDK was installed. The question was asked again rather than inherited, and the answer held for reasons that are now evidence rather than anticipation:

- **The four protocols are small.** What Diffusion sends is one instruction plus one JSON payload; what it reads is one text field. The whole wire layer is `src/ai/wire.ts`, and its provider table names each protocol's own JSON-output field and its own max-token field — the two places where guessing silently produces a no-op parameter or a 400 (`max_tokens` is deprecated on OpenAI, mandatory on Anthropic, spelled `maxOutputTokens` on Gemini).
- **Bundle and runtime cost.** Four SDKs would add several dependencies to a desktop application for a request shape that fits in one file, and this project's dependency policy prefers the standard library first.
- **Abort semantics are a correctness boundary, not a convenience.** Diffuse's bounded subsequent calls and the user-facing Stop both depend on cancellation propagating exactly. `AbortSignal` in one transport is fully understood; interop with four SDK abort models is four things to verify.
- **Structured output is not the hard part.** JSON mode does not guarantee a schema in any provider, so Zod remains the authority on what an answer may mean regardless of who assembled the request. An SDK would not remove that layer.
- **A named seam already exists.** `HttpSend.send(request, signal)` is the single transport seam, so adopting a transport that does not depend on a provider's browser CORS policy — or an SDK — is a change to one file that no adapter or product surface can observe.

This is a decision to keep owning a small, measured surface, not a refusal to evaluate. If a protocol grows features a thin adapter cannot honestly express (streaming with tool results, for instance), the seam is where that changes.

## Evidence is a separate boundary

`search` returns discovery candidates and strips provider judgments. The UI explicitly fetches and extracts before it can assess a claim. Extracted passages must match the fetched body. `/api/evidence/reason` validates provenance, re-fetches up to two unique sources through the fixed operator gateway, matches submitted passages, and then makes a separate bounded reasoning call. Results cite actual passage IDs and retain the claim/rationale. An unsupported reader, empty extraction or inconclusive result never becomes a positive verdict.

The SmartSearch README inspected in the v0.2 run describes a **CLI** contract. This project does not claim that `SEARCH_BASE_URL` can point at that CLI. The gateway's discovery backend is a normalized HTTP endpoint (`SEARCH_BASE_URL`/`SEARCH_API_KEY`); the desktop app's is Diffusion's own bundled engine under `internal/discovery-engine/`, and the TypeScript product layer does not know which provider answered. Diffusion's discovery engine originated from selected components of `onedotmint/smartsearch` v1.0.3 (commit `a6e310d8c51d1fb9eb454d27afbbc3f81cc2e61a`) and is now independently maintained by Diffusion; SmartSearch compatibility is not a product contract and no Diffusion build or release follows SmartSearch. See `internal/discovery-engine/PROVENANCE.md` and EVIDENCE_GATEWAY.md.

## Diagnostics and privacy

Request IDs, fixed operation stage, protocol kind, elapsed milliseconds, status and safe failure code are available. No private prompts, transcripts, extracted passages, source URLs, credentials or raw upstream error bodies are logged. The default logger can be replaced by an injected callback. This pass does not claim an authenticated multi-tenant service or enterprise audit system.
