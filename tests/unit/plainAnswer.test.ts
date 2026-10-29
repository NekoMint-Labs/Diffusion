import { describe, expect, it, vi } from 'vitest';
import { respondWithReading } from '../../src/ai/readingResponse.ts';
import { PLAIN_ANSWER_INSTRUCTIONS } from '../../src/ai/plainAnswer.ts';
import { compileContext } from '../../src/ai/context.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { saveResponse } from '../../src/ui/workspace/response.ts';
import type { ContextPacket } from '../../src/core/semantics.ts';
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


// These assert transmitted context and ownership, not whether a live model reasons correctly.
describe('authored redirection context in the wording trial', () => {
    it.each([
        '我改主意了，只想整理自己的公开课程提纲。不找同学，也先不开发工具。请给我一个方向。',
        '我是一名教师，现在只整理自己的授课提纲，不做工具、不访谈学生。请给我一个方向。',
        '我只想整理自己用来复习的公开课程提纲，不给别人讲课、不开发工具。请给我一个方向。',
    ])('preserves current wording, causal history and restrictions after re-entry: %s', async correctionText => {
        const project = createProject('redirect-role');
        project.thoughts.root = makeThought('想判断复习工具有没有人用；不接触私人作业、成绩或身份资料。', { x: 0, y: 0 }, 1, 'root');
        project.thoughts.kept = { ...makeThought('可以看你的学生能否听懂已经讲过的章节。', { x: 400, y: 0 }, 2, 'kept'), generatedBy: 'ai', generationAction: 'continue', derivedFrom: ['root'] };
        project.thoughts.unrelated = makeThought('我是教师，另一个完全不同的话题。', { x: 0, y: 600 }, 99, 'unrelated');
        let persisted = project;
        const controller = new ProjectController(project, async snapshot => { persisted = structuredClone(snapshot); });
        const correction = saveResponse(controller, correctionText, ['kept'], { x: 700, y: 0 })!;
        await controller.flush();
        const reentered = new ProjectController(structuredClone(persisted), async () => {});
        const before = structuredClone(reentered.getSnapshot().project);
        const packet = compileContext(reentered.getSnapshot().project, [correction.id]);
        const answer = '可以先标出一处概念依赖，看看理解这一节之前需要哪些内容。';
        const injected = provider({ intents: [{ type: 'surface_possibility', text: answer }] });
        await respondWithReading(injected.instance, packet, { kind: 'continue', text: '继续想', requestId: 'redirect' }, new AbortController().signal, { plainAnswer: true, propositions: true });
        const request = injected.structured.mock.calls[0][0];
        const input = request.input as { context: ContextPacket; guidance: { candidateLimit: number; branches: { selectedId: string; authored: { id: string; distance: number }[] }[] } };
        expect(input.context.scope).toEqual([expect.objectContaining({ id: correction.id, text: correctionText, authored: true })]);
        expect(input.context.local).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'kept', text: project.thoughts.kept.text, authored: false }),
            expect.objectContaining({ id: 'root', text: project.thoughts.root.text, authored: true }),
        ]));
        expect([...input.context.scope, ...input.context.local].some(item => item.id === 'unrelated')).toBe(false);
        expect(input.guidance.branches).toEqual([{ selectedId: correction.id, authored: [{ id: correction.id, distance: 0 }, { id: 'root', distance: 2 }] }]);
        expect(input.guidance.candidateLimit).toBe(1);
        expect(request.instructions).toContain(PLAIN_ANSWER_INSTRUCTIONS);
        expect(injected.structured).toHaveBeenCalledTimes(1);
        expect(reentered.getSnapshot().project).toEqual(before);
    });
});
