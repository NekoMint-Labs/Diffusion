import { describe, expect, it } from 'vitest';
import { AIRuntime, intentAllowedForAction } from '../../src/ai/runtime.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider } from '../../src/ai/contracts.ts';
import { createProject, makeThought, type ThinkingOperation } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';

function project() {
    const value = createProject('phase3a', 'Phase 3A', 1);
    value.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
    value.thoughts.b = makeThought('B', { x: 400, y: 0 }, 1, 'b');
    return value;
}
function baseProvider(respond: AIProvider['respond']): AIProvider {
    return {
        label: 'Runtime fixture', mock: false, capabilities: async () => UNKNOWN_CAPABILITIES, respond,
        structured: async request => ({ value: request.input, providerLabel: 'Runtime fixture', mock: false }),
    };
}
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
}

describe('Phase 3A action permissions and operation lifecycle', () => {
    it('a relation probe cannot navigate to Deep Dive, Thread, or Crystal', () => {
        expect(intentAllowedForAction('probe', 'surface_relation')).toBe(true);
        expect(intentAllowedForAction('probe', 'request_deep_dive')).toBe(false);
        expect(intentAllowedForAction('probe', 'request_thread')).toBe(false);
        expect(intentAllowedForAction('probe', 'request_crystal_preview')).toBe(false);
    });

    it('drops an out-of-mode Deep Dive request even when it is globally legal', async () => {
        const controller = new ProjectController(project(), async () => {});
        const routed: string[] = [];
        const runtime = new AIRuntime(controller, async () => baseProvider(async () => ({
            providerLabel: 'Runtime fixture', mock: false,
            intents: [
                { type: 'request_deep_dive', text: 'Go elsewhere' },
                { type: 'surface_relation', a: 'a', b: 'b', kind: 'tension', label: 'a candidate', explanation: 'A plain reason for proposing the candidate.' },
            ],
        })), { pending: () => {}, notice: () => {}, route: kind => routed.push(kind), anchor: () => ({ x: 0, y: 0 }) });
        const result = await runtime.run('probe', 'Find a relation', ['a', 'b']);
        expect(result).toMatchObject({ status: 'completed', emitted: 1 });
        expect(routed).toEqual([]);
        expect(Object.values(controller.getSnapshot().session.phenomena)).toHaveLength(1);
        expect(Object.values(controller.getSnapshot().session.phenomena)[0]).toMatchObject({ label: 'a candidate', explanation: 'A plain reason for proposing the candidate.' });
        expect(Object.values(controller.getSnapshot().project.relations)).toHaveLength(0);
    });

    it('a stale request completion cannot clear the newer pending operation', async () => {
        const first = deferred<Awaited<ReturnType<AIProvider['respond']>>>();
        const second = deferred<Awaited<ReturnType<AIProvider['respond']>>>();
        let call = 0;
        const operations: ThinkingOperation[] = [];
        const pending: boolean[] = [];
        const runtime = new AIRuntime(new ProjectController(project(), async () => {}), async () => baseProvider(async () => (++call === 1 ? first.promise : second.promise)), {
            pending: value => pending.push(value), operation: value => operations.push(value), notice: () => {}, route: () => {}, anchor: () => ({ x: 0, y: 0 }),
        });
        const older = runtime.run('ask', 'first', ['a']);
        const newer = runtime.run('ask', 'second', ['b']);
        first.resolve({ intents: [], providerLabel: 'Runtime fixture', mock: false });
        expect((await older).status).toBe('cancelled');
        expect(operations.at(-1)?.phase).toBe('pending');
        expect(pending.at(-1)).toBe(true);
        second.resolve({ intents: [], providerLabel: 'Runtime fixture', mock: false });
        expect((await newer).status).toBe('completed');
        expect(operations.at(-1)?.phase).toBe('completed');
        expect(pending.at(-1)).toBe(false);
    });

    it('cancellation settles the matching operation even when a provider ignores AbortSignal', async () => {
        const response = deferred<Awaited<ReturnType<AIProvider['respond']>>>();
        const operations: ThinkingOperation[] = [];
        const pending: boolean[] = [];
        const runtime = new AIRuntime(new ProjectController(project(), async () => {}), async () => baseProvider(async () => response.promise), {
            pending: value => pending.push(value), operation: value => operations.push(value), notice: () => {}, route: () => {}, anchor: () => ({ x: 0, y: 0 }),
        });
        const run = runtime.run('ask', 'question', ['a']);
        runtime.cancel();
        response.resolve({ intents: [], providerLabel: 'Runtime fixture', mock: false });
        expect((await run).status).toBe('cancelled');
        expect(operations.at(-1)?.phase).toBe('cancelled');
        expect(pending.at(-1)).toBe(false);
    });
});
