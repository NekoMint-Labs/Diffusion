# Diffusion Explorer v0.2.6.4 — Interaction Layer Audit

## Scope

This audit covers paint order and local legibility only. Thought coordinates, Scope Hub placement, Speak geometry, Field gestures, semantic state, result placement, providers, evidence, and persistence remain unchanged.

## Actual DOM and stacking contexts

Real mounted React/Chromium inspection found:

- `.app` is the local UI stacking root because `isolation: isolate` creates a stacking context.
- `.field` is an absolutely positioned child of `.app`, but does not itself create a stacking context.
- `.world` is transformed by `CameraController` (`translate3d(...) scale(...)`), so it creates the Field-content stacking context.
- each `.thought` is transformed for canonical placement and may also create a stacking context through animated opacity; Ghost, Recall, and Crystal share this path.
- relation SVG, relation hit targets, Thoughts, and selection presentation had no semantic layer assignment. Their paint order mostly depended on DOM order inside `.world`.
- `.scope-hub` is a fixed child of `.field`, outside `.world`. Motion temporarily applies transform and opacity, and the Hub had a literal `z-index: 20`.
- `.speak-positioner` is an absolutely positioned child of `.app`, outside `.field`, with literal `z-index: 16`. Motion transforms/opacity are applied to the nested form.
- command menus and Settings/surfaces use the existing Floating UI portal attached under `body`. Their fixed roots had literal z-indices (`40`, `41`, `60`), above the isolated `.app` stacking context.
- no relevant ancestor uses `filter` or `backdrop-filter`. There is no separate interaction overlay portal for Scope Hub or Speak.

## Root cause

The observed crossing is not a failed `z-index` escape: Scope Hub and Speak already paint above the transformed `.world`. The failure is that both interaction surfaces are intentionally transparent, so darker Field text remains fully visible through their labels, controls, textarea, and baseline. This makes correctly layered content look visually interleaved.

Maintainability was also weak: global ordering was encoded as unrelated literal z-indices, while relation, Thought, and selection ordering relied on source order. Future transient UI had no named place in the stack.

## Repair boundary

- Keep `.app` as the isolated local stacking root and keep the existing Floating UI portal.
- Keep Scope Hub outside the transformed `.world`; do not add another portal.
- Define one semantic CSS layer scale: Field, relation, Thought, selection, Scope, Speak, surface.
- Split relation and selection SVG presentation only enough to assign their existing visuals to the correct semantic layers.
- Add visual-only, Field-colored soft masks locally behind Scope Hub actions and composing Speak.
- Keep overlay wrappers pointer-transparent and real controls pointer-active.
