# Verification entry point

Use [`TESTING.md`](TESTING.md) for current commands and claim boundaries, [`PERFORMANCE.md`](PERFORMANCE.md) for measured costs, [`MIGRATIONS.md`](MIGRATIONS.md) for data preservation, and [`../STATUS.md`](../STATUS.md) for the latest verified results and open limitations.

## Portable evidence vs local evidence

Only tracked files establish the state of the repository for anyone who clones it. `verification/`, `playwright-report/` and `test-results/` are generated locally and intentionally ignored by Git, so a fresh clone does not contain them.

| Portable — tracked; cite these | Local — generated; PR support only |
|---|---|
| `tests/unit/`, `tests/offline/`, `tests/e2e/`, `tests/primitives/`, and the commands in [`TESTING.md`](TESTING.md) | `verification/` pass directories and captured screenshots/videos |
| [`../STATUS.md`](../STATUS.md) — the latest verified results and open limitations | `playwright-report/`, `test-results/` |
| [`ACCEPTANCE_MAP.md`](ACCEPTANCE_MAP.md) — requirement → implementation → evidence → remaining acceptance | ad-hoc proof files and benchmark output |
| [`TESTING.md`](TESTING.md), this file, and the CI configuration with the GitHub Actions results it produces when a run is explicitly referenced | |

A tracked claim must be reproducible from tracked material. Local evidence may support a pull request, and historical verification records remain historical; neither establishes the state of current `main` on its own.

A complete claim must name the layer actually exercised:

- TypeScript/application build;
- offline and unit contracts;
- mounted Chromium E2E;
- native Tauri/Cargo behavior;
- live provider or discovery integration.

Passing one layer does not imply the others. In particular, fixture screenshots are not mounted-application interaction evidence, and offline provider envelopes are not a live-provider smoke test.
