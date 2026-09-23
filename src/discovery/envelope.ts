import { safeWebURL } from '../platform/contracts.ts';
import type { EvidenceCandidate } from '../core/model.ts';
import type { FetchedResource, EvidenceChunk } from '../evidence/contracts.ts';

/** Raised by Diffusion's discovery-envelope boundary. `code` is a fixed token, never upstream text:
 * the engine can put a private message in `error.message`, and none of it is retained. */
export class DiscoveryError extends Error {
    readonly code: string;
    constructor(code: string) { super(`External search ${code}.`); this.name = 'DiscoveryError'; this.code = code; }
}
const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DiscoveryError('invalid-contract');
    return value as Record<string, unknown>;
};
function text(value: unknown, maximum: number): string {
    if (typeof value !== 'string' || value.length > maximum) throw new DiscoveryError('invalid-contract');
    return value;
}
/** Diffusion's discovery envelope: the version-1 JSON contract the bundled engine emits; no pre-v1
 * aliases and no implicit research.
 *
 * This is the *only* place that output shape is known. It lives in `discovery/` rather than in the
 * gateway because it is Diffusion's discovery contract, not a server detail: the bundled desktop
 * engine and the gateway read the identical envelope. The engine is Diffusion-owned source under
 * `internal/discovery-engine/` (provenance in `internal/discovery-engine/PROVENANCE.md`), and the
 * source vocabulary below (Exa/Tavily/Brave) is Diffusion's own. */
export function envelope(raw: string, operation: 'search' | 'read'): Record<string, unknown> {
    return object(envelopeRoot(raw, operation).data);
}
/** The whole validated envelope. Used where the *nature* of the answer matters as much as its
 * data — a degraded multi-source search is a legitimate answer, and the caller must be able to
 * say so rather than reporting a partial result as a complete one. */
export function envelopeRoot(raw: string, operation: 'search' | 'read'): Record<string, unknown> {
    if (raw.length > 1024 * 1024) throw new DiscoveryError('output-too-large');
    let root: Record<string, unknown>;
    try { root = object(JSON.parse(raw)); } catch { throw new DiscoveryError('invalid-contract'); }
    if (root.version !== 1 || root.operation !== operation || !['complete', 'degraded', 'failed'].includes(String(root.status))) throw new DiscoveryError('invalid-contract');
    if (root.status === 'failed') {
        const code = object(root.error).code;
        throw new DiscoveryError(code === 'CONFIGURATION_ERROR' ? 'not-configured' : 'provider-failed');
    }
    if (root.error !== null) throw new DiscoveryError('invalid-contract');
    return root;
}
/** What a search actually reached. `degraded` is the engine's own word for "some sources did not
 * answer": the useful results are kept and the shortfall is reported instead of the whole
 * operation being failed. */
export interface SearchOutcome {
    candidates: EvidenceCandidate[];
    degraded: boolean;
    providers: string[];
}
export function searchOutcome(raw: string, limit = 5): SearchOutcome {
    const root = envelopeRoot(raw, 'search');
    const attempts = Array.isArray(root.attempts) ? root.attempts : [];
    const providers = [...new Set(attempts
        .filter(item => item && typeof item === 'object')
        .filter(item => Number((item as Record<string, unknown>).result_count ?? 0) > 0)
        .map(item => String((item as Record<string, unknown>).provider ?? '').slice(0, 60))
        .filter(Boolean))];
    return { candidates: mapSearch(raw, limit), degraded: root.status === 'degraded', providers };
}
export function searchArguments(query: string, limit = 5): string[] {
    if (!query.trim() || query.length > 3000 || query.includes('\0') || !Number.isInteger(limit) || limit < 1 || limit > 10) throw new DiscoveryError('invalid-request');
    // '--' ensures user text is always the positional query, including leading hyphens.
    return ['search', '--mode', limit <= 3 ? 'fast' : limit <= 5 ? 'balanced' : 'research', '--format', 'json', '--', query];
}
export function readArguments(url: string): string[] {
    return ['read', '--max-chars', '50000', '--format', 'json', '--', safeWebURL(url)];
}
export function mapSearch(raw: string, limit = 5): EvidenceCandidate[] {
    const data = envelope(raw, 'search');
    if (!Array.isArray(data.candidates) || data.candidates.length > 100) throw new DiscoveryError('invalid-contract');
    const seen = new Set<string>();
    const output: EvidenceCandidate[] = [];
    for (const item of data.candidates) {
        const record = object(item);
        const url = safeWebURL(text(record.display_url || record.url, 3000));
        if (seen.has(url)) continue;
        seen.add(url);
        output.push({ id: `candidate-${output.length + 1}`, title: text(record.title, 2000).slice(0, 500) || new URL(url).hostname, url, excerpt: text(record.snippet, 20000).slice(0, 6000), stage: 'candidate', inspected: 'External discovery snippet only; source content has not been read.' });
        if (output.length >= limit) break;
    }
    return output;
}
export function mapRead(raw: string): FetchedResource {
    const record = object(envelope(raw, 'read').evidence);
    const content = text(record.content, 100000);
    const localClip = content.length > 50000;
    if (typeof record.truncated !== 'boolean' || !Number.isInteger(record.returned_length) || (record.returned_length as number) < 0 || !Number.isInteger(record.original_length) || (record.original_length as number) < 0) throw new DiscoveryError('invalid-contract');
    const provider = text(record.provider, 200) || 'configured reader';
    const returned = record.returned_length as number, original = record.original_length as number;
    // Python counts Unicode code points, so do not compare its length to JS UTF-16 units.
    if (returned > original || returned > 50000) throw new DiscoveryError('invalid-contract');
    return { url: safeWebURL(text(record.url, 3000)), title: text(record.title, 2000).slice(0, 500), text: content.slice(0, 50000), inspected: `Reader (${provider}): ${returned} of ${original} reported characters returned${localClip ? '; locally retained at most 50000 UTF-16 units' : ''}${record.truncated ? ' (truncated)' : ''}. Bounded reader output; not a full-document reading claim.` };
}
/** A thin extraction step over an already-fetched reader body, not a second search or reranker. */
export function extractRead(resource: FetchedResource, query = ''): EvidenceChunk[] {
    const terms = [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])].slice(0, 32);
    const blocks: Array<{ text: string; start: number; score: number }> = [];
    const body = resource.text;
    let start = 0;
    while (start < body.length && blocks.length < 200) {
        const boundary = body.indexOf('\n\n', start);
        const end = Math.min(boundary < 0 ? body.length : boundary, start + 2400);
        const segment = body.slice(start, end);
        if (segment.trim().length >= 12) blocks.push({ text: segment, start, score: terms.filter(term => segment.toLocaleLowerCase().includes(term)).length });
        start = end + (end === boundary ? 2 : 0);
        if (end === body.length) break;
    }
    return blocks.sort((a, b) => b.score - a.score || a.start - b.start).slice(0, 4).map(block => ({ text: block.text, locator: `Reader text characters ${block.start + 1}-${block.start + block.text.length} (UTF-16; bounded reader output)`, inspected: resource.inspected.slice(0, 1900) }));
}
