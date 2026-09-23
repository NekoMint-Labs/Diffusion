# Provider and trust boundaries

The shipped default is **Demo**, a deterministic authored provider. Its output is always labeled. AI Off performs no requests. Selecting Gateway enables only explicit requests; selecting a Thought never sends a request.

## Start a private gateway

1. Copy `.env.example` to `.env` and set `AI_BASE_URL`, `AI_MODEL`, and optionally `AI_API_KEY` for your provider.
2. Run `npm run gateway` and `npm run dev` in separate terminals. Vite proxies `/api` to loopback port 8787.
3. In Settings, choose Gateway. Leave the gateway URL empty for the Vite same-origin proxy. With a deployed frontend, set the HTTPS gateway base URL and its session token.
4. Set `ALLOWED_ORIGIN` to exact comma-separated UI origins. For Tauri, include the real platform origin (commonly `tauri://localhost` or `http://tauri.localhost`) after observing it on the target platform. Do not use `*`.

Only `VITE_` configuration is public. Never prefix provider secrets with VITE_. Session tokens entered in Settings remain in memory and are not saved to localStorage, IndexedDB, or exports. The gateway defaults to loopback. Public binding requires a 24-character minimum token; production deployments also need HTTPS, authentication, rate limits per user, cost controls and a reverse proxy. This scaffold is a personal/local gateway, not a hardened multi-tenant service.

The AI adapter uses the OpenAI-compatible Chat Completions JSON-object protocol at `<AI_BASE_URL>/chat/completions`. Providers without `response_format: { type: "json_object" }` require a small adapter adjustment; compatibility is not assumed. No model name is guessed. The strict semantic output schema is in `src/ai/schemas.ts`. Only semantic candidates are returned; Core applies permission checks. The server replaces any client-supplied core contract with its own. Source excerpts are untrusted data, never executable instructions.

## Replaceable evidence endpoint

`SEARCH_BASE_URL` is an operator-controlled, **Diffusion-compatible normalized service**, not a generic search website and not the AI Chat Completions endpoint. Set `SEARCH_API_KEY` if it requires bearer authentication. Browser settings choose the gateway, not arbitrary secret-bearing upstream endpoints.

The gateway POSTs JSON to these fixed paths under SEARCH_BASE_URL:

- `/search`: `{ "query": "...", "limit": 5 }` -> `{ "candidates": [...] }`
- `/fetch`: `{ "url": "https://..." }` -> `{ "url": "...", "title": "...", "text": "...", "inspected": "exact scope actually read" }`
- `/extract`: `{ "url": "https://...", "query": "optional" }` -> `{ "chunks": [{ "text": "...", "inspected": "...", "locator": "optional, only when known" }] }`
- `/metadata`: `{ "url": "https://..." }` -> `{ "url": "...", "title": "...", "mime": "optional" }`

Each search candidate has `id`, `title`, HTTP(S) `url`, `excerpt`, `outcome`, and `inspected`; `locator` is optional. Outcomes: `support`, `challenge`, `partial`, `prior-art`, `inconclusive`, `conflicting`. Do not label a claim objectively verified. Snippets are not full-page inspection. The provider must report inspection scope honestly and enforce public-URL/SSRF protection, resource budgets, and its own content policies when fetching resources.

No bundled Brave/Tavily/Exa/OpenAI-web-search adapter is implemented. Adapt your chosen search service to this documented interface. Web requests occur only from explicit Search or an explicitly web-authorized Diffuse run; normal AI requests have no web tools. Returned candidates remain transient until individually brought into the Field.

## Runtime verification

All external-service integrations are implementation-only in the delivery environment: npm and external provider credentials are unavailable. JSON contracts and dependency-free guards have offline tests; Hono/Zod integration tests require `npm install` first. Neither Demo output nor test fixtures are live evidence.
