import { report } from './feedback.ts';
import { failureRemedy, failureText, type ThinkingFailure } from '../../ai/errors.ts';
import { t } from '../../shared/i18n.ts';

/** How the application says one thing to the person using it.
 *
 * A notice is ephemeral presentation state, never canonical Field content and never a log:
 * the next notice replaces the previous one, and nothing accumulates. Any capability may
 * report through this one line instead of receiving a callback threaded through every layer.
 *
 * Lifetime: ordinary acknowledgement and failure are two different things. An acknowledgement
 * (`feedback`) settles on its own, but a notice must stay until something replaces it — a failure
 * that vanishes on a timer is an error silently lost. So `notice` is the permanent lifetime,
 * built on `report` (which never schedules a settle) rather than an auto-dismissing toast.
 */
export const notice = (text: string): void => report(text, 'info');

/** "AI is off", said where it happens, with the one control that changes it.
 *
 * A person who writes into a Field that cannot answer was told to go to Settings and offered
 * nothing to press — the words stayed in the composer and the message named a destination with no
 * road to it. This is the same sentence with the product's own remedy attached, so the answer to
 * "why did nothing happen?" is one press away. */
export function aiOffNotice(): void {
    report(t('AI is off. Manual Field interactions still work. Choose Demo or your provider in Settings.'), 'info', { label: t(REMEDY_LABEL['ai-settings']), kind: 'ai-settings' });
}

/** The one control each failure offers. Answering "what happened?" without a way to act on it is
 * how a failure becomes a dead end, so every remedy that has a control names it here. */
const REMEDY_LABEL: Record<ReturnType<typeof failureRemedy>, string> = {
    'ai-settings': 'Open AI settings',
    'search-settings': 'Configure search',
    'model': 'Choose another model',
    'retry': 'Retry',
    'none': '',
};

/** A failure, in the product's own words, with the control that resolves it.
 *
 * The provider's raw body and message never reach this line: a bounded taxonomy sentence does.
 * "Upstream responded 401" tells a person nothing they can act on; "Authentication failed. Check
 * the API key for Anthropic." plus one button is the same fact with the next step attached.
 */
export function failureNotice(failure: ThinkingFailure, subject = 'The provider', canRetry = false): void {
    const remedy = failureRemedy(failure);
    // Retry means "send the same words again", and those words live in the composer. A failure that
    // happened somewhere else — a Thread's own input, an exploration, a Diffuse run — has nothing for
    // that control to resend, and a button that does nothing is worse than no button. The sentence
    // still arrives; only the empty promise is withheld.
    const label = remedy === 'retry' && !canRetry ? '' : REMEDY_LABEL[remedy];
    report(failureText(failure, subject), 'error', remedy === 'none' || !label ? null : { label, kind: remedy });
}

/** The bounded vocabulary for a failure that happened on this device rather than upstream.
 *
 * A raw thrown value — `QuotaExceededError`, a DOMException name, a storage stack — tells the person
 * nothing they can act on. Every kind below is one sentence in the product's own words that says
 * what did not succeed, whether the work is still safe, and what to do next. Like `failureText`, the
 * sentence is resolved through the translator at the moment it is shown; the raw cause is kept for a
 * developer in a single log line and never becomes the UI text. */
export type DeviceFailure = 'save' | 'read' | 'create' | 'duplicate' | 'export' | 'import' | 'storage' | 'link' | 'restore' | 'original';

export function deviceFailureText(kind: DeviceFailure): string {
    switch (kind) {
        case 'save': return t('This Field could not be saved on this device. Nothing was lost and what you wrote is still here; export a copy before closing.');
        case 'read': return t('That Field could not be read from this device. Nothing was changed and the Field you were in is still open; try again or choose another Field.');
        case 'create': return t('A new Field could not be created. Nothing was changed and the current Field is still open; try again.');
        case 'duplicate': return t('The copy could not be created. The current Field is unchanged; try again.');
        case 'export': return t('The export could not be prepared. The Field is unchanged; try again.');
        case 'import': return t('That reference could not be brought into the Field. Nothing in the Field was changed; try again.');
        case 'storage': return t('Local storage is unavailable, so this session is not being saved. The work stays on screen until the window closes; export it to keep it.');
        case 'link': return t('That address could not be opened in your browser. The Field is unchanged; try again or copy the address.');
        case 'restore': return t('That file could not be read as a Diffusion export. No existing Field was changed; choose another export file.');
        case 'original': return t('That original could not be opened here. The reference and the Field are unchanged; try again.');
    }
}

/** The bounded sentence, with the raw cause kept for a developer: one `console.error` line — there is
 * no logging framework here — and the exception text is never the UI. A surface that holds its own
 * error line uses this; the workspace's one notice line uses `deviceFailureNotice` below. */
export function deviceFailureDetail(kind: DeviceFailure, cause?: unknown): string {
    console.error('[diffusion]', kind, cause);
    return deviceFailureText(kind);
}

/** A device failure, said once: the bounded sentence reaches the person, the raw cause reaches the
 * developer. */
export function deviceFailureNotice(kind: DeviceFailure, cause?: unknown): void {
    report(deviceFailureDetail(kind, cause), 'error');
}
