import { describe, expect, it } from 'vitest';
import { ANSWER_PREVIEW_LIMIT, answerPreview } from '../../src/shared/answerPreview.ts';

describe('bounded answer previews', () => {
    it('keeps short answers and their formatting intact', () => {
        for (const text of ['', 'A provisional answer.', '\u5148\u9a8c\u8bc1\u9700\u6c42\u3002\n\n\u518d\u51b3\u5b9a\u662f\u5426\u5f00\u53d1\u3002', 'x'.repeat(ANSWER_PREVIEW_LIMIT)]) {
            expect(answerPreview(text)).toBe(text);
        }
    });
    it('prefers a compact opening without merging in the detailed explanation', () => {
        const text = 'Only if students need it, test a manual index first.\r\n\r\n' + 'Detailed conditions. '.repeat(20);
        expect(answerPreview(text)).toBe('Only if students need it, test a manual index first.\u2026');
        expect(text).toContain('Detailed conditions.');
    });
    it('bounds long Chinese and Unicode answers including the omission marker', () => {
        for (const text of ['\u9700\u6c42'.repeat(400), '\u{1f9ea}'.repeat(200), '\n\n' + 'A'.repeat(300)]) {
            const preview = answerPreview(text);
            expect(Array.from(preview).length).toBeLessThanOrEqual(ANSWER_PREVIEW_LIMIT);
            expect(preview.endsWith('\u2026')).toBe(true);
            expect(preview).not.toContain('\ufffd');
        }
    });
});
