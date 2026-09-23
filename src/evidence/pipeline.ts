import { id, type EvidenceCandidate, type EvidencePassage, type EvidenceReasoning, type SourceRecord } from '../core/model.ts';
import { safeWebURL } from '../platform/contracts.ts';
import type { WebEvidenceProvider } from './contracts.ts';
const outcomes = new Set(['support', 'challenge', 'partial', 'prior-art', 'inconclusive', 'conflicting']);
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); }
/** Search can never smuggle a read stage, outcome, or fabricated passage into Core. */
export function discoveryCandidate(value: EvidenceCandidate): EvidenceCandidate {
    return { id: value.id, title: value.title.slice(0, 500), url: safeWebURL(value.url), excerpt: value.excerpt.slice(0, 6000), stage: 'candidate', inspected: 'Search snippet only; page content has not been read.' };
}
export function hasReadPassages(value: Pick<EvidenceCandidate, 'stage' | 'passages'>): boolean {
    return (value.stage === 'read' || value.stage === 'judged') && !!value.passages?.length && value.passages.length <= 4 && value.passages.every(passage => {
        try { return !!passage.id && !!passage.text.trim() && passage.text.length <= 2500 && !!passage.locator && !!passage.provider && Number.isFinite(passage.retrievedAt) && passage.retrievedAt >= 0 && safeWebURL(passage.url) === passage.url; } catch { return false; }
    });
}
export function readableSource(source: SourceRecord): boolean {
    return source.status !== 'processing' && source.status !== 'unavailable' && !!source.excerpt.trim() && (source.mime !== 'text/uri-list' || !!source.evidence && hasReadPassages(source.evidence));
}
export async function readCandidate(provider: WebEvidenceProvider, value: EvidenceCandidate, query: string, signal?: AbortSignal): Promise<EvidenceCandidate> {
    const candidate = discoveryCandidate(value);
    checkAbort(signal);
    const resource = await provider.fetch(candidate.url, signal);
    checkAbort(signal);
    const finalURL = safeWebURL(resource.url);
    const fetched = resource.text.slice(0, 50000);
    if (!fetched.trim()) return { ...candidate, inspected: 'No sufficient evidence: the fetched source contained no readable text.' };
    const chunks = await provider.extract(candidate.url, query.slice(0, 3000), signal);
    checkAbort(signal);
    const normalized = normalize(fetched);
    // A passage has to occur in the fetched body. Provider snippets/claims alone do not count.
    const verified = chunks.filter(chunk => chunk.text.trim() && normalize(chunk.text).length >= 12 && normalized.includes(normalize(chunk.text)));
    if (!verified.length) return { ...candidate, inspected: 'No sufficient evidence: no extracted passage could be matched to the fetched source.' };
    let remaining = 6000;
    const passages: EvidencePassage[] = [];
    for (const chunk of verified.slice(0, 4)) {
        const text = chunk.text.slice(0, Math.min(2500, remaining));
        if (!text.trim()) break;
        remaining -= text.length;
        passages.push({ id: id('passage'), text, url: finalURL, locator: (chunk.locator || `Fetched text match; ${text.length} characters`).slice(0, 500), inspected: chunk.inspected.slice(0, 1000), retrievedAt: Date.now(), provider: (provider.label || 'Configured evidence gateway').slice(0, 200) });
    }
    return { ...candidate, url: finalURL, title: (resource.title || candidate.title).slice(0, 500), stage: 'read', passages, inspected: `${passages.length} extracted passage(s) matched to fetched text; not the complete document.`, locator: passages.map(passage => passage.locator).join('; ').slice(0, 500) };
}
export function validateReasoning(reasoning: EvidenceReasoning, passages: EvidencePassage[]): EvidenceReasoning {
    const ids = new Set(passages.map(passage => passage.id));
    if (!outcomes.has(reasoning.outcome) || !reasoning.rationale?.trim() || reasoning.rationale.length > 4000 || !reasoning.passageIds?.length || reasoning.passageIds.length > 4 || reasoning.passageIds.some(key => !ids.has(key))) throw new Error('Evidence judgment requires a rationale and references to actually read passages.');
    return { outcome: reasoning.outcome, rationale: reasoning.rationale, passageIds: [...new Set(reasoning.passageIds)] };
}
export async function reasonCandidate(provider: WebEvidenceProvider, candidate: EvidenceCandidate, claim: string, signal?: AbortSignal): Promise<EvidenceCandidate> {
    if (!hasReadPassages(candidate)) throw new Error('Read and extract a source before assessing it against a claim.');
    if (!claim.trim()) throw new Error('A specific claim is required for evidence assessment.');
    if (!provider.reason) throw new Error('This provider can retrieve sources but has no evidence reasoning capability.');
    checkAbort(signal);
    const reasoning = validateReasoning(await provider.reason(claim.slice(0, 3000), candidate.passages!, signal), candidate.passages!);
    checkAbort(signal);
    return { ...candidate, stage: 'judged', judgment: { ...reasoning, claim: claim.slice(0, 3000), at: Date.now(), provider: (provider.label || 'Configured evidence gateway').slice(0, 200) } };
}
