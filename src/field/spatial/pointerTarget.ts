/** Pointer-target classification for the Field.
 *
 * The Field is one gesture surface with overlapping owners: Thoughts, relation labels, the
 * Scope Hub, open surfaces and text editors. Deciding what a pointer event landed on is a pure
 * DOM classification concern — no camera, no geometry, no canonical state — so it lives outside
 * the imperative gesture path and can be reasoned about (and tested) on its own.
 *
 * Nothing here reads or writes Field state. It answers only: does this event belong to a text
 * editor, to a control that owns its own press, to passive decoration, to a Thought, or to the
 * blank Field. Blank classification is intentionally neutral: Field.tsx decides whether that
 * blank press becomes navigation (default drag), marquee selection (Shift + drag), or a click.
 */

/** Decoration is never an interaction target. An empty-Field invitation, an arrival caption or
 * any other passive copy resolves to nothing here, so the blank gesture reaches the Field
 * underneath and can never be intercepted by something that merely looks like the interface.
 * One guard covers blank double-click, pointer start and the blank context menu, because all
 * three resolve their target through this function. */
export function interactionTarget(target: EventTarget | null): HTMLElement | null {
    return target instanceof HTMLElement && !target.closest('[data-decoration]') ? target : null;
}

/** A text editor keeps its own keyboard, including Escape and Space. */
export function isTyping(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && !!target.closest('input,textarea,select,[contenteditable="true"]');
}

/** Controls that already own their own press: a Field gesture must start beneath them. */
const GESTURE_OWNERS = 'textarea,input,button,select,[data-surface],.context-actions,.relation-label-overlay';
/** Controls that own their own double-click: writing and relation affordances, not plain buttons. */
const DOUBLE_CLICK_OWNERS = 'button,textarea,input,select,[data-surface],.relation-label-overlay';

export function ownsPointerGesture(target: EventTarget | null): boolean {
    return Boolean(interactionTarget(target)?.closest(GESTURE_OWNERS));
}

export function ownsDoubleClick(target: EventTarget | null): boolean {
    return Boolean(interactionTarget(target)?.closest(DOUBLE_CLICK_OWNERS));
}

/** A keyboard event on a control belongs to that control, not to the Field. */
export function ownsKeyboard(target: EventTarget | null): boolean {
    return isTyping(target) || (target instanceof HTMLElement && Boolean(target.closest('button,a,[role=button]')));
}

export function thoughtIdAt(target: EventTarget | null): string | undefined {
    return target instanceof HTMLElement ? target.closest<HTMLElement>('[data-thought-id]')?.dataset.thoughtId : undefined;
}

export type ContextTarget = 'ignored' | 'blank' | 'thought';

/** Right-click resolution. A control keeps its own menu, a Thought keeps the current selection
 * scope (selected elsewhere; classification must not read selection), and anything else is the
 * blank Field. */
export function resolveContextTarget(target: EventTarget | null): ContextTarget {
    if (ownsKeyboard(target) || interactionTarget(target)?.closest('button,a,[role=button],[data-surface]'))
        return 'ignored';
    return thoughtIdAt(target) ? 'thought' : 'blank';
}
