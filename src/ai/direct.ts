import { CORE_CONTRACT } from '../core/semantics.ts';
import type { AIResponse, ContextPacket, UserIntent } from '../core/semantics.ts';
import { UNKNOWN_CAPABILITIES, THINKING_DEPTHS, type AIProvider, type ConnectionCheck, type ThinkingCapabilities, type ThinkingDepth, type StructuredRequest, type StructuredResponse } from './contracts.ts';
import { ThinkingError, classifyFailure } from './errors.ts';
import { semanticInstructions, parseSemanticText } from './prompt.ts';
import { DIRECT_PROVIDERS, outputBudget, reasoningEffort, structuredDepth, type DirectProviderId, type ProviderDescriptor, type WireProtocol } from './providers.ts';
import { fetchSend, type HttpSend } from './transport.ts';
import { WireOutputError, buildRequest, readModelList, readWireText, type WireRequest } from './wire.ts';

const REQUEST_BUDGET_MS = 45000;

/** What the Test Connection probe may spend. A reasoning model can consume a small cap entirely on
 * reasoning and reach it before writing its answer, so the probe asks for enough room to think and
 * still answer. This is the probe's own number: it is stated here, never derived from a depth word,
 * and it is passed by `testConnection` alone. Real requests keep `outputBudget`'s mapping. */
const TEST_CONNECTION_BUDGET = 1024;

export interface DirectConfig {
    providerId: DirectProviderId;
    /** The session-held secret. In a browser build this is the value the person typed. On Desktop it is
     * empty on purpose: the native transport reads the stored key and places it in the outbound
     * request, so JavaScript only ever learns whether one exists. */
    apiKey: string;
    /** Whether a credential is stored, for a build whose transport owns the secret. Absent means
     * "whatever `apiKey` says", which is the browser path. */
    credentialPresent?: boolean;
    model: string;
    /** Only honoured for a provider whose descriptor permits it. */
    baseUrl?: string;
    protocol?: WireProtocol;
    depth: ThinkingDepth;
}

/** A provider the user configured with their own account.
 *
 * This is the path the audit found missing entirely (P0-1): a key, a model and a request, with no
 * gateway and no build-time configuration in between. The adapter normalizes Diffusion's semantic
 * intent; it does not pretend four different wire protocols are one, and it never touches the
 * Field — Core still owns every decision about what an answer may do.
 */
export class DirectAIProvider implements AIProvider {
    readonly label: string;
    readonly mock = false;
    private readonly config: DirectConfig;
    private readonly descriptor: ProviderDescriptor;
    private readonly protocol: WireProtocol;
    private readonly send: HttpSend;
    /** The most recent model list this session actually saw. Never invented, never persisted as
     * truth: a stale list must not become a claim about what exists today. */
    private models: string[] = [];
    constructor(config: DirectConfig, send?: HttpSend) {
        this.config = config;
        this.descriptor = DIRECT_PROVIDERS[config.providerId];
        this.label = this.descriptor.label;
        this.protocol = config.protocol && this.descriptor.editableProtocol ? config.protocol : this.descriptor.protocol;
        this.send = send ?? fetchSend(this.label);
    }
    /** No network here on purpose. The provider table already knows what this provider supports, and
     * discovering models is a deliberate action rather than something a settings screen does while
     * a person is still typing a URL. */
    async capabilities(): Promise<ThinkingCapabilities> {
        return {
            configured: this.baseUrl() !== '' && (this.hasCredential() || !this.descriptor.requiresKey),
            defaultModel: this.config.model || null,
            models: [...this.models],
            // Manual entry is always allowed: a model list that failed, came back empty or does not
            // exist must never become a dead end.
            allowModelOverride: true,
            // Depth always maps to a real wire parameter for these protocols, so the control is
            // never shown doing nothing. Whether it *also* means reasoning effort is a property of
            // the provider, which the Settings surface reads from the provider table.
            depth: { supported: true, mode: 'output-budget', levels: [...THINKING_DEPTHS] },
        };
    }
    /** A deliberate model listing. A provider that cannot list returns `null`; a listing that fails
     * throws, and the caller shows manual entry rather than an error the user cannot act on. */
    async listModels(signal?: AbortSignal): Promise<string[] | null> {
        if (!this.descriptor.modelsPath) return null;
        const headers: Record<string, string> = { ...this.descriptor.extraHeaders };
        if (this.config.apiKey && this.descriptor.auth) headers[this.descriptor.auth.header] = this.descriptor.auth.prefix + this.config.apiKey;
        const response = await this.rawSend(`${this.baseUrl()}${this.descriptor.modelsPath}`, headers, signal);
        this.models = readModelList(this.descriptor, response);
        return this.models;
    }
    /** The honest readiness probe: the smallest *real* model request this provider accepts.
     *
     * Diffusion is not a general model client, so "the smallest appropriate request" is a bounded
     * chat/response of a few tokens. That costs the user a real request, which the UI says out loud.
     * A check that only proved an endpoint answered would reproduce exactly the false "Connected"
     * the audit rejected. */
    async testConnection(signal?: AbortSignal): Promise<ConnectionCheck> {
        const model = this.config.model.trim();
        if (!model) return { ok: false, effectiveModel: null, failure: 'model-not-found' };
        if (this.descriptor.requiresKey && !this.hasCredential()) return { ok: false, effectiveModel: null, failure: 'authentication-failed' };
        try {
            // The check asks for exactly what a real request asks for, so the instruction has to ask
            // for JSON too: a provider asked for a JSON-object response refuses a context that never
            // mentions JSON before the model ever runs, and both JSON-mode spellings below are
            // subject to it. Asking for one word *and* a JSON object is a request no provider can
            // satisfy, which made this check fail against endpoints that were answering fine.
            //
            // The probe's own budget is 1024, and it is stated here rather than taken from a depth
            // word: a reasoning model may spend every token it is given on reasoning and reach the
            // cap before it writes the object, which is a truncated probe, not a broken endpoint. The
            // number is the probe's own and reaches no other request — a real one is capped by
            // `outputBudget`, which this path never consults.
            const request = buildRequest(this.descriptor, {
                baseUrl: this.baseUrl(), model, instructions: 'Reply only with a JSON object: {"ok":true}.',
                input: 'ok', budget: TEST_CONNECTION_BUDGET, effort: null, apiKey: this.config.apiKey,
            }, this.protocol);
            const envelope = await this.send.send(request, this.combine(signal));
            const result = readWireText(this.protocol, envelope);
            return { ok: result.text.trim().length > 0, effectiveModel: result.effectiveModel };
        }
        catch (error) {
            return { ok: false, effectiveModel: null, failure: classifyFailure(error) };
        }
    }
    async structured(task: StructuredRequest, signal?: AbortSignal): Promise<StructuredResponse> {
        const model = this.config.model.trim();
        if (!model) throw new ThinkingError('model-not-found', this.label);
        if (this.descriptor.requiresKey && !this.hasCredential()) throw new ThinkingError('authentication-failed', this.label);
        // Structured extraction is bounded representation work, so it never inherits the deepest
        // deliberation the person chose for their own thinking. Same mappings, lower ceiling.
        const depth = structuredDepth(this.config.depth);
        const request = buildRequest(this.descriptor, {
            baseUrl: this.baseUrl(), model, instructions: task.instructions, input: JSON.stringify(task.input),
            budget: outputBudget(depth, this.descriptor),
            effort: reasoningEffort(depth, this.descriptor), apiKey: this.config.apiKey,
        }, this.protocol);
        const envelope = await this.send.send(request, this.combine(signal));
        try {
            const result = readWireText(this.protocol, envelope);
            if (result.truncated) throw new ThinkingError('malformed-provider-response', this.label);
            return { value: JSON.parse(result.text), providerLabel: this.label, mock: false, model: { requested: model, effective: result.effectiveModel } };
        }
        catch (error) {
            if (error instanceof ThinkingError) throw error;
            if (error instanceof WireOutputError && error.kind === 'refusal') throw new ThinkingError('semantic-validation-failure', this.label);
            throw new ThinkingError('malformed-provider-response', this.label);
        }
    }
    async respond(packet: ContextPacket, intent: UserIntent, signal?: AbortSignal): Promise<AIResponse> {
        const model = this.config.model.trim();
        if (!model) throw new ThinkingError('model-not-found', this.label);
        if (this.descriptor.requiresKey && !this.hasCredential()) throw new ThinkingError('authentication-failed', this.label);
        const request = buildRequest(this.descriptor, {
            baseUrl: this.baseUrl(), model,
            instructions: CORE_CONTRACT + '\n' + semanticInstructions(intent),
            input: JSON.stringify({ intent, context: { ...packet, contract: CORE_CONTRACT } }),
            budget: outputBudget(this.config.depth, this.descriptor),
            effort: reasoningEffort(this.config.depth, this.descriptor),
            apiKey: this.config.apiKey,
        }, this.protocol);
        const envelope = await this.send.send(request, this.combine(signal));
        let text: string;
        let effectiveModel: string | null;
        try {
            const result = readWireText(this.protocol, envelope);
            text = result.text;
            effectiveModel = result.effectiveModel;
        }
        catch (error) {
            if (error instanceof WireOutputError && error.kind === 'refusal') throw new ThinkingError('semantic-validation-failure', this.label);
            throw new ThinkingError('malformed-provider-response', this.label);
        }
        const intents = parseSemanticText(text);
        return { intents, providerLabel: this.label, mock: false, model: { requested: model, effective: effectiveModel } };
    }
    /** The address actually used. A provider that does not permit a custom base ignores one, so a
     * stale value from another provider can never silently redirect this one's requests. */
    private baseUrl(): string {
        return (this.descriptor.editableBaseUrl ? (this.config.baseUrl ?? '') : this.descriptor.baseUrl).replace(/\/+$/, '');
    }
    private combine(signal?: AbortSignal): AbortSignal {
        const timeout = AbortSignal.timeout(REQUEST_BUDGET_MS);
        return signal ? AbortSignal.any([signal, timeout]) : timeout;
    }
    /** Whether this provider has what it needs to authenticate: a stored credential on a build whose
     * transport owns the secret, or the session value itself in a browser build. */
    private hasCredential(): boolean {
        return this.config.apiKey !== '' || this.config.credentialPresent === true;
    }
    /** A GET for model listings, through the same transport as everything else so one seam owns
     * every outbound provider call. */
    private async rawSend(url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
        const auth = this.descriptor.auth;
        const request: WireRequest = {
            provider: this.config.providerId, url, method: 'GET', headers, body: {},
            ...(auth ? { credential: { header: auth.header, prefix: auth.prefix } } : {}),
        };
        return this.send.send(request, this.combine(signal));
    }
}
/** Provider-table access for the Settings surface, so a label or a key hint is never duplicated in
 * the UI. */
export function descriptorFor(id: DirectProviderId): ProviderDescriptor { return DIRECT_PROVIDERS[id]; }
