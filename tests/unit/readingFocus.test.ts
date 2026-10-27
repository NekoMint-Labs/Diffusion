import { describe, expect, it, vi } from 'vitest';
import { focusSegments, parseReadingFocus, summarizeReading } from '../../src/ai/readingFocus.ts';
import type { AIProvider } from '../../src/ai/contracts.ts';
import { readReadingFocus, rememberReadingFocus } from '../../src/ui/thought/readingFocusStore.ts';
const text = '只有条件成立时才能这样判断。不要把没使用直接当成没有需求。';
const focus = { point: '没使用不能直接证明没有需求。', conditions: ['只有条件成立时才能判断。'], highlights: ['不要把没使用直接当成没有需求。'] };
const fixture = (value: unknown = focus) => {
    const structured = vi.fn(async () => ({ value, mock: false, providerLabel: 'Test fixture', model: { requested: 'requested', effective: 'actual' } }));
    return { provider: { mock: false, structured } as unknown as AIProvider, structured };
};
describe('read-only focus extraction', () => {
    it('sends the complete clicked text once and reports returned model identity', async () => {
        const { provider, structured } = fixture();
        const result = await summarizeReading(provider, text, new AbortController().signal);
        expect(structured).toHaveBeenCalledTimes(1);
        expect(structured.mock.calls[0]).toBeDefined();
        expect(structured).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'exploration-step', input: { text } }), expect.any(AbortSignal));
        expect(result).toMatchObject({ focus, provider: 'Test fixture / requested → actual', mock: false });
    });
    it.each([
        { ...focus, point: '长'.repeat(121) }, { ...focus, point: ' ' },
        { ...focus, highlights: ['从未提供的其他内容'] }, { ...focus, command: 'keep' },
        { ...focus, conditions: ['a', 'b', 'c', 'd'] }, { ...focus, highlights: [] },
    ])('rejects malformed or ungrounded output without a fallback request: %j', async value => {
        const { provider, structured } = fixture(value);
        await expect(summarizeReading(provider, text, new AbortController().signal)).rejects.toMatchObject({ failure: 'semantic-validation-failure' });
        expect(structured).toHaveBeenCalledTimes(1);
    });
    it('rejects explicit loss of uncertainty during manual extraction, keeping the original untouched', async () => {
        const original = '这更像是尚未找到问题，而不是已经证明没有需求。';
        const { provider, structured } = fixture({ point: '说明没有找到问题。', conditions: [], highlights: ['尚未找到问题'] });
        await expect(summarizeReading(provider, original, new AbortController().signal)).rejects.toMatchObject({ failure: 'semantic-validation-failure' });
        expect(structured).toHaveBeenCalledTimes(1);
    });
    it('counts Unicode characters and preserves exact source wording', () => {
        expect(parseReadingFocus({ ...focus, point: '🧪'.repeat(120) }, text).point).toBe('🧪'.repeat(120));
        expect(parseReadingFocus(focus, text).highlights[0]).toBe(focus.highlights[0]);
    });
    it('never lets overlapping markers duplicate or delete canonical wording', () => {
        const original = '0123456789🧪末尾';
        const parts = focusSegments(original, ['12345', '34567', '12345', '🧪', '', 'missing']);
        expect(parts.map(part => part.text).join('')).toBe(original);
        expect(parts.filter(part => part.marked).map(part => part.text)).toEqual(['1234567', '🧪']);
    });
    it('does not call a provider for an already-cancelled request or demo', async () => {
        const { provider, structured } = fixture();
        const abort = new AbortController(); abort.abort();
        await expect(summarizeReading(provider, text, abort.signal)).rejects.toThrow();
        await expect(summarizeReading({ ...provider, mock: true }, text, new AbortController().signal)).rejects.toMatchObject({ failure: 'not-configured' });
        expect(structured).not.toHaveBeenCalled();
    });
    it('discards a late result when the provider ignores cancellation', async () => {
        const abort = new AbortController();
        const { provider, structured } = fixture();
        structured.mockImplementationOnce(async () => { abort.abort(); return { value: focus, mock: false, providerLabel: 'Test fixture', model: { requested: 'r', effective: 'r' } }; });
        await expect(summarizeReading(provider, text, abort.signal)).rejects.toThrow();
    });
    it('limits presentation memory and rejects a summary after the canonical wording changes', () => {
        const result = { focus, provider: 'Fixture', mock: false };
        rememberReadingFocus('reading-case', text, result);
        expect(readReadingFocus('reading-case', text)).toBe(result);
        expect(readReadingFocus('reading-case', text + ' Changed.')).toBeUndefined();
        for (let i = 0; i < 24; i++) rememberReadingFocus('bounded-' + i, text, result);
        expect(readReadingFocus('reading-case', text)).toBeUndefined();
    });
});
