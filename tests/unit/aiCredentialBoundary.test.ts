import { afterEach, describe, expect, it, vi } from 'vitest';
import { nativeSend, type NativeAiAnswer, type NativeAiBridge, type NativeAiPayload } from '../../src/ai/transport.ts';
import { DirectAIProvider } from '../../src/ai/direct.ts';
import { createThinkingProvider, type ThinkingSelection } from '../../src/ai/registry.ts';
import { DIRECT_PROVIDERS } from '../../src/ai/providers.ts';
import { buildRequest } from '../../src/ai/wire.ts';
import type { CredentialId, CredentialStore } from '../../src/credentials/contracts.ts';
import { compileContext } from '../../src/ai/context.ts';
import { demoProject } from '../../src/core/demo.ts';

const SECRET = 'sk-live-secret-0123456789';
const packet = compileContext(demoProject(), ['attention']);
const intent = { kind: 'ask' as const, text: 'What is unresolved?', requestId: 'r1' };
const selection: ThinkingSelection = { provider: 'openai', model: 'gpt-5', thinkingDepth: 'auto', gateway: '', token: '', baseUrl: '' };
const wireBody = { status: 'completed', output: [{ type: 'message', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify({ intents: [{ type: 'respond_in_field', text: 'A possibility.' }] }) }] }] };

/** The payload that would cross to the desktop shell, and the answer it returns. */
function recordingBridge(answer: NativeAiAnswer | (() => Promise<NativeAiAnswer>) = { status: 200, body: '{}' }) {
    const payloads: NativeAiPayload[] = [];
    const cancels: string[] = [];
    const bridge: NativeAiBridge = {
        async request(payload) { payloads.push(payload); return typeof answer === 'function' ? await answer() : answer; },
        async cancel(requestId) { cancels.push(requestId); },
    };
    return { bridge, payloads, cancels };
}

/** A Desktop credential store. `reveal` throws, so any code path that reads a stored secret fails
 * loudly instead of quietly passing a test. */
function secureStore(present: boolean, seen: CredentialId[] = []): CredentialStore {
    return {
        kind: 'secure',
        async has(id) { seen.push(id); return present; },
        async reveal() { throw new Error('the WebView must not read a stored AI credential'); },
        async store() { /* not exercised here */ },
        async forget() { /* not exercised here */ },
    };
}

/** A browser credential store holding one session value, which is where it legitimately lives. */
function sessionStore(value = SECRET, seen: CredentialId[] = []): CredentialStore {
    return {
        kind: 'session',
        async has() { return value !== ''; },
        async reveal(id) { seen.push(id); return value; },
        async store() { /* not exercised here */ },
        async forget() { /* not exercised here */ },
    };
}

/** The fetch boundary, so the real browser transport runs with no socket. */
function stubFetch(handler: () => Response | Promise<Response>) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init: init ?? {} });
        return handler();
    }));
    return calls;
}

describe('the native transport crosses the boundary with a scheme, never a credential', () => {
    const request = {
        provider: 'openai' as const,
        url: 'https://api.openai.com/v1/responses', method: 'POST' as const,
        headers: { 'Content-Type': 'application/json' }, body: { model: 'gpt-5' },
        credential: { header: 'Authorization', prefix: 'Bearer ' },
    };

    it('states each provider\u2019s own auth scheme instead of flattening the protocols', () => {
        // The scheme comes from the provider table, which this path shares with the browser path: the
        // native layer is told which header to fill and supplies the value itself.
        const schemes = (['openai', 'anthropic', 'gemini', 'deepseek', 'compatible'] as const).map(id => {
            const built = buildRequest(DIRECT_PROVIDERS[id], {
                baseUrl: DIRECT_PROVIDERS[id].baseUrl || 'https://compatible.example/v1', model: 'm',
                instructions: '', input: '', budget: null, effort: null, apiKey: '',
            });
            // No key reached this side, so no credential header was written here at all.
            expect(built.headers.Authorization).toBeUndefined();
            expect(built.headers['x-api-key']).toBeUndefined();
            expect(built.headers['x-goog-api-key']).toBeUndefined();
            return [id, built.credential];
        });
        expect(schemes).toEqual([
            ['openai', { header: 'Authorization', prefix: 'Bearer ' }],
            ['anthropic', { header: 'x-api-key', prefix: '' }],
            ['gemini', { header: 'x-goog-api-key', prefix: '' }],
            ['deepseek', { header: 'Authorization', prefix: 'Bearer ' }],
            ['compatible', { header: 'Authorization', prefix: 'Bearer ' }],
        ]);
    });

    it('names the header the provider table chose and carries no value for it', async () => {
        const { bridge, payloads } = recordingBridge({ status: 200, body: JSON.stringify(wireBody) });
        await nativeSend('OpenAI', bridge).send(request, new AbortController().signal);
        expect(payloads).toHaveLength(1);
        // The provider id is how the native layer knows which credential slot to read; the value is
        // not in the payload at all.
        expect(payloads[0].provider).toBe('openai');
        expect(payloads[0].credentialHeader).toBe('Authorization');
        expect(payloads[0].credentialPrefix).toBe('Bearer ');
        expect(payloads[0].headers.Authorization).toBeUndefined();
        // The prefix is the provider's scheme, not its secret: Diffusion states the scheme and the
        // native layer supplies the value. Assert the value is nowhere in what crosses.
        expect(JSON.stringify(payloads[0])).not.toContain(SECRET);
        expect(JSON.stringify(payloads[0])).not.toMatch(/sk-|api-key-|secret/i);
    });

    it('returns the provider envelope the wire adapter expects', async () => {
        const { bridge } = recordingBridge({ status: 200, body: JSON.stringify(wireBody) });
        await expect(nativeSend('OpenAI', bridge).send(request, new AbortController().signal)).resolves.toEqual(wireBody);
    });

    it('keeps the provider failure taxonomy from the returned status and type token', async () => {
        const failure = async (status: number, body: string) => {
            const { bridge } = recordingBridge({ status, body });
            try { await nativeSend('OpenAI', bridge).send(request, new AbortController().signal); return null; }
            catch (error) { return (error as { failure?: string }).failure; }
        };
        expect(await failure(401, '{"error":{"type":"authentication_error"}}')).toBe('authentication-failed');
        expect(await failure(429, '{"error":{"type":"rate_limit_error"}}')).toBe('rate-limited');
        expect(await failure(400, '{"error":{"type":"model_not_found"}}')).toBe('model-not-found');
        expect(await failure(500, '{}')).toBe('provider-server-error');
    });

    it('refuses a body beyond the transport budget rather than reading it', async () => {
        const { bridge } = recordingBridge({ status: 200, body: 'x'.repeat(512 * 1024 + 1) });
        await expect(nativeSend('OpenAI', bridge).send(request, new AbortController().signal))
            .rejects.toMatchObject({ name: 'ThinkingError', failure: 'malformed-provider-response' });
    });

    it('asks the shell to abandon the request when the caller aborts', async () => {
        const { bridge, cancels } = recordingBridge(() => new Promise<NativeAiAnswer>(() => { /* never answers */ }));
        const controller = new AbortController();
        const pending = nativeSend('OpenAI', bridge).send(request, controller.signal);
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(cancels).toHaveLength(1);
        expect(cancels[0]).toHaveLength(36);
    });
});

describe('a desktop build never reads a stored key', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('builds a provider from presence alone, without revealing the secret', async () => {
        const seen: CredentialId[] = [];
        const provider = await createThinkingProvider(selection, secureStore(true, seen));
        expect(provider).toBeInstanceOf(DirectAIProvider);
        expect(seen).toEqual(['ai.openai']);
    });

    it('reports configured from presence, and refuses a request when nothing is stored', async () => {
        expect((await (await createThinkingProvider(selection, secureStore(true))).capabilities()).configured).toBe(true);
        const missing = await createThinkingProvider(selection, secureStore(false));
        expect((await missing.capabilities()).configured).toBe(false);
        await expect(missing.respond(packet, intent)).rejects.toMatchObject({ name: 'ThinkingError', failure: 'authentication-failed' });
        expect(await missing.testConnection?.()).toEqual({ ok: false, effectiveModel: null, failure: 'authentication-failed' });
    });

    it('sends its request through the native layer and never through fetch', async () => {
        const fetchSpy = vi.fn(() => { throw new Error('the desktop path must not use fetch'); });
        vi.stubGlobal('fetch', fetchSpy);
        const provider = await createThinkingProvider(selection, secureStore(true));
        await expect(provider.respond(packet, intent)).rejects.toMatchObject({ name: 'ThinkingError' });
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('a browser build keeps sending its own request with the session value', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reveals the session value, uses the provider auth header, and parses the answer', async () => {
        const seen: CredentialId[] = [];
        const calls = stubFetch(() => Response.json(wireBody));
        const provider = await createThinkingProvider(selection, sessionStore(SECRET, seen));
        const response = await provider.respond(packet, intent);
        expect(seen).toEqual(['ai.openai']);
        expect(calls[0].url).toBe('https://api.openai.com/v1/responses');
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer ' + SECRET);
        expect(response.intents).toEqual([{ type: 'respond_in_field', text: 'A possibility.' }]);
    });

    it('keeps Anthropic on its own header rather than flattening the protocols', async () => {
        const calls = stubFetch(() => Response.json({ id: 'm', model: 'claude-x', content: [{ type: 'text', text: JSON.stringify({ intents: [] }) }] }));
        const provider = await createThinkingProvider({ ...selection, provider: 'anthropic', model: 'claude-x' }, sessionStore());
        await provider.respond(packet, intent);
        const headers = calls[0].init.headers as Record<string, string>;
        expect(headers['x-api-key']).toBe(SECRET);
        expect(headers.Authorization).toBeUndefined();
    });
});

describe('a custom OpenAI-compatible endpoint still works', () => {
    afterEach(() => vi.unstubAllGlobals());
    const compatible: ThinkingSelection = { ...selection, provider: 'compatible', baseUrl: 'https://local.example/v1' };

    it('is configured without any stored credential, because it may not need one', async () => {
        const provider = await createThinkingProvider(compatible, secureStore(false));
        expect((await provider.capabilities()).configured).toBe(true);
    });

    it('still performs the request natively, with no credential to inject', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        const provider = await createThinkingProvider(compatible, secureStore(false));
        await expect(provider.respond(packet, intent)).rejects.toMatchObject({ name: 'ThinkingError' });
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('reaches the endpoint the person typed, on the session path', async () => {
        const calls = stubFetch(() => Response.json({ choices: [{ message: { content: JSON.stringify({ intents: [] }) } }] }));
        const provider = await createThinkingProvider(compatible, sessionStore(SECRET));
        await provider.respond(packet, intent);
        expect(calls[0].url).toBe('https://local.example/v1/chat/completions');
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer ' + SECRET);
    });
});
