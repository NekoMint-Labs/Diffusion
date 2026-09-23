# v0.2.1 inherited authority and read order

User-provided authority for this run, preserved with the hardening prompt.

The uploaded current v0.2 source ZIP is not merely implementation code. It also contains the authoritative product specifications, previous rebuild instructions, verification records, and reference audits.

Before making any change, read the relevant project documents under `docs/` and `docs/specs/`.

At minimum, read:

1. `docs/specs/DIFFUSION_EXPLORER_V0_2_REDESIGN_REBUILD_SPEC_EN_REV1.md`
2. `docs/history/prompts/POWERFUL_AI_DIFFUSION_V0_2_REBUILD_PROMPT_EN_REV1.md`
3. `docs/specs/01_PRODUCT_ARCHITECTURE_AND_BOUNDARIES.md`
4. `docs/specs/02_TECH_STACK_AND_IMPLEMENTATION.md`
5. `docs/specs/03_UI_VISUAL_SYSTEM.md`
6. `docs/specs/04_PERFORMANCE_CONTRACT.md`
7. `docs/specs/05_REFERENCE_PROJECTS_AND_LINKS.md`
8. `docs/specs/07_FULL_BUILD_ACCEPTANCE_CHECKLIST.md`
9. `docs/REFERENCE_AUDIT.md`
10. `docs/history/v0.2/V0_2_AUDIT.md`
11. `STATUS.md`

Also preserve the delivery/checkpoint safety rules from:

`docs/history/prompts/POWERFUL_AI_4H_FULL_BUILD_PROMPT_EN_VALUE_CHECKPOINT_SAFE.md`

This v0.2.1 hardening prompt EXTENDS the existing v0.2 contract. It does not replace or weaken it.

Authority order for this run:

1. this v0.2.1 hardening prompt for the specific scope and newly introduced requirements;
2. the v0.2 REV1 redesign specification for product, interaction, and visual semantics;
3. the frozen product architecture and technical/performance contracts;
4. the current implementation where it does not conflict with the above;
5. historical v0.1 material only as background.

If this prompt is silent on an existing product rule, PRESERVE the existing v0.2 REV1 rule.

Do not reinterpret silence as permission to remove, simplify, or redesign an already-specified behavior.

In particular, preserve all existing rules concerning:

- User acts -> AI reacts -> User interprets;
- Field is state; messages are history;
- selection defines scope;
- AI never sits on the critical interaction path;
- AI cannot create permanent commitment for the user;
- Thought / Ghost / Recall / Crystal semantics;
- Focus Field semantics;
- relation semantics and no default graph arrows;
- Thread frozen scope;
- Deep Dive as a distinct mode, not a wider Thread;
- Region / Atlas / semantic zoom;
- lifecycle based on active attention pressure rather than closed wall-clock time;
- re-entry behavior;
- Evidence provenance and "indexed != read";
- local-first persistence;
- React/Tauri shared architecture;
- camera/pointer hot-path performance rules;
- localization;
- Light/Dark parity;
- honest Limited/Unavailable source states;
- verification honesty;
- checkpoint/archive/delivery preservation.

Do not delete or supersede existing specifications unless this prompt explicitly requires changing a specific rule.
