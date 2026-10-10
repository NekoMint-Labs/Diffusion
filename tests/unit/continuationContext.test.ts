import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileContext } from '../../src/ai/context.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { MockAIProvider } from '../../src/ai/mock.ts';
import { packetSchema } from '../../src/ai/schemas.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { captureThreadScope } from '../../src/core/thread.ts';
import { saveResponse } from '../../src/ui/workspace/response.ts';
import { setLocale } from '../../src/shared/i18n.ts';
import type { AIResponse } from '../../src/ai/contracts.ts';

const runtimes: AIRuntime[] = [];
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.dispose(); });
function setup() {
    setLocale('en');
    const project = createProject('continuation-test', 'Response context', 1);
    project.thoughts.question = makeThought('Are we worried about trusting a wrong result, or discarding a correct one?', { x: 0, y: 0 }, 1, 'question');
    project.thoughts.other = makeThought('An unrelated project decision.', { x: 0, y: 0 }, 1, 'other');
    const controller = new ProjectController(project, async () => {});
    const response = saveResponse(controller, 'I am more worried about discarding correct results.', ['question'], { x: 400, y: 0 })!;
    return { controller, response };
}
function runtimeFor(controller: ProjectController, provider: MockAIProvider) {
    const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 500, y: 300 }) });
    runtimes.push(runtime);
    return runtime;
}
const possibility: AIResponse = { providerLabel: 'Context fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: 'A supplied test possibility, not a model-quality claim.' }] };

describe('selected responses retain their direct question as background', () => {
    it('uses saved durable lineage after reopen without enlarging selection or committing a relation', () => {
        const { controller, response } = setup();
        const project = JSON.parse(JSON.stringify(controller.getSnapshot().project));
        const before = JSON.stringify(project);
        const packet = packetSchema.parse(compileContext(project, [response.id]));
        expect(packet.scope.map(item => item.id)).toEqual([response.id]);
        expect(packet.local.map(item => item.id)).toEqual(['question']);
        expect(packet.local[0].text).toBe(project.thoughts.question.text);
        expect(packet.continuations).toEqual([{ thoughtId: response.id, sourceIds: ['question'] }]);
        expect(packet.relations).toEqual([]);
        expect(packet.retrieved.sources).toEqual([]);
        expect(JSON.stringify(project)).toBe(before);
    });

    it('keeps each multi-selected response paired with its own source, and avoids duplicate background', () => {
        const { controller, response } = setup();
        const second = saveResponse(controller, 'A separate answer.', ['other', 'question'], { x: 700, y: 0 })!;
        const packet = compileContext(controller.getSnapshot().project, [response.id, second.id, 'question']);
        expect(packet.scope.map(item => item.id)).toEqual([response.id, second.id, 'question']);
        expect(packet.local.map(item => item.id)).toEqual(['other']);
        expect(packet.continuations).toEqual([
            { thoughtId: response.id, sourceIds: ['question'] },
            { thoughtId: second.id, sourceIds: ['other', 'question'] },
        ]);
    });

    it('takes only direct sources and never follows an ancestor or an organizing parent', () => {
        const { controller, response } = setup();
        const project = controller.getSnapshot().project;
        project.thoughts.question.derivedFrom = ['other'];
        Object.assign(project.thoughts[response.id], { organizingParentId: 'other' });
        const packet = compileContext(project, [response.id]);
        expect(packet.local.map(item => item.id)).toEqual(['question']);
        expect(packet.continuations![0].sourceIds).toEqual(['question']);
    });

    it('omits absent, self and duplicate references without inventing replacement context', () => {
        const { controller, response } = setup();
        const project = controller.getSnapshot().project;
        project.thoughts[response.id].derivedFrom = ['missing-ghost', response.id, 'question', 'question'];
        project.thoughts.question.derivedFrom = [response.id];
        const packet = compileContext(project, [response.id]);
        expect(packet.local.map(item => item.id)).toEqual(['question']);
        expect(packet.continuations).toEqual([{ thoughtId: response.id, sourceIds: ['question'] }]);
        delete project.thoughts.question;
        expect(compileContext(project, [response.id]).continuations).toBeUndefined();
    });

    it('prioritizes at most four direct background thoughts within the six-thought / 6400-character local budget', () => {
        const { controller, response } = setup();
        const project = controller.getSnapshot().project;
        const ids = Array.from({ length: 20 }, (_, index) => 'source-' + index);
        for (const key of ids) {
            project.thoughts[key] = makeThought('Source '.repeat(500), { x: 0, y: 0 }, 1, key);
            project.relations[key] = { id: key, a: response.id, b: key, kind: 'support', label: 'Existing relation', status: 'confirmed', createdAt: 1 };
        }
        project.thoughts[response.id].derivedFrom = ids;
        const packet = packetSchema.parse(compileContext(project, [response.id]));
        expect(packet.continuations![0].sourceIds).toEqual(ids.slice(0, 4));
        expect(packet.local.slice(0, 4).map(item => item.id)).toEqual(ids.slice(0, 4));
        expect(packet.local).toHaveLength(4);
        expect(packet.local.reduce((length, item) => length + item.text.length, 0)).toBeLessThanOrEqual(6400);
        const available = new Set([...packet.scope, ...packet.local].map(item => item.id));
        expect(packet.relations.every(relation => available.has(relation.a) && available.has(relation.b))).toBe(true);
        expect(packet.local.every(item => item.text.length <= 1600)).toBe(true);
    });

    it('does not change unselected Field behavior or populate a frozen Thread with live lineage', () => {
        const { controller, response } = setup();
        const project = controller.getSnapshot().project;
        expect(compileContext(project, []).continuations).toBeUndefined();
        project.threads.thread = { id: 'thread', title: 'Frozen response', scopeIds: [response.id], scopeSnapshot: captureThreadScope(project, [response.id]), messages: [], createdAt: 1 };
        const frozenText = response.text;
        project.thoughts[response.id].text = 'Later wording';
        const packet = compileContext(project, ['other'], { threadId: 'thread' });
        expect(packet.scope[0].text).toBe(frozenText);
        expect(packet.local).toEqual([]);
        expect(packet.continuations).toBeUndefined();
    });

    it('accepts legacy packets but rejects lineage pointing outside supplied scope/background', () => {
        const { controller, response } = setup();
        const packet = compileContext(controller.getSnapshot().project, [response.id]);
        const { continuations, ...legacy } = packet;
        expect(packetSchema.safeParse(legacy).success).toBe(true);
        for (const link of [
            { thoughtId: 'question', sourceIds: [response.id] },
            { thoughtId: response.id, sourceIds: ['other'] },
            { thoughtId: response.id, sourceIds: [response.id] },
            { thoughtId: response.id, sourceIds: ['question', 'question'] },
        ]) expect(packetSchema.safeParse({ ...packet, continuations: [link] }).success).toBe(false);
    });

    it('passes the background once to the provider and keeps Ghost scope on the selected response', async () => {
        const { controller, response } = setup();
        const provider = new MockAIProvider();
        const respond = vi.spyOn(provider, 'respond').mockResolvedValue(possibility);
        const runtime = runtimeFor(controller, provider);
        const before = JSON.stringify(controller.getSnapshot().project);
        const result = await runtime.run('continue', 'Continue from my response', [response.id], { maxCandidates: 1 });
        expect(result).toMatchObject({ status: 'completed', emitted: 1 });
        expect(respond).toHaveBeenCalledTimes(1);
        const packet = respond.mock.calls[0][0];
        expect(packet.local[0].text).toContain('discarding a correct one');
        expect(packet.continuations![0].thoughtId).toBe(response.id);
        const ghost = Object.values(controller.getSnapshot().session.ghosts)[0];
        expect(ghost.scopeIds).toEqual([response.id]);
        expect(JSON.stringify(controller.getSnapshot().project)).toBe(before);
        controller.dismissGhost(ghost.id);
        expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(0);
        expect(JSON.stringify(controller.getSnapshot().project)).toBe(before);
    });

    it.each(['edit', 'delete', 'unlink'] as const)('discards an in-flight answer when its source is changed: %s', async change => {
        const { controller, response } = setup();
        const provider = new MockAIProvider();
        let finish!: (value: AIResponse) => void;
        let entered!: () => void;
        const called = new Promise<void>(resolve => { entered = resolve; });
        vi.spyOn(provider, 'respond').mockImplementation(async () => { entered(); return new Promise<AIResponse>(resolve => { finish = resolve; }); });
        const runtime = runtimeFor(controller, provider);
        const pending = runtime.run('continue', 'Continue', [response.id]);
        await called;
        if (change === 'edit') controller.dispatch({ type: 'thought.edit', id: 'question', text: 'A changed question?' });
        if (change === 'delete') controller.dispatch({ type: 'thought.delete', ids: ['question'] });
        if (change === 'unlink') controller.getSnapshot().project.thoughts[response.id].derivedFrom = [];
        finish(possibility);
        expect((await pending).status).toBe('failed');
        expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(0);
    });
});
