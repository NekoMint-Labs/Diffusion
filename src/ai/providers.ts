import type { ThinkingDepth } from './contracts.ts';

/** The providers a person may actually choose. Diffusion Gateway is a first-class connection on
 * Desktop, not the only way to have AI — that was the audit's P0-1. */
export type ProviderId = 'off' | 'demo' | 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'compatible' | 'gateway';
export type DirectProviderId = Exclude<ProviderId, 'off' | 'demo' | 'gateway'>;
export const PROVIDER_IDS: ProviderId[] = ['off', 'demo', 'openai', 'anthropic', 'gemini', 'deepseek', 'compatible', 'gateway'];
export const DIRECT_PROVIDER_IDS: DirectProviderId[] = ['openai', 'anthropic', 'gemini', 'deepseek', 'compatible'];

/** Wire protocols are genuinely different, so they are named rather than flattened.
 * The abstraction normalizes Diffusion's semantic intent; it never pretends the four request
 * shapes are one. */
export type WireProtocol = 'chat-completions' | 'responses' | 'anthropic-messages' | 'gemini-generate-content';
export const WIRE_PROTOCOLS: WireProtocol[] = ['chat-completions', 'responses', 'anthropic-messages', 'gemini-generate-content'];

/** What a provider can actually do. Only capabilities Diffusion acts on now: a speculative
 * universal AI capability matrix would be a fiction with a schema. */
export interface ProviderCapabilities {
    /** The provider can list its own models. `false` is not a failure and never blocks model entry. */
    modelDiscovery: boolean;
    /** A model id outside any returned list may be entered by hand. */
    manualModel: boolean;
    /** An explicit JSON-object response may be requested on the wire (not schema validation). */
    structuredOutput: boolean;
    /** Whether the provider has a real reasoning control beyond an output budget. Diffusion only
     * shows a thinking control when this is true — never to mirror another provider's parameter. */
    thinking: { supported: boolean; modes: ThinkingDepth[] };
    /** The provider can search the web itself. Kept separate from Diffusion evidence: "the model
     * says it searched" is not a fetched, inspectable passage. */
    nativeWebSearch: boolean;
    vision: boolean;
}

export interface ProviderDescriptor {
    id: DirectProviderId;
    label: string;
    protocol: WireProtocol;
    baseUrl: string;
    /** Only the OpenAI-compatible provider may be pointed somewhere else by the user. */
    editableBaseUrl: boolean;
    /** Protocol may be chosen explicitly. Genuinely necessary for compatible endpoints. */
    editableProtocol: boolean;
    modelsPath: string | null;
    /** How the model list response is shaped. Named per provider, never assumed. */
    modelsShape: 'openai' | 'gemini';
    /** The wire parameter this provider caps output with. Named per provider, never assumed:
     * OpenAI deprecated `max_tokens` in favour of `max_completion_tokens`. */
    maxTokensField: 'max_completion_tokens' | 'max_tokens' | 'max_output_tokens' | 'maxOutputTokens' | null;
    auth: { header: string; prefix: string } | null;
    /** Headers a provider requires beyond authentication. */
    extraHeaders: Record<string, string>;
    requiresKey: boolean;
    keyHint: string;
    capabilities: ProviderCapabilities;
}

/** The provider table. Diffusion's own model names are deliberately absent: a hardcoded list goes
 * stale silently, so the product discovers models and otherwise accepts what the user types. */
export const DIRECT_PROVIDERS: Record<DirectProviderId, ProviderDescriptor> = {
    openai: {
        id: 'openai', label: 'OpenAI', protocol: 'responses',
        baseUrl: 'https://api.openai.com/v1', editableBaseUrl: false, editableProtocol: false,
        modelsPath: '/models', modelsShape: 'openai', maxTokensField: 'max_output_tokens',
        auth: { header: 'Authorization', prefix: 'Bearer ' }, extraHeaders: {}, requiresKey: true,
        keyHint: 'Create a key at platform.openai.com. It is stored in this device\u2019s secure store.',
        capabilities: { modelDiscovery: true, manualModel: true, structuredOutput: true, thinking: { supported: false, modes: [] }, nativeWebSearch: false, vision: true },
    },
    anthropic: {
        id: 'anthropic', label: 'Anthropic', protocol: 'anthropic-messages',
        baseUrl: 'https://api.anthropic.com', editableBaseUrl: false, editableProtocol: false,
        modelsPath: '/v1/models', modelsShape: 'openai', maxTokensField: 'max_tokens',
        auth: { header: 'x-api-key', prefix: '' },
        // Measured, not assumed: Anthropic answers a preflight for this header with
        // `access-control-allow-origin: *`, and refuses the browser origin without it. It is the
        // documented opt-in for exactly this situation — a desktop shell calling the API with a
        // credential the user holds on their own machine.
        extraHeaders: { 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, requiresKey: true,
        keyHint: 'Create a key at console.anthropic.com. It is stored in this device\u2019s secure store.',
        // Anthropic genuinely exposes a reasoning-effort control (`output_config.effort`), so the
        // depth control means two real things here. Every other provider only gets the output
        // budget, and the UI says so rather than implying parity.
        capabilities: { modelDiscovery: true, manualModel: true, structuredOutput: false, thinking: { supported: true, modes: ['light', 'standard', 'deep'] }, nativeWebSearch: true, vision: true },
    },
    gemini: {
        id: 'gemini', label: 'Google Gemini', protocol: 'gemini-generate-content',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta', editableBaseUrl: false, editableProtocol: false,
        modelsPath: '/models', modelsShape: 'gemini', maxTokensField: 'maxOutputTokens',
        auth: { header: 'x-goog-api-key', prefix: '' }, extraHeaders: {}, requiresKey: true,
        keyHint: 'Create a key at aistudio.google.com. It is stored in this device\u2019s secure store.',
        capabilities: { modelDiscovery: true, manualModel: true, structuredOutput: true, thinking: { supported: false, modes: [] }, nativeWebSearch: true, vision: true },
    },
    deepseek: {
        id: 'deepseek', label: 'DeepSeek', protocol: 'chat-completions',
        baseUrl: 'https://api.deepseek.com', editableBaseUrl: false, editableProtocol: false,
        modelsPath: '/models', modelsShape: 'openai', maxTokensField: 'max_tokens',
        auth: { header: 'Authorization', prefix: 'Bearer ' }, extraHeaders: {}, requiresKey: true,
        keyHint: 'Create a key at platform.deepseek.com. It is stored in this device\u2019s secure store.',
        capabilities: { modelDiscovery: true, manualModel: true, structuredOutput: true, thinking: { supported: false, modes: [] }, nativeWebSearch: false, vision: false },
    },
    compatible: {
        id: 'compatible', label: 'OpenAI compatible', protocol: 'chat-completions',
        baseUrl: '', editableBaseUrl: true, editableProtocol: true,
        modelsPath: '/models', modelsShape: 'openai', maxTokensField: 'max_tokens',
        auth: { header: 'Authorization', prefix: 'Bearer ' }, extraHeaders: {}, requiresKey: false,
        keyHint: 'Works with any OpenAI-compatible endpoint, including a local server. Leave blank for an unauthenticated local endpoint.',
        capabilities: { modelDiscovery: true, manualModel: true, structuredOutput: true, thinking: { supported: false, modes: [] }, nativeWebSearch: false, vision: false },
    },
};

export function isDirectProvider(id: ProviderId): id is DirectProviderId {
    return (DIRECT_PROVIDER_IDS as string[]).includes(id);
}

/** Diffusion's depth word -> the output budget on the wire. `auto` sends nothing, so no provider
 * is handed a number the user did not choose — except the Messages API, where `max_tokens` is
 * mandatory and omitting it would be a 400. */
export function outputBudget(depth: ThinkingDepth, descriptor: ProviderDescriptor): number | null {
    if (depth === 'auto') return descriptor.protocol === 'anthropic-messages' ? 2048 : null;
    return descriptor.protocol === 'anthropic-messages'
        ? { light: 1024, standard: 2048, deep: 4096 }[depth]
        : { light: 700, standard: 1600, deep: 4000 }[depth];
}

/** Diffusion's depth word -> the provider's own reasoning-effort word, only where the provider has
 * one. Anything absent here is simply not sent, so no provider receives a parameter it ignores. */
export function reasoningEffort(depth: ThinkingDepth, descriptor: ProviderDescriptor): string | null {
    if (!descriptor.capabilities.thinking.supported || !descriptor.capabilities.thinking.modes.includes(depth)) return null;
    // `auto` has no provider-side word for "you decide", so it is left to the provider by omission.
    return ({ light: 'low', standard: 'medium', deep: 'high' } as Record<string, string>)[depth] ?? null;
}

/** The depth a bounded structured task (extraction, relation inference, repair) is allowed to
 * inherit. A structured request asks for representation, not deliberation: it must not consume the
 * deepest setting the person chose for an open question. `standard` is the ceiling, and every other
 * level passes through untouched, so this is a bound rather than a second thinking vocabulary. */
export function structuredDepth(depth: ThinkingDepth): ThinkingDepth {
    return depth === 'deep' ? 'standard' : depth;
}
