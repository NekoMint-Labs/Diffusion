# Diffusion documentation

The index for this repository's documentation. Start at the top and descend only as far as your
change requires.

**Authority rule:** a current document describes behaviour that exists in the product today, and only
a current document may be cited as a contract. Material under [`history/`](history/README.md) is
**provenance, never authority** — it explains how the product got here and must not override a
current document. When a current document and the code disagree, stop and resolve the conflict
explicitly rather than assuming one of them is right.

## START HERE

| Document | What it is |
|---|---|
| [README.md](../README.md) | What Diffusion is today, how to run it, and the repository map. |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to work here: workflow, scope, dependencies, tests, boundaries, Definition of Done. |
| [STATUS.md](../STATUS.md) | What current `main` actually supports, what was verified, what remains unverified. |

## CURRENT PRODUCT AND ENGINEERING

These files govern implementation. Read the ones your change touches.

| Document | What it defines |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Current implementation ownership and the shared architectural boundaries. The authority on *where code lives and what may not be crossed*. |
| [CONVENTIONS.md](CONVENTIONS.md) | Repository naming and implementation conventions: TypeScript/React, files, modules, CSS, product identifiers, tests. |
| [TESTING.md](TESTING.md) | The verification strategy: which layer owns which test, what each command proves, and where its claims stop. |
| [ACCEPTANCE_MAP.md](ACCEPTANCE_MAP.md) | Product contract → implementation → executed evidence → remaining acceptance. |
| [VERIFICATION.md](VERIFICATION.md) | Short entry point that routes to the verification, performance, migration and status documents. |
| [specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md](specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md) | Product semantics and authority boundaries: the Field, Thought/Ghost/Recall/Crystal, relations, Thread/Deep Dive, evidence, diffusing. |
| [specs/02_TECH_STACK_AND_IMPLEMENTATION.md](specs/02_TECH_STACK_AND_IMPLEMENTATION.md) | Architecture contract: module boundaries, state separation, storage/platform/provider seams, semantic tokens. |
| [specs/04_PERFORMANCE_CONTRACT.md](specs/04_PERFORMANCE_CONTRACT.md) | Performance contract: hot paths, camera ownership, DOM/SVG rules, culling and geometry-cache budgets. |
| [specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md](specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md) | The visual, interaction and backend-hardening contract: design direction, themes, typography, Focus, Ghost/Recall/Crystal, Region/Atlas, Thread/Deep Dive, provider and evidence hardening. |

Only the documents in this section are current contracts. Numbered files no longer listed here
were v0.1 phase material and now live under
[`history/v0.1/kickoff-pack/`](history/v0.1/kickoff-pack/README.md); do not treat a file as
authoritative just because it once lived under `specs/`.

## SPECIALIZED CONTRACTS AND REFERENCES

Current, but scoped to one subsystem or one record.

| Document | What it covers |
|---|---|
| [PROVIDER_CONTRACT.md](PROVIDER_CONTRACT.md) | The AI provider boundary, protocols, and credential rules. |
| [PROVIDER_DECISION.md](PROVIDER_DECISION.md) | Which providers were selected and why. |
| [EVIDENCE_GATEWAY.md](EVIDENCE_GATEWAY.md) | The one normalized discovery/evidence HTTP seam and its required routes. |
| [DESKTOP.md](DESKTOP.md) | The Tauri desktop shell and its native boundary. |
| [LANGUAGE_CONTRACT.md](LANGUAGE_CONTRACT.md) | The bilingual UI contract: what is localized and what is never translated. |
| [PERFORMANCE.md](PERFORMANCE.md) | Measured performance results and how to reproduce them (not the contract — that is spec 04). |
| [MIGRATIONS.md](MIGRATIONS.md) | Storage schema versions and the in-place migration policy. |
| [ATTRIBUTION.md](ATTRIBUTION.md) | The root license boundary (Apache-2.0 for Diffusion-owned source) and the retained terms for third-party, copied and vendor-derived source. |
| [REFERENCE_AUDIT.md](REFERENCE_AUDIT.md) | Which external projects were actually inspected, reused or rejected. |
| [third_party/](third_party/MATERIAL_GALLERY.md) | Field-background provenance, retained notices and license texts. |
| [language/](language/examples.zh.md) | Locale examples and regression fixtures. |

## HISTORY

| Location | What it is |
|---|---|
| [history/](history/README.md) | **Provenance only.** Supplied v0.1 documents, the v0.1 kickoff pack, checkpoint notes and proofs, supplied build prompts, and every version/phase journal (v0.1–v0.4). |

Historical documents are kept unedited and are useful for understanding decisions, constraints and
earlier verification. They never define current behaviour.
