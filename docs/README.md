# Diffusion documentation

## Integrated candidate checkpoint — October 14, 2026

C now includes main `ae74a2b73cd528f58cef4ef51f85f4651e3baded`: #52–#56 and #60/#61/#65 are merged by the operator, alongside #57/#64/#66. C's #63 source is unchanged from A/B-approved `f77f446` after resolving duplicate squash conflicts: application, native, server, discovery-engine and test trees match byte-for-byte in Git. C recovery, bounded-excerpt validation, approved #49 navigation and conservative source previews are retained. Only merge ancestry and documentation change.

`f77f446` passed 649 unit and 12 focused browser cases locally, and its own full CI/E2E passed; A/B both formally approved it. New integration-head gates/review are recorded separately in #63. A matching 0.3.15 Windows preview is being prepared; it is not installed/live acceptance. The old 0.3.14 remains `2c82f50`. #11/#12 remain open, including real AI/Verify, no-key search quality, physical network/input, persistence and long-session checks. Earlier checkpoint text below retains its original date and is historical.


The index for this repository's documentation. Start at the top and descend only as far as your
change requires.

**Authority rule:** a current document describes behaviour that exists in the product today, and only
a current document may be cited as a contract. Material under [`history/`](history/README.md) is
**provenance, never authority** — it explains how the product got here and must not override a
current document. When a current document and the code disagree, stop and resolve the conflict
explicitly rather than assuming one of them is right.

**Current checkpoint (October 13, 2026):** main is `bb8de89`, including merged #18, #57, #64, #66 and A's #52-#55; #10 is closed as its delivered milestone. #60/#61/#65 remain reviewed Field inputs. Draft #63 implements approved #49 in its candidate but still has a quoted-question source-preview blocker at `a63e1d1`; the old `2c82f50` installer excludes these changes. The [Round 2 Task Index #51](https://github.com/NekoMint-Labs/Diffusion/issues/51) owns the queue. #11/#12 remain open for Field and installed-product acceptance. Start with [STATUS.md](../STATUS.md) and [ACCEPTANCE_MAP.md](ACCEPTANCE_MAP.md); dated records preserve their actual versions and evidence limits.

The live Round 2 review checkpoint and the limited requester trial of candidate `d97eb4be`
are recorded in [STATUS.md](../STATUS.md); use that entry before relying on older history.

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
| [NATIVE_UX_ACCEPTANCE.md](NATIVE_UX_ACCEPTANCE.md) | PR #17 Windows feedback, repair mapping, reuse/license record and native acceptance limits. |
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
| [ISSUE10_CLOSEOUT.md](ISSUE10_CLOSEOUT.md) | Contributor-facing live trial steps and closeout criteria; a procedure, not completed acceptance evidence. |
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

## REVIEW RECORDS AND PROPOSALS

These records do not establish a new product contract or completed native acceptance.

| Document | Status |
|---|---|
| [ROUND2_REVIEW_20261013.md](ROUND2_REVIEW_20261013.md) | Independent A/documentation reviews, transport confirmation, B receipt finding and C integration inputs. |
| [ISSUE49_NAVIGATION_PROPOSAL.md](ISSUE49_NAVIGATION_PROPOSAL.md) | Shared compact-surface rules confirmed; detailed #49 reveal/return behavior proposed, not approved. |
| [DESKTOP_REVIEW_0312.md](DESKTOP_REVIEW_0312.md) | Draft #63 combined candidate: implemented repairs, exact integration inputs, checks and remaining acceptance work. |
| [WEB_ANSWER_PROPOSAL.md](WEB_ANSWER_PROPOSAL.md) | Proposed web-answer flow and search-source alternatives; not implemented or approved. |

## HISTORY

| Location | What it is |
|---|---|
| [history/](history/README.md) | **Provenance only.** Supplied v0.1 documents, the v0.1 kickoff pack, checkpoint notes and proofs, supplied build prompts, and every version/phase journal (v0.1–v0.4). |

Historical documents are kept unedited and are useful for understanding decisions, constraints and
earlier verification. They never define current behaviour.
