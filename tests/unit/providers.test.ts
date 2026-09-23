import { afterEach, describe, expect, it, vi } from 'vitest';
import { DIRECT_PROVIDERS, WIRE_PROTOCOLS, isDirectProvider, outputBudget, reasoningEffort, type WireProtocol } from '../../src/ai/providers.ts';
import { buildRequest, readModelList, readWireText, WireOutputError, type WireOptions } from '../../src/ai/wire.ts';
import { classifyFailure, failureForStatus, ThinkingError, type ThinkingFailure } from '../../src/ai/errors.ts';
import { fetchSend } from '../../src/ai/transport.ts';
import { DirectAIProvider, type DirectConfig } from '../../src/ai/direct.ts';
import { HTTPResponseError } from '../../src/shared/http.ts';
import { compileContext } from '../../src/ai/context.ts';
import { demoProject } from '../../src/core/demo.ts';

const API_KEY = 'test-secret-key-0123';
const baseOf = (id: keyof typeof DIRECT_PROVIDERS): string => DIRECT_PROVIDERS[id].baseUrl || 'https://compatible.example/v1';

/** Every build below pins its own base URL, so a URL assertion is about the protocol route and never
 * about which default host a provider table happens to carry today. */
function wire(id: keyof typeof DIRECT_PROVIDERS, extra: Partial<WireOptions> = {}, protocol?: WireProtocol) {
    return buildRequest(DIRECT_PROVIDERS[id], {
        baseUrl: baseOf(id), model: 'a-model', instructions: 'SYS', input: 'USER',
        budget: null, effort: null, apiKey: API_KEY, ...extra,
    }, protocol ?? DIRECT_PROVIDERS[id].protocol);
}

describe('the provider table names four genuinely different wire protocols', () => {
    it('classifies direct providers and only those', () => {
        expect(isDirectProvider('openai')).toBe(true);
        expect(isDirectProvider('compatible')).toBe(true);
        for (const id of ['off', 'demo', 'gateway'] as const)
            expect(isDirectProvider(id)).toBe(false);
        expect(new Set(WIRE_PROTOCOLS).size).toBe(4);
    });

    it('OpenAI Responses uses text.format and max_output_tokens', () => {
        const request = wire('openai', { budget: 700 });
        expect(request.url).toBe('https://api.openai.com/v1/responses');
        expect(request.method).toBe('POST');
        expect(request.headers.Authorization).toBe('Bearer ' + API_KEY);
        expect(request.headers['Content-Type']).toBe('application/json');
        const body = request.body;
        expect((body.text as { format: { type: string } }).format).toEqual({ type: 'json_object' });
        expect(body.max_output_tokens).toBe(700);
        // The names the other protocols use must never leak in here.
        expect(body.max_tokens).toBeUndefined();
        expect(body.response_format).toBeUndefined();
        expect(body.messages).toBeUndefined();
    });

    it('Anthropic Messages uses max_tokens, x-api-key and anthropic-version', () => {
        const request = wire('anthropic', { budget: 2048 });
        expect(request.url).toBe('https://api.anthropic.com/v1/messages');
        expect(request.method).toBe('POST');
        expect(request.headers['x-api-key']).toBe(API_KEY);
        expect(request.headers.Authorization).toBeUndefined();
        expect(request.headers['anthropic-version']).toBe('2023-06-01');
        const body = request.body;
        expect(body.max_tokens).toBe(2048);
        expect(body.system).toBe('SYS');
        expect(body.max_output_tokens).toBeUndefined();
        expect((body.messages as Array<{ role: string; content: string }>)[0]).toEqual({ role: 'user', content: 'USER' });
    });

    it('Gemini generateContent uses systemInstruction/contents/generationConfig', () => {
        const request = wire('gemini', { budget: 900 });
        expect(request.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/a-model:generateContent');
        expect(request.method).toBe('POST');
        expect(request.headers['x-goog-api-key']).toBe(API_KEY);
        const body = request.body;
        expect((body.systemInstruction as { parts: Array<{ text: string }> }).parts[0].text).toBe('SYS');
        expect((body.contents as Array<{ role: string; parts: Array<{ text: string }> }>)[0]).toEqual({ role: 'user', parts: [{ text: 'USER' }] });
        expect((body.generationConfig as { maxOutputTokens: number }).maxOutputTokens).toBe(900);
        expect((body.generationConfig as { responseMimeType: string }).responseMimeType).toBe('application/json');
        expect(body.messages).toBeUndefined();
        expect(body.max_tokens).toBeUndefined();
    });

    it('DeepSeek chat completions uses response_format and max_tokens', () => {
        const request = wire('deepseek', { budget: 1600 });
        expect(request.url).toBe('https://api.deepseek.com/chat/completions');
        expect(request.headers.Authorization).toBe('Bearer ' + API_KEY);
        const body = request.body;
        expect(body.response_format).toEqual({ type: 'json_object' });
        expect(body.max_tokens).toBe(1600);
        expect((body.messages as Array<{ role: string }>)[0].role).toBe('system');
        expect(body.max_output_tokens).toBeUndefined();
        expect(body.text).toBeUndefined();
        expect(body.systemInstruction).toBeUndefined();
    });

    it('the OpenAI-compatible provider posts to its own base URL with the chat shape', () => {
        const request = wire('compatible', { baseUrl: 'https://local.example/v1/', budget: 700 });
        expect(request.url).toBe('https://local.example/v1/chat/completions');
        expect(request.headers.Authorization).toBe('Bearer ' + API_KEY);
        const body = request.body;
        expect(body.response_format).toEqual({ type: 'json_object' });
        expect(body.max_tokens).toBe(700);
    });

    it('every direct provider builds a distinct request, proving the four are not one shape renamed', () => {
        const signature = (id: keyof typeof DIRECT_PROVIDERS) => {
            const request = wire(id, { budget: 700 });
            return JSON.stringify({ url: new URL(request.url).pathname, keys: Object.keys(request.body).sort(), auth: Object.keys(request.headers).sort() });
        };
        const signatures = new Set(Object.keys(DIRECT_PROVIDERS).map(id => signature(id as keyof typeof DIRECT_PROVIDERS)));
        // openai + gemini + deepseek + compatible + anthropic -> five distinct shapes (deepseek and
        // compatible share a protocol but not a path).
        expect(signatures.size).toBe(5);
    });
});

describe('readWireText normalizes each protocol and refuses to invent a model', () => {
    it('reads Responses, reporting the model the provider named', () => {
        const envelope = { status: 'completed', model: 'gpt-5-2025', output: [{ type: 'message', status: 'completed', content: [{ type: 'output_text', text: 'hello' }] }] };
        expect(readWireText('responses', envelope)).toEqual({ text: 'hello', effectiveModel: 'gpt-5-2025', truncated: false });
    });

    it('reads Anthropic Messages, ignoring thinking blocks and reporting the model', () => {
        const envelope = { model: 'claude-x', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: 'hi' }] };
        expect(readWireText('anthropic-messages', envelope)).toEqual({ text: 'hi', effectiveModel: 'claude-x', truncated: false });
    });

    it('reads Gemini generateContent, reporting modelVersion', () => {
        const envelope = { modelVersion: 'gemini-2.5-pro', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'hey' }] } }] };
        expect(readWireText('gemini-generate-content', envelope)).toEqual({ text: 'hey', effectiveModel: 'gemini-2.5-pro', truncated: false });
    });

    it('reads chat completions and reports a truncation as truncated, not as a failure', () => {
        const complete = { model: 'deepseek-chat', choices: [{ finish_reason: 'stop', message: { content: 'yo' } }] };
        expect(readWireText('chat-completions', complete)).toEqual({ text: 'yo', effectiveModel: 'deepseek-chat', truncated: false });
        const cut = { choices: [{ finish_reason: 'length', message: { content: 'partial' } }] };
        expect(readWireText('chat-completions', cut)).toEqual({ text: 'partial', effectiveModel: null, truncated: true });
    });

    it('reports effectiveModel null when the provider does not say, on every protocol', () => {
        expect(readWireText('responses', { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'x' }] }] }).effectiveModel).toBeNull();
        expect(readWireText('anthropic-messages', { content: [{ type: 'text', text: 'x' }] }).effectiveModel).toBeNull();
        expect(readWireText('gemini-generate-content', { candidates: [{ content: { parts: [{ text: 'x' }] } }] }).effectiveModel).toBeNull();
        expect(readWireText('chat-completions', { choices: [{ message: { content: 'x' } }] }).effectiveModel).toBeNull();
    });

    it('throws WireOutputError on malformed output for each protocol', () => {
        const cases: Array<[WireProtocol, unknown]> = [
            ['responses', { status: 'completed', output: 'not-an-array' }],
            ['responses', { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '   ' }] }] }],
            ['anthropic-messages', { content: 'not-an-array' }],
            ['gemini-generate-content', { candidates: 'not-an-array' }],
            ['chat-completions', { choices: [] }],
            ['chat-completions', { choices: [{ message: { content: 42 } }] }],
        ];
        for (const [protocol, envelope] of cases)
            expect(() => readWireText(protocol, envelope)).toThrow(WireOutputError);
    });

    it('distinguishes a refusal from malformed and incomplete output', () => {
        const caught = (protocol: WireProtocol, envelope: unknown): WireOutputError => {
            try { readWireText(protocol, envelope); }
            catch (error) { return error as WireOutputError; }
            throw new Error('expected a WireOutputError');
        };
        expect(caught('responses', { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }).kind).toBe('refusal');
        expect(caught('chat-completions', { choices: [{ message: { refusal: 'no', content: 'x' } }] }).kind).toBe('refusal');
        expect(caught('responses', { status: 'in_progress', output: [] }).kind).toBe('incomplete');
        expect(caught('chat-completions', { choices: [{ finish_reason: 'content_filter', message: { content: 'x' } }] }).kind).toBe('incomplete');
        expect(caught('anthropic-messages', { content: 'nope' }).kind).toBe('malformed');
    });
});

describe('output budget and reasoning effort are the provider table, not a guess', () => {
    it('sends nothing for auto except where the wire makes a token cap mandatory', () => {
        expect(outputBudget('auto', DIRECT_PROVIDERS.openai)).toBeNull();
        expect(outputBudget('auto', DIRECT_PROVIDERS.gemini)).toBeNull();
        expect(outputBudget('auto', DIRECT_PROVIDERS.deepseek)).toBeNull();
        // Anthropic Messages has no request without max_tokens, so the smallest honest cap is sent.
        expect(outputBudget('auto', DIRECT_PROVIDERS.anthropic)).toBe(2048);
    });

    it('maps each depth to a larger budget, per protocol family', () => {
        expect(outputBudget('light', DIRECT_PROVIDERS.anthropic)).toBe(1024);
        expect(outputBudget('standard', DIRECT_PROVIDERS.anthropic)).toBe(2048);
        expect(outputBudget('deep', DIRECT_PROVIDERS.anthropic)).toBe(4096);
        expect(outputBudget('light', DIRECT_PROVIDERS.openai)).toBe(700);
        expect(outputBudget('standard', DIRECT_PROVIDERS.openai)).toBe(1600);
        expect(outputBudget('deep', DIRECT_PROVIDERS.openai)).toBe(4000);
    });

    it('only Anthropic has a real reasoning-effort control; every other provider gets none', () => {
        expect(reasoningEffort('auto', DIRECT_PROVIDERS.anthropic)).toBeNull();
        expect(reasoningEffort('light', DIRECT_PROVIDERS.anthropic)).toBe('low');
        expect(reasoningEffort('standard', DIRECT_PROVIDERS.anthropic)).toBe('medium');
        expect(reasoningEffort('deep', DIRECT_PROVIDERS.anthropic)).toBe('high');
        for (const id of ['openai', 'gemini', 'deepseek', 'compatible'] as const) {
            for (const depth of ['auto', 'light', 'standard', 'deep'] as const)
                expect(reasoningEffort(depth, DIRECT_PROVIDERS[id])).toBeNull();
        }
    });

    it('emits output_config.effort only for the provider that has the capability', () => {
        const anthropic = wire('anthropic', { effort: 'high', budget: 4096 });
        expect(anthropic.body.output_config).toEqual({ effort: 'high' });
        // A provider that lacks the capability must never receive the field, even if a caller sets it.
        for (const id of ['openai', 'gemini', 'deepseek', 'compatible'] as const) {
            const request = wire(id, { effort: 'high', budget: 700 });
            expect(request.body.output_config).toBeUndefined();
            expect(JSON.stringify(request.body)).not.toContain('effort');
        }
    });
});

describe('readModelList never fails a model listing', () => {
    it('reads the OpenAI data[].id shape', () => {
        expect(readModelList(DIRECT_PROVIDERS.openai, { data: [{ id: 'a' }, { id: 'b' }, { id: 'a' }] })).toEqual(['a', 'b']);
    });

    it('reads the Gemini models[].name shape and strips the models/ prefix', () => {
        expect(readModelList(DIRECT_PROVIDERS.gemini, { models: [{ name: 'models/gemini-2.5-pro' }, { name: 'gemini-2.0' }] })).toEqual(['gemini-2.5-pro', 'gemini-2.0']);
    });

    it('returns an empty list for empty, missing, wrong-typed or non-object bodies, without throwing', () => {
        const cases: unknown[] = [
            { data: [] }, {}, { data: 'not-an-array' }, { data: [null, 3, { id: 5 }] },
            'a string', null, undefined, 42, [], { models: null },
        ];
        for (const envelope of cases) {
            expect(readModelList(DIRECT_PROVIDERS.openai, envelope)).toEqual([]);
            expect(readModelList(DIRECT_PROVIDERS.gemini, envelope)).toEqual([]);
        }
    });
});

describe('DirectAIProvider against an injected transport (never the network)', () => {
    const packet = compileContext(demoProject(), ['attention']);
    const intent = { kind: 'ask' as const, text: 'What is unresolved?', requestId: 'r1' };
    const config = (over: Partial<DirectConfig> = {}): DirectConfig => ({ providerId: 'openai', apiKey: API_KEY, model: 'gpt-5', depth: 'auto', ...over });

    /** A fake transport at the fetch boundary, so the real fetchSend classification runs with no socket. */
    function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const entry = { url: String(input), init: init ?? {} };
            calls.push(entry);
            return handler(entry.url, entry.init);
        });
        vi.stubGlobal('fetch', fake);
        return calls;
    }
    const provider = (over: Partial<DirectConfig> = {}) => new DirectAIProvider(config(over), fetchSend('Test provider'));
    const responsesBody = (text: string, model?: string) => Response.json({ status: 'completed', ...(model ? { model } : {}), output: [{ type: 'message', status: 'completed', content: [{ type: 'output_text', text }] }] });

    afterEach(() => vi.unstubAllGlobals());

    it('returns Diffusion intents plus the requested and effective model on success', async () => {
        const calls = stubFetch(() => responsesBody(JSON.stringify({ intents: [{ type: 'respond_in_field', text: 'A possibility.' }] }), 'gpt-5-2025'));
        const response = await provider().respond(packet, intent);
        expect(response.intents).toEqual([{ type: 'respond_in_field', text: 'A possibility.' }]);
        expect(response.model).toEqual({ requested: 'gpt-5', effective: 'gpt-5-2025' });
        expect(response.mock).toBe(false);
        expect(calls[0].url).toBe('https://api.openai.com/v1/responses');
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer ' + API_KEY);
    });

    it('testConnection reports ok with the effective model', async () => {
        stubFetch(() => responsesBody('ok', 'gpt-5-2025'));
        expect(await provider().testConnection()).toEqual({ ok: true, effectiveModel: 'gpt-5-2025' });
    });

    it('asks for a JSON object and instructs JSON in the same request, on both protocols', async () => {
        // A provider asked for a JSON-object response refuses a context that never mentions JSON
        // before the model runs, and this is true of both spellings below. A check that asks for a
        // JSON object while instructing "the single word: ok" is a contradiction the provider
        // rejects, which is how this failed against an endpoint that was answering fine.
        for (const protocol of ['chat-completions', 'responses'] as const) {
            const calls = stubFetch(() => protocol === 'responses'
                ? responsesBody('{"ok":true}', 'a-model')
                : Response.json({ model: 'a-model', choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] }));
            const direct = new DirectAIProvider({ providerId: 'compatible', apiKey: '', credentialPresent: true, model: 'a-model', baseUrl: 'https://local.example/v1', protocol, depth: 'auto' }, fetchSend('OpenAI compatible'));
            expect(await direct.testConnection(AbortSignal.timeout(5000))).toEqual({ ok: true, effectiveModel: 'a-model' });
            const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
            expect(body.response_format ?? (body.text as { format: unknown }).format).toEqual({ type: 'json_object' });
            expect(JSON.stringify([body.messages, body.instructions, body.input]).toLowerCase()).toContain('json');
            const instruction = Array.isArray(body.messages) ? (body.messages as Array<{ content: string }>)[0].content : String(body.instructions);
            expect(instruction).toBe('Reply only with a JSON object: {"ok":true}.');
        }
    });

    it('gives the Test Connection probe 1024 tokens on both protocols, and only the probe', async () => {
        // A reasoning model can spend a small cap entirely on reasoning and reach it before writing
        // its answer, so the probe asks for room to think and still answer. Each protocol keeps its
        // own spelling of the cap, and neither may carry the other's name.
        for (const protocol of ['chat-completions', 'responses'] as const) {
            const calls = stubFetch(() => protocol === 'responses'
                ? responsesBody('{"ok":true}', 'a-model')
                : Response.json({ model: 'a-model', choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] }));
            const direct = new DirectAIProvider({ providerId: 'compatible', apiKey: '', credentialPresent: true, model: 'a-model', baseUrl: 'https://local.example/v1', protocol, depth: 'auto' }, fetchSend('OpenAI compatible'));
            await direct.testConnection(AbortSignal.timeout(5000));
            const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
            if (protocol === 'responses') {
                expect(body.max_output_tokens).toBe(1024);
                expect(body.max_tokens).toBeUndefined();
            }
            else {
                expect(body.max_tokens).toBe(1024);
                expect(body.max_output_tokens).toBeUndefined();
            }
        }
    });

    it('keeps a real request on the depth mapping, never on the probe budget', async () => {
        // The probe's 1024 is its own: what Diffusion spends on a real answer is still what the depth
        // word maps to, in the protocol's own parameter name.
        const answer = JSON.stringify({ intents: [{ type: 'respond_in_field', text: 'A possibility.' }] });
        const chat = stubFetch(() => Response.json({ model: 'a-model', choices: [{ finish_reason: 'stop', message: { content: answer } }] }));
        await new DirectAIProvider({ providerId: 'compatible', apiKey: '', credentialPresent: true, model: 'a-model', baseUrl: 'https://local.example/v1', protocol: 'chat-completions', depth: 'light' }, fetchSend('OpenAI compatible')).respond(packet, intent);
        const chatBody = JSON.parse(String(chat[0].init.body)) as Record<string, unknown>;
        expect(chatBody.max_tokens).toBe(700);
        expect(chatBody.max_output_tokens).toBeUndefined();

        const responses = stubFetch(() => responsesBody(answer, 'a-model'));
        await provider({ depth: 'light' }).respond(packet, intent);
        const responsesBodySent = JSON.parse(String(responses[0].init.body)) as Record<string, unknown>;
        expect(responsesBodySent.max_output_tokens).toBe(700);
        expect(responsesBodySent.max_tokens).toBeUndefined();
    });

    it('maps transport and provider failures to the bounded vocabulary', async () => {
        const failureOf = async (handler: () => Response | Promise<Response>) => {
            stubFetch(handler);
            return (await provider().testConnection()).failure;
        };
        expect(await failureOf(() => new Response('{"error":{"type":"authentication_error"}}', { status: 401 }))).toBe('authentication-failed');
        expect(await failureOf(() => new Response('{}', { status: 429 }))).toBe('rate-limited');
        expect(await failureOf(() => new Response('{"error":{"type":"rate_limit_error"}}', { status: 400 }))).toBe('rate-limited');
        expect(await failureOf(() => new Response('{"error":{"type":"model_not_found"}}', { status: 400 }))).toBe('model-not-found');
    });

    it('reports malformed provider output as malformed-provider-response on a real answer', async () => {
        stubFetch(() => Response.json({ status: 'completed', output: 'not-an-array' }));
        await expect(provider().respond(packet, intent)).rejects.toMatchObject({ name: 'ThinkingError', failure: 'malformed-provider-response' });
    });

    it('surfaces an aborted request as cancelled', async () => {
        stubFetch(() => { throw new DOMException('aborted', 'AbortError'); });
        const controller = new AbortController();
        controller.abort();
        expect(await provider().testConnection(controller.signal)).toEqual({ ok: false, effectiveModel: null, failure: 'cancelled' });
        let aborted: unknown;
        try { await provider().respond(packet, intent, controller.signal); } catch (error) { aborted = error; }
        expect(classifyFailure(aborted)).toBe('cancelled');
    });

    it('never echoes the API key into a thrown error', async () => {
        const calls = stubFetch(() => new Response('{"error":{"type":"server_error"}}', { status: 500 }));
        let thrown: unknown;
        try { await provider().respond(packet, intent); } catch (error) { thrown = error; }
        expect(thrown).toBeInstanceOf(ThinkingError);
        expect((thrown as Error).message).not.toContain(API_KEY);
        // The key really was in play, so the assertion above is meaningful rather than vacuous.
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer ' + API_KEY);
    });
});

describe('capabilities are declared, not discovered', () => {
    function stubFetch(handler: () => Response | Promise<Response>) {
        const fake = vi.fn(async () => handler());
        vi.stubGlobal('fetch', fake);
        return fake;
    }
    afterEach(() => vi.unstubAllGlobals());

    it('makes no network call and always allows manual model entry', async () => {
        const fake = stubFetch(() => new Response('{}'));
        const direct = new DirectAIProvider({ providerId: 'openai', apiKey: API_KEY, model: 'typed-model', depth: 'auto' }, fetchSend('OpenAI'));
        const capabilities = await direct.capabilities();
        expect(fake).not.toHaveBeenCalled();
        expect(capabilities.allowModelOverride).toBe(true);
        expect(capabilities.configured).toBe(true);
        expect(capabilities.defaultModel).toBe('typed-model');
        expect(capabilities.depth).toEqual({ supported: true, mode: 'output-budget', levels: ['auto', 'light', 'standard', 'deep'] });
    });

    it('still allows a manual model after model discovery fails', async () => {
        const fake = stubFetch(() => { throw new TypeError('offline'); });
        const direct = new DirectAIProvider({ providerId: 'openai', apiKey: API_KEY, model: '', depth: 'auto' }, fetchSend('OpenAI'));
        await expect(direct.listModels()).rejects.toBeInstanceOf(ThinkingError);
        const afterDiscovery = fake.mock.calls.length;
        expect((await direct.capabilities()).allowModelOverride).toBe(true);
        expect(fake.mock.calls.length).toBe(afterDiscovery);
    });
});

describe('failure classification maps the documented statuses', () => {
    it('maps HTTP statuses, including back-pressure and account refusals', () => {
        const expected: Array<[number, ThinkingFailure]> = [
            [401, 'authentication-failed'], [402, 'permission-denied'], [403, 'permission-denied'],
            [404, 'model-not-found'], [408, 'timeout'], [429, 'rate-limited'],
            [500, 'provider-server-error'], [529, 'rate-limited'], [400, 'invalid-configuration'], [418, 'unknown'],
        ];
        for (const [status, failure] of expected)
            expect(failureForStatus(status)).toBe(failure);
    });

    it('lets a provider type token correct a status that would say otherwise', () => {
        expect(failureForStatus(400, 'rate_limit_error')).toBe('rate-limited');
        expect(failureForStatus(500, 'model_not_found')).toBe('model-not-found');
        expect(failureForStatus(400, 'authentication_error')).toBe('authentication-failed');
        expect(failureForStatus(400, 'permission_denied')).toBe('permission-denied');
        expect(failureForStatus(400, 'deadline_exceeded')).toBe('timeout');
    });

    it('attributes arbitrary thrown values without reading their prose', () => {
        expect(classifyFailure(new ThinkingError('rate-limited'))).toBe('rate-limited');
        expect(classifyFailure(new HTTPResponseError(402))).toBe('permission-denied');
        expect(classifyFailure(new HTTPResponseError(529))).toBe('rate-limited');
        expect(classifyFailure(new DOMException('x', 'AbortError'))).toBe('cancelled');
        expect(classifyFailure(new DOMException('x', 'TimeoutError'))).toBe('timeout');
        expect(classifyFailure(new SyntaxError('bad json'))).toBe('malformed-provider-response');
        expect(classifyFailure(new TypeError('fetch failed'))).toBe('provider-unreachable');
        expect(classifyFailure('a string, not an error')).toBe('unknown');
        expect(classifyFailure(undefined)).toBe('unknown');
    });
});
