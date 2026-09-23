# Diffusion Explorer v0.2.2 motion contract

Motion explains a state relationship. It never owns the state transition.

| Role | Typical use | Duration guidance | Properties |
|---|---|---:|---|
| `INSTANT_RESPONSE` | hover / press / pointer acknowledgement | 80-110 ms | opacity, color |
| `MICRO_SETTLE` | contextual actions, small labels | 120-150 ms | opacity, small translate |
| `SURFACE_ENTER` | menu / anchored panel | 160-190 ms | opacity, <= 5 px translate, <= 1.5% scale |
| `SURFACE_TRANSFORM` | related shell continuity | 180-220 ms | shell transform/opacity only |
| `ATTENTION_SHIFT` | Focus, relation wake, Ghost/Recall presence | 180-260 ms | opacity, subtle depth/translate |
| `REPRESENTATION_CHANGE` | Thread/Deep Dive or semantic representation when used | 200-260 ms | opacity/transform; never tiny-text tweening |

## Rules

1. User intent interrupts motion immediately. Escape, a new surface, drag, or changed selection wins over animation completion.
2. Direct manipulation is 1:1. Thought drag and camera movement do not spring or trail the pointer.
3. A positioned overlay and its animated visual shell are separate layers whenever transform positioning could conflict.
4. Shell continuity is allowed; body text is not stretched to fake morphing.
5. Exit can be shortened or skipped during an owner handoff. Focus/ownership correctness is more important than a visible exit.
6. No `transition: all`. Animate only the properties that communicate the state change.
7. `prefers-reduced-motion` collapses durations to zero while preserving visual hierarchy and state clarity.
8. The same state meaning must survive Paper Day / Graphite Night and Chinese / English.
