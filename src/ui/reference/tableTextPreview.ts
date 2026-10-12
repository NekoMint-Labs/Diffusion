/** Presentation only: never replace the fetched passage or assessment input. */
export function tableTextPreview(raw: string): string | null {
    // Only handle an opening pipe table; prose mentioning pipes is left intact.
    if (!/^\s*\|/.test(raw) || (raw.match(/\|/g)?.length ?? 0) < 8) return null;
    const end = raw.search(/\b(?:See Also in (?:Chinese|English)|Nearby Translations|New Story Writing Game!)\b/i);
    const table = end < 0 ? raw : raw.slice(0, end);
    // Empty cells carry no text. Keep the order and wording of all populated cells;
    // separators express layout only, without inferring translations or conclusions.
    const rows = table.split(/\r?\n|\|\s*\|\s*\|/u).map(row => row.split('|')
        .map(cell => cell.trim()).filter(cell => cell && !/^:?-{3,}:?$/.test(cell))
        .join(' · ')).filter(Boolean);
    if (!rows.length) return null;
    const characters = Array.from(rows.join('；'));
    return characters.slice(0, 360).join('') + (characters.length > 360 ? '…' : '');
}
