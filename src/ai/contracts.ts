import type { AIResponse, ContextPacket, UserIntent } from '../core/semantics.ts';
import type { ThinkingFailure } from './errors.ts';
export type { AIResponse, ContextPacket, UserIntent, SemanticIntent } from '../core/semantics.ts';
/** How much thinking the user is asking for. A product-level word, not a provider parameter:
 * the gateway decides what it means for the provider it is configured with. */
export type ThinkingDepth = 'auto' | 'light' | 'standard' | 'deep';
export const THINKING_DEPTHS: ThinkingDepth[] = ['auto', 'light', 'standard', 'deep'];
/** What the gateway truthfully reports about itself.
 *
 * `models` is empty when the operator has not declared a list — the product then says
 * "Gateway default" rather than inventing model names. `allowModelOverride` is false unless the
 * operator opted in, so a custom model id is only offered when the backend would accept it.
 * `depth` says whether the gateway actually varies anything; `mode` names how, so the UI can be
 * honest instead of implying a reasoning control that does nothing.
 */
export interface ThinkingCapabilities {
    configured: boolean;
    defaultModel: string | null;
    models: string[];
    allowModelOverride: boolean;
    depth: { supported: boolean; mode: 'output-budget' | 'none'; levels: ThinkingDepth[] };
}
export const UNKNOWN_CAPABILITIES: ThinkingCapabilities = {
    configured: false, defaultModel: null, models: [], allowModelOverride: false,
    depth: { supported: false, mode: 'none', levels: THINKING_DEPTHS },
};

export type StructuredPurpose = 'thought-extraction' | 'thought-extraction-recheck' | 'relation-inference' | 'ingestion-repair';
export interface StructuredRequest {
    purpose: StructuredPurpose;
    instructions: string;
    input: unknown;
}
export interface StructuredResponse {
    value: unknown;
    providerLabel: string;
    mock: boolean;
    model?: { requested: string; effective: string | null };
}

export interface AIProvider {
    readonly label: string;
    readonly mock: boolean;
    respond(packet: ContextPacket, intent: UserIntent, signal?: AbortSignal): Promise<AIResponse>;
    /** A bounded product-owned structured task. Its Zod contract lives with the task, not in SemanticIntent. */
    structured(request: StructuredRequest, signal?: AbortSignal): Promise<StructuredResponse>;
    /** Optional native progressive path. Semantic events must represent complete provider data, never partial JSON guesses. */
    streamStructured?(request: StructuredRequest, signal?: AbortSignal): AsyncGenerator<import('./stream.ts').StructuredStreamEvent>;
    /** What this provider can actually do. Never guessed: an unavailable answer is `UNKNOWN_CAPABILITIES`.
     *
     * For a directly-configured provider this is derived from an inspected provider table and makes
     * no network call: a settings screen must not put a round trip on every keystroke. */
    capabilities(signal?: AbortSignal): Promise<ThinkingCapabilities>;
    /** The deliberate "what models do you offer" action. `null` means the provider has no model
     * listing at all — an honest answer, and never a reason to block manual model entry. */
    listModels?(signal?: AbortSignal): Promise<string[] | null>;
    /** The deliberate "can this actually answer" action. Present only where a real bounded request
     * can be made: a probe that only proves a metadata route answered is not a verification. */
    testConnection?(signal?: AbortSignal): Promise<ConnectionCheck>;
}
/** The result of a deliberate verification. `ok` means the selected provider, credential and model
 * completed a real request; anything less is reported as less. */
export interface ConnectionCheck {
    ok: boolean;
    effectiveModel: string | null;
    failure?: ThinkingFailure;
}
/** The one place a provider request is assembled from a depth, so no product surface has to
 * know a vendor parameter name. `auto` sends no override at all. */
export const DEPTH_OUTPUT_BUDGET: Record<ThinkingDepth, number | null> = {
    auto: null, light: 700, standard: 1600, deep: 4000,
};
export interface GatewayConfig {
    url: string;
    token: string;
    /** Operator-chosen model override. Empty (`''`) keeps the gateway default and is never sent. */
    model?: string;
    /** Requested thinking depth. `auto` sends no override; the gateway decides what it means. */
    depth?: ThinkingDepth;
}
export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Cancelled', 'AbortError'));
            return;
        }
        const done = () => { signal?.removeEventListener('abort', cancel); resolve(); };
        const timer = setTimeout(done, ms);
        const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(new DOMException('Cancelled', 'AbortError')); };
        signal?.addEventListener('abort', cancel, { once: true });
    });
}
