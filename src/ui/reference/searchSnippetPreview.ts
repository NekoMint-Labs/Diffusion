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
    let start = 0;
    if (match > 100) {
        // Omit only complete preceding sentences. Never jump directly to a query:
        // a prefix may carry negation or a qualification even after navigation noise.
        const prefix = plain.slice(0, match);
        const boundaries = [...prefix.matchAll(/[.!?。！？]+["'”’]?\s*/gu)];
        const boundary = boundaries.at(-1);
        if (boundary) start = boundary.index + boundary[0].length;
    }
    const characters = Array.from(plain.slice(start));
    return `${start ? '…' : ''}${characters.slice(0, 360).join('')}${characters.length > 360 ? '…' : ''}`;
}
