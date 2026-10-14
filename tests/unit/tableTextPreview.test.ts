import { describe, expect, it } from 'vitest';
import { tableTextPreview } from '../../src/ui/reference/tableTextPreview.ts';
import { searchSnippetPreview } from '../../src/ui/reference/searchSnippetPreview.ts';
import { wordhippoSnippet } from '../fixtures/wordhippoSnippet.ts';

describe('literal table presentation', () => {
    it('cleans the reported collapsed WordHippo table and cuts its related navigation and ad', () => {
        const preview = searchSnippetPreview(wordhippoSnippet, '你好');
        for (const term of ['你好', 'hello to you too', 'hi there', 'hiya', 'hola', 'howdy', 'bonjour']) expect(preview).toContain(term);
        for (const noise of ['|', 'See Also', 'Amazon', 'Nearby Translations', '你多大']) expect(preview).not.toContain(noise);
        expect(wordhippoSnippet).toContain('Amazon');
        expect(tableTextPreview(wordhippoSnippet)).toBe(preview);
    });
    it('keeps populated cell order, negation and punctuation without inventing an answer', () => {
        const raw = '| Claim | Status |\n| --- | --- |\n| 你好 means goodbye | not supported |\n| Other | unknown |';
        expect(tableTextPreview(raw)).toBe('Claim · Status；你好 means goodbye · not supported；Other · unknown');
    });
    it('leaves prose, even prose containing many pipes, unchanged', () => {
        expect(tableTextPreview('Do not delete this context. | a | b | c | d | e | f | g | h |')).toBeNull();
        expect(tableTextPreview('你好 does not mean goodbye.')).toBeNull();
    });
    it('bounds long table previews without splitting Unicode or mutating the original', () => {
        const raw = '| | | ' + '🐈'.repeat(400) + ' | | | tail | | |';
        expect(tableTextPreview(raw)).toBe('🐈'.repeat(360) + '…');
        expect(raw).toContain('tail');
    });
});
