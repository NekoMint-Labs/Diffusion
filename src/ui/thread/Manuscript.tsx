import type { ReactNode } from 'react';
import { parseManuscript, safeManuscriptURL } from '../../shared/manuscript.ts';
function inline(text: string): ReactNode[] {
    const result: ReactNode[] = []; let cursor = 0;
    for (const match of text.matchAll(/\[([^\]\n]{1,180})\]\(([^\s)]+)\)/g)) {
        const index = match.index!; result.push(text.slice(cursor, index));
        const href = safeManuscriptURL(match[2]);
        result.push(href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer">{match[1]}</a> : match[0]);
        cursor = index + match[0].length;
    }
    result.push(text.slice(cursor)); return result;
}
export function Manuscript({ text }: { text: string }) {
    return <div className="structured-manuscript">{parseManuscript(text).map((block, index) => {
        switch (block.kind) {
            case 'heading': return block.level === 1 ? <h2 key={index}>{inline(block.text)}</h2> : <h3 key={index}>{inline(block.text)}</h3>;
            case 'paragraph': return <p key={index}>{inline(block.text)}</p>;
            case 'quote': return <blockquote key={index}>{inline(block.text)}</blockquote>;
            case 'code': return <pre key={index}><code>{block.text}</code></pre>;
            case 'list': return <ul key={index}>{block.items.map((item, key) => <li key={key}>{inline(item)}</li>)}</ul>;
            case 'table': return <div className="manuscript-table" key={index}><table><thead><tr>{block.headers.map((header, key) => <th key={key} scope="col">{inline(header)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowKey) => <tr key={rowKey}>{row.map((cell, key) => <td key={key}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
        }
    })}</div>;
}
