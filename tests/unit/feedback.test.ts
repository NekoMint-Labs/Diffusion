import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearFeedback, currentFeedback, FEEDBACK_SETTLE_MS, FEEDBACK_TEXT, FEEDBACK_TONE,
    feedback, report, type FeedbackEvent,
} from '../../src/ui/workspace/feedback.ts';
import { failureNotice, deviceFailureNotice } from '../../src/ui/workspace/notice.ts';
import { setLocale } from '../../src/shared/i18n.ts';
import { useUI } from '../../src/ui/store.ts';

const locale = readFileSync(new URL('../../src/locales/zh.ts', import.meta.url), 'utf8');
const EVENTS = Object.keys(FEEDBACK_TEXT) as FeedbackEvent[];

/** A locale key is present only when the whole quoted key is a property name, not a prefix of a
 * longer sentence that happens to start with the same words. */
const hasLocaleKey = (key: string): boolean =>
    new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`).test(locale);

const setWindow = (present: boolean): void => { (globalThis as { window?: unknown }).window = present ? {} : undefined; };

// The assertions below quote English copy verbatim. Locale defaults to 'system', which resolves from
// the machine running the suite, so each test has to establish the locale it depends on rather than
// inherit it — and hand the default back afterwards so no test leaks 'en' into the next one.
beforeEach(() => setLocale('en'));
afterEach(() => setLocale('system'));

describe('feedback vocabulary', () => {
    it('names every event with a text key that is a real localization key', () => {
        expect(EVENTS.length).toBeGreaterThan(0);
        for (const event of EVENTS) {
            expect(FEEDBACK_TEXT[event], `${event} has no text`).toBeTruthy();
            expect(hasLocaleKey(FEEDBACK_TEXT[event]), `locale is missing key: ${FEEDBACK_TEXT[event]}`).toBe(true);
        }
    });

    it('gives every event a tone', () => {
        expect(Object.keys(FEEDBACK_TONE).sort()).toEqual([...EVENTS].sort());
        for (const event of EVENTS) expect(['info', 'error']).toContain(FEEDBACK_TONE[event]);
    });

    it('reuses the existing recall sentence rather than inventing a new one', () => {
        expect(hasLocaleKey(FEEDBACK_TEXT['recall-awakened'])).toBe(true);
    });
});

describe('feedback lifetimes', () => {
    beforeEach(() => { setWindow(true); vi.useFakeTimers(); clearFeedback(); });
    afterEach(() => { clearFeedback(); vi.useRealTimers(); setWindow(false); });

    it('clears an acknowledgement after FEEDBACK_SETTLE_MS', () => {
        feedback('field-created');
        expect(currentFeedback().text).toBe(FEEDBACK_TEXT['field-created']);
        vi.advanceTimersByTime(FEEDBACK_SETTLE_MS - 1);
        expect(currentFeedback().text).toBe(FEEDBACK_TEXT['field-created']);
        vi.advanceTimersByTime(1);
        expect(currentFeedback().text).toBe('');
    });

    it('restarts the single timer on a second call and never clears the later text early', () => {
        feedback('field-created');
        vi.advanceTimersByTime(FEEDBACK_SETTLE_MS - 100);
        feedback('field-opened'); // the first timer is replaced, not allowed to own the line
        vi.advanceTimersByTime(200); // past the original settle point
        expect(currentFeedback().text).toBe(FEEDBACK_TEXT['field-opened']);
        expect(vi.getTimerCount()).toBe(1); // exactly one timer, never a queue
        vi.advanceTimersByTime(FEEDBACK_SETTLE_MS);
        expect(currentFeedback().text).toBe('');
    });

    it('never auto-clears a report', () => {
        report('Saving the original failed.', 'error');
        vi.advanceTimersByTime(FEEDBACK_SETTLE_MS * 4);
        expect(currentFeedback()).toEqual({ text: 'Saving the original failed.', tone: 'error' });
    });

    it('lets a report cancel a pending acknowledgement settle', () => {
        feedback('field-created');
        report('Reference could not be imported.', 'error');
        vi.advanceTimersByTime(FEEDBACK_SETTLE_MS * 2);
        expect(currentFeedback().text).toBe('Reference could not be imported.');
    });

    it('clears immediately, timer and all', () => {
        report('anything');
        clearFeedback();
        expect(currentFeedback().text).toBe('');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('schedules nothing without a window', () => {
        setWindow(false);
        clearFeedback();
        feedback('field-opened');
        expect(currentFeedback().text).toBe(FEEDBACK_TEXT['field-opened']);
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('a failure notice offers only remedies that can actually run', () => {
    beforeEach(() => { setWindow(false); clearFeedback(); });
    afterEach(() => clearFeedback());

    it('states the failure in the product\'s words, never the internal code', () => {
        failureNotice('authentication-failed', 'Anthropic');
        const { text, tone } = currentFeedback();
        expect(text).toBe('Authentication failed. Check the API key for Anthropic.');
        expect(tone).toBe('error');
        // The bounded vocabulary is a code, not a sentence: it must never be what a person reads.
        expect(text).not.toBe('authentication-failed');
    });

    it('offers the remedy that owns the cause, with or without composed words', () => {
        failureNotice('not-configured', 'The provider', false);
        expect(useUI.getState().noticeAction).toEqual({ label: 'Open AI settings', kind: 'ai-settings' });
        failureNotice('discovery-unavailable', 'External search', false);
        expect(useUI.getState().noticeAction).toEqual({ label: 'Configure search', kind: 'search-settings' });
    });

    it('withholds a Retry that has nothing to resend', () => {
        // A failure from a Thread's own input or an exploration: the composer is empty, so pressing
        // Retry would silently do nothing.
        failureNotice('timeout', 'OpenAI', false);
        expect(currentFeedback().text).toBe('OpenAI did not answer in time.');
        expect(useUI.getState().noticeAction).toBeNull();
        // The same failure with words still in the composer is genuinely retryable.
        failureNotice('timeout', 'OpenAI', true);
        expect(useUI.getState().noticeAction).toEqual({ label: 'Retry', kind: 'retry' });
    });
});

describe('a device failure never shows the raw thrown message', () => {
    beforeEach(() => { setWindow(false); clearFeedback(); });
    afterEach(() => clearFeedback());

    it('reports a storage failure in the product\'s words, with an error tone', () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const thrown = new Error('QuotaExceededError: The quota has been exceeded.');
            deviceFailureNotice('storage', thrown);
            const { text, tone } = currentFeedback();
            expect(tone).toBe('error');
            expect(text).not.toContain('QuotaExceededError');
            expect(text).not.toContain(thrown.message);
            expect(text.length).toBeGreaterThan(0);
            // The raw cause is kept for a developer in exactly one log line, never as UI text.
            expect(log).toHaveBeenCalledTimes(1);
        }
        finally {
            log.mockRestore();
        }
    });
});
