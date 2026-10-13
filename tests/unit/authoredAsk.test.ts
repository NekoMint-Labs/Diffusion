import { describe, expect, it, vi } from 'vitest';
import { intentAllowedForAction, parseSemantics, semanticInstructions } from '../../src/ai/prompt.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { MockAIProvider } from '../../src/ai/mock.ts';
import { compileContext } from '../../src/ai/context.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';

describe('authored Ask answer contract (#43)', () => {
    it('limits the Demo earlier recall shortcut to an explicit recall request', async () => {
        const project = createProject('ask-recall');
        project.thoughts.a = makeThought('Plan three practice evenings', { x: 0, y: 0 }, 1, 'a');
        const packet = compileContext(project, ['a']);
        packet.retrieved.thoughts = [{ id: 'earlier', text: 'An earlier practice plan', kind: 'thought' }];
        const provider = new MockAIProvider();
        const answer = await provider.respond(packet, { kind: 'ask', text: 'How should I improve the earlier practice plan?', requestId: 'answer' });
        expect(answer.intents).toEqual([expect.objectContaining({ type: 'respond_in_field' })]);
        const recall = await provider.respond(packet, { kind: 'ask', text: ' earlier ', requestId: 'recall' });
        expect(recall.intents).toEqual([{ type: 'request_recall', thoughtId: 'earlier' }]);
        packet.retrieved.thoughts = [];
        const missing = await provider.respond(packet, { kind: 'ask', text: 'earlier', requestId: 'missing' });
        expect(missing.intents).toEqual([expect.objectContaining({ type: 'respond_in_field' })]);
    });
    it('accepts one or several substantive answer cards without padding the requested maximum', () => {
        const one = [{ type: 'respond_in_field', text: 'Use the first evening for practice.' }];
        expect(parseSemantics({ intents: one }, 'ask')).toEqual(one);
        expect(parseSemantics({ intents: [...one, { type: 'respond_in_field', text: 'Use the second evening for a timed mock interview.' }] }, 'ask')).toHaveLength(2);
        expect(parseSemantics({ intents: [] }, 'ask')).toEqual([]);
    });
    it('rejects mixed answer/reframing shapes on the provider parsing path', () => {
        expect(() => parseSemantics({ intents: [{ type: 'respond_in_field', text: 'An answer' }, { type: 'surface_possibility', text: 'Try another angle instead' }] }, 'ask')).toThrow();
        expect(intentAllowedForAction('ask', 'surface_question')).toBe(false);
        expect(intentAllowedForAction('ask', 'surface_evidence')).toBe(true);
        expect(intentAllowedForAction('ask', 'request_recall')).toBe(true);
        for (const kind of ['continue', 'angle', 'question'] as const) expect(intentAllowedForAction(kind, kind === 'question' ? 'surface_question' : 'surface_possibility')).toBe(true);
    });
    it('a custom provider cannot turn Ask into another action or commitment', async () => {
        const project = createProject('ask-fixture'); project.thoughts.a = makeThought('Three evenings for interview practice', { x: 0, y: 0 }, 1, 'a');
        const controller = new ProjectController(project, async () => {});
        const p = new MockAIProvider();
        vi.spyOn(p, 'respond').mockResolvedValue({ providerLabel: 'Fixture', mock: true, intents: [
            { type: 'respond_in_field', text: 'Evening one: rehearse your introduction.' },
            { type: 'surface_possibility', text: 'Think from another angle.' },
            { type: 'respond_in_field', text: 'Evening two: record answers to interview questions.' },
        ] });
        const runtime = new AIRuntime(controller, async () => p, { pending() {}, notice() {}, route() { throw new Error('Ask must stay in the Field'); }, anchor: () => ({ x: 300, y: 0 }) });
        try {
            expect(await runtime.run('ask', 'How should I arrange the evenings?', ['a'])).toMatchObject({ status: 'completed', emitted: 2 });
            const ghosts = Object.values(controller.getSnapshot().session.ghosts);
            expect(ghosts.map(g => g.text)).toEqual(['Evening one: rehearse your introduction.', 'Evening two: record answers to interview questions.']);
            expect(Object.keys(controller.getSnapshot().project.thoughts)).toEqual(['a']);
            controller.dismissGhost(ghosts[0].id); controller.claim(ghosts[1].id);
            expect(Object.keys(controller.getSnapshot().project.thoughts)).toHaveLength(2);
        } finally { runtime.dispose(); }
    });
    it('provides the authored-answer instructions alongside the shared permission contract', () => {
        const instructions = semanticInstructions({ kind: 'ask', text: 'My question', requestId: 'r' }, 3);
        expect(instructions).toContain('Directly answer the authored question');
        expect(instructions).toContain('A single substantive answer is preferable');
        expect(instructions).not.toContain('"type":"surface_possibility"');
    });
});
