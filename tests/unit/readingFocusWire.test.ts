import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectAIProvider } from '../../src/ai/direct.ts';
import { GatewayAIProvider } from '../../src/ai/gateway.ts';
import { createGateway } from '../../server/app.ts';
import { loadConfig } from '../../server/config.ts';
import type { StructuredPurpose } from '../../src/ai/contracts.ts';
const value = { intents: [{ type: 'surface_possibility', text: 'A complete answer.', reading: { point: 'A card point.' } }] };
afterEach(() => vi.unstubAllGlobals());
describe('single-call answers retain the user-selected thinking depth', () => {
    it.each([['field-answer', 4000], ['exploration-step', 1600]] as const)('direct: %s uses its own budget and returns display metadata once', async (purpose, budget) => {
        const send = vi.fn(async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }], model: 'reported-model' }));
        const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'injected-test-key', model: 'chosen-model', depth: 'deep' }, { kind: 'webview', send });
        const result = await provider.structured({ purpose, instructions: 'Return JSON', input: {} });
        expect(send).toHaveBeenCalledTimes(1);
        expect((send.mock.calls[0] as unknown as [{ body: { max_tokens: number } }])[0].body.max_tokens).toBe(budget);
        expect(result.value).toEqual(value); expect(result.model).toEqual({ requested: 'chosen-model', effective: 'reported-model' });
    });
    it.each([['field-answer', 'deep'], ['exploration-step', 'standard']] as const)('gateway client: %s keeps the intended depth without extra generation', async (purpose, depth) => {
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
