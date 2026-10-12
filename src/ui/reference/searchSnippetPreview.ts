/** A display excerpt, never a replacement for the provider snippet or read evidence. */
import { tableTextPreview } from './tableTextPreview.ts';

export function searchSnippetPreview(raw: string, query = ''): string {
    const table = tableTextPreview(raw);
    if (table !== null) return table;
    const plain = raw
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, '$1')
        .replace(/\\([#*_`|])/g, '$1')
        .replace(/(?:^|\s|(?<=[。！？]))#{1,6}\s+/g, ' ')
        .replace(/(\*\*|__)([\s\S]*?)\1/g, '$2')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\|/g, ' · ')
        .replace(/^\s*Skip to (?:main )?content\s*/i, '')
        .replace(/\s+/g, ' ').trim();
    const term = query.trim();
    // A short literal query can skip a site's leading navigation. Do not infer
    // an answer, translate the source, or choose a passage as read evidence.
    const match = term && Array.from(term).length <= 40 ? plain.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1;
    let start = match > 100 ? match : 0;
    if (match >= 0 && Array.from(term).length <= 40) {
        // Prefer a source sentence over table/navigation fragments. This is literal selection,
        // not an answer: leave negation/context intact and keep the original available to expand.
        const needle = term.toLocaleLowerCase();
        for (const sentence of plain.matchAll(/[^.!?。！？]+[.!?。！？]+["'”’]?/gu)) {
            const text = sentence[0], at = sentence.index;
            if (!text.toLocaleLowerCase().includes(needle)) continue;
            const noise = (text.match(/ · /g)?.length ?? 0) >= 2 || /Listen to the audio pronunciation.*gain XP/i.test(text);
            const candidate = noise ? text.slice(text.toLocaleLowerCase().lastIndexOf(needle)) : text.trimStart();
            if (candidate.length < 24 || candidate.length > 360 || / · /.test(candidate)) continue;
            if (/^(?:Frequently Asked Questions|FAQ\b|Related (?:content|articles)|In other languages|按字母顺序浏览|常见问题)/i.test(candidate)) continue;
            const offset = noise ? text.toLocaleLowerCase().lastIndexOf(needle) : text.length - text.trimStart().length;
            // A long leading navigation preamble is safe to omit; an ordinary short snippet
            // retains its complete sentence, including any words before the query.
            if (at + offset > 0 && (noise || match > 100)) start = at + offset;
            break;
        }
    }
    const characters = Array.from(plain.slice(start));
    return `${start ? '…' : ''}${characters.slice(0, 360).join('')}${characters.length > 360 ? '…' : ''}`;
}
