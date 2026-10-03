import { expect, it } from 'vitest';
import { t } from '../../src/shared/i18n.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider } from '../../src/ai/contracts.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought, type ThinkingOperation } from '../../src/core/model.ts';

function fixture(respond: AIProvider['respond']) {
    const project = createProject('p', 'P');
    project.thoughts.a = makeThought('A', { x: 100, y: 100 }, 1, 'a');
    project.thoughts.b = makeThought('B', { x: 600, y: 100 }, 1, 'b');
    const controller = new ProjectController(project, async () => {});
    const notices: string[] = [], operations: ThinkingOperation[] = [];
    const provider: AIProvider = { label: 'Fixture', mock: false, respond, capabilities: async () => UNKNOWN_CAPABILITIES, structured: async () => ({ providerLabel: 'Fixture', mock: false, value: {} }) };
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
