import type { Camera, Point } from '../../core/model.ts';

/** The gesture contract: one pointer press, one owner, decided once.
 *
 * A gesture is classified at `pointerdown` and never re-read afterwards. A press that lands on a
 * Thought is a drag of the selection (or of that one Thought); a press that lands on blank Field
 * pans by default, while Shift + blank drag deliberately owns marquee selection. The selection is *owned* by the gesture from that moment until `pointerup`: nothing
 * inside a gesture may add to it, remove from it, reinterpret movement as selection expansion, or
 * let hover hit-testing mutate it. Dragging means dragging, and a selection change is its own
 * deliberate gesture.
 *
 * This contract was written down in the Phase 2.7 pass because the product was breaking it. Before
 * it, the kind was re-derived per branch, a second press during a live gesture silently re-classified
 * it (a middle click turned a drag into a pan), and — worst of all — a press that missed a Thought's
 * box by a few pixels became a marquee, because "blank" was the only remaining category. Since a
 * marquee *replaces* the selection, the mistake was destructive: dragging one or two selected
 * Thoughts could hand the person a selection of everything the accidental rectangle grazed.
 *
 * The machine that drives this contract (pointer capture, rAF coalescing, the world transform) stays
 * in `field/Field.tsx`; this module holds only what the contract *is*, so the vocabulary and its
 * thresholds have one owner and can be reasoned about without the hot path.
 */
export interface WheelZoomGesture {
    anchor: Point;
    at: number;
}

/** A wheel/pinch burst keeps one attended screen point. Browser pinch packets can report a slightly
 * different client point on every frame; accepting that jitter makes the world appear to swim. */
export function resolveWheelZoom(previous: WheelZoomGesture | null, input: {
    point: Point;
    deltaY: number;
    deltaMode: number;
    viewportHeight: number;
    ctrlKey: boolean;
    timeStamp: number;
}): { gesture: WheelZoomGesture; delta: number } {
    const anchor = previous && input.timeStamp - previous.at < 180 ? previous.anchor : input.point;
    const modeScale = input.deltaMode === 1 ? 16 : input.deltaMode === 2 ? input.viewportHeight : 1;
    // Chromium exposes trackpad pinch as ctrl+wheel with much smaller deltas than a wheel notch.
    const sensitivity = input.ctrlKey ? 4 : 1;
    const delta = Math.max(-240, Math.min(240, input.deltaY * modeScale * sensitivity));
    return { gesture: { anchor, at: input.timeStamp }, delta };
}

export type GestureKind = 'pan' | 'selection' | 'marquee';

export interface Gesture {
    kind: GestureKind;
    pointerId: number;
    start: Point;
    last: Point;
    worldStart: Point;
    camera: Camera;
    /** The Thought the press landed on. Only the hold-to-explore probe uses it. */
    target?: string;
    /** The set this gesture deliberately moves. For a selection drag it is the selection at press. */
    ids: string[];
    positions: Record<string, Point>;
    moved: boolean;
    /** Whether the marquee adds to the current selection rather than replacing it. */
    extend: boolean;
    /** A normal blank click clears attention even though a blank drag is now a pan. */
    clearSelectionOnClick: boolean;
    probe?: {
        id: string;
        since: number;
    };
}

/** Screen-space distance a press must travel before it is a drag rather than a click. */
export const DRAG_THRESHOLD = 5;

/** How long a Thought has to be held over a neighbour before the probe offers to explore. */
export const PROBE_HOLD = 650;

/** The Scope Hub is the selection's own handle, so a press on the hub itself means "drag this
 * selection" rather than "pan or draw a marquee over the Field underneath it". The *rendered* hub is asked
 * for (`data-scope-hub`), so the area claimed is the object the person can see and nothing more. */
export const SCOPE_HANDLE_SELECTOR = '[data-scope-hub]';
