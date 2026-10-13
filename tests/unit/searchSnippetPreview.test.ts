import { describe, expect, it } from 'vitest';
import { searchSnippetPreview } from '../../src/ui/reference/searchSnippetPreview.ts';

describe('search snippets remain short previews rather than evidence or generated answers', () => {
    it('retains a conservative source excerpt when a definition has no safe leading boundary', () => {
        const raw = 'Skip to content Mandarin Temple Beta Come for Knowledge. Stay for Wisdom. Start your Chinese Learning JourneyStart Now 你好 — pronunciations, definitions, and tags | Hanzi | Pinyin | English | Tags | | 你好 | nǐhǎo | hello; hi | HSK 1, l, Easy | nǐhǎo(ni3hao3) T3 1. 1hello; hi Listen to the audio pronunciation 3 times to gain XP May 27, 2026 # 你好nǐhǎo(ni3hao3) 你好 (nǐhǎo) is a common greeting in Mandarin that means \'hello.\' It is used in both formal and informal contexts to acknowledge someone\'s presence.';
        const preview = searchSnippetPreview(raw, '你好');
        expect(preview).toContain('Start your Chinese Learning JourneyStart Now 你好');
        expect(preview).not.toContain('Skip to content');
        expect(Array.from(preview).length).toBeLessThanOrEqual(362);
        expect(raw).toContain('gain XP');
    });
    it.each([
        'Home | Pricing | Documentation | Do not translate 你好 as goodbye; it means hello.',
        'Home | Pricing | Documentation | Only in this example does 你好 mean hello.',
        'Home | Pricing | Documentation | 不要把你好翻译成再见，它表示问候。',
        'Navigation '.repeat(20) + 'Do not translate 你好 as goodbye; it means hello.',
    ])('never starts a mixed navigation preview inside its qualifying sentence: %s', raw => {
        const preview = searchSnippetPreview(raw, '你好');
        if (raw.includes('Do not')) expect(preview).toContain('Do not translate 你好');
        if (raw.includes('Only')) expect(preview).toContain('Only in this example does 你好');
        if (raw.includes('不要')) expect(preview).toContain('不要把你好');
    });
    it('preserves negation and context before a query in an ordinary sentence', () => {
        const raw = 'The greeting 你好 does not mean goodbye; it means hello.';
        expect(searchSnippetPreview(raw, '你好')).toBe(raw);
    });
    it('does not replace the pronunciation snippet with later repeated FAQ headings', () => {
        const raw = 'Site navigation. '.repeat(12) + '你好 — pronunciations | Pinyin | nǐhǎo | hello; hi | ' + '## Frequently Asked Questions 关于你好。'.repeat(30);
        expect(searchSnippetPreview(raw, '你好')).toContain('nǐhǎo');
    });
    it('keeps Chinese and pinyin readable while skipping a long navigation preamble', () => {
        const raw = 'Skip to content Mandarin Temple Beta Come for Knowledge. Stay for Wisdom. Start your Chinese Learning Journey. '.repeat(2) + '你好 — pronunciations | Hanzi | Pinyin | English | 你好 | nǐhǎo | hello; hi | ' + '网页后续内容。'.repeat(200);
        const preview = searchSnippetPreview(raw, '你好');
        expect(preview).toContain('你好');
        expect(preview).toContain('nǐhǎo');
        expect(preview).not.toContain('Skip to content');
        expect(preview).not.toContain('Mandarin Temple');
        expect(Array.from(preview).length).toBeLessThanOrEqual(362);
        expect(raw).toContain('Skip to content');
    });
    it('removes obvious markdown display markers without rewriting multilingual wording', () => {
        const raw = '\\## 你好 **hello; hi** [词典](https://example.org) ![Tile](https://example.org/tile.png) `nǐhǎo` — 您好, xin chào, привет';
        expect(searchSnippetPreview(raw)).toBe('你好 hello; hi 词典 nǐhǎo — 您好, xin chào, привет');
        expect(searchSnippetPreview('你好。## Frequently asked questions')).toBe('你好。 Frequently asked questions');
    });
    it('does not split emoji or invent an answer to an unmatched query', () => {
        const raw = '🐈'.repeat(400);
        expect(searchSnippetPreview(raw, '不相关')).toBe('🐈'.repeat(360) + '…');
    });
    it('leaves a short plain snippet unchanged', () => {
        expect(searchSnippetPreview('你好 means hello; hi.')).toBe('你好 means hello; hi.');
    });
});
