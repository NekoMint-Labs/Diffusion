import { expect, it, vi } from 'vitest';
import { t } from '../../src/shared/i18n.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider } from '../../src/ai/contracts.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought, type ThinkingOperation } from '../../src/core/model.ts';

function fixture(respond: AIProvider['respond'], structured: AIProvider['structured'] = async () => ({ providerLabel: 'Fixture', mock: false, value: {} })) {
    const project = createProject('p', 'P');
    project.thoughts.a = makeThought('A', { x: 100, y: 100 }, 1, 'a');
    project.thoughts.b = makeThought('B', { x: 600, y: 100 }, 1, 'b');
    const controller = new ProjectController(project, async () => {});
    const notices: string[] = [], operations: ThinkingOperation[] = [];
    const provider: AIProvider = { label: 'Fixture', mock: false, respond, capabilities: async () => UNKNOWN_CAPABILITIES, structured };
    const runtime = new AIRuntime(controller, async () => provider, { pending() {}, notice: text => notices.push(text), operation: state => operations.push(state), route() {}, anchor: () => ({ x: 500, y: 400 }) });
    return { controller, runtime, notices, operations };
}
const answer = () => ({ providerLabel: 'Fixture', mock: false, intents: [{ type: 'surface_possibility' as const, text: 'A possible next step' }] });

it('distinguishes an empty or action-incompatible response from success', async () => {
    for (const intents of [[], [{ type: 'request_deep_dive' as const, text: 'Not a continuation' }]]) {
        const f = fixture(async () => ({ providerLabel: 'Fixture', mock: false, intents }));
        expect(await f.runtime.run('continue', '', ['a'])).toEqual({ status: 'completed', emitted: 0 });
        expect(f.operations.at(-1)?.resultCount).toBe(0);
        expect(f.notices.at(-1)).toBe(t('No new suggestion was surfaced this time.'));
        expect(Object.keys(f.controller.getSnapshot().session.ghosts)).toHaveLength(0);
    }
});

it('reports a provider timeout as a failure rather than a user cancellation', async () => {
    vi.useFakeTimers();
    try {
        const f = fixture(async (_packet, _intent, signal) => await new Promise<never>((_resolve, reject) => {
            signal!.addEventListener('abort', () => reject(new DOMException('deadline', 'AbortError')), { once: true });
        }));
        const pending = f.runtime.run('continue', '', ['a']);
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(45000);
        expect(await pending).toMatchObject({ status: 'failed', emitted: 0 });
        expect(f.operations.at(-1)?.phase).toBe('failed');
        expect(f.notices.at(-1)).toBe(t('{subject} did not answer in time.', { subject: 'Fixture' }));
    } finally { vi.useRealTimers(); }
});


it('reports an ingestion deadline as failed while preserving the saved input', async () => {
    vi.useFakeTimers();
    try {
        const structured = vi.fn<AIProvider['structured']>(async (_request, signal) => await new Promise<never>((_resolve, reject) => {
            signal!.addEventListener('abort', () => reject(new DOMException('deadline', 'AbortError')), { once: true });
        }));
        const f = fixture(async () => answer(), structured);
        const text = 'A first idea. A separate concern.';
        const input = f.controller.recordInput(text);
        const events: string[] = [];
        const pending = f.runtime.ingest(text, input.id, { onEvent: event => events.push(event.type) });
        await vi.waitFor(() => expect(structured).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(45000);
        expect(await pending).toMatchObject({ status: 'failed', emitted: 0, inputId: input.id });
        expect(f.operations.at(-1)?.phase).toBe('failed');
        expect(events).toEqual(['started', 'failed']);
        expect(f.notices.at(-1)).toBe(t('{subject} did not answer in time.', { subject: 'Fixture' }));
        expect(f.controller.getSnapshot().project.inputs[input.id].text).toBe(text);
        expect(Object.keys(f.controller.getSnapshot().session.ghosts)).toHaveLength(0);
    } finally { vi.useRealTimers(); }
});

it('discards a late response after a deadline and preserves the failure outcome', async () => {
    vi.useFakeTimers();
    try {
        let release!: () => void;
        const held = new Promise<void>(resolve => { release = resolve; });
        const f = fixture(async () => { await held; return answer(); });
        const pending = f.runtime.run('continue', '', ['a']);
        await vi.advanceTimersByTimeAsync(45000);
        release();
        expect(await pending).toMatchObject({ status: 'failed', emitted: 0 });
        expect(f.operations.at(-1)?.phase).toBe('failed');
        expect(Object.keys(f.controller.getSnapshot().session.ghosts)).toHaveLength(0);
    } finally { vi.useRealTimers(); }
});

it('a stale timeout rejection cannot replace a newer request feedback', async () => {
    vi.useFakeTimers();
    try {
        let rejectOld!: (error: Error) => void;
        const oldResponse = new Promise<never>((_resolve, reject) => { rejectOld = reject; });
        let releaseNew!: () => void;
        const newResponse = new Promise<void>(resolve => { releaseNew = resolve; });
        let calls = 0;
        const f = fixture(async () => {
            if (++calls === 1) return oldResponse;
            await newResponse;
            return answer();
        });
        const older = f.runtime.run('continue', '', ['a']);
        await vi.advanceTimersByTimeAsync(45000);
        const newer = f.runtime.run('continue', '', ['b']);
        const noticeCount = f.notices.length;
        rejectOld(new DOMException('deadline', 'AbortError'));
        expect((await older).status).toBe('cancelled');
        expect(f.operations.at(-1)).toMatchObject({ phase: 'pending', scopeIds: ['b'] });
        expect(f.notices).toHaveLength(noticeCount);
        releaseNew();
        expect((await newer).status).toBe('completed');
    } finally { vi.useRealTimers(); }
});

it('keeps the request scope when selection changes during a held response', async () => {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const f = fixture(async () => { await held; return answer(); });
    const selection = ['a'];
    const pending = f.runtime.run('continue', '', selection);
    await Promise.resolve();
    selection.splice(0, 1, 'b');
    release();
    expect((await pending).emitted).toBe(1);
    expect(f.operations.at(-1)?.scopeIds).toEqual(['a']);
    expect(Object.values(f.controller.getSnapshot().session.ghosts)[0].scopeIds).toEqual(['a']);
});
it('discards a provider result delivered after Stop', async () => {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const f = fixture(async () => { await held; return answer(); });
    const pending = f.runtime.run('continue', '', ['a']);
    await Promise.resolve();
    f.runtime.cancel(); release();
    expect((await pending).status).toBe('cancelled');
    expect(f.operations.at(-1)?.phase).toBe('cancelled');
    expect(Object.keys(f.controller.getSnapshot().session.ghosts)).toHaveLength(0);
});
it('reports an error without a success notice or committed material', async () => {
    const f = fixture(async () => { throw new Error('Controlled failure'); });
    expect((await f.runtime.run('continue', '', ['a'])).status).toBe('failed');
    expect(f.operations.at(-1)?.phase).toBe('failed');
    expect(f.notices.at(-1)).toBe('Controlled failure');
    expect(Object.keys(f.controller.getSnapshot().project.thoughts)).toEqual(['a', 'b']);
});
