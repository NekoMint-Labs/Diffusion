import { useUI } from '../store.ts';

/** The shared feedback vocabulary.
 *
 * Every acknowledgement the product makes is named here once, so a caller never decides wording
 * or tone at the call site: it asks for an event and gets the product's answer. Feedback is one
 * line of presentation state — never canonical Field content, never a log, never a queue. Two
 * lifetimes live here, and the difference is the point:
 *
 *  - `feedback(event)` is an acknowledgement. It settles on its own after `FEEDBACK_SETTLE_MS`.
 *  - `report(text, tone)` is something the person must actually see. It stays until replaced.
 *
 * A failure that fades away while it is still being read is a failure that was never delivered,
 * which is why `report` never schedules a timer and why `notice` is built on it.
 */
export type FeedbackTone = 'info' | 'error';

/** The one control a failure may point at. A kind rather than a callback, so feedback stays pure
 * presentation state and the surface that renders the line owns what the action does. */
export type NoticeActionKind = 'ai-settings' | 'search-settings' | 'model' | 'retry';
export interface NoticeAction {
    label: string;
    kind: NoticeActionKind;
}

export type FeedbackEvent =
    | 'field-created' | 'field-opened' | 'field-duplicated' | 'export-prepared'
    | 'gateway-connected' | 'reference-imported' | 'possibility-claimed' | 'recall-awakened';

/** Localization keys, never pre-translated: the caller resolves them through `t` at render time,
 * so an event can never ship the same string in every language. */
export const FEEDBACK_TEXT: Record<FeedbackEvent, string> = {
    'field-created': 'New Field created.',
    'field-opened': 'Field opened.',
    'field-duplicated': 'Field duplicated.',
    'export-prepared': 'Markdown export prepared. Space, relations and Threads are not included.',
    'gateway-connected': 'Gateway connected.',
    'reference-imported': 'Reference imported.',
    'possibility-claimed': 'Possibility claimed.',
    'recall-awakened': 'Earlier thought awakened. Use Find / Take me there to travel.',
};

/** Every named event is an acknowledgement, so every tone is quiet. A failure is not an event;
 * it arrives through `report`, which carries its own tone. */
export const FEEDBACK_TONE: Record<FeedbackEvent, FeedbackTone> = {
    'field-created': 'info',
    'field-opened': 'info',
    'field-duplicated': 'info',
    'export-prepared': 'info',
    'gateway-connected': 'info',
    'reference-imported': 'info',
    'possibility-claimed': 'info',
    'recall-awakened': 'info',
};

/** How long an acknowledgement is allowed to sit before the line returns to rest. */
export const FEEDBACK_SETTLE_MS = 3200;

/** One timer for the whole application, like the line itself: no stack, no accumulation. A new
 * call replaces this handle, which is how later text is never cleared early by an earlier timer. */
let settleTimer: ReturnType<typeof setTimeout> | undefined;

const write = (text: string, tone: FeedbackTone, action: NoticeAction | null = null): void => useUI.getState().patch({ notice: text, noticeTone: tone, noticeAction: action });

const cancelSettle = (): void => {
    if (settleTimer !== undefined) { clearTimeout(settleTimer); settleTimer = undefined; }
};

/** An acknowledgement: appear, settle, disappear. A second call replaces the text and restarts
 * the single timer — the previous callback can no longer own the line. */
export function feedback(event: FeedbackEvent): void {
    cancelSettle();
    write(FEEDBACK_TEXT[event], FEEDBACK_TONE[event]);    // A non-browser environment (a node test) has nothing to settle for and must schedule nothing.
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
        if (settleTimer !== timer) return; // a later call owns the line now
        settleTimer = undefined;
        write('', 'info');
    }, FEEDBACK_SETTLE_MS);
    settleTimer = timer;
}

/** Something the person must see: it stays until something replaces it, so a failure cannot
 * silently disappear. Any pending acknowledgement settle is cancelled. A failure may carry the one
 * control that would resolve it — a message that says what happened and offers nothing to do about
 * it is only half an answer. */
export function report(text: string, tone: FeedbackTone = 'info', action: NoticeAction | null = null): void {
    cancelSettle();
    write(text, tone, action);
}

/** Return the line to rest immediately, clearing the timer with it. */
export function clearFeedback(): void {
    cancelSettle();
    write('', 'info');
}

/** The smallest honest read accessor: the module's state as it actually is, for tests. */
export function currentFeedback(): { text: string; tone: FeedbackTone } {
    const { notice, noticeTone } = useUI.getState();
    return { text: notice, tone: noticeTone };
}
