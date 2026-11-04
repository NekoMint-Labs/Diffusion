# Field integration from main

Base: `237e5481fdfaacc4d3ffd0ef958f8f882ee59bde`.
Source candidate inspected: `e5f203ddeb64973c067bfbf054de6f34926740b4` (#88).
This branch selects Field changes; it does not merge that branch's ancestry.

| Source | Selected behavior and owning files |
| --- | --- |
| #80 `5ab6b20` | Full-answer disclosure (`answerPreview`, `AnswerText`, Thread/Suggestions); Preview app and native credential identity |
| #81 `79a4844` | Field answer/context guidance, strict semantic validation before count limiting, optional reading and empty-result explanation |
| #82 `827fb65` | Content/interaction proposal used as design evidence; no historical proposal copied into runtime |
| #83 `8f9d621` | Optional proposition model/events/reducer/import validation, explicit AI origin, fixed reader and gesture handoff |
| #88 `5e4f979` | `bringPlacement.ts`, optional Core placement callback and actual ForkSurface wiring |
| #95 `08018f1` | Fixed profile packaging, exact-source checks, installer provenance and isolated Preview configs |

The integration changes the selected sources further: one provider response
entry, one fixed Field reader, no transient summary cache, independent manual
reading purpose, and Field defaults for generic/Field Preview. Plain-answer
instructions and their URL switch are not imported. Existing selection-driven
thinking, proximity Probe and Core authority remain in place.

Excluded: `src/next/**`, Next route/startup scripts, separate Next sessions and
storage, `experiments/**`, historical model outputs from #84/#89–#93, and Free
Links #94 implementation. Those remain available on their original branches;
no experimental PR is closed or treated as merged by this integration.

Deterministic acceptance covers one-call generation and gateway compatibility,
full-original preservation, optional metadata fallback, legacy projects,
Keep/edit/Undo/Redo, author-vs-AI Fork/Bring, JSON/Dexie recovery, cancelled or
stale results, reader focus/gesture behavior and packaging contracts. Browser
checks use injected models and disposable profiles. Installed Windows,
physical-input/DPI, real native credential operations and live model quality
require separate evidence tied to the exact package; packaging alone does not
complete them. See [Windows instructions](WINDOWS_PREVIEW.md).
