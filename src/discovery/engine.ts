import { ThinkingError, type ThinkingFailure } from '../ai/errors.ts';
import { DiscoveryError, type SearchOutcome } from './envelope.ts';
import type { DiscoveryRuntime } from './runtime.ts';
import type { EvidenceCandidate, EvidencePassage, EvidenceReasoning } from '../core/model.ts';
import type { EvidenceChunk, EvidenceProvenance, FetchedResource, ResourceMetadata, SearchOptions, WebEvidenceProvider } from '../evidence/contracts.ts';

/** Scoped reasoning over read passages. Separated from discovery because whoever can *read* a page
 * and whoever can *think* about it are different capabilities, and either may be missing. */
export interface EvidenceReasoner {
    reason(claim: string, passages: EvidencePassage[], signal?: AbortSignal): Promise<EvidenceReasoning>;
}

/** The engine's own failure codes, translated into the product's vocabulary. An engine that is not
 * installed, not configured, or has no usable source is one honest state: external discovery is
 * unavailable and the Field still works. */
export function discoveryFailure(error: unknown): ThinkingFailure {
    if (!(error instanceof DiscoveryError)) return 'discovery-unavailable';
    switch (error.code) {
        case 'not-installed':
        case 'not-configured':
        case 'invalid-executable':
        case 'execution-failed':
        case 'provider-failed': return 'discovery-unavailable';
        case 'invalid-contract':
        case 'output-too-large': return 'malformed-provider-response';
        default: return 'invalid-configuration';
    }
}

/** Discovery behind one `WebEvidenceProvider`, so the trust pipeline, the surfaces and the Core
 * validation above it are unchanged by which engine answered.
 *
 * Search results are candidates and stay candidates: a snippet is never retained as evidence, and
 * a source whose reading failed stays discovery-only. Being built in buys the engine better
 * ergonomics, never more epistemic authority. */
export class DiscoveryEvidenceProvider implements WebEvidenceProvider {
    readonly label = 'Built-in discovery';
    /** Present only when a reasoner was supplied. Its absence is meaningful: `reasonCandidate`
     * refuses to judge a claim without one, rather than failing later. */
    reason?: (claim: string, passages: EvidencePassage[], signal?: AbortSignal) => Promise<EvidenceReasoning>;
    private readonly runtime: DiscoveryRuntime;
    private outcome: SearchOutcome | null = null;
    constructor(runtime: DiscoveryRuntime, reasoner?: EvidenceReasoner) {
        this.runtime = runtime;
        if (reasoner) this.reason = (claim, passages, signal) => reasoner.reason(claim, passages, signal);
    }
    async search(query: string, options: SearchOptions = {}): Promise<EvidenceCandidate[]> {
        const outcome = await this.attempt(() => this.runtime.search(query, options.limit ?? 5, options.signal ?? new AbortController().signal));
        this.outcome = outcome;
        return outcome.candidates;
    }
    async fetch(url: string, signal?: AbortSignal): Promise<FetchedResource> {
        return this.attempt(() => this.runtime.fetch(url, signal ?? new AbortController().signal));
    }
    async extract(url: string, query?: string, signal?: AbortSignal): Promise<EvidenceChunk[]> {
        return this.attempt(() => this.runtime.extract(url, query ?? '', signal ?? new AbortController().signal));
    }
    async metadata(url: string, signal?: AbortSignal): Promise<ResourceMetadata> {
        return this.attempt(() => this.runtime.metadata(url, signal ?? new AbortController().signal));
    }
    /** What the last search reached, so a result can say whether the internet was used. */
    provenance(): EvidenceProvenance | null {
        const outcome = this.outcome;
        if (!outcome) return null;
        const count = outcome.candidates.length;
        const sources = outcome.providers.join(', ');
        if (!count) return { key: 'External discovery returned no results.', values: {} };
        if (outcome.degraded) return { key: 'External discovery completed with limited sources ({sources}).', values: { sources: sources || 'unknown' } };
        return sources
            ? { key: '{count} external results from {sources}.', values: { count, sources } }
            : { key: '{count} external results.', values: { count } };
    }
    private async attempt<T>(run: () => Promise<T>): Promise<T> {
        try { return await run(); }
        catch (error) {
            if (error instanceof ThinkingError) throw error;
            throw new ThinkingError(discoveryFailure(error));
        }
    }
}
