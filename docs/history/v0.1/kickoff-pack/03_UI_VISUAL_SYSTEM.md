# 03 — UI / Visual System v0.1

## 1. Overall direction: Quiet Living Field

The goal is not “a beautiful infinite canvas.” It is:

> **A quiet, spacious, low-noise field whose structure gradually becomes visible as the user places attention.**

Keywords:

- Quiet
- Alive
- Unfinished
- Thought-first
- Large negative space
- Contextual UI
- Progressive disclosure
- No graph aesthetic
- No AI neon

Delight comes from state change, not decorative effects.

## 2. Shell

By default almost the entire screen is Field.

Persistent UI should be limited to:

1. Field identity (very light, top-left)
2. Thought Field (the main surface)
3. Speak (bottom-center, not styled like a chat composer)
4. very few global controls when genuinely needed

Do not persist:

- file sidebar
- AI sidebar
- top toolbar
- right inspector
- Sources sidebar
- graph minimap

## 3. Thought typography

### Normal Thought

Starting point:

- 16–17px, prefer 17px
- Regular 400
- line-height ~1.45
- sans-first
- body-text presence, not UI-label presence
- preferred width ~160–280px
- max width ~320px
- normally show 3–5 lines before subtle fade / ellipsis

### Crystal

- 18–19px
- around 500 weight
- no huge heading and no gold styling

### Region

- gains importance through semantic zoom
- weak or absent at Local scale
- landmark label in Neighborhood / Atlas

### Metadata / actions

- 11–13px
- clearly subordinate to Thought

## 4. Hybrid Thought

A Thought is not a permanent card.

Rest: text only.  
Hover: a very weak sense of presence / hit area.  
Selected: attention halo + contextual actions.  
Editing: only this state gains a fully legible surface/card boundary.

Selection and hover must not cause text reflow.

## 5. Color system

### Principle

**Warm Neutral + One Accent.**

Do not encode semantics as colors such as:

- red = tension
- green = support
- purple = AI
- blue = Source
- yellow = question

Accent expresses only:

> current user attention / active interaction

### Light

- slightly warm near-white Field, not pure `#fff`
- deep gray-black primary ink, not pure `#000`
- surfaces only slightly separated from the Field
- low-saturation accent

### Dark

- warm charcoal, not pure black
- warm light-gray ink, not glaring white
- same accent hue family as Light, but without neon/glow character

Light and Dark are first-class. Follow OS by default and allow explicit override.

## 6. Focus Field

After selecting a Thought:

- selected = highest temporary weight
- direct related = high
- relevant context = medium
- unrelated = lower but still spatially visible

Do not:

- place a fullscreen dark overlay;
- simply reduce unrelated content to 20–30% opacity;
- move related items automatically;
- auto-layout.

Focus changes visibility / emphasis, never geometry.

## 7. Selection Halo

Halo is an **attention aura**, not a bounding box.

- Hover: extremely light, “touchable”
- Selected: clearer, “current scope”
- Editing: the only state that becomes a full surface

Context actions occupy nearby negative space:

- one Thought: `Ask / Keep / ···`
- two Thoughts: `Explore / Ask / ···`
- 3+: `Ask / Keep / ···`
- Source + Thought: `Test / Ask / ···`

Actions recede during drag and return after drop.

## 8. Relation / Phenomenon

Relations do not use arrows by default.

Prefer glyphs:

- `≈` resonance
- `↯` tension
- `?` gap / unresolved
- `✓` support / evidence
- `∼` bridge (sparingly)

The default visual unit is the phenomenon between objects:

```text
A           ↯           B
          tension
```

Only stronger focus / hover grows a very faint incomplete trace:

```text
A      · · ↯ · ·      B
```

Principle:

> phenomenon first, connection second

A confirmed relation may persist in data while remaining visually asleep.

## 9. Ghost

Not a purple AI card.

Feeling: **text that has not fully settled yet**.

- same typography scale as Thought
- lower contrast / clarity
- appears from almost absent → legible → settled
- once settled it does not float, breathe or shimmer
- hover may show a small `AI suggestion`
- Claim makes it “stand firmly” in the same position as a normal Thought

## 10. Recall

Not merely another pale Ghost.

Feeling: **far away, but clear**.

- text itself stays clear
- lower overall contrast
- weaker spatial presence
- may retain a `◇` marker for “earlier thought resurfaced”
- Wake restores ordinary Thought presence

## 11. Source

Source always remains visually below Thought.

Default representation can be as small as:

```text
Paper A
source · p.12
```

or attached to a Thought as:

```text
representation changes with scale
· 2 sources
```

Source images may contribute their natural color, but the UI should not wrap them in colorful category cards.

A Source Reference Surface answers only:

- where did this come from?
- what exactly did the model inspect?
- how precise is provenance?
- `Open original`

Do not build a Reader inside Diffusion.

## 12. Crystal

Feeling: **stable, not glamorous**.

- `◆` may remain
- slightly firmer typography
- stable contrast
- somewhat more negative space
- survives zoom-out longer
- formation uses a settling motion, not confetti / glow / success animation

## 13. Progressive Surfaces

Use only three depth levels.

### Anchored Surface

Explanatory: Source provenance, relation detail, Why?. Anchored near the object; Esc closes it.

### Split Surface

Thought Thread. Field yields roughly one-third of its width and remains interactive.

Thread looks like a thinking manuscript, not chat:

- no avatars
- no large `YOU / AI` labels
- header shows `Thinking with`
- scope is snapshotted
- explicit `Add current selection`

### Focus Surface

Deep Dive / History / Fork Compare. Used only when substantial linear space is justified.

Every surface preserves a Return Point: viewport / zoom / selection / focus.

Do not create nested-panel stacks.

## 14. Speak

Bottom-center, but it must not look like a ChatGPT-style permanent composer.

Idle is light; focus gives it a complete input surface.

With selection it displays Scope, not a chat recipient:

```text
○ semantic zoom  ○ information hiding
Say something about these…
```

No selection means whole-Field scope.

## 15. Motion

Three rhythms:

1. **Touch motion** — user action; fastest, immediate and stable.
2. **Emergence motion** — Ghost / Recall / relation / evidence; subtle reveal.
3. **Drift motion** — lifecycle; slow, continuous and unobtrusive.

AI never changes user space through animation.

Prefer `transform` / `opacity`. Avoid widespread sustained blur / glow / layout animation.

Support `prefers-reduced-motion` from v0.1.

## 16. Semantic Zoom

### Local

Full Thoughts, Ghosts, Recalls, active relations and context actions.

### Neighborhood

Thought text simplifies; Ghost/relation/Source detail disappears earlier; Region identity appears; Crystals remain.

### Atlas

Primarily:

- Region names
- Crystals
- active frontiers
- a very small number of landmarks

Atlas is thought geography, not a node graph.

Regions do not use hard frames or colored bubbles; they emerge through:

> spatial density + label + negative-space boundary

## 17. Visual acceptance sentence

If the first impression resembles Miro, Obsidian Canvas, Kumu, ChatGPT Canvas, a material manager, or a colorful AI graph, the implementation has drifted.

The intended feeling is:

> **Thoughts quietly inhabit a spacious field; structure and relationships surface only where attention lands.**
