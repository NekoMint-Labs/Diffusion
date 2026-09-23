# Diffusion Discovery Engine

Diffusion's own discovery implementation. It searches the sources a person enabled, reads a found
page into bounded source content, normalizes and fuses what came back, and reports honestly when
some of that did not work.

It is an implementation detail of Diffusion. The product shows sources (Exa, Tavily, Brave); it
never shows this. Provenance is recorded in [`PROVENANCE.md`](PROVENANCE.md): this code originated
from selected components of `onedotmint/smartsearch` v1.0.3 and is now independently maintained
here. Nothing in Diffusion follows SmartSearch releases.

## What it is allowed to do

The engine is deliberately small and deliberately powerless:

* **It reads configuration from its own process environment only.** There is no config file, no
  config directory and no user-level persistence, so it can neither write a credential to disk nor
  pick up a configuration the person never chose in Diffusion. `Diffusion Settings` is the
  authority for configuration.
* **It reads only the variables the native launcher allowlists** — the `EXA_`, `TAVILY_`, `BRAVE_`
  and `JINA_` families. Credentials arrive in the environment for one operation and never in an
  argument list, which is readable by other processes on the same machine.
* **A search never produces evidence.** A candidate carries a title, a URL and a snippet. Only
  `read` produces source content, and that content is bounded.
* **It writes one JSON envelope to stdout and nothing else.** Diagnostics go nowhere: the launcher
  discards stderr rather than let a provider's message or a key reach a log.

## Operations

One process, one operation, one line of JSON on stdout. Exit code 0 when the status is not `failed`,
otherwise 2 (`INVALID_ARGUMENT`), 3 (`CONFIGURATION_ERROR`), 4 (`PROVIDER_ERROR`) or 5
(`INTERNAL_ERROR`).

```
diffusion-discovery search --mode fast|balanced|research --format json -- <query>
diffusion-discovery read --max-chars N --format json -- <url>
```

The envelope is `{version: 1, operation, status, data, attempts, warnings, error}`, where `status` is
`complete`, `degraded` (useful results, but a source did not answer) or `failed`. `attempts[*]`
carries a provider id, a role, a status and a stable classification — never an upstream message.
A mode is a fixed policy, not a knob: `fast` is 3 results, `balanced` 5, `research` 10.

| Variable | Used by |
|---|---|
| `EXA_API_KEY`, `EXA_ENABLED`, `EXA_BASE_URL`, `EXA_TIMEOUT_SECONDS` | search source |
| `TAVILY_API_KEY`, `TAVILY_ENABLED`, `TAVILY_API_URL`, `TAVILY_TIMEOUT_SECONDS` | search source |
| `BRAVE_API_KEY`, `BRAVE_ENABLED`, `BRAVE_API_URL`, `BRAVE_TIMEOUT_SECONDS` | search source |
| `JINA_API_KEY`, `JINA_READER_API_URL`, `JINA_RESPOND_WITH`, `JINA_TIMEOUT_SECONDS` | reader |

A source with no credential, or with its enable flag off, is simply absent: a search never fails
because a source the person did not turn on is unconfigured, and one working source is enough.

## Build and test

A build machine needs Python 3.10+, because the engine is frozen with PyInstaller. **An end user
needs no Python and no separate install** — the executable is a build artifact that ships inside the
application.

```
pnpm run build:discovery     # freeze internal/discovery-engine into src-tauri/resources/discovery/
pnpm run check:discovery     # is that artifact present and current? (cheap, no Python)
pnpm run test:discovery      # this package's tests (offline, no network, no credentials)
pnpm run tauri dev           # runs check:discovery first, and says what to run if it fails
```

`check:discovery` compares a hash of the engine source with the hash recorded beside the artifact, so
`tauri dev` fails with an explicit instruction instead of silently running without external
discovery. The artifact and the build virtualenv are both gitignored: a committed binary would age
silently and could not be verified against its source.

## Layout

```
diffusion_discovery/
  cli.py              the JSON envelope, the two operations, exit codes
  config.py           environment-only settings; no filesystem access at all
  security.py         redaction of secrets and URL credentials in machine output
  core/               models, per-source normalizers, canonicalization, dedup, fusion
  evidence/           bounded reading of one page, ordered reader fallback
  providers/          the four transports, their registry, and the shared error protocol
tests/                the behaviour contract, with fake sources and readers
```
