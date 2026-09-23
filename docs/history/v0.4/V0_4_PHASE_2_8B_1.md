> **Superseded.** This phase record was true when it was written. The ownership transfer since then replaced the external frozen dependency with Diffusion-owned source under `internal/discovery-engine/` (authoritative provenance: `internal/discovery-engine/PROVENANCE.md`; frozen with `npm run build:discovery`). The body below records the state as of that phase.

# Phase 2.8B-1 — Thinking and discovery capability layer

**Workstream 1 of the product-loop completion.** The product question this phase answers is narrow
and concrete: *can a person with an AI account, and optionally some search keys, configure
Diffusion, verify it, think, explore, and recover from failure — without knowing anything about
Diffusion's internal gateway architecture?*

Before this phase the answer was no. After it, the answer is yes on Desktop, with named limits
recorded at the end.

This phase does **not** start PixiJS, reopen Phase 2.7 visual work, redesign the Field, or implement
general export/migration recovery.

---

## 0. Audit record

**The Phase 2.8A audit is not present in this repository.** The brief asked for the executive summary
mismatch (`2 × P0` / `8 × P1` versus an enumerated P1-1…P1-9) to be corrected. Searched:
`git log --all`, all tracked Markdown, `docs/`, `docs/history/`, `verification/`, and the working
tree. No file contains "2.8A", "P0-1", or "P1-9". The only two files mentioning "2.8" are
`docs/REFERENCE_AUDIT.md` and `docs/PERFORMANCE.md`, in unrelated contexts.

So there was nothing to correct, and no correction was invented. The findings themselves were
reproduced from the code instead, which is stronger evidence than the summary was:

| Finding | Reproduced in code | Evidence |
|---|---|---|
| P0-1 no real path from an account/key to a request | Yes | `useThinkingService.ts` chose between `demo`, `gateway` and off. A direct provider did not exist. |
| P0-2 intent cleared before success | Yes | `useThinkingIntents.ts:114` ran `setWords('')` before `runtime.run(...)` at `:141`, which is `void` (fire-and-forget). Nothing restored it. |
| P1-1 "Connected" proved reachability | Yes | `SettingsSurface.tsx:79` reported `Connected` from `GET /api/capabilities` alone. |
| P1-5 search prerequisites hidden | Yes | No search configuration existed in Settings at all; `canWeb={!!evidence}` was true only in gateway mode, so the first search produced the surprise. |
| P1-6 selected model could silently not run | Yes | The gateway reported only `providerLabel: config.aiModel`; requested and effective model were recorded nowhere. |

---

## A. Pre-implementation audit — what was wrong with the old AI model

Three structural problems, not three bugs.

**1. The gateway was the only way to have AI, and it was mandatory.** The client could reach
`demo` or a Diffusion Gateway. There was no code path from a provider account and an API key to a
model request. On Desktop this meant a person had to run a separate Hono server, configure
environment variables on it, and point the application at its address — for a feature the application
already shipped. That is a dependency chain where a capability composition belongs.

A gateway is genuinely the right answer for a browser deployment, a shared team, centralized secrets
and policy boundaries. It was never the right answer as the *only* path on a desktop where the user's
own key is the natural credential.

**2. Capability probing was welded to configuration and proved the wrong thing.** `useThinkingCapabilities`
had `gateway` and `token` as `useCallback` dependencies, and each keystroke in either Settings field
produced a fresh `GatewayAIProvider`, defeating its own per-instance memo. So typing a URL produced a
network probe per character. Meanwhile the answer that probe produced — "a metadata route replied" —
was rendered as `Connected`, which is a claim about model usability that a metadata route cannot
support.

**3. Failures were engineering errors and the retry path was destroyed.** `HTTPResponseError`
formatted as `Upstream responded 401.` A failure arrived as `notice(reason)` with `tone: 'info'`, and
all notices auto-dismissed after 6500 ms. So the *only* signal was a quiet line that erased itself,
while the sentence the person wrote had already been deleted synchronously, before the request was
even dispatched. Fixing the key meant retyping the question. The audit called this P0 and it was
correct: the failure path, not the success path, is what a thinking tool lives on.

---

## B. Provider architecture

The provider layer is now a registry of adapters behind one product-facing contract, with transport,
credential storage and Diffusion Core deliberately separate from provider semantics.

```
src/ai/providers.ts   the inspected provider table (capabilities, endpoints, auth, wire names)
src/ai/wire.ts        four wire protocols, assembled and read by name — never flattened
src/ai/transport.ts   the send seam: HttpSend.send(request, signal)
src/ai/direct.ts      DirectAIProvider: one adapter, table-driven
src/ai/registry.ts    selection -> provider, plus the two deliberate probes
src/ai/errors.ts      the bounded failure taxonomy
src/ai/prompt.ts      the semantic contract, shared by every path
src/credentials/      where a secret lives (native keychain | session memory)
```

`AIProviderAdapter` conceptually: `id`, `label`, `capabilities()`, `listModels?()`, `testConnection()`,
`respond()`. It produces Diffusion's existing bounded semantic result and never touches canonical
Field state.

Provider APIs were verified against current first-party documentation before each adapter was
written. Sources reviewed (recorded in `REFERENCE_AUDIT.md`): OpenAI Chat Completions / Responses /
Models / Structured Outputs / error codes, Anthropic Messages / Models / extended thinking / errors,
Gemini generateContent / models / structured output / errors, DeepSeek list-models and chat
completion.

| Provider | Configuration | Credential | Model discovery | Manual model | Native protocol | Test connection | Desktop | Web |
|---|---|---|---|---|---|---|---|---|
| **OpenAI** | API key | OS keychain | `GET /models` | Yes, always | `responses` (`text.format`, `max_output_tokens`) | real bounded request | Yes | via Gateway |
| **Anthropic** | API key | OS keychain | `GET /v1/models` | Yes, always | `anthropic-messages` (`x-api-key`, `anthropic-version`, mandatory `max_tokens`) | real bounded request | Yes | via Gateway |
| **Gemini** | API key | OS keychain | `GET /v1beta/models` | Yes, always | `gemini-generate-content` (`systemInstruction`/`contents`/`generationConfig`) | real bounded request | Yes | via Gateway |
| **DeepSeek** | API key | OS keychain | `GET /models` | Yes, always | OpenAI-compatible `chat-completions` | real bounded request | Yes | via Gateway |
| **OpenAI compatible** | Base URL (+ optional protocol) | OS keychain, optional | `GET /models` | Yes, always | `chat-completions` or `responses`, user-chosen | real bounded request | Yes | via Gateway |
| **Diffusion Gateway** | Address + session token | memory only, never persisted | its own `/api/capabilities` | Only where the operator allows override | unchanged (chat-completions / responses) | reports what it reports | Yes (advanced) | Yes (normal) |
| **Local / Ollama** | not implemented as its own adapter | — | — | — | — | — | — | — |
| **Demo** | none | none | none | none | authored fixtures | n/a — explicitly not readiness | Yes | Yes |
| **Off** | none | none | none | none | none | n/a | Yes | Yes |

Local/Ollama was deliberately **not** given a first-class adapter. It falls out of the
OpenAI-compatible provider with a loopback base URL, and adding a logo would have meant a duplicate
adapter with no distinct product behaviour.

### Effective model honesty (P1-6)

`AIResponse.model` is now `{ requested, effective }`. `effective` is `null` when the provider does
not report one — an unknown identity is reported as unknown rather than filled in with the requested
name, because that substitution would be a fabricated claim. When a provider reports a *different*
model than the one asked for, the provenance note says so: `Anthropic - claude-x (provider ran
claude-y)`. The same string reaches Ghost provenance, Thread messages and `SourceRecord.lastSubmitted`.

### One capability table, no network

`capabilities()` on a direct provider is derived from the inspected table and makes **no** request.
Capability probing is no longer tied to configuration changes, which fixes the per-keystroke probe:
editing makes the state "configuration changed", and only `Test connection` or `Refresh models`
talks to the provider.

---

## C. SmartSearch integration

**It is built in.** Verified by construction and by execution, not by inspection.

- **Exact version:** SmartSearch `1.0.3` (`pyproject.toml` / `package.json`), pinned in
  `scripts/build-smartsearch-sidecar.mjs` rather than floating.
- **How it is bundled:** `scripts/build-smartsearch-sidecar.mjs` installs the pinned package into a
  build-only venv and freezes it with PyInstaller into **one self-contained executable**,
  `src-tauri/resources/smartsearch/smart-search` (**11.6 MiB**), which `tauri.conf.json` copies into
  the installer as a resource. `npm run build:smartsearch`. It is gitignored, like `dist/`: a
  binary that ages silently and cannot be verified against its source does not belong in the tree.
- **Python on the user's machine:** **not required.** Proven by running the packaged binary with a
  `PATH` that contains no Python at all (below).
- **Separate installation:** **not required.** There is no `SMARTSEARCH_BIN` for a user to set; the
  path is resolved by the native layer from the application's own resources.
- **Startup / runtime model:** one process per operation. No daemon, no idle cost, no lifecycle to
  supervise. The price — process startup per search — is measured in section I.
- **Upgrade strategy:** bump the pinned version, rebuild, review the envelope contract test. A
  discovery engine that changes shape under a released application is a support problem, not a
  feature.

### The clean boundary

Nothing from SmartSearch is vendored. Diffusion owns exactly one copy of the CLI's *output* contract
(`src/discovery/envelope.ts`), because that envelope is the integration seam and both the bundled
engine and the gateway must read it identically. Adapters, retry policy, normalization,
deduplication, pooling and reranking are the engine's and are not duplicated. When the engine grows a
library API, only `DiscoveryRuntime` changes: `src/discovery/runtime.ts` is the single transport seam
and nothing above it knows whether an operation ran a process, called a core function or posted to a
URL. CLI transport is an implementation detail; Settings, Explore semantics, evidence records and
source configuration are unaffected by it.

### Credentials reach the engine without ever being an argument

`src/discovery/config.ts` translates stored selection into the engine's environment:

- **A disabled source is written `false`, not omitted.** SmartSearch treats `*_ENABLED` as defaulting
  to *true* (verified in `providers/registry.py` and `config.py`). Omitting a variable would let a key
  the user happened to have in their shell — or a pre-existing SmartSearch config file — start
  answering for a source the UI says is off. The control and the behaviour are the same claim.
- **Credentials travel in the child environment, never in `argv`.** An argument list is readable by
  other processes on the machine; an environment handed to one child is not.
- **Stdin is `/dev/null` and stderr is never read.** Engine diagnostics may mention a URL or a key and
  are nobody's business.
- Diffusion never invokes the engine's interactive `setup`; Settings is Diffusion's experience.

---

## D. Search sources

| Source | Configured | Enabled by default | Credential storage | Verified |
|---|---|---|---|---|
| **Exa** | Search & Evidence → sources | No | OS keychain (`search.exa`) | CONTRACT ONLY (stub provider; no live key) |
| **Tavily** | Search & Evidence → sources | No | OS keychain (`search.tavily`) | CONTRACT ONLY (stub provider; no live key) |
| **Brave** | Search & Evidence → sources | No | OS keychain (`search.brave`) | CONTRACT ONLY (stub provider; no live key) |
| **Reader / fetch** | automatic, no control | n/a | not configured by Diffusion | CONTRACT ONLY |

Brave was driven end-to-end through the real bundled engine against a local stub, including its
`X-Subscription-Token` header and `{web:{results:[…]}}` response shape. That proves Diffusion's
integration and the engine's packaging; it does **not** prove Brave's live service, and is not
reported as if it did.

The reader is deliberately not a control. Diffusion configures neither the reader nor its key; it
consumes whatever reading capability the engine has, which for the bundled engine is anonymous and
present by default. A reader-specific switch is only worth exposing if a person genuinely has to
decide something.

---

## E. Capability degradation

Measured, with the real bundled engine, on the real code path
(`searchArguments` + `engineEnvironment` → process → `searchOutcome`):

| State | Observed behaviour |
|---|---|
| **No AI, no search** | The manual Field works. Nothing is sent anywhere. |
| **AI only** | Ask / Continue / model-based Explore work. No web-search claim is made. |
| **AI + one search source** | External discovery works. No minimum provider count: SmartSearch's multi-source design does not become "you need several services". |
| **AI + multiple sources** | The engine aggregates, falls back and reranks; Diffusion receives the normalized candidate contract and adds no second aggregator. |
| **Search, no optional reader key** | The bundled engine reads anonymously; whatever reading genuinely exists is used. |
| **Zero enabled sources** | `status: failed`, `error: PROVIDER_ERROR` → `ThinkingError('discovery-unavailable')` → "External search is unavailable. You can still explore the Field with AI." **Not a crash, not a silent empty result.** |
| **Source enabled with no key** | Same honest unavailable. The engine is never launched with a key the user does not have. |
| **One source fails** | Honest unavailable, not a fabricated empty success. |
| **One fails, one succeeds** | **`status: degraded`, 1 candidate preserved, `providers: ["brave"]`.** Diffusion surfaces "completed with limited sources" rather than failing the whole operation. |
| **Reader failure** | The candidate stays discovery-only. A snippet is never promoted to evidence and the model is never asked to invent a passage from one. |

Verified end-to-end output for the last case:

```
envelope status    : degraded
degraded           : true
providers reached  : ["brave"]
candidates         : 1
candidate.hasOutcome : false
candidate.hasPassages: false
inspected          : External discovery snippet only; source content has not been read.
```

---

## F. P0-2 recovery

**The rule now:** the composed intent is retained until the request reaches a terminal state.

`useThinkingIntents.submit()` no longer clears before dispatch. Two branches release immediately and
both are honest commits rather than losses — a message sent into a Thread belongs to that Thread's
history, and the first Thought of an empty Field has become Field content. Everything else waits for
`await runtime.run(...)` and releases only on `status === 'completed'`. A failure, a cancellation and
a timeout all keep the words, and the classified failure notice is rendered as `tone: 'error'` with
the one control that resolves it.

The recovery sequence, end to end:

1. A person types a paragraph (IME-safe: `isComposing`/`keyCode === 229` still guards commit).
2. Submit. `runtime.run` dispatches. The words remain in the composer.
3. The provider returns 401 → `failureForStatus(401)` → `authentication-failed` →
   `ThinkingError` → `hooks.failure` → "Authentication failed. Check the API key for Anthropic."
   with **[Open AI settings]**, `tone: 'error'`, and **the notice no longer auto-dismisses** while it
   carries an action.
4. The action opens Settings directly on the AI section. The draft survives: `words` is
   workspace-level state and opening Settings never touched it (already pinned by
   `hardening.spec.ts`).
5. Fix the key, return, press Enter — or press **[Retry]**, which calls the same `submit()` and
   re-sends exactly the words that are still there.
6. Only a completed answer clears the composer.

Covered by `tests/unit/intentRecovery.test.ts` (the run outcome is what decides; a refusal reports
`failed`, an abort reports `cancelled`, only a real answer reports `completed`) and by the composer
state assertions that words plus `busy` is `submitting` and returns to `writing`, never to `idle`,
when the words are unchanged.

---

## G. Model honesty

- **Requested** — `settings.model`, sent only where the provider takes one.
- **Effective** — read from each protocol's own field (`root.model` for OpenAI/Anthropic/chat,
  `root.modelVersion` for Gemini). `null` when absent. Never filled in with the requested value.
- **Substitution** — disclosed in the provenance string, never silently absorbed.
- **Discovery failure never blocks model entry.** `capabilities().allowModelOverride` is always
  `true` for a direct provider, manual entry is always reachable, and a failed or empty model list is
  a normal outcome (asserted: `readModelList` returns `[]` for junk, never throws). The audit's
  `"could not discover models" + "manual model disabled" = dead end` cannot occur.

---

## H. Security

**Secret storage.** Desktop keys go to the operating system's credential store
(`keyring v3.6.3`) under the fixed service `app.diffusion.explorer` and a closed identity vocabulary
(`ai.<provider>`, `search.<source>`). The webview is told whether a key exists, never what it is, and
reads one value per request. `CredentialStore` has no enumeration API: an OS credential store is not
portably listable and does not need to be.

`keyring` is declared with `default-features = false` and an explicit backend list. The default Linux
backend links `libdbus` through pkg-config; `async-secret-service` + `crypto-rust` speaks the same
protocol in pure Rust, so the only build requirement stays the one Tauri already has. Verified by
compiling the crate standalone.

**Never persisted:** the gateway session token (`saveSettings` strips it, pinned by
`settings.test.ts`), any provider key, any search key. Not in IndexedDB, not in localStorage, not in
the settings record (which stores *presence*), not in exports, not in logs, not in diagnostics, not in
argv.

**Browser policy, explicit:** a web build reports `directProviders: false` and keeps any credential
session-only. It does not silently persist a third-party provider secret in browser storage, and it
leads with the Gateway. Browser-direct access is not claimed to be universally safe or deployable —
though it was measured to work for all four providers (below).

**Redaction.** `redact(text, secrets)` exists in `src/ai/errors.ts` and is exercised by the smoke
tooling; the failure taxonomy never carries an upstream body. `errorTypeFrom` reads only the
provider's own `error.type`/`status`/`code` token, truncated, from a body capped at 8 KiB.

**Measured, not assumed:** all four providers were checked for cross-origin viability from a desktop
webview origin. OpenAI, Gemini and DeepSeek answer the origin directly; **Anthropic refuses without
its documented `anthropic-dangerous-direct-browser-access` header and allows it with** — so that
header is sent, which is exactly the opt-in Anthropic provides for an application calling the API
with a credential the user holds on their own machine. Recorded in `REFERENCE_AUDIT.md`.

---

## I. Performance

| Measurement | Result | How |
|---|---|---|
| Bundled engine size | **11.6 MiB** (single file) | built artifact |
| App idle with discovery unused | **no process, no cost** | one process per operation |
| First engine start + search | **≈0.4 s** wall clock, including the stub provider round trip | measured end-to-end |
| Engine start with no sources | **≈0.2 s**, then an honest `failed` envelope | measured |
| One source search | 1 provider request | stub server request count |
| Multi-source with one failure | 1 preserved candidate, `degraded: true` | measured |
| Idle cost of a long-lived sidecar | **not applicable** — no sidecar was chosen | design |

The tradeoff is stated rather than hidden: per-operation spawn costs process startup on every search
and buys no daemon to supervise, no idle memory while a Field is being written in, and no lifecycle
to leak. A resident process is the right move only if startup is measured to dominate a search; the
number above says it does not. Noted in `src/discovery/runtime.ts` as a `ponytail:` ceiling with its
upgrade path.

Not measured: engine startup on Windows (no Windows machine available — see J), and cold-start from a
first-run installer.

---

## J. Verification

**Automated, and green:**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npx tsc -p tsconfig.core.json` | clean |
| `npm test` | **209 passed** (25 files): 64 new in `providers` / `discovery` / `intentRecovery` |
| `npm run build` | clean |
| `npm run test:e2e` | **115 passed, 8 skipped (pre-existing platform-gated), 0 failed** — including 7 new in `phase28b.spec.ts` |
| `npm run check:offline` | **PASS**, 141 offline tests, locale coverage clean, source-size within policy |

The offline `v023-identity` Settings structural test was updated, not weakened: it now asserts the
same properties (cluster grouping, one Select owner, `data-setting` rows, section list) at the files
that now own them, and additionally pins the sixth section and asserts the provider control and the
discovery controls are no longer in the same panel.

**Bundled engine, end-to-end, with no Python on `PATH`:**

```
argv               : ["search","--mode","balanced","--format","json","--","attention and place"]
exit code          : 0 (the v1 envelope, not the exit code, is the contract)
stub provider hits : 1 {"url":".../web/search?q=attention+and+place&count=5","auth":"<header, not argv>"}
envelope status    : complete
candidates         : 2   both stage: candidate, no outcome, no passages
```

Run with `env -i PATH=<a directory containing no Python>`. This is the acceptance rule from §53:
Diffusion starts, the bundled engine is discoverable, **the user did not install SmartSearch, and the
user did not install Python**, and a configured source performed a search.

**Real provider smoke tests:** `npm run smoke:providers` — opt-in, never in CI, no secret required,
prints CONTRACT VERIFIED and LIVE VERIFIED as different things. **Not run here: no provider keys exist
in this environment**, so every provider is currently CONTRACT VERIFIED only.

**Windows native:** **NOT VERIFIED.** No Windows machine and no cross-compilation toolchain was
available. The Windows-specific code paths are written and reasoned about (`CREATE_NO_WINDOW` to
avoid a console flash; `Scripts/python.exe` and `smart-search.exe` paths in the build script;
per-user `LOCALAPPDATA` config dir left to the engine) but they are unexecuted. The credential
store's Windows backend (`windows-native`) is compiled in and unexercised. **Do not read anything in
this document as Windows verification.**

**Also unverified:** the live behaviour of Exa, Tavily and Brave; the live behaviour of every AI
provider; Chinese IME inside the new provider/model/base-URL fields and the retry flow (the existing
IME guards are unchanged and still covered, but they were not exercised against these new inputs);
and the actual installer-produced bundle, since `webkit2gtk`/`glib` are absent on this machine so
Tauri cannot be compiled or packaged here at all.

**Rust is unverified in this environment.** `cargo check` on `src-tauri` fails on missing
`glib-2.0`/`webkit2gtk-4.1`, and installing them requires privileges this environment does not have.
The native modules are written against APIs that were verified by compiling the `keyring` crate
standalone, but `src-tauri` itself has never been compiled by this pass.

---

## Final verdicts

| Verdict | Answer |
|---|---|
| DIRECT AI PROVIDER LOOP COMPLETE | **YES** |
| AI FAILURE RECOVERY COMPLETE | **YES** |
| MODEL DISCOVERY HAS MANUAL FALLBACK | **YES** |
| EFFECTIVE MODEL IS HONEST | **YES** |
| SMARTSEARCH IS BUILT INTO DESKTOP | **YES** — bundled 11.6 MiB frozen executable, proven with no Python on PATH |
| SMARTSEARCH REQUIRES USER INSTALLATION | **NO** |
| ZERO SEARCH SOURCES DEGRADES GRACEFULLY | **YES** |
| ONE SEARCH SOURCE WORKS | **YES** — CONTRACT + engine end-to-end against a stub; no live key |
| MULTI-SOURCE DISCOVERY WORKS | **YES** — CONTRACT + engine end-to-end (degraded path measured) |
| SEARCH FAILURE PRESERVES AI-ONLY USE | **YES** |
| EVIDENCE TRUST BOUNDARY PRESERVED | **YES** |
| DESKTOP SECRETS USE SECURE STORAGE | **CONTRACT ONLY** — implemented against the OS keychain; never executed, because `src-tauri` cannot be compiled here |
| REAL PROVIDER VERIFIED | **NONE** — no keys in this environment; all four CONTRACT VERIFIED only |
| REAL SEARCH VERIFIED | **NONE** — no live keys; Brave proven against a local stub through the real bundled engine |
| WINDOWS NATIVE VERIFIED | **NO** |

Verdicts that are true only by fixture say so. Nothing above claims a live service it did not reach.

---

## Stop boundary

Stopped at Phase 2.8B-1. Not touched: general persistence close flushing, migration recovery,
export/import portability, Thread reopen, camera-return, selection action placement, Ghost/Recall
visual distinction, PixiJS, Phase 3 phenomena. Those belong to later workstreams.
