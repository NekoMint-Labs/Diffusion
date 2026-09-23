import { boundedJSON } from '../shared/http.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type AIResponse, type ContextPacket, type GatewayConfig, type ThinkingCapabilities, type UserIntent, type StructuredRequest, type StructuredResponse } from './contracts.ts';
import { capabilitiesSchema, responseSchema, structuredResponseSchema } from './schemas.ts';
import { structuredDepth } from './providers.ts';
export function gatewayURL(config: GatewayConfig, path: string): string {
    const base = config.url.trim();
    if (!base)
        return path;
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw new Error('Gateway must be an HTTP(S) URL without embedded credentials.');
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        throw new Error('Remote gateways must use HTTPS.');
    return url.href.replace(/\/$/, '') + path;
}
export class GatewayAIProvider implements AIProvider {
    readonly label = 'Configured gateway';
    readonly mock = false;
    private config: GatewayConfig;
    /** One capability answer per provider instance. It is asked once, not before every request:
     * a 45 s round trip to ask permission for a model the gateway already gates server-side is
     * exactly the kind of latency a settings screen must never introduce into thinking. */
    private capabilityPromise: Promise<ThinkingCapabilities> | null = null;
    constructor(config: GatewayConfig) { this.config = config; }
    /** Truthful self-report. A missing or malformed answer is `UNKNOWN_CAPABILITIES`, never a throw:
     * the Settings screen must survive a gateway that cannot describe itself. Model names are never invented. */
    capabilities(signal?: AbortSignal): Promise<ThinkingCapabilities> {
        this.capabilityPromise ??= (async () => {
            try {
                const response = await fetch(gatewayURL(this.config, '/api/capabilities'), { method: 'GET', headers: { ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}) }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
                return capabilitiesSchema.parse(await boundedJSON(response));
            }
            catch {
                this.capabilityPromise = null; // A failed probe is retried on the next explicit ask.
                return UNKNOWN_CAPABILITIES;
            }
        })();
        return this.capabilityPromise;
    }
    async structured(task: StructuredRequest, signal?: AbortSignal): Promise<StructuredResponse> {
        const model = this.config.model ?? '';
        // The same bound the direct path applies: a bounded structured task never inherits the
        // deepest setting, whichever end of the connection turns it into a provider parameter.
        const depth = structuredDepth(this.config.depth ?? 'auto');
        const override = model && (await this.capabilities(signal)).allowModelOverride ? model : '';
        const response = await fetch(gatewayURL(this.config, '/api/structured'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}) }, body: JSON.stringify({ ...task, depth, ...(override ? { model: override } : {}) }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
        const data = structuredResponseSchema.parse(await boundedJSON(response));
        if (!Object.prototype.hasOwnProperty.call(data, 'value'))
            throw new Error('Structured response is missing value');
        return { ...data, value: data.value, providerLabel: data.providerLabel || this.label };
    }
    async respond(packet: ContextPacket, intent: UserIntent, signal?: AbortSignal): Promise<AIResponse> {
        const model = this.config.model ?? '';
        const depth = this.config.depth ?? 'auto';
        // The gateway is the authority on whether an override is allowed; this only avoids sending
        // a model the gateway has already said it would refuse.
        const override = model && (await this.capabilities(signal)).allowModelOverride ? model : '';
        const response = await fetch(gatewayURL(this.config, '/api/respond'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}) }, body: JSON.stringify({ packet, intent, depth, ...(override ? { model: override } : {}) }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
        const data = responseSchema.parse(await boundedJSON(response));
        return { ...data, mock: data.mock, providerLabel: data.providerLabel || this.label };
    }
}
