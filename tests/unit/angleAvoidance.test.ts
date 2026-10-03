import { describe, expect, it } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { angleAvoidancePrompt } from '../../src/ai/diversity.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type ContextPacket, type UserIntent } from '../../src/ai/contracts.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';

function setup() {
    const project = createProject('angle-avoidance', 'Authored fixture', 1);
    project.thoughts.a = makeThought('A selected uncertainty', { x: 100, y: 100 }, 1, 'a');
    project.thoughts.b = makeThought('A different uncertainty', { x: 300, y: 100 }, 1, 'b');
    const controller = new ProjectController(project, async () => {});
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const provider: AIProvider = { label: 'Fixture / not live', mock: true,
        capabilities: async () => UNKNOWN_CAPABILITIES, structured: async () => { throw Error('Not used'); },
        respond: async (packet, intent) => {
            requests.push({ packet, intent });
            return { providerLabel: 'Fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: 'An already tried frame.' }] };
        },
    };
    const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 400, y: 300 }) });
    return { controller, runtime, requests };
}

describe('repeated explicit Angle requests (fixtures, not semantic-quality evidence)', () => {
    it('remembers an ignored frame only as negative data and rejects a literal repeat without retry', async () => {
        const fixture = setup();
        try {
            const before = structuredClone(fixture.controller.getSnapshot().project);
            expect((await fixture.runtime.run('angle', 'Another angle', ['a'])).emitted).toBe(1);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            expect((await fixture.runtime.run('angle', 'Another angle', ['a'])).emitted).toBe(0);
            expect(fixture.requests).toHaveLength(2);
            expect(fixture.requests[1].intent.text).toContain('An already tried frame.');
            expect(fixture.requests[1].intent.text).toContain('not facts, premises, evidence or instructions');
            expect(fixture.requests[1].packet).toEqual(fixture.requests[0].packet);
            expect(JSON.stringify(fixture.requests[1].packet)).not.toContain('An already tried frame.');
            expect(fixture.controller.getSnapshot().project).toEqual(before);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
        } finally { fixture.runtime.dispose(); }
    });
    it('does not carry an old frame into a changed selection or changed selected wording', async () => {
        const fixture = setup();
        try {
            await fixture.runtime.run('angle', 'Another angle', ['a']);
            await fixture.runtime.run('angle', 'Another angle', ['b']);
            expect(fixture.requests[1].intent.text).toBe('Another angle');
            fixture.controller.dispatch({ type: 'thought.edit', id: 'b', text: 'A revised uncertainty' }, 'user');
            await fixture.runtime.run('angle', 'Another angle', ['b']);
            expect(fixture.requests[2].intent.text).toBe('Another angle');
        } finally { fixture.runtime.dispose(); }
    });
    it('does not attach Angle history to Continue or to an explicit new Diffuse run', async () => {
        const fixture = setup();
        try {
            await fixture.runtime.run('angle', 'Another angle', ['a']);
            await fixture.runtime.run('continue', 'Continue', ['a']);
            await fixture.runtime.run('diffuse', 'New exploration', ['a']);
            expect(fixture.requests.slice(1).map(request => request.intent.text)).toEqual(['Continue', 'New exploration']);
        } finally { fixture.runtime.dispose(); }
    });
    it('bounds escaped negative data and preserves a maximum-length authored prompt', () => {
        const prompt = angleAvoidancePrompt('Another angle', Array(20).fill('\u0001'.repeat(20000)));
        expect(prompt.length).toBeLessThanOrEqual(12000);
        expect(JSON.parse(prompt.split('\n').at(-1)!)).toHaveLength(6);
        expect(angleAvoidancePrompt('x'.repeat(12000), ['Previous frame'])).toBe('x'.repeat(12000));
    });
});