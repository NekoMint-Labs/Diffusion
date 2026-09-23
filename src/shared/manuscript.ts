export type ManuscriptBlock =
    | { kind: 'paragraph' | 'quote' | 'code'; text: string }
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'list'; items: string[] }
    | { kind: 'table'; headers: string[]; rows: string[][] };
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').slice(0, 8).map(cell => cell.trim());
/** Deliberately small, bounded presentation parser. HTML is always inert text. */
export function parseManuscript(text: string): ManuscriptBlock[] {
    const lines = text.slice(0, 65000).replace(/\r\n?/g, '\n').split('\n');
    const result: ManuscriptBlock[] = [];
    for (let i = 0; i < lines.length && result.length < 350;) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }
        if (/^```/.test(line)) {
            const body: string[] = []; i++;
            while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
            if (i < lines.length) i++;
            result.push({ kind: 'code', text: body.join('\n') }); continue;
        }
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);
        if (heading) { result.push({ kind: 'heading', level: heading[1].length, text: heading[2] }); i++; continue; }
        if (line.includes('|') && lines[i + 1] && cells(lines[i + 1]).length > 1 && cells(lines[i + 1]).every(cell => /^:?-{3,}:?$/.test(cell))) {
            const headers = cells(line); i += 2;
            const rows: string[][] = [];
            while (i < lines.length && lines[i].includes('|') && rows.length < 100) { const row = cells(lines[i++]); rows.push(headers.map((_, index) => row[index] ?? '')); }
            result.push({ kind: 'table', headers, rows }); continue;
        }
        if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\s*(?:[-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
            result.push({ kind: 'list', items }); continue;
        }
        if (/^>\s?/.test(line)) { result.push({ kind: 'quote', text: line.replace(/^>\s?/, '') }); i++; continue; }
        const body = [line]; i++;
        while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>\s?|\s*[-*]\s)/.test(lines[i]) && !(lines[i].includes('|') && lines[i + 1]?.includes('---'))) body.push(lines[i++]);
        result.push({ kind: 'paragraph', text: body.join('\n') });
    }
    return result;
}
export function safeManuscriptURL(value: string): string | null {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
