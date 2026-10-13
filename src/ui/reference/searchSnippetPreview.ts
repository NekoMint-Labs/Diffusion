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
    // Punctuation alone cannot establish a substantive sentence boundary (quotes,
    // parentheses and abbreviations can all carry it). Keep the bounded source
    // prefix rather than searching for a later query occurrence and losing context.
    const characters = Array.from(plain);
    return `${heading ? '…' : ''}${characters.slice(0, 360).join('')}${characters.length > 360 ? '…' : ''}`;
}
