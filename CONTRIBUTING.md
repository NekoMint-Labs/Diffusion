# Contributing to Diffusion

Diffusion welcomes focused changes that preserve its product and authority boundaries. Keep pull
requests small enough to understand and verify, and do not add process or abstractions without a
demonstrated need.

The canonical collaboration repository is <https://github.com/NekoMint-Labs/Diffusion>.

## Getting started

Requirements come from [`package.json`](package.json):

- Node.js 22.12 or newer;
- pnpm 12.4.2.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

Manual Field work needs no provider or API key. `/demo?locale=en` opens a separate deterministic
example project. The optional gateway, desktop shell and discovery engine are described in the
[README](README.md).

## Before changing something

Read in proportion to the change. A small isolated UI or copy fix needs the file you are editing and
[`docs/CONVENTIONS.md`](docs/CONVENTIONS.md). A change that touches a shared seam — canonical state,
camera or geometry, the command registry, persistence or migration, providers, evidence,
Appearance, or a native/platform boundary — also needs:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for ownership and shared boundaries;
- the relevant current contract under [`docs/specs/`](docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md);
- [`docs/TESTING.md`](docs/TESTING.md) to know which verification layer can prove the change.

[`docs/README.md`](docs/README.md) is the documentation index. Everything under
[`docs/history/`](docs/history/README.md) is provenance: it is useful for understanding why the
product is the way it is, and it never overrides a current contract. Do not rewrite historical
reports to match current `main`.

## Contribution workflow

```text
problem or issue -> branch -> implementation -> verification -> pull request -> review -> merge
```

An issue is not required for a trivial typo or documentation fix — open the pull request. For a
behavioural change, describe the workflow or defect first, then the implementation.

## Branch names

Lightweight branch names are sufficient:

- `feat/...`
- `fix/...`
- `docs/...`
- `test/...`
- `refactor/...`
- `chore/...`

## Commit messages

Conventional-style subjects are recommended for readable history:

- `feat:` a new capability
- `fix:` a defect
- `docs:` documentation only
- `test:` tests only
- `refactor:` no behaviour change
- `chore:` tooling or maintenance

No commit-lint dependency is used, and none is required.

## Scope discipline

- One coherent change per pull request.
- No unrelated drive-by refactors or formatting.
- Preserve unrelated local changes; do not revert someone else's work to make yours smaller.
- Do not clean up another subsystem while fixing something else.
- An architectural change needs an explicit reason in the pull request, not just a working diff.

## Dependency policy

A new runtime dependency has a cost — bundle size, supply chain, upgrade duty and another
vocabulary to learn. Prefer, roughly in order:

1. a platform or language capability already available (standard library, CSS, browser or Tauri API);
2. a dependency the project already has;
3. a small local implementation, when the behaviour is simple and clearly owned by one module;
4. a mature external dependency, when it removes genuinely difficult behaviour (accessibility,
   collision/focus contracts, camera math, protocol wire formats).

Do not treat "zero dependencies" as the goal; do not add a library for what a few lines can do.

A justification states: the problem solved; why the existing capabilities are insufficient; the
runtime and bundle implications; the maintenance and upgrade implications; and, when relevant, the
license and provenance. This matches the contract in the
[v0.2 dependency policy §36](docs/specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md) — in
particular, a
new dependency must not impose another product ontology, and must not sit on pointer-frequency hot
paths unless it is designed for that. New copied or vendored source also needs its license and
provenance recorded in [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

## Testing expectations

Read [`docs/TESTING.md`](docs/TESTING.md) for the command meanings and which layer owns which test.
In short:

- run the checks relevant to your change, then the repository gates before a substantial pull request;
- a bug fix should include a regression test when the behaviour is feasible to test;
- do not add tests that only raise a coverage number;
- do not weaken, skip, or retry away a real failure to manufacture a green result.

## Visual changes

For a meaningful visual change — Theme/Profile, Field Style, Accent, Image Atmosphere, Field
Presence, Ambient Motion, layout or interaction feedback — attach a fixed-size screenshot or a short
video to the pull request, and:

- check light and dark where the change affects both;
- check Reduced Motion and Motion 0 where motion is affected;
- check interaction and focus where behaviour changed, not just appearance.

Generated evidence under `verification/`, `playwright-report/` and `test-results/` is intentionally
ignored; do not commit it unless the owner asks for a tracked evidence update. Label evidence by
what it actually exercised: a CSS fixture or component screenshot is not mounted-application
interaction evidence.

## Shared architectural boundaries

These are the invariants most likely to be crossed by accident. The authoritative list, with
reasoning, is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — do not restate it in a pull
request.

- **AI creates possibilities; the user creates commitment.** A provider never moves, edits or
  deletes a Thought, confirms a relation, or forms a Crystal.
- **Presentation does not directly mutate canonical state.** UI, AI and renderers go through the
  command/event path and the Core permission gate.
- **Pointer-frequency work stays off React state.** Camera, drag, lasso, culling and geometry live
  in the imperative hot path; there is one camera and one world transform.
- **One command registry.** Menus, the palette, the keyboard router and help are projections of it,
  never independent implementations.
- **Appearance is device-local presentation state.** It never enters canonical `ProjectState`,
  project records, collision or geometry caches.
- **Search candidates are not read evidence.** Reading and extraction are explicit and keep their
  provenance.
- **Desktop is the same frontend behind narrow adapters**, not a second UI. Never widen a native
  filesystem, opener, credential, origin or provider-host permission to hide an error.

## AI-assisted contributions

AI assistance is allowed and common. The contributor stays responsible for the result:

- understand the change, and be able to explain it without the tool;
- review generated code as if a colleague wrote it;
- verify behaviour yourself — never report a test result you did not run or fabricate evidence;
- do not copy third-party code with an incompatible license or unclear provenance;
- do not paste secrets, credentials, private prompts or private source content;
- explain architectural changes in your own terms.

Disclosing each AI interaction is not required.

## Definition of Done

A contribution is complete when:

- the requested behaviour is implemented and nothing unrelated changed;
- relevant tests were added or updated where the behaviour is testable;
- the required checks pass, and any skipped layer is named honestly;
- the owning document or spec is updated when the actual contract changed;
- migration or data-compatibility impact is handled where relevant;
- visual or native evidence is attached where the change is visual or platform-specific;
- known limitations and follow-up work are stated plainly.

A documentation-only change needs `git diff --check` and correct links, not the full suite.

## Review expectations

Review checks, in this order:

1. **Product intent** — does this belong in Diffusion, and does it cross a stated boundary?
2. **Ownership** — is the change in the module that owns the behaviour?
3. **Correctness** — does it do what it claims, including the failure and empty paths?
4. **Regression risk** — what could this break, and what is the evidence that it did not?
5. **Tests and evidence** — do they exercise the real path, and are the claims accurate?
6. **Maintainability** — is this the smallest correct change, or an abstraction with one caller?
7. **Scope discipline** — is the pull request one coherent change?

There is no fixed approval count. Reviewers should block on a boundary violation or a false
verification claim, and should not block on personal style preferences that this repository does not
enforce.

## Secrets and private data

Never commit:

- `.env` or `.env.*` files other than the tracked `.env.example`;
- model-provider or discovery API keys;
- gateway tokens;
- OS credential exports;
- private prompts, source documents, fetched bodies, or logs containing them.

Never put a secret in a `VITE_` variable. Follow
[`docs/PROVIDER_CONTRACT.md`](docs/PROVIDER_CONTRACT.md) and the existing browser/native credential
boundaries.

## License

Diffusion-owned source is licensed under the [Apache License 2.0](LICENSE). A contribution to
Diffusion-owned source is submitted for inclusion under that license.

- Third-party, copied, adapted and vendor-derived material keeps its own terms. Retain its notices
  and license texts; the vendored Field background renderers (`src/ui/fieldBackgrounds/vendor/`) and
  the discovery engine (`internal/discovery-engine/`) are the two places in the tree where that
  applies directly.
- Do not copy code with an incompatible or unclear license into Diffusion, and do not remove or
  rewrite an existing third-party notice. Read [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) before
  adding copied or vendored source.
- The Apache-2.0 root license applies to Diffusion's own source only; it does not relicense
  third-party material.

No contributor licence agreement, copyright assignment, DCO or sign-off requirement is used. This
section states the licence boundary; it is not legal advice.
