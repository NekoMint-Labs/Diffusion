import type { EvidenceCandidate, EvidencePassage, EvidenceReasoning } from '../core/model.ts';
export interface SearchOptions {
    limit?: number;
    signal?: AbortSignal;
}
export interface FetchedResource {
    url: string;
    title: string;
    text: string;
    inspected: string;
}
export interface EvidenceChunk {
    text: string;
    locator?: string;
    inspected: string;
}
export interface ResourceMetadata {
    url: string;
    title: string;
    mime?: string;
}
/** A localizable statement about what a search actually reached. Diffusion's result must make it
 * possible to tell whether the internet was used, without becoming a technical readout. */
export interface EvidenceProvenance {
    key: string;
    values: Record<string, string | number>;
}
export interface WebEvidenceProvider {
    readonly label?: string;
    reason?(claim: string, passages: EvidencePassage[], signal?: AbortSignal): Promise<EvidenceReasoning>;
    search(query: string, options?: SearchOptions): Promise<EvidenceCandidate[]>;
    fetch(url: string, signal?: AbortSignal): Promise<FetchedResource>;
    extract(url: string, query?: string, signal?: AbortSignal): Promise<EvidenceChunk[]>;
    metadata(url: string, signal?: AbortSignal): Promise<ResourceMetadata>;
    /** What the last search reached. `null` before any search has run. */
    provenance?(): EvidenceProvenance | null;
}
