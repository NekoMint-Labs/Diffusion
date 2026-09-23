import type { SourceStatus } from '../core/model.ts';
export const TEXT_READ_LIMIT = 256 * 1024;
export const EXCERPT_LIMIT = 6000;
export const ORIGINAL_LIMIT = 32 * 1024 * 1024;
export interface ExtractInput {
    name: string;
    mime: string;
    size: number;
    bytes?: ArrayBuffer;
    error?: string;
}
export interface Extraction {
    status: SourceStatus;
    excerpt: string;
    inspected: string;
    error?: string;
}
export function isTextSource(name: string, mime: string) { return mime.startsWith('text/') || /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|js|mjs|cjs|ts|tsx|jsx|py|rs|c|cpp|h|java|sh|yaml|yml|toml|log|rst|tex)$/i.test(name) || ['application/json', 'application/xml'].includes(mime); }
export function extractBytes(input: ExtractInput): Extraction {
    if (input.error)
        return { status: 'unavailable', excerpt: '', inspected: 'Metadata only; content could not be read.', error: input.error };
    if (!isTextSource(input.name, input.mime))
        return { status: 'limited', excerpt: '', inspected: 'Metadata only: filename, media type and size. No PDF, image, audio, video or office-document content was inspected.' };
    if (!input.bytes)
        return { status: 'limited', excerpt: '', inspected: 'Metadata only. Original bytes were not available within the local resource budget.' };
    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(input.bytes, { stream: input.size > input.bytes.byteLength });
    }
    catch {
        return { status: 'limited', excerpt: '', inspected: 'A bounded byte sample was attempted; it was not valid UTF-8. No text interpretation is available.' };
    }
    if (text.includes('\0'))
        return { status: 'limited', excerpt: '', inspected: 'The bounded sample appears binary despite its filename. Content was not interpreted.' };
    const clipped = text.length > EXCERPT_LIMIT || input.size > input.bytes.byteLength;
    return { status: clipped ? 'limited' : 'ready', excerpt: text.slice(0, EXCERPT_LIMIT), inspected: clipped ? `UTF-8 prefix: ${Math.min(input.bytes.byteLength, input.size)} of ${input.size} bytes examined; first ${Math.min(text.length, EXCERPT_LIMIT)} characters retained. No claim about the remainder.` : `Entire UTF-8 text decoded (${input.size} bytes; ${text.length} characters). Raw markup/code is not executed.` };
}
