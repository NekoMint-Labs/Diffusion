import { extractRead, mapRead, readArguments, searchArguments, searchOutcome, type SearchOutcome } from './envelope.ts';
import { safeWebURL } from '../platform/contracts.ts';
import { boundedJSON } from '../shared/http.ts';
import { searchResultsSchema, fetchedSchema, extractedSchema, metadataSchema } from '../evidence/schemas.ts';
import type { EvidenceChunk, FetchedResource, ResourceMetadata } from '../evidence/contracts.ts';

/** How a discovery operation actually reaches an engine.
 *
 * Desktop runs the bundled engine; a self-hosted or enterprise deployment points at the normalized
 * HTTP endpoint; tests inject a fixture. Everything above this line is identical in all three
 * cases, which is what keeps the eventual move from "launch a process" to "call a core API" a
 * transport change rather than a product change. Diffusion never learns which one it got.
 */
export interface DiscoveryRuntime {
    readonly kind: 'built-in' | 'custom';
    search(query: string, limit: number, signal: AbortSignal): Promise<SearchOutcome>;
    fetch(url: string, signal: AbortSignal): Promise<FetchedResource>;
    extract(url: string, query: string, signal: AbortSignal): Promise<EvidenceChunk[]>;
    metadata(url: string, signal: AbortSignal): Promise<ResourceMetadata>;
}

/** Launches the bundled engine once per operation and returns its single-line JSON envelope.
 * The launcher owns the environment; this type only knows the argv contract. */
export type EngineRunner = (args: string[], signal: AbortSignal) => Promise<string>;

/** The built-in engine, reached one operation at a time.
 *
 * One process per operation is a deliberate trade: no daemon to supervise, no idle cost, and no
 * lifecycle to get wrong. The price is process startup per search, which is measured rather than
 * assumed. `ponytail: per-operation spawn; keep a resident process only if startup is measured to
 * dominate a search.`
 */
export class BuiltInDiscoveryRuntime implements DiscoveryRuntime {
    readonly kind = 'built-in' as const;
    /** One reader body per URL, kept only long enough to pair a fetch with its following extract.
     * Memory-only, bounded, and never telemetry. */
    private readonly reads = new Map<string, { resource: FetchedResource; at: number }>();
    private readonly run: EngineRunner;
    private readonly now: () => number;
    private readonly ttl: number;
    constructor(run: EngineRunner, now: () => number = Date.now, ttl = 30000) { this.run = run; this.now = now; this.ttl = ttl; }
    private prune() {
        for (const [key, value] of this.reads) if (this.now() - value.at >= this.ttl) this.reads.delete(key);
        while (this.reads.size >= 16) this.reads.delete(this.reads.keys().next().value!);
    }
    private async read(url: string, signal: AbortSignal): Promise<FetchedResource> {
        const resource = mapRead(await this.run(readArguments(url), signal));
        this.prune();
        this.reads.set(resource.url, { resource, at: this.now() });
        return resource;
    }
    async search(query: string, limit: number, signal: AbortSignal): Promise<SearchOutcome> {
        return searchOutcome(await this.run(searchArguments(query, limit), signal), limit);
    }
    async fetch(url: string, signal: AbortSignal): Promise<FetchedResource> {
        // Always a fresh read: a cached body must never stand in for "this page says so now".
        return this.read(safeWebURL(url), signal);
    }
    async extract(url: string, query: string, signal: AbortSignal): Promise<EvidenceChunk[]> {
        this.prune();
        const key = safeWebURL(url);
        const resource = this.reads.get(key)?.resource ?? await this.read(key, signal);
        this.reads.delete(key);
        return extractRead(resource, query);
    }
    async metadata(url: string, signal: AbortSignal): Promise<ResourceMetadata> {
        const resource = await this.read(safeWebURL(url), signal);
        return { url: resource.url, title: resource.title };
    }
}

/** An operator-chosen normalized HTTP endpoint, for self-hosting, an enterprise deployment, an
 * alternate engine or a test fixture. It speaks the same four-route contract the Diffusion Gateway
 * already serves, so this is the existing boundary at a different address rather than a second
 * discovery implementation. */
export class CustomDiscoveryRuntime implements DiscoveryRuntime {
    readonly kind = 'custom' as const;
    private readonly base: string;
    private readonly token: string;
    private readonly budget: number;
    constructor(base: string, token = '', budget = 25000) {
        this.base = base.replace(/\/+$/, '');
        this.token = token;
        this.budget = budget;
    }
    private async call(route: string, body: unknown, signal: AbortSignal): Promise<unknown> {
        const response = await fetch(`${this.base}/${route}`, {
            method: 'POST', redirect: 'error',
            headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
            body: JSON.stringify(body),
            signal: AbortSignal.any([signal, AbortSignal.timeout(this.budget)]),
        });
        return boundedJSON(response);
    }
    async search(query: string, limit: number, signal: AbortSignal): Promise<SearchOutcome> {
        const data = searchResultsSchema.parse(await this.call('search', { query, limit }, signal));
        // A plain normalized endpoint does not report per-source attempts, so this says exactly
        // that rather than inventing a provenance it does not have.
        return { candidates: data.candidates, degraded: false, providers: [] };
    }
    async fetch(url: string, signal: AbortSignal): Promise<FetchedResource> {
        return fetchedSchema.parse(await this.call('fetch', { url }, signal));
    }
    async extract(url: string, query: string, signal: AbortSignal): Promise<EvidenceChunk[]> {
        return extractedSchema.parse(await this.call('extract', { url, query }, signal)).chunks;
    }
    async metadata(url: string, signal: AbortSignal): Promise<ResourceMetadata> {
        return metadataSchema.parse(await this.call('metadata', { url }, signal));
    }
}
