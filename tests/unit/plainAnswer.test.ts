import { describe, expect, it, vi } from 'vitest';
import { respondWithReading } from '../../src/ai/readingResponse.ts';
import { PLAIN_ANSWER_INSTRUCTIONS } from '../../src/ai/plainAnswer.ts';
import { compileContext } from '../../src/ai/context.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import type { AIProvider, StructuredRequest } from '../../src/ai/contracts.ts';

function fixture() {
    const project = createProject('plain-answer');
    project.thoughts.question = makeThought('不接触私人作业或成绩。我还在想是否值得做，不需要开发计划。', { x: 0, y: 0 }, 1, 'question');
    return compileContext(project, ['question'], { maxCandidates: 1 });
}
function provider(value: unknown) {
    const structured = vi.fn(async (_request: StructuredRequest) => ({ value, mock: false, providerLabel: 'Injected wording fixture' }));
    return { structured, instance: { mock: false, label: 'Fixture', structured } as unknown as AIProvider };
}
describe('plain-answer opt-in request boundary', () => {
    it.each(['ask', 'continue', 'angle', 'diffuse'] as const)('changes only instructions for %s, retaining one call, context and the original response', async kind => {
        const packet = fixture(), snapshot = structuredClone(packet);
        const intent = { kind, text: '先给我一个方向。', requestId: 'wording-fixture' };
        const text = '如果能找到愿意聊的同学，可以问他上次复习卡在哪一步；这只是找线索，还不能说明工具一定有人用。';
        const value = { intents: [{ type: kind === 'ask' ? 'respond_in_field' : 'surface_possibility', text }] };
        const ordinary = provider(value), control = provider(value), candidate = provider(value);
        const options = { propositions: true };
        const baseline = await respondWithReading(ordinary.instance, packet, intent, new AbortController().signal, options);
        await respondWithReading(control.instance, packet, intent, new AbortController().signal, { ...options, plainAnswer: false });
        const result = await respondWithReading(candidate.instance, packet, intent, new AbortController().signal, { ...options, plainAnswer: true });
        const originalRequest = ordinary.structured.mock.calls[0][0], controlRequest = control.structured.mock.calls[0][0], changed = candidate.structured.mock.calls[0][0];
        expect(controlRequest).toEqual(originalRequest);
        expect(changed.input).toEqual(originalRequest.input);
        expect(changed.purpose).toBe(originalRequest.purpose);
        expect(changed.instructions.replace('\n' + PLAIN_ANSWER_INSTRUCTIONS, '')).toBe(originalRequest.instructions);
        expect(result).toEqual(baseline);
        expect(packet).toEqual(snapshot);
        expect(candidate.structured).toHaveBeenCalledTimes(1);
        expect(result.response.intents[0]).toMatchObject({ text });
    });
    it('does not repair a bad semantic response or rewrite it using wording rules', async () => {
        const fixtureProvider = provider({ intents: [{ type: 'delete-field' }] });
        await expect(respondWithReading(fixtureProvider.instance, fixture(), { kind: 'continue', text: '继续想', requestId: 'invalid' }, new AbortController().signal, { plainAnswer: true })).rejects.toMatchObject({ failure: 'semantic-validation-failure' });
        expect(fixtureProvider.structured).toHaveBeenCalledTimes(1);
    });
});
