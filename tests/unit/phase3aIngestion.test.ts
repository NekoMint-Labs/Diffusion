import { describe, expect, it } from 'vitest';
import { extractThoughts, looksCompoundInput, resolveSourceQuotes } from '../../src/ai/ingestion.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type StructuredRequest } from '../../src/ai/contracts.ts';

function provider(structured: (request: StructuredRequest) => unknown | Promise<unknown>): AIProvider {
    return {
        label: 'Structured fixture', mock: false,
        capabilities: async () => UNKNOWN_CAPABILITIES,
        respond: async () => ({ intents: [], providerLabel: 'Structured fixture', mock: false }),
        structured: async request => ({ value: await structured(request), providerLabel: 'Structured fixture', mock: false }),
    };
}

describe('Phase 3C structured ingestion', () => {
    it('maps exact source quotes to deterministic UTF-16 ranges', () => {
        const text = '我喜欢 HCI🙂，但我也担心就业。';
        const ranges = resolveSourceQuotes('input-1', text, ['HCI🙂', '担心就业']);
        expect(ranges.map(range => text.slice(range.start, range.end))).toEqual(['HCI🙂', '担心就业']);
    });
    it('rejects unsupported and ambiguous source quotes', () => {
        expect(() => resolveSourceQuotes('input', '原始文字', ['改写文字'])).toThrow(/exact substring/);
        expect(() => resolveSourceQuotes('input', 'same and same', ['same'])).toThrow(/ambiguous/);
    });
    it('model contract contains only text and sourceQuotes', async () => {
        const text = 'I like HCI, but I worry about work.';
        const seen: string[] = [];
        const result = await extractThoughts(provider(request => {
            seen.push(request.purpose);
            return { units: [
                { text: 'I like HCI', sourceQuotes: ['I like HCI'] },
                { text: 'I worry about work', sourceQuotes: ['I worry about work'] },
            ] };
        }), text, 'input-2');
        expect(result.units).toHaveLength(2);
        expect(Object.keys(result.units[0]).sort()).toEqual(['sourceQuotes', 'sourceRanges', 'text']);
        expect(seen).toEqual(['thought-extraction']);
        expect(result.requests).toBe(1);
    });
    it('challenges a suspicious one-unit result exactly once, without locally splitting', async () => {
        const text = '我喜欢 HCI，但是我担心以后不好找工作。';
        const seen: string[] = [];
        const result = await extractThoughts(provider(request => {
            seen.push(request.purpose);
            if (request.purpose === 'thought-extraction') return { units: [{ text, sourceQuotes: [text] }] };
            if (request.purpose === 'thought-extraction-recheck') return { units: [
                { text: '我喜欢 HCI', sourceQuotes: ['我喜欢 HCI'] },
                { text: '我担心以后不好找工作', sourceQuotes: ['我担心以后不好找工作'] },
            ] };
            throw new Error('unexpected repair');
        }), text, 'input-3');
        expect(result.units).toHaveLength(2);
        expect(result.rechecked).toBe(true);
        expect(seen).toEqual(['thought-extraction', 'thought-extraction-recheck']);
    });
    it('accepts one after the bounded re-check and never makes a third request', async () => {
        const text = '我喜欢 HCI，但是这个原因让我更喜欢它。';
        let calls = 0;
        const result = await extractThoughts(provider(() => { calls++; return { units: [{ text, sourceQuotes: [text] }] }; }), text, 'input-4');
        expect(result.units).toHaveLength(1);
        expect(calls).toBe(2);
    });
    it('does not challenge an ordinary atomic idea', async () => {
        const text = '我喜欢 HCI，因为它把技术、设计和人联系在一起。';
        let calls = 0;
        const result = await extractThoughts(provider(() => { calls++; return { units: [{ text, sourceQuotes: [text] }] }; }), text, 'input-5');
        expect(result.units).toHaveLength(1);
        expect(calls).toBe(1);
        expect(looksCompoundInput(text)).toBe(false);
    });
    it('uses one repair for invalid grounding', async () => {
        const text = 'I like HCI.';
        let calls = 0;
        const result = await extractThoughts(provider(request => {
            calls++;
            if (request.purpose === 'thought-extraction') return { units: [{ text: 'I like HCI', sourceQuotes: ['not source'] }] };
            if (request.purpose === 'ingestion-repair') return { units: [{ text: 'I like HCI', sourceQuotes: ['I like HCI'] }] };
            throw new Error('unexpected');
        }), text, 'input-6');
        expect(result.repaired).toBe(true);
        expect(result.units).toHaveLength(1);
        expect(calls).toBe(2);
    });
    it('returns zero units instead of inventing meaning', async () => {
        const result = await extractThoughts(provider(() => ({ units: [] })), 'Anything at all.', 'input-7');
        expect(result.units).toEqual([]);
    });
});
