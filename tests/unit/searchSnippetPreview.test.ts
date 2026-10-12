import { describe, expect, it } from 'vitest';
import { searchSnippetPreview } from '../../src/ui/reference/searchSnippetPreview.ts';

describe('search snippets remain short previews rather than evidence or generated answers', () => {
    it('starts the reported dictionary preview at its definition instead of its pronunciation/XP table', () => {
        const raw = 'Skip to content Mandarin Temple Beta Come for Knowledge. Stay for Wisdom. Start your Chinese Learning JourneyStart Now 你好 — pronunciations, definitions, and tags | Hanzi | Pinyin | English | Tags | | 你好 | nǐhǎo | hello; hi | HSK 1, l, Easy | nǐhǎo(ni3hao3) T3 1. 1hello; hi Listen to the audio pronunciation 3 times to gain XP May 27, 2026 # 你好nǐhǎo(ni3hao3) 你好 (nǐhǎo) is a common greeting in Mandarin that means \'hello.\' It is used in both formal and informal contexts to acknowledge someone\'s presence.';
        expect(searchSnippetPreview(raw, '你好')).toBe('…你好 (nǐhǎo) is a common greeting in Mandarin that means \'hello.\' It is used in both formal and informal contexts to acknowledge someone\'s presence.');
        expect(raw).toContain('gain XP');
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
