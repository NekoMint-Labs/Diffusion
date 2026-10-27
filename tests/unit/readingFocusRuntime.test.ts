import { describe, expect, it, vi } from 'vitest';
import { AIRuntime, type RuntimeHooks } from '../../src/ai/runtime.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import type { AIProvider } from '../../src/ai/contracts.ts';
import { respondWithReading } from '../../src/ai/readingResponse.ts';
import { isCompactReading } from '../../src/ai/readingFocus.ts';
const answer = 'Only if a student can safely share a real assignment, observe one small trial first. '.repeat(3);
const point = 'If sharing is safe, observe one assignment trial; this remains a hypothesis.';
function setup(value: unknown = { intents: [{ type: 'surface_possibility', text: answer, reading: { point } }] }) {
    const project = createProject('focus-runtime', 'Fixture');
    project.thoughts.a = makeThought('Which premise should we check first?', { x: 0, y: 0 }, 1, 'a');
    const controller = new ProjectController(project, async () => {});
    const structured = vi.fn(async () => ({ value, mock: false, providerLabel: 'Injected fixture', model: { requested: 'requested', effective: 'actual' } }));
    const respond = vi.fn(async () => ({ mock: false, providerLabel: 'Injected demo', intents: [] }));
    const provider = { label: 'Fixture, no real model', mock: false, structured, respond } as unknown as AIProvider;
    const attached = new Map<string, string>();
    const notices: string[] = [];
    const hooks: RuntimeHooks = { pending: () => {}, notice: text => notices.push(text), route: () => {}, anchor: () => ({ x: 500, y: 200 }),
        respondWithPresentation: async (selected, packet, intent, signal) => {
            const { response, readings, emptyReason } = await respondWithReading(selected, packet, intent, signal);
            return { response, emptyReason, presentText: (text, id) => {
                expect(controller.getSnapshot().session.ghosts[id]).toBeUndefined();
                const reading = readings.get(text); if (reading) attached.set(id, reading.focus.point);
            } };
        } };
    const runtime = new AIRuntime(controller, async () => provider, hooks);
    return { controller, provider, structured, respond, attached, runtime, notices };
}
describe('one generation returns original and optional card point', () => {
    it('counts one request, keeps the entire original and strips display metadata before Core', async () => {
        const fixture = setup();
        try {
            expect(await fixture.runtime.run('continue', 'Continue', ['a'])).toMatchObject({ status: 'completed', emitted: 1 });
            expect(fixture.runtime.requestCount).toBe(1);
            expect(fixture.structured).toHaveBeenCalledTimes(1); expect(fixture.respond).not.toHaveBeenCalled();
            const ghost = Object.values(fixture.controller.getSnapshot().session.ghosts)[0];
            expect(ghost.text).toBe(answer); expect(ghost).not.toHaveProperty('reading');
            expect(fixture.attached.get(ghost.id)).toBe(point);
            expect(ghost.origin?.note).toContain('provider ran actual');
        } finally { fixture.runtime.dispose(); }
    });
    it('shows already-short originals directly even when a model supplies an unnecessary summary', async () => {
        const fixture = setup({ intents: [{ type: 'surface_possibility', text: 'Check one safe trial first.', reading: { point } }] });
        try {
            expect(await fixture.runtime.run('continue', 'Continue', ['a'])).toMatchObject({ status: 'completed' });
            expect(fixture.structured).toHaveBeenCalledTimes(1); expect(fixture.attached.size).toBe(0);
            expect(Object.values(fixture.controller.getSnapshot().session.ghosts)[0].text).toBe('Check one safe trial first.');
            expect(isCompactReading('🧪'.repeat(120))).toBe(true); expect(isCompactReading('🧪'.repeat(121))).toBe(false);
        } finally { fixture.runtime.dispose(); }
    });
    it.each([undefined, { point: 'x'.repeat(121) }, { point: '' }, { point, command: 'keep' }])('preserves a valid long answer with invalid/missing reading and never retries: %j', async reading => {
        const fixture = setup({ intents: [{ type: 'surface_possibility', text: answer, reading }] });
        try {
            expect(await fixture.runtime.run('continue', 'Continue', ['a'])).toMatchObject({ status: 'completed', emitted: 1 });
            expect(fixture.structured).toHaveBeenCalledTimes(1); expect(fixture.attached.size).toBe(0);
            expect(Object.values(fixture.controller.getSnapshot().session.ghosts)[0].text).toBe(answer);
        } finally { fixture.runtime.dispose(); }
    });
    it.each(['cancel', 'edit'] as const)('does not attach metadata or publish a card after %s during generation', async action => {
        const fixture = setup(); let entered!: () => void; let release!: () => void;
        const started = new Promise<void>(resolve => { entered = resolve; });
        const gate = new Promise<void>(resolve => { release = resolve; });
        fixture.structured.mockImplementationOnce(async () => { entered(); await gate; return { value: { intents: [{ type: 'surface_possibility', text: answer, reading: { point } }] }, mock: false, providerLabel: 'Late fixture', model: { requested: 'r', effective: 'r' } }; });
        try {
            const pending = fixture.runtime.run('continue', 'Continue', ['a']); await started;
            if (action === 'cancel') fixture.runtime.cancel(); else fixture.controller.dispatch({ type: 'thought.edit', id: 'a', text: 'A different question with a different goal.' });
            release(); const result = await pending;
            expect(result.status).toBe(action === 'cancel' ? 'cancelled' : 'failed');
            expect(fixture.attached.size).toBe(0); expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
            expect(fixture.structured).toHaveBeenCalledTimes(1);
        } finally { release(); fixture.runtime.dispose(); }
    });
    it.each([
        { intents: [{ type: 'delete-field', text: 'bad', reading: { point } }] },
        { intents: [{ type: 'surface_possibility', text: 'x'.repeat(481), reading: { point } }] },
        { intents: [{ type: 'surface_possibility', text: answer, command: 'keep' }] },
        { intents: [], command: 'keep' },
    ])('retains the normal action and schema gates without an automatic fallback request', async value => {
        const fixture = setup(value);
        try {
            expect(await fixture.runtime.run('continue', 'Continue', ['a'])).toMatchObject({ status: 'failed', emitted: 0 });
            expect(fixture.structured).toHaveBeenCalledTimes(1); expect(fixture.respond).not.toHaveBeenCalled();
            expect(fixture.attached.size).toBe(0);
        } finally { fixture.runtime.dispose(); }
    });
    it('shows a no-progress reason without creating a card or committing model metadata', async () => {
        const reason = '还缺少实际观察，继续展开会重复。';
        const fixture = setup({ intents: [], pause: { reason } });
        try {
            const before = JSON.stringify(fixture.controller.getSnapshot().project);
            expect(await fixture.runtime.run('continue', 'Continue', ['a'])).toMatchObject({ status: 'completed', emitted: 0 });
            expect(fixture.notices.at(-1)).toContain(reason);
            expect(fixture.structured).toHaveBeenCalledTimes(1);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
            expect(JSON.stringify(fixture.controller.getSnapshot().project)).toBe(before);
        } finally { fixture.runtime.dispose(); }
    });
    it('uses the existing provider path for demo and question/relation actions', async () => {
        const fixture = setup();
        try {
            await fixture.runtime.run('question', 'Ask a question', ['a']);
            expect(fixture.respond).toHaveBeenCalledTimes(1); expect(fixture.structured).not.toHaveBeenCalled();
            Object.defineProperty(fixture.provider, 'mock', { value: true });
            await fixture.runtime.run('continue', 'Continue', ['a']);
            expect(fixture.respond).toHaveBeenCalledTimes(2); expect(fixture.structured).not.toHaveBeenCalled();
        } finally { fixture.runtime.dispose(); }
    });
});
