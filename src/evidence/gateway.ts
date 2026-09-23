import type { EvidencePassage } from '../core/model.ts';
import { boundedJSON } from '../shared/http.ts';
import type { GatewayConfig } from '../ai/contracts.ts';
import type { WebEvidenceProvider, SearchOptions } from './contracts.ts';
import { searchResultsSchema, fetchedSchema, extractedSchema, metadataSchema, reasoningSchema } from './schemas.ts';
import { gatewayURL } from '../ai/gateway.ts';
export class GatewayEvidenceProvider implements WebEvidenceProvider {
    readonly label = 'Configured evidence gateway';
    async reason(claim: string, passages: EvidencePassage[], signal?: AbortSignal) { return reasoningSchema.parse(await this.request('reason', { claim, passages }, signal)); }
    private config: GatewayConfig;
    constructor(config: GatewayConfig) { this.config = config; }
    private async request(action: string, body: unknown, signal?: AbortSignal): Promise<unknown> { const budget = action === 'reason' ? 65000 : 25000; const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(budget)]) : AbortSignal.timeout(budget); const response = await fetch(gatewayURL(this.config, `/api/evidence/${action}`), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}) }, body: JSON.stringify(body), signal: combined }); return boundedJSON(response); }
    async search(query: string, options: SearchOptions = {}) { return searchResultsSchema.parse(await this.request('search', { query, limit: options.limit ?? 5 }, options.signal)).candidates; }
    async fetch(url: string, signal?: AbortSignal) { return fetchedSchema.parse(await this.request('fetch', { url }, signal)); }
    async extract(url: string, query?: string, signal?: AbortSignal) { return extractedSchema.parse(await this.request('extract', { url, query }, signal)).chunks; }
    async metadata(url: string, signal?: AbortSignal) { return metadataSchema.parse(await this.request('metadata', { url }, signal)); }
}
