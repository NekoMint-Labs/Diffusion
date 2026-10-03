import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readResponseDraft, writeResponseDraft, clearResponseDraft, sameResponseScope } from '../../src/ui/workspace/responseDraft.ts';

let values: Map<string, string>;
beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
    });
});
afterEach(() => vi.unstubAllGlobals());

describe('device-local response drafts', () => {
    it('retains exact authored wording and original references across reopening', () => {
        const text = '  A response with\nits original spacing.  ';
        expect(writeResponseDraft('main', text, ['question', 'removed-reference'])).toBe(true);
        expect(readResponseDraft('main')).toMatchObject({ text, scope: ['question', 'removed-reference'] });
    });
    it('keeps different Fields independent and removes only the cleared draft', () => {
        writeResponseDraft('main', 'Main response', ['a']);
        writeResponseDraft('other', 'Other response', ['b']);
        expect(clearResponseDraft('main')).toBe(true);
        expect(readResponseDraft('main')).toBeNull();
        expect(readResponseDraft('other')?.text).toBe('Other response');
    });
    it('clearing the input does not resurrect an older response on reopening', () => {
        writeResponseDraft('main', 'Old response', ['a']);
        expect(writeResponseDraft('main', '', ['a'])).toBe(true);
        expect(readResponseDraft('main')).toBeNull();
    });
    it('reports unavailable storage without claiming that a write succeeded', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('unavailable'); },
            setItem: () => { throw new Error('quota'); },
            removeItem: () => { throw new Error('unavailable'); },
        });
        expect(readResponseDraft('main')).toBeNull();
        expect(writeResponseDraft('main', 'Keep this in the window', ['a'])).toBe(false);
        expect(clearResponseDraft('main')).toBe(false);
    });
    it('refuses malformed or oversized storage records', () => {
        for (const value of ['not-json', 'null', JSON.stringify({ text: 'draft', scope: ['a', 7] }),
            JSON.stringify({ text: 'draft', scope: [] }), JSON.stringify({ text: 'x'.repeat(12001), scope: ['a'] })]) {
            values.set('diffusion-response-draft:main', value);
            expect(readResponseDraft('main')).toBeNull();
        }
    });
    it('selection order does not change which thoughts a response belongs to', () => {
        expect(sameResponseScope(['a', 'b'], ['b', 'a'])).toBe(true);
        expect(sameResponseScope(['a'], ['b'])).toBe(false);
        expect(sameResponseScope(null, ['a'])).toBe(false);
    });
});
