import { describe, expect, it } from 'vitest';
import { AIRuntime, type RuntimeHooks } from '../../src/ai/runtime.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject } from '../../src/core/model.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type StructuredRequest } from '../../src/ai/contracts.ts';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const provider = (structured: (request: StructuredRequest) => Promise<unknown>): AIProvider => ({
    label: 'Structured fixture', mock: false, capabilities: async () => UNKNOWN_CAPABILITIES,
    respond: async () => ({ intents: [], providerLabel: 'Structured fixture', mock: false }),
    structured: async request => ({ value: await structured(request), providerLabel: 'Structured fixture', mock: false }),
});
const hooks: RuntimeHooks = { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 0, y: 0 }) };
const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
const extraction = (...entries: Array<[text: string, quote: string]>) => ({ units: entries.map(([text, quote]) => ({ text, sourceQuotes: [quote] })) });
const session = (controller: ProjectController) => controller.getSnapshot().session;

describe('Phase 3C progressive structuring', () => {
    it('emits real units after one decomposition call and never infers relations during ingestion', async () => {
        const text = 'I like HCI. I also worry about finding work.';
        const controller = new ProjectController(createProject('p', 'Phase 3C', 1), async () => {});
        const structure = deferred<unknown>();
        const seen: string[] = [];
        const events: string[] = [];
        const runtime = new AIRuntime(controller, async () => provider(request => { seen.push(request.purpose); return structure.promise; }), hooks);
        const input = controller.recordInput(text);
        const run = runtime.ingest(text, input.id, { anchor: { x: 40, y: 50 }, onEvent: event => events.push(event.type) });
        expect(controller.getSnapshot().project.inputs[input.id]?.text).toBe(text);
        await tick();
        expect(Object.keys(session(controller).ghosts)).toEqual([]);
        structure.resolve(extraction(['I like HCI', 'I like HCI'], ['I worry about finding work', 'I also worry about finding work']));
        const outcome = await run;
        expect(outcome.proposalIds).toHaveLength(2);
        expect(Object.keys(session(controller).phenomena)).toEqual([]);
        expect(seen).toEqual(['thought-extraction']);
        expect(events).toEqual(['started', 'unit', 'unit', 'completed']);
        expect(runtime.requestCount).toBe(1);
        expect(Object.keys(controller.getSnapshot().project.thoughts)).toEqual([]);
    });

    it('keeps every grounded extracted unit as a proposal', async () => {
        const text = 'One thought. A supporting detail. Another concern.';
        const controller = new ProjectController(createProject('p', 'Phase 3C', 1), async () => {});
        const runtime = new AIRuntime(controller, async () => provider(async () => extraction(['One thought', 'One thought'], ['A supporting detail', 'A supporting detail'], ['Another concern', 'Another concern'])), hooks);
        const input = controller.recordInput(text);
        const outcome = await runtime.ingest(text, input.id);
        expect(outcome.proposalIds).toHaveLength(3);
        expect(Object.keys(session(controller).ghosts)).toHaveLength(3);
    });

    it('keeps the seven-shape postgraduate example as seven grounded proposals', async () => {
        const text = '我现在其实不知道要不要考研。一方面我觉得本科就业可能竞争比较大，读研可能让我有更多时间探索方向；但是我又不确定三年研究生到底值不值。我最近发现自己对网络里的路径优化有一点兴趣，HCI 也觉得挺有意思，但我其实不太想以后每天主要工作都是写代码。';
        const controller = new ProjectController(createProject('p', 'Phase 3C', 1), async () => {});
        const runtime = new AIRuntime(controller, async () => provider(async () => extraction(
            ['我还没决定要不要考研', '不知道要不要考研'], ['我担心本科就业竞争比较大', '本科就业可能竞争比较大'],
            ['读研可能让我有更多时间探索方向', '读研可能让我有更多时间探索方向'], ['我不确定三年研究生值不值', '不确定三年研究生到底值不值'],
            ['我对网络路径优化有兴趣', '对网络里的路径优化有一点兴趣'], ['我对 HCI 有兴趣', 'HCI 也觉得挺有意思'],
            ['我不想以后主要靠写代码工作', '不太想以后每天主要工作都是写代码'])), hooks);
        const outcome = await runtime.ingest(text, controller.recordInput(text).id);
        expect(outcome.proposalIds).toHaveLength(7);
    });

    it('reports single for one or zero units', async () => {
        for (const value of [extraction(['One thought', 'One thought.']), { units: [] }]) {
            const controller = new ProjectController(createProject('p', 'Phase 3C', 1), async () => {});
            const runtime = new AIRuntime(controller, async () => provider(async () => value), hooks);
            const outcome = await runtime.ingest('One thought.', controller.recordInput('One thought.').id);
            expect(outcome).toMatchObject({ status: 'completed', single: true, proposalIds: [] });
        }
    });

    it('a replaced request cannot surface stale proposals into the newer request', async () => {
        const first = deferred<unknown>(); const second = deferred<unknown>(); let call = 0;
        const controller = new ProjectController(createProject('p', 'Phase 3C', 1), async () => {});
        const runtime = new AIRuntime(controller, async () => provider(() => (++call === 1 ? first.promise : second.promise)), hooks);
        const older = runtime.ingest('First submission.', 'input-a');
        const newer = runtime.ingest('Second submission.', 'input-b');
        first.resolve(extraction(['Stale one', 'First'], ['Stale two', 'submission.']));
        expect((await older).status).toBe('cancelled');
        expect(Object.keys(session(controller).ghosts)).toEqual([]);
        second.resolve(extraction(['Kept one', 'Second'], ['Kept two', 'submission.']));
        expect((await newer).status).toBe('completed');
        expect(Object.values(session(controller).ghosts).map(ghost => ghost.text)).toEqual(['Kept one', 'Kept two']);
    });
});
