# 01 — Product Architecture and Boundaries

> **Status: current product authority.** This document defines durable product semantics and
> authority boundaries, not a phase or kickoff artifact. Implementation ownership and shared
> boundaries are in [`ARCHITECTURE.md`](../ARCHITECTURE.md); how to change something is in
> [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## 1. Product center

Diffusion Explorer is for the **pre-idea / pre-commitment** stage: the user senses that something is wrong, vaguely sees a direction, or suspects two things may relate, but is not yet ready to turn that into a conclusion, task, or polished document.

Core boundary:

> **Diffusion handles uncertainty. Execution starts after commitment.**

Therefore Diffusion is not a search engine, AI mind map, knowledge-graph editor, Obsidian replacement, task manager, research agent, conventional infinite canvas, or “ChatGPT + Canvas.”

## 2. The Field

The Field is a **Shared Thought State**.

Its primary content is the user’s current thinking:

- vague thought
- question
- fragment
- hypothesis
- doubt
- interpretation
- weak possibility
- stabilized commitment

Do not treat the Field as a material desk. Sources may participate in the current reasoning scope, but their purpose is to change thought, not to become the product’s main managed objects.

### User-facing primitives

- **Place** — place a thought.
- **Move** — use space to express the current arrangement.
- **Select** — define a temporary Thought Scope.
- **Speak** — add linguistic intent to that scope.
- **Keep** — explicitly preserve something before it becomes a Crystal.

Grammar:

> Selection defines scope.  
> Gesture creates relation.  
> Language creates intent.

## 3. Human / AI authority

Core rhythm:

> **User acts → AI reacts → User interprets.**

Authority boundary:

> **AI creates possibility. User creates commitment.**

In Normal Mode the AI must stop after the semantic response triggered by the user. It must not continue indefinitely on its own.

AI must not:

- move user Thoughts;
- silently rewrite user Thoughts;
- delete user Thoughts;
- create permanent relations automatically;
- create or modify a Crystal automatically;
- move the camera automatically;
- surprise the user with web search;
- rearrange the Field based on inferred similarity;
- turn Recall into hidden personalization or recommendation.

AI may:

- create Ghosts;
- surface tentative phenomena;
- request a semantic UI expression;
- read Sources / Web evidence when permitted;
- explore autonomously only inside explicit scope + budget + permission in Diffuse mode.

## 4. Thought / Ghost / Recall / Crystal

### Thought

The normal first-class object of the Field. The UI does not need to expose the internal term “Material” or a permanent node glyph. A Thought should feel like text naturally inhabiting space.

### Ghost

An AI-created possibility, not a purple version of a normal Thought.

- hover is not acceptance;
- click = Claim + Select;
- drag = Claim + Move;
- ignoring is valid;
- no generic Accept / Reject chrome for ordinary AI possibilities;
- a structured-ingestion proposal is a narrow exception: because it is an AI interpretation of the user's own compound input, the Field may offer a quiet remove affordance plus Keep all / Keep original review actions;
- lasso does not Claim;
- an unclaimed Ghost must not become the basis for further autonomous Normal Mode generation.

### Recall

A previously existing Thought resurfacing into current attention. It is not a copy and not a recommendation result.

- click = Wake + Select;
- drag = Wake + Move;
- ignored Recall returns to memory and is not a rejection;
- offscreen Recall may show an edge cue but must not steal the camera.

### Crystal

A stable landmark created when the user decides a thought is stable enough to act on.

- AI may create a Crystal Draft / Preview only;
- only explicit user edit / confirmation creates the Crystal;
- a Crystal is not objective truth;
- it does not normally fade;
- it survives zoom-out longer than ordinary Thoughts;
- Continue grows new evolving thought without rewriting the old Crystal.

## 5. Selection and Focus Field

Selection is a **temporary Thought Scope**, not a group and not semantic commitment.

- click to select;
- Shift+click for multi-select;
- lasso from blank space;
- Esc to clear;
- multi-selection does not show one giant group bounding box;
- each selected object keeps its own halo;
- Selection itself does not trigger AI.

Confirmed Focus Field behavior:

- selected Thought is clearest;
- confirmed or currently active direct relations wake up;
- directly related Thoughts remain prominent;
- unrelated content gently recedes but remains spatially present;
- no fullscreen dark overlay;
- no geometry changes;
- Selection must not invent relations;
- clicking blank Field restores the normal Field.

Relation **persistence** and **visibility** are separate.

## 6. Probe / Relation

When the user drags A toward B:

`far → proximity → ? cue → hold/confirm → semantic Probe → async AI`

Drag, proximity and the `?` preview are local and immediate. They never wait on AI.

Relation layers:

1. **Proximity** — the user is considering items together; no semantic relation is implied.
2. **Tentative phenomenon** — resonance / tension / gap / support etc.; ephemeral.
3. **Confirmed relation** — persists only after explicit user confirmation.

v0.1 has no Connect Tool, no hypergraph and no edge soup.

Relations should **not use arrows by default**. Arrows over-imply causality, direction and process.

Prefer:

- `≈` resonance
- `↯` tension
- `?` gap / unresolved
- `✓` support / evidence
- small labels
- very faint incomplete traces only when attention requires them

Principle:

> **phenomenon first, connection second**

## 7. Region / Atlas

A Region is not a folder, box, frame, or container. It is a neighborhood that emerges from repeated spatial activity.

- no “Create Region Box”;
- no hard border;
- Local scale is Thought-first;
- Neighborhood zoom gradually reveals Region identity;
- Atlas is dominated by Regions and Crystals;
- Atlas must not become node-edge soup.

Atlas is continuous semantic zoom, not a separate page.

## 8. Conversation / Thread / Deep Dive

Input may remain available, but Conversation must not permanently occupy the screen.

- short one-shot semantic response → Field (Ghost / phenomenon / short response);
- discourse that depends on previous context → Thread;
- longer or deeper reasoning → Deep Dive.

Thread:

- temporary split surface;
- not chat bubbles;
- no AI avatar;
- scope is snapshotted at creation;
- clicking another Field item does not silently add it;
- explicit `Add current selection` is allowed;
- AI thoughts brought back to the Field default to Ghosts.

Deep Dive:

- grants reasoning more real screen space;
- preserves Field context;
- is not a full writing editor;
- closing it restores the prior viewport / selection / focus.

## 9. Source and Web Evidence

### Source

A Source is an **external knowledge body that participates in thought**.

A post-freeze UI refinement is confirmed: user-facing behavior is **Drop anything / best effort**. Do not fake capability by restricting upload types; instead expose capability honestly with states such as `Processing / Ready / Limited / Unavailable`.

This does not mean building a Reader:

- no PDF reader;
- no image cropper;
- no annotation suite;
- no document workbench.

Source is visually below Thought and behaves more like a reference / portal.

### Web Evidence

The web is an **Evidence Channel for the Field**, not a browser and not an autonomous research suite.

The user explicitly triggers Verify / prior work / counterexample / evidence / papers.

Search infrastructure must be replaceable. Results begin as candidate Sources / Evidence, not as a result list exploded into the Field.

## 10. Diffuse

One of the few intentionally visible special modes.

- user explicitly selects scope / Region;
- explicit budget;
- web requires separate permission;
- results are progressively revealed;
- AI still cannot move/delete/rewrite user Thoughts;
- it cannot create permanent relations or Crystals;
- once the user touches a Ghost, that territory belongs to the user and autonomous AI action on it stops.

## 11. Re-entry / History / Find

### Re-entry

Open directly into the prior Field and approximate viewport; do not show a resume dashboard.

- unresolved frontier may show a subtle `continue here`;
- active Thread is not auto-opened;
- unclaimed Ghosts are not long-term persistent objects;
- Thoughts / Keep / Crystal / Source / confirmed relation / Region persist.

### Find

Project Find locates known past project content and is distinct from Recall and Web Search.

### History

History is semantic trajectory, not a raw operation log.

It should answer:

> **How did this form?**

not “moved 3px / zoomed / clicked.”

## 12. Critical anti-patterns

Avoid:

- Chat dominance
- Auto-layout dictatorship
- Forced graph ontology
- Automatic commitment
- Infinite idea generation
- Hidden automatic reorganization
- False document comprehension
- Fake evidence certainty
- Recommendation-style Recall
- Tool overload

If a new capability appears to need a permanent toolbar button, first try:

> direct manipulation → contextual action → language → system phenomenon
