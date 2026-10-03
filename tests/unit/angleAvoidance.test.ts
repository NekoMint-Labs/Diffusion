import { describe, expect, it } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { angleAvoidancePrompt } from '../../src/ai/diversity.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type ContextPacket, type SemanticIntent, type UserIntent } from '../../src/ai/contracts.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';

function setup(responses?: SemanticIntent[], existingText = 'A different uncertainty') {
    const project = createProject('angle-avoidance', 'Authored fixture', 1);
    project.thoughts.a = makeThought('A selected uncertainty', { x: 100, y: 100 }, 1, 'a');
    project.thoughts.b = makeThought(existingText, { x: 300, y: 100 }, 1, 'b');
    const controller = new ProjectController(project, async () => {});
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const provider: AIProvider = { label: 'Fixture / not live', mock: true,
        capabilities: async () => UNKNOWN_CAPABILITIES, structured: async () => { throw Error('Not used'); },
        respond: async (packet, intent) => {
            requests.push({ packet, intent });
            return { providerLabel: 'Fixture / not live', mock: true, intents: responses ?? [{ type: 'surface_possibility', text: 'An already tried frame.' }] };
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

describe('literal duplicate proposal filtering (fixtures, not semantic-quality evidence)', () => {
    it.each([
        ['continue', 'surface_possibility', 'A selected uncertainty', 'A distinct continuation'],
        ['angle', 'surface_possibility', 'A selected uncertainty', 'A distinct angle'],
        ['question', 'surface_question', 'A selected uncertainty?', 'A distinct question?'],
    ] as const)('filters scope/pending echoes and same-response repeats for %s while retaining unrelated canvas wording', async (action, type, echo, distinct) => {
        const duplicate = type === 'surface_question' ? `${distinct}!` : `${distinct}.`;
        const canvasEcho = 'A separate canvas idea';
        const pendingEcho = 'A pending proposal from earlier';
        const fixture = setup([
            { type, text: echo },
            { type, text: canvasEcho },
            { type, text: pendingEcho },
            { type, text: distinct },
            { type, text: `  ${duplicate}  ` },
        ], canvasEcho);
        fixture.controller.setSession({ ...fixture.controller.getSnapshot().session, ghosts: { pending: { id: 'pending', text: pendingEcho, x: 0, y: 0, createdAt: 1, scopeIds: ['a'] } } });
        try {
            const before = structuredClone(fixture.controller.getSnapshot().project);
            const result = await fixture.runtime.run(action, action, ['a'], { maxCandidates: 5 });
            expect(result).toMatchObject({ status: 'completed', emitted: 2 });
            expect(fixture.requests).toHaveLength(1);
            expect(fixture.runtime.requestCount).toBe(1);
            const proposals = Object.values(fixture.controller.getSnapshot().session.ghosts);
            expect(proposals.map(proposal => proposal.text)).toEqual([pendingEcho, canvasEcho, distinct]);
            expect(fixture.controller.getSnapshot().project).toEqual(before);
        } finally { fixture.runtime.dispose(); }
    });
});

describe('duplicate filtering respects supplied context (fixtures, not semantic-quality evidence)', () => {
    it('retains identical wording from a pending proposal attached only to another scope', async () => {
        const text = 'An independent proposal';
        const fixture = setup([{ type: 'surface_possibility', text }]);
        fixture.controller.addGhost({ id: 'other-ghost', text, x: 0, y: 0, createdAt: 1, scopeIds: ['b'] });
        try {
            const result = await fixture.runtime.run('continue', 'continue', ['a']);
            expect(result).toMatchObject({ status: 'completed', emitted: 1 });
            expect(fixture.requests).toHaveLength(1);
            expect(Object.values(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(2);
        } finally { fixture.runtime.dispose(); }
    });

    it('filters direct lineage background without changing the selected scope', async () => {
        const fixture = setup([{ type: 'surface_possibility', text: 'A different uncertainty' }]);
        fixture.controller.getSnapshot().project.thoughts.a.derivedFrom = ['b'];
        try {
            const before = structuredClone(fixture.controller.getSnapshot().project);
            const result = await fixture.runtime.run('continue', 'continue', ['a']);
            expect(result).toMatchObject({ status: 'completed', emitted: 0 });
            expect(fixture.requests[0].packet.scope.map(item => item.id)).toEqual(['a']);
            expect(fixture.requests[0].packet.local.map(item => item.id)).toEqual(['b']);
            expect(fixture.controller.getSnapshot().project).toEqual(before);
        } finally { fixture.runtime.dispose(); }
    });

    it('filters a canvas thought when it is explicitly selected as scope', async () => {
        const fixture = setup([
            { type: 'surface_possibility', text: 'A different uncertainty' },
        ]);
        try {
            const result = await fixture.runtime.run('continue', 'continue', ['a', 'b']);
            expect(result).toMatchObject({ status: 'completed', emitted: 0 });
            expect(Object.values(fixture.controller.getSnapshot().session.ghosts)).toEqual([]);
        } finally { fixture.runtime.dispose(); }
    });
});
