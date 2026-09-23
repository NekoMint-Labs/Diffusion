import type { AIProvider, ConnectionCheck, ThinkingDepth } from './contracts.ts';
import type { CredentialStore } from '../credentials/contracts.ts';
import { aiCredential } from '../credentials/contracts.ts';
import { DisabledAIProvider, MockAIProvider } from './mock.ts';
import { GatewayAIProvider } from './gateway.ts';
import { DirectAIProvider } from './direct.ts';
import { fetchSend, nativeSend } from './transport.ts';
import { DIRECT_PROVIDERS, isDirectProvider, type ProviderId, type WireProtocol } from './providers.ts';

/** Everything needed to build a provider. A credential is *not* here: it is addressed by the
 * provider id and fetched from the credential store at the moment a request is made, so this
 * object remains safe to keep in React state, to log, and to reason about. */
export interface ThinkingSelection {
    provider: ProviderId;
    model: string;
    thinkingDepth: ThinkingDepth;
    /** Diffusion Gateway address and in-memory session token. */
    gateway: string;
    token: string;
    /** Only used by the OpenAI-compatible provider. */
    baseUrl: string;
    protocol?: WireProtocol;
}

/** Chooses the provider for one request.
 *
 * Async because a secret is fetched from wherever it actually lives — an OS credential store on
 * Desktop — at call time rather than being mirrored into application state. That is the whole
 * point of the credential seam: there is never a second copy to leak.
 */
export async function createThinkingProvider(selection: ThinkingSelection, credentials: CredentialStore): Promise<AIProvider> {
    if (selection.provider === 'demo') return new MockAIProvider();
    if (selection.provider === 'gateway') return new GatewayAIProvider({ url: selection.gateway, token: selection.token, model: selection.model, depth: selection.thinkingDepth });
    if (isDirectProvider(selection.provider)) {
        const providerId = selection.provider;
        const label = DIRECT_PROVIDERS[providerId].label;
        const credential = aiCredential(providerId);
        // An OS-backed store means a native boundary exists, and the same boundary that holds the
        // secret must also be the one that sends the request: the native transport resolves
        // `ai.<provider>` and injects it, and JavaScript is told only whether it is there. A session
        // store has no such boundary, so a browser build keeps sending the request itself with the
        // value it holds for this session — its behaviour is unchanged.
        const native = credentials.kind === 'secure';
        const apiKey = native ? '' : await credentials.reveal(credential);
        return new DirectAIProvider({
            providerId,
            apiKey,
            credentialPresent: native ? await credentials.has(credential) : apiKey !== '',
            model: selection.model, baseUrl: selection.baseUrl, protocol: selection.protocol, depth: selection.thinkingDepth,
        }, native ? nativeSend(label) : fetchSend(label));
    }
    return new DisabledAIProvider();
}

/** The deliberate verification the Settings screen offers.
 *
 * Both actions build the provider exactly the way a real request would, so a passing check is
 * evidence about the path that actually runs rather than about a second implementation. Neither
 * action is ever triggered by editing a field; both are owned by the person pressing the control.
 */
export async function probeProvider(selection: ThinkingSelection, credentials: CredentialStore, action: 'models' | 'connection'): Promise<{ models?: string[] | null; check?: ConnectionCheck }> {
    const provider = await createThinkingProvider(selection, credentials);
    if (action === 'models') {
        if (!provider.listModels) return { models: null };
        return { models: await provider.listModels(AbortSignal.timeout(20000)) };
    }
    if (!provider.testConnection) return { check: undefined };
    return { check: await provider.testConnection(AbortSignal.timeout(30000)) };
}

/** Whether the selected provider can answer at all, without making a request. Used to decide what
 * the composer and Settings are allowed to promise before anything is sent. */
export function providerConfigured(selection: ThinkingSelection): boolean {
    if (selection.provider === 'demo') return true;
    if (selection.provider === 'gateway') return selection.gateway.trim().length > 0;
    if (selection.provider === 'compatible') return selection.baseUrl.trim().length > 0;
    return isDirectProvider(selection.provider);
}
