# Preflight / 2026-09-13

START_TIME=2026-09-13T09:47:15Z
SOURCE_IMPLEMENTATION_START_TIME=2026-09-13T09:49:50.679508+00:00
PACKAGE_CUTOFF=2026-09-13T13:07:15Z
HARD_STOP=2026-09-13T13:47:15Z
SOURCE_ROOT=/mnt/data/diffusion-explorer
DELIVERY_ROOT=/mnt/data/delivery

| Check | Actual outcome |
|---|---|
| Filesystem create/list/write/read/delete | PASS |
| Shell | bash via container; Linux x86_64, working directory / |
| ZIP rehearsal | PASS: create, list, CRC test, extract, byte-for-byte read-back; test artifacts removed |
| Delivery | Mounted /mnt/data artifact path accessible |
| Node | v22.16.0 |
| npm | 10.9.2 |
| Git | 2.47.3; local-only use allowed; no remote actions |
| Registry | BLOCKED: curl DNS failure; npm informative retry EAI_AGAIN |
| Offline dependency resolution | ENOTCACHED; npm cache empty |
| TypeScript | Global compiler available |
| Browser | Chromium 144; Python Playwright installed; application dependencies missing |
| Rust/cargo | Not installed |
| WebKit GTK 4.1 | Not found via pkg-config |
| AI/search credentials | Not required; no real credentials used |

Mode: **Offline Source Implementation Mode**. React/TypeScript architecture is retained. No fabricated lockfile. Dependency versions use conservative explicit major ranges, not registry-resolved versions. Build/E2E/native validation are distinct from archive and dependency-free Core validation. No further registry retries are planned after the established failure.

## Subsequent verification capability findings

Chromium navigation to a local HTTP test URL returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. No policy was changed. A network-free `page.set_content` harness using the real transpiled camera/geometry and original CSS ran successfully: 8 isolated checks passed. This does not execute the React app, Vite, IndexedDB, source workers or full E2E.

Actual spatial-index benchmark: 100/500/2000/5000 Thought projects, 1000 measured local queries each. Results are in `verification/spatial-benchmark.json`; no 60fps application claim is made.
