/** A display excerpt, never a replacement for the provider snippet or read evidence. */
import { tableTextPreview } from './tableTextPreview.ts';

export function searchSnippetPreview(raw: string, query = ''): string {
    const table = tableTextPreview(raw);
    if (table !== null) return table;
    // Keep the entire explicit heading after the reported pronunciation/XP table,
    // rather than guessing that the last query occurrence begins a definition.
    const term = query.trim();
    const heading = term && Array.from(term).length <= 40
        ? [...raw.matchAll(/(?:^|\s)#{1,6}\s+([^#]+)/gu)].find(match =>
            match[1].trimStart().toLocaleLowerCase().startsWith(term.toLocaleLowerCase())
            && /Listen to the audio pronunciation.*gain XP/i.test(raw.slice(0, match.index))
            && (raw.slice(0, match.index).match(/\|/g)?.length ?? 0) >= 2)
        : undefined;
    const content = heading ? raw.slice(heading.index + heading[0].indexOf(heading[1])) : raw;
    const plain = content
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, '$1')
        .replace(/\\([#*_`|])/g, '$1')
        .replace(/(?:^|\s|(?<=[。！？]))#{1,6}\s+/g, ' ')
        .replace(/(\*\*|__)([\s\S]*?)\1/g, '$2')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\|/g, ' · ')
        .replace(/^\s*Skip to (?:main )?content\s*/i, '')
        .replace(/\s+/g, ' ').trim();
    // A short literal query can skip a site's leading navigation. Do not infer
    // an answer, translate the source, or choose a passage as read evidence.
    const match = term && Array.from(term).length <= 40 ? plain.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1;
    let start = 0;
    if (match > 100) {
        // Omit only complete preceding sentences. Never jump directly to a query:
        // a prefix may carry negation or a qualification even after navigation noise.
        const prefix = plain.slice(0, match);
        const boundaries = [...prefix.matchAll(/[.!?。！？]+["'”’]?\s*/gu)];
        const boundary = boundaries.reverse().find(boundary => {
            if (!boundary[0].startsWith('.')) return true;
            const token = prefix.slice(0, boundary.index).match(/[\p{L}.\d]+$/u)?.[0] ?? '';
            const next = plain.slice(boundary.index + boundary[0].length);
            // Decimal/version punctuation and short/dotted abbreviations are unsafe.
            // A lowercase/non-Latin continuation is ambiguous; retain its prefix.
            return !/[\d.]/u.test(token) && token.length > 3
                && /\s/u.test(boundary[0]) && /^\p{Lu}/u.test(next);
        });
        if (boundary) start = boundary.index + boundary[0].length;
    }
    const characters = Array.from(plain.slice(start));
    return `${start || heading ? '…' : ''}${characters.slice(0, 360).join('')}${characters.length > 360 ? '…' : ''}`;
}
