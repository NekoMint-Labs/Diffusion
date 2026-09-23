import { HTTPResponseError } from '../shared/http.ts';
import { ThinkingError, failureForStatus } from './errors.ts';
import { errorTypeFrom, type WireRequest } from './wire.ts';

const MAX_BYTES = 512 * 1024;

/** Sends one assembled request and returns its parsed body.
 *
 * This is the seam that separates *transport* from *provider semantics*. On Desktop the request
 * leaves through the native layer, which is the only thing that reads the provider credential; in a
 * browser build it leaves through `fetch`, because a browser has no keyring boundary to hide behind
 * and a session-held secret is all there is. Either way no provider adapter and no product surface
 * knows which of the two ran.
 */
export interface HttpSend {
    readonly kind: 'webview' | 'native';
    send(request: WireRequest, signal: AbortSignal): Promise<unknown>;
}

function release(response: Response): void {
    void response.body?.cancel().catch(() => { /* The transport may already be closed. */ });
}

/** A bounded transport with the provider's own failure *type* preserved.
 *
 * The status alone is not enough to be honest: a provider that reports `rate_limit_error` inside a
 * 400 is telling the truth, and flattening it to "bad request" would send the user to fix the
 * wrong thing. Only the type token is read — never the message, which can quote the request. */
export function fetchSend(subject: string): HttpSend {
    return {
        kind: 'webview',
        async send(request, signal) {
            let response: Response;
            try {
                response = await fetch(request.url, {
                    method: request.method,
                    headers: request.headers,
                    ...(request.method === 'POST' ? { body: JSON.stringify(request.body) } : {}),
                    redirect: 'error', signal,
                });
            }
            catch (error) {
                if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) throw error;
                // A rejected fetch is the transport failing: offline, a wrong host, or a refused
                // connection. All three are "could not be reached", not a provider opinion.
                throw new ThinkingError('provider-unreachable', subject);
            }
            if (!response.ok) {
                const type = await errorTypeFrom(response);
                release(response);
                throw new ThinkingError(failureForStatus(response.status, type), subject, response.status);
            }
            const declared = Number(response.headers.get('Content-Length') || 0);
            if (declared > MAX_BYTES) { release(response); throw new ThinkingError('malformed-provider-response', subject); }
            try {
                const body = await response.text();
                // A JSON envelope is always far smaller than the budget; anything larger is not a
                // provider answer, and reading it would only widen the private-data surface.
                if (body.length > MAX_BYTES) throw new ThinkingError('malformed-provider-response', subject);
                return JSON.parse(body) as unknown;
            }
            catch (error) {
                if (error instanceof ThinkingError) throw error;
                // The provider's own malformed body is never retained or quoted.
                throw new ThinkingError('malformed-provider-response', subject);
            }
        },
    };
}

/** Kept so the gateway path's own transport diagnostics stay identical to before this pass. */
export { HTTPResponseError };

/** One request, as it crosses to the desktop shell.
 *
 * It carries the provider's auth *scheme* — a header name and a prefix — and no credential value. The
 * native layer resolves the key from the operating system's credential store, places it in the
 * outbound request and performs the request itself, so a plaintext provider key exists in neither
 * JavaScript memory nor an IPC payload. */
export interface NativeAiPayload {
    requestId: string;
    provider: string;
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    credentialHeader: string | null;
    credentialPrefix: string | null;
    body: Record<string, unknown> | null;
}

/** The native layer's answer: a status and a body it already bounded. */
export interface NativeAiAnswer { status: number; body: string }

/** How a desktop request reaches the native layer.
 *
 * One injectable object rather than an import of the Tauri API spread across the product, for the
 * same reason `EngineRunner` exists for discovery: the boundary is testable, and the product layer
 * above it never learns that a webview shell is what answered. */
export interface NativeAiBridge {
    request(payload: NativeAiPayload): Promise<NativeAiAnswer>;
    /** Ask the shell to abandon an in-flight request. The native layer closes the connection, so a
     * person who stops a request is not billed for one that keeps running. */
    cancel(requestId: string): Promise<void>;
}

async function callNative<T>(command: string, args: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(command, args);
}

export const tauriAiBridge: NativeAiBridge = {
    request: payload => callNative<NativeAiAnswer>('native_ai_request', { ...payload }),
    cancel: async requestId => { await callNative('native_ai_cancel', { requestId }); },
};

function isAbort(error: unknown): boolean {
    return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

/** The desktop transport.
 *
 * Everything observable here is deliberately the same as `fetchSend`: the same failure taxonomy, the
 * same body budget, the same cancellation behaviour. The desktop path must not become a second,
 * differently-behaving provider client — it only changes *who* holds the secret.
 */
export function nativeSend(subject: string, bridge: NativeAiBridge = tauriAiBridge): HttpSend {
    return {
        kind: 'native',
        async send(request, signal) {
            if (signal.aborted) throw signal.reason ?? new DOMException('Cancelled', 'AbortError');
            const requestId = crypto.randomUUID();
            let settled = false;
            const cancelled = new Promise<never>((_, reject) => {
                const onAbort = () => {
                    if (settled) return;
                    // Fire and forget: the local rejection must not wait on the shell answering.
                    void bridge.cancel(requestId).catch(() => { /* A lost cancel is not something the person can act on. */ });
                    reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
                };
                signal.addEventListener('abort', onAbort, { once: true });
            });
            // The losing side of the race must not surface as an unhandled rejection.
            void cancelled.catch(() => { /* Raced and lost, or already reported. */ });
            try {
                const answer = await Promise.race([bridge.request({
                    requestId,
                    provider: request.provider,
                    url: request.url,
                    method: request.method,
                    headers: request.headers,
                    credentialHeader: request.credential?.header ?? null,
                    credentialPrefix: request.credential?.prefix ?? null,
                    body: request.method === 'POST' ? request.body : null,
                }), cancelled]);
                settled = true;
                if (answer.status < 200 || answer.status >= 300) {
                    // The provider's own failure *type* is read from its body exactly as it is on the
                    // webview path, so a 429 that says `rate_limit_error` stays a rate limit.
                    let type: string | undefined;
                    try { type = await errorTypeFrom(new Response(answer.body, { status: answer.status })); }
                    catch { type = undefined; }
                    throw new ThinkingError(failureForStatus(answer.status, type), subject, answer.status);
                }
                // The native layer bounds the body too: the same limit is stated on both sides of a
                // boundary that neither side should have to trust the other about.
                if (answer.body.length > MAX_BYTES) throw new ThinkingError('malformed-provider-response', subject);
                try { return JSON.parse(answer.body) as unknown; }
                catch { throw new ThinkingError('malformed-provider-response', subject); }
            }
            catch (error) {
                settled = true;
                if (error instanceof ThinkingError) throw error;
                // A rejected invoke, or an aborted one, is the transport failing — the same story a
                // rejected `fetch` tells. Its own text is never carried forward.
                if (isAbort(error)) throw error;
                throw new ThinkingError('provider-unreachable', subject);
            }
        },
    };
}
