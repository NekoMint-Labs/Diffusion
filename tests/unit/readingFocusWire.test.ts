import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectAIProvider } from '../../src/ai/direct.ts';
import { GatewayAIProvider } from '../../src/ai/gateway.ts';
import { createGateway } from '../../server/app.ts';
import { loadConfig } from '../../server/config.ts';
import type { StructuredPurpose } from '../../src/ai/contracts.ts';
const value = { intents: [{ type: 'surface_possibility', text: 'A complete answer.', reading: { point: 'A card point.' } }] };
afterEach(() => vi.unstubAllGlobals());
describe('single-call answers retain the user-selected thinking depth', () => {
    it.each([['field-answer', 4000], ['field-reading', 1600]] as const)('direct: %s uses its own budget and returns display metadata once', async (purpose, budget) => {
        const send = vi.fn(async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }], model: 'reported-model' }));
        const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'injected-test-key', model: 'chosen-model', depth: 'deep' }, { kind: 'webview', send });
        const result = await provider.structured({ purpose, instructions: 'Return JSON', input: {} });
        expect(send).toHaveBeenCalledTimes(1);
        expect((send.mock.calls[0] as unknown as [{ body: { max_tokens: number } }])[0].body.max_tokens).toBe(budget);
        expect(result.value).toEqual(value); expect(result.model).toEqual({ requested: 'chosen-model', effective: 'reported-model' });
    });
    it.each([['field-answer', 'deep'], ['field-reading', 'standard']] as const)('gateway client: %s keeps the intended depth without extra generation', async (purpose, depth) => {
        const fetcher = vi.fn(async (_url: unknown, _init?: RequestInit) => Response.json({ value, providerLabel: 'Fixture', mock: false }));
        vi.stubGlobal('fetch', fetcher);
        const provider = new GatewayAIProvider({ url: 'http://127.0.0.1:40001', token: '', depth: 'deep' });
        expect((await provider.structured({ purpose, instructions: 'Return JSON', input: {} })).value).toEqual(value);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ purpose, depth });
    });
    it('gateway server accepts the trial answer purpose and forwards the full depth in one upstream call', async () => {
        const fetcher = vi.fn(async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }));
        const app = createGateway(loadConfig({ AI_MODEL: 'fixture-model', AI_BASE_URL: 'https://fixture.example/v1' }), fetcher as typeof fetch, () => {});
        const purpose: StructuredPurpose = 'field-answer';
        const response = await app.request('/api/structured', { method: 'POST', headers: { Origin: 'http://127.0.0.1:40000', 'Content-Type': 'application/json' },
            body: JSON.stringify({ purpose, instructions: 'Return JSON', input: {}, depth: 'deep' }) });
        expect(response.status).toBe(200); expect((await response.json()).value).toEqual(value);
        expect(fetcher).toHaveBeenCalledTimes(1);
        const call = fetcher.mock.calls[0] as unknown as [string, RequestInit];
        expect(JSON.parse(String(call[1].body)).max_tokens).toBe(4000);
    });
});


describe('unified respond entry preserves originals across direct and gateway transports', () => {
    const original = 'Only if the premise holds, this may be one useful direction. '.repeat(3);
    const point = 'This may be useful if the premise holds.';
    async function context() {
        const { createProject, makeThought } = await import('../../src/core/model.ts');
        const { compileContext } = await import('../../src/ai/context.ts');
        const project = createProject('wire', 'Fixture');
        project.thoughts.a = makeThought('What next?', { x: 0, y: 0 }, 1, 'a');
        return compileContext(project, ['a']);
    }
    it('direct.respond returns the complete original and optional point in exactly one call', async () => {
        const send = vi.fn(async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ intents: [{ type: 'surface_possibility', text: original, reading: { point } }] }) } }], model: 'actual' }));
        const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture', model: 'chosen', depth: 'deep' }, { kind: 'webview', send });
        const result = await provider.respond(await context(), { kind: 'continue', text: 'Continue', requestId: 'r1' });
        expect(result.intents).toEqual([{ type: 'surface_possibility', text: original }]);
        expect(result.presentation?.points.get(original)).toBe(point);
        expect(send).toHaveBeenCalledTimes(1);
        expect((send.mock.calls[0] as unknown as [{ body: { max_tokens: number } }])[0].body.max_tokens).toBe(4000);
    });
    it('gateway.respond uses the existing endpoint and shares the direct parser, without a second request', async () => {
        const upstream = vi.fn(async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ intents: [{ type: 'surface_possibility', text: original, reading: { point } }] }) } }] }));
        const app = createGateway(loadConfig({ AI_MODEL: 'fixture', AI_BASE_URL: 'https://fixture.example/v1' }), upstream as typeof fetch, () => {});
        const requests: string[] = [];
        vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
            requests.push(url);
            return app.request(url, { ...init, headers: { ...init.headers, Origin: 'http://127.0.0.1:40000' } });
        });
        const provider = new GatewayAIProvider({ url: 'http://127.0.0.1:40001', token: '', depth: 'deep' });
        const result = await provider.respond(await context(), { kind: 'continue', text: 'Continue', requestId: 'r2' });
        expect(result.intents).toEqual([{ type: 'surface_possibility', text: original }]);
        expect(result.presentation?.points.get(original)).toBe(point);
        expect(requests).toEqual(['http://127.0.0.1:40001/api/respond']);
        expect(upstream).toHaveBeenCalledTimes(1);
    });
    it('invalid optional gateway metadata falls back to the original without another call', async () => {
        const fetcher = vi.fn(async () => Response.json({ intents: [{ type: 'surface_possibility', text: original }], presentation: { points: 'not a valid point list' }, providerLabel: 'Fixture', mock: false }));
        vi.stubGlobal('fetch', fetcher);
        const provider = new GatewayAIProvider({ url: 'http://127.0.0.1:40001', token: '' });
        const result = await provider.respond(await context(), { kind: 'continue', text: 'Continue', requestId: 'r3' });
        expect(result.intents).toEqual([{ type: 'surface_possibility', text: original }]);
        expect(result.presentation).toBeUndefined();
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it('the manual reading purpose is accepted and the old Next purpose is rejected', async () => {
        const app = createGateway(loadConfig({ AI_MODEL: 'fixture', AI_BASE_URL: 'https://fixture.example/v1' }), vi.fn(async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] })) as typeof fetch, () => {});
        for (const [purpose, status] of [['field-reading', 200], ['exploration-step', 400]] as const) {
            const response = await app.request('/api/structured', { method: 'POST', headers: { Origin: 'http://127.0.0.1:40000', 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose, instructions: 'Return JSON', input: { text: original } }) });
            expect(response.status).toBe(status);
        }
    });
});

describe('compact opening guidance is scoped to Field requests', () => {
    it.each(['ask', 'thread', 'deep', 'probe', 'organize'] as const)('%s keeps its own response contract', async kind => {
        const { compileContext } = await import('../../src/ai/context.ts');
        const { createProject } = await import('../../src/core/model.ts');
        const send = vi.fn(async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"intents":[]}' } }] }));
        const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture', model: 'chosen', depth: 'deep' }, { kind: 'webview', send });
        await provider.respond(compileContext(createProject('opening', 'Fixture'), []), { kind, text: 'Fixture request', requestId: 'opening-' + kind });
        expect(send).toHaveBeenCalledTimes(1);
        const request = send.mock.calls[0] as unknown as [{ body: { messages: { role: string; content: string }[] } }];
        const instructions = request[0].body.messages.find(message => message.role === 'system')!.content;
        const guidance = 'Begin each text answer with a self-contained key point in at most 120 Unicode characters';
        if (kind === 'ask') expect(instructions).toContain(guidance);
        else expect(instructions).not.toContain(guidance);
        expect(instructions).toContain('Write in the user');
    });
});
