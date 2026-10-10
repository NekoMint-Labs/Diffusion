import { describe, expect, it, vi } from 'vitest';
import { DirectAIProvider } from '../../src/ai/direct.ts';
import { createGateway } from '../../server/app.ts';
import { loadConfig } from '../../server/config.ts';
import { compileContext } from '../../src/ai/context.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import type { SemanticIntent, UserIntent } from '../../src/core/semantics.ts';
import type { WireRequest } from '../../src/ai/wire.ts';

const project = createProject('actions', 'Authored fixture / not live', 1);
project.thoughts.a = makeThought('A selected uncertainty', { x: 0, y: 0 }, 1, 'a');
project.thoughts.b = makeThought('A related uncertainty', { x: 100, y: 0 }, 1, 'b');
const packet = compileContext(project, ['a', 'b'], { maxCandidates: 1 });
const envelope = (candidate: SemanticIntent) => ({ choices: [{ message: { content: JSON.stringify({ intents: [candidate] }) } }] });
const cases: [UserIntent['kind'], SemanticIntent][] = [
    ['continue', { type: 'surface_possibility', text: 'A possible consequence.' }],
    ['diffuse', { type: 'surface_possibility', text: 'A grounded distinct direction.' }],
    ['angle', { type: 'surface_possibility', text: 'A different grounded frame.' }],
    ['question', { type: 'surface_question', text: 'Which condition changes this judgment?' }],
    ['probe', { type: 'surface_relation', a: 'a', b: 'b', kind: 'tension', label: 'Competing constraints' }],
    ['organize', { type: 'surface_structure', groups: [], relations: [], note: 'An unresolved constraint.' }],
];
describe('action-specific provider pipeline (fixtures, not model-quality evidence)', () => {
    it.each(cases)('direct %s exposes only its output shape and stays within the requested count', async (kind, candidate) => {
        const calls: WireRequest[] = [];
        const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture-model', depth: 'light' }, {
            kind: 'webview',
            send: async request => { calls.push(request); return envelope(candidate); },
        });
        const response = await provider.respond(packet, { kind, text: 'Think about the selection', requestId: 'r' });
        expect(response.intents).toEqual([candidate]);
        expect(calls).toHaveLength(1);
        const messages = calls[0].body.messages as { role: string; content: string }[];
        expect(messages[0].content).toContain('at most 1 intents');
        const offered = [...messages[0].content.matchAll(/"type":"([^"\n]+)"/g)].map(match => match[1]);
        expect(offered).toEqual(kind === 'diffuse' ? ['respond_in_field', 'surface_possibility', 'surface_relation', 'surface_evidence', 'request_recall'] : [candidate.type]);
        const input = JSON.parse(messages[1].content);
        expect(input.context.scope.map((item: { id: string }) => item.id)).toEqual(['a', 'b']);
    });
    it.each(['direct', 'gateway'] as const)('%s rejects a structurally valid output from the wrong action with one call', async path => {
        const candidate: SemanticIntent = { type: 'request_deep_dive', text: 'Change interaction mode' };
        const intent: UserIntent = { kind: 'continue', text: 'Continue', requestId: 'r' };
        if (path === 'direct') {
            const send = vi.fn(async () => envelope(candidate));
            const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture-model', depth: 'light' }, { kind: 'webview', send });
            await expect(provider.respond(packet, intent)).rejects.toMatchObject({ failure: 'semantic-validation-failure' });
            expect(send).toHaveBeenCalledTimes(1);
        } else {
            const fetcher = vi.fn(async () => Response.json(envelope(candidate)));
            const app = createGateway(loadConfig({ AI_MODEL: 'fixture-model' }), fetcher as typeof fetch, () => {});
            const response = await app.request('/api/respond', { method: 'POST', headers: { Origin: 'http://127.0.0.1:40000', 'Content-Type': 'application/json' }, body: JSON.stringify({ packet, intent }) });
            expect(response.status).toBe(502);
            expect(fetcher).toHaveBeenCalledTimes(1);
        }
    });
    it.each(['direct', 'gateway'] as const)('%s preserves Diffuse evidence, response, relation and recall shapes', async path => {
        const candidates: SemanticIntent[] = [
            { type: 'surface_evidence', sourceId: 's', outcome: 'inconclusive', text: 'x'.repeat(481) },
            { type: 'respond_in_field', text: 'x'.repeat(481) },
            { type: 'surface_relation', a: 'a', b: 'b', kind: 'tension', label: 'Competing constraints' },
            { type: 'request_recall', thoughtId: 'a' },
        ];
        for (const candidate of candidates) {
            const intent: UserIntent = { kind: 'diffuse', text: 'Think about the selection', requestId: 'r' };
            if (path === 'direct') {
                const send = vi.fn(async () => envelope(candidate));
                const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture-model', depth: 'light' }, { kind: 'webview', send });
                expect((await provider.respond(packet, intent)).intents).toEqual([candidate]);
                expect(send).toHaveBeenCalledTimes(1);
            } else {
                const fetcher = vi.fn(async () => Response.json(envelope(candidate)));
                const app = createGateway(loadConfig({ AI_MODEL: 'fixture-model' }), fetcher as typeof fetch, () => {});
                const response = await app.request('/api/respond', { method: 'POST', headers: { Origin: 'http://127.0.0.1:40000', 'Content-Type': 'application/json' }, body: JSON.stringify({ packet, intent }) });
                expect(response.status).toBe(200);
                expect((await response.json()).intents).toEqual([candidate]);
                expect(fetcher).toHaveBeenCalledTimes(1);
            }
        }
    });
    it('rejects a long thinking card without truncating it, while preserving longer Thread replies', async () => {
        const send = vi.fn(async () => envelope({ type: 'surface_possibility', text: 'x'.repeat(481) }));
        const provider = new DirectAIProvider({ providerId: 'deepseek', apiKey: 'fixture-only', model: 'fixture-model', depth: 'light' }, { kind: 'webview', send });
        await expect(provider.respond(packet, { kind: 'continue', text: 'Continue', requestId: 'r1' })).rejects.toMatchObject({ failure: 'semantic-validation-failure' });
        expect((await provider.respond(packet, { kind: 'thread', text: 'Read more', requestId: 'r2' })).intents[0]).toMatchObject({ text: 'x'.repeat(481) });
        expect(send).toHaveBeenCalledTimes(2);
    });
});
