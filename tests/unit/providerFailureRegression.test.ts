import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectAIProvider } from '../../src/ai/direct.ts';
import { classifyFailure } from '../../src/ai/errors.ts';
import { fetchSend } from '../../src/ai/transport.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { createProject, makeThought, type ThinkingOperation } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { compileContext } from '../../src/ai/context.ts';
import type { WireProtocol } from '../../src/ai/providers.ts';

const project = () => { const p = createProject('failure-fixture'); p.thoughts.a = makeThought('A question', { x: 0, y: 0 }, 1, 'a'); return p; };
const packet = () => compileContext(project(), ['a']);
const text = JSON.stringify({ intents: [{ type: 'respond_in_field', text: 'An answer' }] });
const envelope = (protocol: WireProtocol, truncated = false, content = text): unknown => {
    switch (protocol) {
        case 'responses': return { status: truncated ? 'incomplete' : 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: content }] }] };
        case 'anthropic-messages': return { stop_reason: truncated ? 'max_tokens' : 'end_turn', content: [{ type: 'text', text: content }] };
        case 'gemini-generate-content': return { candidates: [{ finishReason: truncated ? 'MAX_TOKENS' : 'STOP', content: { parts: [{ text: content }] } }] };
        default: return { choices: [{ finish_reason: truncated ? 'length' : 'stop', message: { content } }] };
    }
};
const provider = (body: unknown) => new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture', depth: 'standard' }, { kind: 'webview', send: vi.fn(async () => body) });
afterEach(() => vi.unstubAllGlobals());

describe('ordinary and structured provider failures (#42)', () => {
    for (const protocol of ['chat-completions', 'responses', 'anthropic-messages', 'gemini-generate-content'] as const) {
        for (const channel of ['respond', 'structured'] as const) {
            it(`${protocol} ${channel} rejects even parseable JSON marked truncated`, async () => {
                const send = vi.fn(async () => envelope(protocol, true));
                const id = protocol === 'anthropic-messages' ? 'anthropic' : protocol === 'gemini-generate-content' ? 'gemini' : 'compatible';
                const p = new DirectAIProvider({ providerId: id, apiKey: 'fixture-only', model: 'fixture', baseUrl: 'https://fixture.example', protocol, depth: 'standard' }, { kind: 'webview', send });
                const pending = channel === 'respond' ? p.respond(packet(), { kind: 'ask', text: 'Question', requestId: 'r' }) : p.structured({ purpose: 'thought-extraction', instructions: 'Return JSON', input: {} });
                await expect(pending).rejects.toMatchObject({ failure: 'response-truncated' });
                expect(send).toHaveBeenCalledTimes(1);
            });
        }
    }
    it.each([
        ['valid', envelope('chat-completions'), null],
        ['malformed JSON', envelope('chat-completions', false, '{'), 'malformed-provider-response'],
        ['invalid semantics', envelope('chat-completions', false, '{"intents":[{"type":"delete_thought","id":"a"}]}'), 'semantic-validation-failure'],
        ['refusal', { choices: [{ finish_reason: 'stop', message: { refusal: 'private provider prose', content: '' } }] }, 'provider-refused'],
    ] as const)('%s settles without committing model output', async (_name, body, failure) => {
        const p = provider(body);
        const controller = new ProjectController(project(), async () => {});
        const operations: ThinkingOperation[] = [], pending: boolean[] = [], failures: string[] = [];
        const runtime = new AIRuntime(controller, async () => p, { pending: value => pending.push(value), operation: value => operations.push(value), notice() {}, failure: value => failures.push(value), route() {}, anchor: () => ({ x: 300, y: 0 }) });
        try {
            expect((await runtime.run('ask', 'Question', ['a'])).status).toBe(failure ? 'failed' : 'completed');
            expect(operations.at(-1)?.phase).toBe(failure ? 'failed' : 'completed');
            expect(pending.at(-1)).toBe(false);
            expect(failures).toEqual(failure ? [failure] : []);
            expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(failure ? 0 : 1);
            expect(Object.keys(controller.getSnapshot().project.thoughts)).toEqual(['a']);
        } finally { runtime.dispose(); }
    });
    it.each([['TimeoutError', 'timeout'], ['AbortError', 'cancelled'], ['TypeError', 'provider-unreachable']] as const)('preserves %s transport classification', async (name, failure) => {
        vi.stubGlobal('fetch', vi.fn(async () => { if (name === 'TypeError') throw new TypeError('private network details'); throw new DOMException('private transport details', name); }));
        const p = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture', depth: 'standard' }, fetchSend('DeepSeek'));
        const error = await p.respond(packet(), { kind: 'ask', text: 'Question', requestId: 'r' }).catch(error => error);
        expect(classifyFailure(error)).toBe(failure);
    });
    it.each(['TimeoutError', 'AbortError'] as const)('preserves %s while reading the response body', async name => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: new Headers(), text: async () => { throw new DOMException('private details', name); } })));
        const p = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture', depth: 'standard' }, fetchSend('DeepSeek'));
        const error = await p.respond(packet(), { kind: 'ask', text: 'Question', requestId: 'r' }).catch(error => error);
        expect(classifyFailure(error)).toBe(name === 'TimeoutError' ? 'timeout' : 'cancelled');
    });});
