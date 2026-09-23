import { HTTPResponseError } from '../shared/http.ts';
import { t } from '../shared/i18n.ts';

/** The bounded failure vocabulary the product is allowed to show a person.
 *
 * One word per thing that actually went wrong. "Upstream responded 401" tells nobody what to do
 * next, and "Could not connect" hides a rate limit behind a network story — both destroy the only
 * thing a failure is for, which is the next action. Raw provider bodies never reach here: every
 * sentence below is Diffusion's own, and it says what happened *and* what can be done.
 */
export const THINKING_FAILURES = [
    'not-configured',
    'invalid-configuration',
    'authentication-failed',
    'permission-denied',
    'model-not-found',
    'rate-limited',
    'network-unavailable',
    'provider-unreachable',
    'timeout',
    'provider-server-error',
    'unsupported-capability',
    'malformed-provider-response',
    'semantic-validation-failure',
    'cancelled',
    'discovery-unavailable',
    'reader-unavailable',
    'unknown',
] as const;
export type ThinkingFailure = typeof THINKING_FAILURES[number];

export class ThinkingError extends Error {
    readonly failure: ThinkingFailure;
    /** The upstream status, when there was one. Kept for diagnostics; never shown raw. */
    readonly status?: number;
    constructor(failure: ThinkingFailure, _subject = 'The provider', status?: number) {
        // The message is the failure *code*, not a sentence. A sentence would freeze the locale at
        // throw time and let a provider-shaped string travel through the product; the code is
        // classified and rendered in the user's language at the moment it is shown, and it is safe
        // to log or persist exactly as it is.
        super(failure);
        this.name = 'ThinkingError';
        this.failure = failure;
        this.status = status;
    }
}

/** What the failure means, in one sentence a person can act on.
 *
 * Resolved through the translator at *render* time, with `subject` as a value rather than as string
 * concatenation, so every sentence here is a real dictionary key and the Chinese locale is not
 * silently reduced to half-English text.
 */
export function failureText(failure: ThinkingFailure, subject = 'The provider'): string {
    const values = { subject };
    switch (failure) {
        case 'not-configured': return t('No AI provider is configured yet. Choose one in AI settings.');
        case 'invalid-configuration': return t('{subject} refused the request settings. Check the model and options in AI settings.', values);
        case 'authentication-failed': return t('Authentication failed. Check the API key for {subject}.', values);
        case 'permission-denied': return t('{subject} refused this request for this account. Check the plan and the key permissions.', values);
        case 'model-not-found': return t('{subject} could not use that model. Choose another model.', values);
        case 'rate-limited': return t('{subject} asked us to wait before trying again.', values);
        case 'network-unavailable': return t('This device appears to be offline.');
        case 'provider-unreachable': return t('{subject} could not be reached. Check the base URL and your connection.', values);
        case 'timeout': return t('{subject} did not answer in time.', values);
        case 'provider-server-error': return t('{subject} reported a server error. Nothing about the request was wrong.', values);
        case 'unsupported-capability': return t('{subject} does not support this option.', values);
        case 'malformed-provider-response': return t('{subject} returned a response Diffusion could not read.', values);
        case 'semantic-validation-failure': return t('The answer arrived but did not pass Diffusion validation. Nothing was changed.');
        case 'cancelled': return t('Thinking stopped. Only already surfaced possibilities remain.');
        case 'discovery-unavailable': return t('External search is unavailable. You can still explore the Field with AI.');
        case 'reader-unavailable': return t('The source could not be read, so no evidence was retained.');
        default: return t('{subject} failed for an unreported reason.', values);
    }
}

/** The one control each failure points at. The UI decides where that control lives. */
export type FailureRemedy = 'ai-settings' | 'model' | 'retry' | 'search-settings' | 'none';
export function failureRemedy(failure: ThinkingFailure): FailureRemedy {
    switch (failure) {
        case 'not-configured':
        case 'invalid-configuration':
        case 'authentication-failed':
        case 'permission-denied':
        case 'provider-unreachable':
        case 'unsupported-capability': return 'ai-settings';
        case 'model-not-found': return 'model';
        case 'discovery-unavailable':
        case 'reader-unavailable': return 'search-settings';
        case 'semantic-validation-failure':
        case 'cancelled': return 'none';
        default: return 'retry';
    }
}

/** HTTP status, corrected by the provider's own error type when it names one.
 * A provider that says "rate_limit_error" is telling the truth even when the status is a 400. */
export function failureForStatus(status: number, providerType?: string): ThinkingFailure {
    const named = (providerType ?? '').toLowerCase();
    if (named.includes('rate') || named.includes('quota') || named.includes('overload') || named.includes('resource_exhausted') || named.includes('too_many_requests')) return 'rate-limited';
    if (named.includes('authentic') || named.includes('unauthorized')) return 'authentication-failed';
    if (named.includes('permission') || named.includes('forbidden')) return 'permission-denied';
    if (named.includes('not_found') || named.includes('not-found') || named.includes('model_not')) return 'model-not-found';
    if (named.includes('deadline') || named.includes('timeout')) return 'timeout';
    if (named.includes('invalid') || named.includes('failed_precondition')) return 'invalid-configuration';
    if (named.includes('unavailable') || named.includes('api_error') || named.includes('internal')) return 'provider-server-error';
    if (status === 401) return 'authentication-failed';
    if (status === 402 || status === 403) return 'permission-denied';
    if (status === 404) return 'model-not-found';
    if (status === 408 || status === 499 || status === 504) return 'timeout';
    if (status === 413 || status === 422) return 'invalid-configuration';
    if (status === 429) return 'rate-limited';
    // Anthropic overloads with 529; that is back-pressure, not a broken deployment.
    if (status === 529) return 'rate-limited';
    if (status >= 500) return 'provider-server-error';
    if (status === 400) return 'invalid-configuration';
    return 'unknown';
}

/** Attributes an arbitrary thrown value to the taxonomy. Never reads the message: a provider's own
 * prose is private, unbounded, and may quote the request. Only the class and status are trusted. */
export function classifyFailure(error: unknown): ThinkingFailure {
    if (error instanceof ThinkingError) return error.failure;
    if (error instanceof HTTPResponseError) return failureForStatus(error.status);
    if (error instanceof DOMException) return error.name === 'TimeoutError' ? 'timeout' : error.name === 'AbortError' ? 'cancelled' : 'unknown';
    if (error instanceof Error) {
        if (error.name === 'TimeoutError') return 'timeout';
        if (error.name === 'AbortError') return 'cancelled';
        // Both the client's own wire reader and the gateway's server-side reader report the same
        // thing: a body arrived that Diffusion could not read. Recognizing only the server's class
        // name made a live provider's unreadable answer degrade to "an unreported reason".
        if (error.name === 'WireOutputError' || error.name === 'ProviderOutputError') return 'malformed-provider-response';
        if (error instanceof SyntaxError) return 'malformed-provider-response';
        // A rejected fetch is the transport failing, not the provider's opinion.
        if (error instanceof TypeError) return 'provider-unreachable';
    }
    return 'unknown';
}

/** Removes user-held secrets from a string before it can reach a log, a notice or a diagnostic.
 * Used by the diagnostics channel and asserted by the redaction tests. */
export function redact(text: string, secrets: readonly string[]): string {
    let output = text;
    for (const secret of secrets) {
        if (secret && secret.length >= 8)
            output = output.split(secret).join('[redacted]');
    }
    return output;
}
