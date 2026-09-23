import type { DirectProviderId, ProviderDescriptor, WireProtocol } from './providers.ts';

/** One wire request, fully assembled. Transport is a separate concern: the same request can be
 * sent by the browser, by the desktop shell, or inspected by a fixture. */
export interface WireRequest {
    /** Which provider this request is for. The desktop transport needs it to name the credential slot
     * the native layer must resolve, and it comes from the same descriptor that shaped the request. */
    provider: DirectProviderId;
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body: Record<string, unknown>;
    /** The provider's own auth scheme, when it has one.
     *
     * Diffusion states the scheme on the request instead of keeping a second copy per platform: a
     * browser transport already carries the secret in `headers`, and the desktop transport uses this
     * to place the secret its native layer read from the operating system's store. This field holds a
     * header *name* and a prefix — never a value. */
    credential?: { header: string; prefix: string };
}
export interface WireOptions {
    baseUrl: string;
    model: string;
    instructions: string;
    input: string;
    /** Provider-native output cap, already resolved from Diffusion's depth word. */
    budget: number | null;
    /** Provider-native reasoning effort, already resolved. Only sent where it is real. */
    effort: string | null;
    apiKey: string;
}
/** The text a provider produced, plus whatever it truthfully reported about which model ran.
 * `effectiveModel` is null — never a guess — when the provider does not say. */
export interface WireResult {
    text: string;
    effectiveModel: string | null;
    /** A provider-reported reason the output is not complete, when it names one. */
    truncated: boolean;
}
export class WireOutputError extends Error {
    readonly kind: 'malformed' | 'incomplete' | 'refusal';
    constructor(kind: 'malformed' | 'incomplete' | 'refusal') { super(`Provider output was ${kind}.`); this.name = 'WireOutputError'; this.kind = kind; }
}
const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WireOutputError('malformed');
    return value as Record<string, unknown>;
};
const bounded = (value: unknown, maximum: number): string => typeof value === 'string' && value.length <= maximum ? value : '';

/** Assembles the request for one provider. Each protocol keeps its own parameter names: the four
 * are not one shape wearing four names, and pretending otherwise is how a silent no-op parameter
 * gets shipped. */
export function buildRequest(descriptor: ProviderDescriptor, options: WireOptions, protocol: WireProtocol = descriptor.protocol): WireRequest {
    const request = assembleRequest(descriptor, options, protocol);
    return {
        ...request,
        provider: descriptor.id,
        // The provider's own auth scheme travels with the request, so the desktop transport can place
        // the secret without a second copy of the provider table and without a second copy of the key.
        ...(descriptor.auth ? { credential: { header: descriptor.auth.header, prefix: descriptor.auth.prefix } } : {}),
    };
}

function assembleRequest(descriptor: ProviderDescriptor, options: WireOptions, protocol: WireProtocol): Omit<WireRequest, 'provider' | 'credential'> {
    const base = options.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...descriptor.extraHeaders };
    if (options.apiKey && descriptor.auth) headers[descriptor.auth.header] = descriptor.auth.prefix + options.apiKey;
    const model = options.model.trim();
    if (protocol === 'anthropic-messages') return {
        url: `${base}/v1/messages`, method: 'POST', headers,
        body: {
            model, max_tokens: options.budget ?? 2048, system: options.instructions,
            messages: [{ role: 'user', content: options.input }],
            ...(options.effort ? { output_config: { effort: options.effort } } : {}),
        },
    };
    if (protocol === 'gemini-generate-content') return {
        url: `${base}/models/${encodeURIComponent(model)}:generateContent`, method: 'POST', headers,
        body: {
            systemInstruction: { parts: [{ text: options.instructions }] },
            contents: [{ role: 'user', parts: [{ text: options.input }] }],
            generationConfig: {
                ...(descriptor.capabilities.structuredOutput ? { responseMimeType: 'application/json' } : {}),
                ...(options.budget ? { maxOutputTokens: options.budget } : {}),
            },
        },
    };
    if (protocol === 'responses') return {
        url: `${base}/responses`, method: 'POST', headers,
        body: {
            model, stream: false, store: false, instructions: options.instructions,
            input: [{ role: 'user', content: options.input }],
            ...(descriptor.capabilities.structuredOutput ? { text: { format: { type: 'json_object' } } } : {}),
            ...(options.budget ? { max_output_tokens: options.budget } : {}),
        },
    };
    return {
        url: `${base}/chat/completions`, method: 'POST', headers,
        body: {
            model, stream: false,
            messages: [{ role: 'system', content: options.instructions }, { role: 'user', content: options.input }],
            ...(descriptor.capabilities.structuredOutput ? { response_format: { type: 'json_object' } } : {}),
            ...(options.budget && descriptor.maxTokensField ? { [descriptor.maxTokensField]: options.budget } : {}),
        },
    };
}

/** Reads the model's text out of each protocol's own envelope, and reports the model the provider
 * says it used. Nothing here invents an identity the provider withheld. */
export function readWireText(protocol: WireProtocol, envelope: unknown): WireResult {
    const root = object(envelope);
    let text = '';
    let effectiveModel: string | null = null;
    let truncated = false;
    if (protocol === 'responses') {
        if (root.status === 'incomplete') truncated = true;
        else if (root.status && root.status !== 'completed') throw new WireOutputError('incomplete');
        effectiveModel = bounded(root.model, 200) || null;
        if (!Array.isArray(root.output)) throw new WireOutputError('malformed');
        for (const item of root.output.slice(0, 32)) {
            const message = object(item);
            if (message.type !== 'message') continue; // Reasoning/tool metadata is never executable intent.
            if (message.status === 'incomplete') truncated = true;
            else if (message.status && message.status !== 'completed') throw new WireOutputError('incomplete');
            if (!Array.isArray(message.content)) throw new WireOutputError('malformed');
            for (const value of message.content.slice(0, 32)) {
                const part = object(value);
                if (part.type === 'refusal') throw new WireOutputError('refusal');
                if (part.type === 'output_text') text += bounded(part.text, 200000);
            }
        }
    }
    else if (protocol === 'anthropic-messages') {
        effectiveModel = bounded(root.model, 200) || null;
        if (root.stop_reason === 'max_tokens') truncated = true;
        if (!Array.isArray(root.content)) throw new WireOutputError('malformed');
        for (const value of root.content.slice(0, 64)) {
            const part = object(value);
            // Thinking blocks are the model's private working, not the answer.
            if (part.type === 'text') text += bounded(part.text, 200000);
        }
    }
    else if (protocol === 'gemini-generate-content') {
        effectiveModel = bounded(root.modelVersion, 200) || null;
        if (!Array.isArray(root.candidates)) throw new WireOutputError('malformed');
        const candidate = object(root.candidates[0]);
        if (typeof candidate.finishReason === 'string' && candidate.finishReason.toUpperCase() === 'MAX_TOKENS') truncated = true;
        const content = candidate.content;
        if (content !== undefined) {
            const parts = object(content).parts;
            if (!Array.isArray(parts)) throw new WireOutputError('malformed');
            for (const value of parts.slice(0, 64)) text += bounded(object(value).text, 200000);
        }
    }
    else {
        if (!Array.isArray(root.choices) || !root.choices.length) throw new WireOutputError('malformed');
        const choice = object(root.choices[0]);
        effectiveModel = bounded(root.model, 200) || null;
        if (choice.finish_reason === 'length') truncated = true;
        else if (choice.finish_reason && choice.finish_reason !== 'stop') throw new WireOutputError('incomplete');
        const message = object(choice.message);
        if (message.refusal) throw new WireOutputError('refusal');
        if (typeof message.content !== 'string') throw new WireOutputError('malformed');
        text = bounded(message.content, 200000);
    }
    if (!text.trim()) throw new WireOutputError('malformed');
    return { text, effectiveModel, truncated };
}

/** Reads the provider's own model list. An empty list is a valid, honest answer and never an
 * error: model discovery failing must not block manual model entry. */
export function readModelList(descriptor: ProviderDescriptor, envelope: unknown): string[] {
    let root: Record<string, unknown>;
    try { root = object(envelope); } catch { return []; }
    const raw = descriptor.modelsShape === 'gemini' ? root.models : root.data;
    if (!Array.isArray(raw)) return [];
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const item of raw.slice(0, 2000)) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const value = descriptor.modelsShape === 'gemini'
            ? (typeof record.name === 'string' ? record.name.replace(/^models\//, '') : '')
            : (typeof record.id === 'string' ? record.id : '');
        const id = value.trim().slice(0, 200);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= 1000) break;
    }
    return ids;
}

/** Extracts only the provider's own failure *type* token — never the message, never the body.
 * This is what lets "401" become "authentication failed" and "429 rate_limit_error" stay a rate
 * limit instead of being flattened into one story. */
export async function errorTypeFrom(response: Response): Promise<string | undefined> {
    try {
        const raw = await response.text();
        // Failure envelopes are small. Anything larger is not a diagnostic we are willing to read.
        if (raw.length > 8192) return undefined;
        const root = JSON.parse(raw) as Record<string, unknown>;
        const error = root?.error;
        if (!error || typeof error !== 'object') return undefined;
        const record = error as Record<string, unknown>;
        const token = record.type ?? record.status ?? record.code;
        return typeof token === 'string' && token.length <= 100 ? token : undefined;
    }
    catch { return undefined; }
}
