import { describe, expect, it, vi } from 'vitest';
import { thinkingGuidance, requestedCandidateLimit } from '../../src/ai/thinkingGuidance.ts';
import { compileContext } from '../../src/ai/context.ts';
import { respondWithReading } from '../../src/ai/readingResponse.ts';
import { faithfulReadingPoint } from '../../src/ai/readingFocus.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { saveResponse } from '../../src/ui/workspace/response.ts';
import type { AIProvider } from '../../src/ai/contracts.ts';
const intent = { kind: 'continue' as const, text: 'Continue up to three directions.', requestId: 'trial' };
function setup() {
    const project = createProject('correction', 'Correction fixture');
    project.thoughts.old = makeThought('做作业辅助，每周四小时；不接触学生私人资料。', { x: 0, y: 0 }, 1, 'old');
    project.thoughts.kept = { ...makeThought('观察一次真实作业。', { x: 400, y: 0 }, 2, 'kept'), generationAction: 'continue', derivedFrom: ['old'] };
    project.thoughts.unrelated = makeThought('最新的别的话题：三维重建。', { x: 0, y: 500 }, 999, 'unrelated');
    const controller = new ProjectController(project, async () => {});
    const correction = saveResponse(controller, '改成考前复习，每周只有两小时。请给我一个方向。', ['kept'], { x: 700, y: 0 })!;
    const packet = compileContext(controller.getSnapshot().project, [correction.id]);
    return { controller, correction, packet };
}
const original = '这更像是尚未找到值得验证的问题，不能直接说明没有需求。' + '这里只是一条待验证的建议，保留这个判断条件。'.repeat(5);
function provider(value: unknown) {
    const structured = vi.fn(async () => ({ value, mock: false, providerLabel: 'Injected fixture' }));
    return { structured, instance: { mock: false, structured, label: 'Fixture' } as unknown as AIProvider };
}
describe('bounded correction guidance', () => {
    it('ranks only authored causal ancestors after a saved correction and retains the older constraints verbatim', () => {
        const { controller, correction, packet } = setup();
        const before = JSON.stringify(controller.getSnapshot().project);
        const guidance = thinkingGuidance(packet, intent);
        expect(guidance.branches).toEqual([{ selectedId: correction.id, authored: [{ id: correction.id, distance: 0 }, { id: 'old', distance: 2 }] }]);
        expect(guidance.candidateLimit).toBe(1);
        expect(JSON.stringify(packet)).toContain('不接触学生私人资料');
        expect(JSON.stringify(packet)).not.toContain('最新的别的话题');
        expect(JSON.stringify(controller.getSnapshot().project)).toBe(before);
        const restored = compileContext(JSON.parse(before), [correction.id]);
        expect(thinkingGuidance(restored, intent)).toEqual(guidance);
    });
    it('does not apply a model/source count, an ancestor count, or a global latest decision to separate selections', () => {
        const { packet } = setup();
        packet.scope[0].authored = false;
        expect(thinkingGuidance(packet, intent).candidateLimit).toBe(3);
        packet.scope.push({ id: 'separate', text: '请给我一个方向。', kind: 'thought', authored: true });
        expect(thinkingGuidance(packet, intent).candidateLimit).toBe(3);
        expect(thinkingGuidance(packet, intent).branches[1]).toEqual({ selectedId: 'separate', authored: [{ id: 'separate', distance: 0 }] });
    });
    it.each([['请给我一个值得继续思考的方向。', 1], ['请给我一个不同的新方向，并说明哪些部分仍是假设。', 1], ['给我三个新的方向。', 3], ['给我三个方向。只给我一个方向。', 1], ['请只给出两个不同的建议。', 2], ['Please give me only one direction.', 1], ['Return up to 3 distinct ideas.', 3], ['如果有一个方向，我再决定。', undefined], ['不要只给我一个方向。', undefined], ['原文说“请给我一个方向”。', undefined]])('recognises direct requests without treating quoted/negated prose as a count: %s', (text, expected) => {
        expect(requestedCandidateLimit(text)).toBe(expected);
    });
    it('limits even a noncompliant provider to the explicit count, in one call, without rewriting text', async () => {
        const { packet } = setup();
        packet.scope[0].text = '我自己知道做到什么程度算完成，当前更想弄清楚的是先复习哪一章。不要再围绕完成标准展开。时间不设上限；不做工具、不安排学生试用、不接触私人资料这些要求保留。请给我一个不同的新方向，并说明哪些部分仍是假设。';
        const fixture = provider({ intents: [1, 2, 3].map(n => ({ type: 'surface_possibility', text: '条件成立时，考前复习的可能方向' + n })) });
        const result = await respondWithReading(fixture.instance, packet, intent, new AbortController().signal);
        expect(result.response.intents).toHaveLength(1);
        expect(result.response.intents[0]).toMatchObject({ text: '条件成立时，考前复习的可能方向1' });
        expect(fixture.structured).toHaveBeenCalledTimes(1);
        expect(fixture.structured.mock.calls[0]).toBeDefined();
        expect(fixture.structured).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ guidance: expect.objectContaining({ candidateLimit: 1 }), context: expect.objectContaining({ maxCandidates: 1 }) }) }), expect.any(AbortSignal));
    });
    it('gives an explicit current Ask count precedence over the selected card and keeps the UI ceiling', () => {
        const { packet } = setup();
        expect(thinkingGuidance(packet, { ...intent, kind: 'ask', text: 'Give me two directions.' }).candidateLimit).toBe(2);
        packet.maxCandidates = 1;
        expect(thinkingGuidance(packet, { ...intent, kind: 'ask', text: 'Give me three directions.' }).candidateLimit).toBe(1);
    });
    it('validates extra candidates before count limiting, so an illegal command cannot hide beyond the cap', async () => {
        const { packet } = setup();
        const fixture = provider({ intents: [{ type: 'surface_possibility', text: 'A valid thought.' }, { type: 'delete-field' }] });
        await expect(respondWithReading(fixture.instance, packet, intent, new AbortController().signal)).rejects.toMatchObject({ failure: 'semantic-validation-failure' });
        expect(fixture.structured).toHaveBeenCalledTimes(1);
    });
    it('keeps the original and omits a strengthened summary without a repair request', async () => {
        const { packet } = setup();
        const fixture = provider({ intents: [{ type: 'surface_possibility', text: original, reading: { point: '说明真正的问题还没有找到。' } }] });
        const result = await respondWithReading(fixture.instance, packet, intent, new AbortController().signal);
        expect(result.readings.size).toBe(0);
        expect(result.response.intents[0]).toMatchObject({ text: original });
        expect(fixture.structured).toHaveBeenCalledTimes(1);
        expect(faithfulReadingPoint(original, '更像是尚未找到真问题，不能直接说明没有需求。')).toBe(true);
    });
    it.each([undefined, { reason: '' }, { reason: 'x'.repeat(241) }, { reason: 'Why', command: 'keep' }])('ignores invalid optional pause metadata and does not retry: %j', async pause => {
        const { packet } = setup(); const fixture = provider({ intents: [], pause });
        const result = await respondWithReading(fixture.instance, packet, intent, new AbortController().signal);
        expect(result.response.intents).toEqual([]); expect(result.emptyReason).toBeUndefined();
        expect(fixture.structured).toHaveBeenCalledTimes(1);
    });
    it('accepts a bounded reason only with a genuinely empty response', async () => {
        const { packet } = setup();
        const pause = { reason: '还缺少学生实际遇到的问题，继续展开会重复当前建议。' };
        const fixture = provider({ intents: [], pause });
        expect((await respondWithReading(fixture.instance, packet, intent, new AbortController().signal)).emptyReason).toBe(pause.reason);
        const nonempty = provider({ intents: [{ type: 'surface_possibility', text: '一个新方向。' }], pause });
        expect((await respondWithReading(nonempty.instance, packet, intent, new AbortController().signal)).emptyReason).toBeUndefined();
    });
});
