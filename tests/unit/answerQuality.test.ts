import { afterEach, describe, expect, it } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type ContextPacket, type SemanticIntent, type UserIntent } from '../../src/ai/contracts.ts';
import { requestSchema } from '../../src/ai/schemas.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';

const runtimes: AIRuntime[] = [];
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.dispose(); });
function fixture(answers: (call: number) => SemanticIntent[]) {
    const project = createProject('answer-quality', 'Answer quality fixture', 1);
    project.thoughts.a = makeThought('我想学英语也想学编程，但每天只有二十分钟，老是换计划。', { x: 100, y: 200 }, 1, 'a');
    const controller = new ProjectController(project, async () => {});
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const provider: AIProvider = {
        label: 'Answer quality fixture / not live', mock: true,
        capabilities: async () => UNKNOWN_CAPABILITIES,
        structured: async () => { throw Error('Not used'); },
        respond: async (packet, intent) => {
            requests.push({ packet, intent });
            return { providerLabel: 'Answer quality fixture / not live', mock: true, intents: answers(requests.length) };
        },
    };
    const runtime = new AIRuntime(controller, async () => provider, {
        pending: () => {}, notice: () => {}, route: () => { throw Error('No navigation expected'); },
        anchor: () => ({ x: 400, y: 300 }),
    });
    runtimes.push(runtime);
    return { controller, runtime, requests };
}
const answer = (text: string): SemanticIntent => ({ type: 'respond_in_field', text });
const continuation = (call: number): SemanticIntent[] => [{ type: 'surface_possibility', text: `Uncommitted fixture output ${call}` }];
function ignoreAll(controller: ProjectController) {
    for (const key of Object.keys(controller.getSnapshot().session.ghosts)) controller.dismissGhost(key);
}

describe('answer quality controls (fixtures, not evidence of model judgment)', () => {
    it('surfaces one Ask answer for repeated wording without losing a distinct answer or making replacement calls', async () => {
        const f = fixture(() => [answer('先区分换科目和换方法。'), answer('  先区分换科目和换方法！'), answer('如果方法稳定，可以考虑按天交替。')]);
        const before = JSON.stringify(f.controller.getSnapshot().project);
        expect(await f.runtime.run('ask', '应该先固定一项吗？', ['a'])).toEqual({ status: 'completed', emitted: 2 });
        expect(Object.values(f.controller.getSnapshot().session.ghosts).map(item => item.text)).toEqual(['先区分换科目和换方法。', '如果方法稳定，可以考虑按天交替。']);
        expect(f.requests).toHaveLength(1);
        expect(JSON.stringify(f.controller.getSnapshot().project)).toBe(before);
    });

    it('preserves technical distinctions and an explicitly requested quotation in Ask', async () => {
        const f = fixture(() => [answer('error > 0'), answer('error >= 0'), answer('我想学英语也想学编程，但每天只有二十分钟，老是换计划。')]);
        expect((await f.runtime.run('ask', '保留公式的区别，并引用原文。', ['a'])).emitted).toBe(3);
        expect(f.requests[0].intent.text).toBe('保留公式的区别，并引用原文。');
    });

    it('can answer the same Ask again after Ignore or a differently worded question', async () => {
        const f = fixture(() => [answer('A direct answer')]);
        for (const text of ['What follows?', 'What follows?', 'What is the supported part?']) {
            expect((await f.runtime.run('ask', text, ['a'])).emitted).toBe(1);
            ignoreAll(f.controller);
        }
        expect(f.requests.map(request => request.intent.text)).toEqual(['What follows?', 'What follows?', 'What is the supported part?']);
    });

    it('varies attempted Continue links after Ignore without sending old output back as premises', async () => {
        const f = fixture(continuation);
        const before = JSON.stringify(f.controller.getSnapshot().project);
        for (let call = 0; call < 4; call++) {
            await f.runtime.run('continue', 'Keep the current goal.', ['a'], { maxCandidates: 1 });
            ignoreAll(f.controller);
        }
        expect(f.requests).toHaveLength(4);
        expect(new Set(f.requests.map(request => request.intent.text)).size).toBe(4);
        expect(f.requests[0].intent.text).toContain('needed condition');
        expect(f.requests[1].intent.text).toContain('possible consequence');
        expect(f.requests[2].intent.text).toContain('unresolved link');
        expect(f.requests[3].intent.text).toContain('This is not evidence');
        expect(f.requests.every(request => !JSON.stringify(request).includes('Uncommitted fixture output'))).toBe(true);
        expect(f.requests.every(request => request.packet.scope.map(item => item.id).join() === 'a' && !request.packet.local.length)).toBe(true);
        expect(JSON.stringify(f.controller.getSnapshot().project)).toBe(before);
    });

    it('resets Continue guidance when selected wording or permissions change', async () => {
        const f = fixture(continuation);
        await f.runtime.run('continue', 'Same goal', ['a'], { maxCandidates: 1 });
        await f.runtime.run('continue', 'Same goal', ['a'], { maxCandidates: 1 });
        f.controller.dispatch({ type: 'thought.edit', id: 'a', text: 'A changed authored goal.' }, 'user');
        await f.runtime.run('continue', 'Same goal', ['a'], { maxCandidates: 1 });
        await f.runtime.run('continue', 'Same goal', ['a'], { maxCandidates: 1, projectSources: true });
        expect(f.requests[1].intent.text).not.toBe(f.requests[0].intent.text);
        expect(f.requests[2].intent.text).toBe(f.requests[0].intent.text);
        expect(f.requests[3].intent.text).toBe(f.requests[0].intent.text);
    });

    it('does not truncate a long authored prompt or consume guidance that did not fit', async () => {
        const f = fixture(continuation);
        const text = 'x'.repeat(12000);
        await f.runtime.run('continue', text, ['a'], { maxCandidates: 1 });
        await f.runtime.run('continue', 'A short prompt', ['a'], { maxCandidates: 1 });
        expect(f.requests[0].intent.text).toBe(text);
        expect(f.requests[1].intent.text).toContain('needed condition');
        expect(f.requests.every(request => requestSchema.safeParse(request).success)).toBe(true);
    });
});
