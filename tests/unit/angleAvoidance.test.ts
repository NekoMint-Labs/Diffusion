import { describe, expect, it } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { SuggestionHistory } from '../../src/ai/diversity.ts';
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
    return { controller, runtime, requests, provider };
}

describe('repeated explicit thinking requests (fixtures, not semantic-quality evidence)', () => {
    it.each(['continue', 'angle'] as const)('%s remembers ignored wording locally without returning it to the provider and rejects a literal repeat without retry', async action => {
        const fixture = setup();
        try {
            const before = structuredClone(fixture.controller.getSnapshot().project);
            expect((await fixture.runtime.run(action, 'Think further', ['a'])).emitted).toBe(1);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            expect((await fixture.runtime.run(action, 'Think further', ['a'])).emitted).toBe(0);
            expect(fixture.requests).toHaveLength(2);
            expect(JSON.stringify(fixture.requests[1])).not.toContain('An already tried frame.');
            expect(fixture.requests[1].intent.text).toBe('Think further');
            expect(fixture.requests[1].packet).toEqual(fixture.requests[0].packet);
            expect(JSON.stringify(fixture.requests[1].packet)).not.toContain('An already tried frame.');
            expect(fixture.controller.getSnapshot().project).toEqual(before);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
        } finally { fixture.runtime.dispose(); }
    });
    it.each(['continue', 'angle'] as const)('%s resets history on changed selection or selected wording', async action => {
        const fixture = setup();
        try {
            await fixture.runtime.run(action, 'Think further', ['a']);
            await fixture.runtime.run(action, 'Think further', ['b']);
            expect(fixture.requests[1].intent.text).toBe('Think further');
            fixture.controller.dispatch({ type: 'thought.edit', id: 'b', text: 'A revised uncertainty' }, 'user');
            await fixture.runtime.run(action, 'Think further', ['b']);
            expect(fixture.requests[2].intent.text).toBe('Think further');
        } finally { fixture.runtime.dispose(); }
    });
    it('shares avoidance across Continue and Angle without changing the requested action', async () => {
        const fixture = setup();
        try {
            await fixture.runtime.run('continue', 'Continue', ['a']);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            expect((await fixture.runtime.run('angle', 'Another angle', ['a'])).emitted).toBe(0);
            expect(fixture.requests[1].intent.kind).toBe('angle');
            expect(JSON.stringify(fixture.requests[1])).not.toContain('An already tried frame.');
            expect(fixture.requests[1].intent.text).toBe('Another angle');
            await fixture.runtime.run('continue', 'Continue', ['a']);
            expect(fixture.requests[2].intent.text).toBe('Continue');
            expect(fixture.requests[2].packet).toEqual(fixture.requests[0].packet);
            expect(fixture.runtime.requestCount).toBe(3);
        } finally { fixture.runtime.dispose(); }
    });
    it('keeps Diffuse and frozen Thread separate while Angle retains history through its presenter', async () => {
        const fixture = setup();
        try {
            await fixture.runtime.run('angle', 'Another angle', ['a']);
            await fixture.runtime.run('diffuse', 'New exploration', ['a']);
            await fixture.runtime.run('angle', 'Budgeted angle', ['a'], { runId: 'exploration' });
            await fixture.runtime.run('continue', 'Frozen continuation', ['a'], { threadId: 'thread' });
            expect(fixture.requests[1].intent.text).toBe('New exploration');
            expect(JSON.stringify(fixture.requests[2])).not.toContain('An already tried frame.');
            expect(fixture.requests[2].intent.text).toBe('Budgeted angle');
            expect(fixture.requests[3].intent.text).toBe('Frozen continuation');
        } finally { fixture.runtime.dispose(); }
    });
    it('resets avoidance when supplied lineage background changes', async () => {
        const fixture = setup();
        fixture.controller.getSnapshot().project.thoughts.a.derivedFrom = ['b'];
        try {
            await fixture.runtime.run('continue', 'Continue', ['a']);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            fixture.controller.dispatch({ type: 'thought.edit', id: 'b', text: 'Revised direct source' }, 'user');
            expect((await fixture.runtime.run('continue', 'Continue', ['a'])).emitted).toBe(1);
            expect(fixture.requests[1].intent.text).toBe('Continue');
            expect(fixture.requests[1].packet.local[0].text).toBe('Revised direct source');
        } finally { fixture.runtime.dispose(); }
    });
    it('does not let a superseded provider lookup erase newer scope history or make a late call', async () => {
        const fixture = setup();
        let release!: (provider: AIProvider) => void;
        let first = true;
        const runtime = new AIRuntime(fixture.controller, () => {
            if (!first) return Promise.resolve(fixture.provider);
            first = false;
            return new Promise(resolve => { release = resolve; });
        }, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 400, y: 300 }) });
        try {
            const older = runtime.run('continue', 'Continue old scope', ['b']);
            await runtime.run('continue', 'Continue', ['a']);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            release(fixture.provider);
            expect(await older).toMatchObject({ status: 'cancelled', emitted: 0 });
            expect((await runtime.run('continue', 'Continue', ['a'])).emitted).toBe(0);
            expect(fixture.requests).toHaveLength(2);
            expect(runtime.requestCount).toBe(2);
            expect(JSON.stringify(fixture.requests[1])).not.toContain('An already tried frame.');
        } finally { runtime.dispose(); fixture.runtime.dispose(); }
    });
    it('bounds local rejection history to six entries without changing a maximum authored prompt', async () => {
        const fixture = setup();
        try {
            const history = new SuggestionHistory();
            const packet = { ...fixture.controller.getSnapshot().project };
            const { compileContext } = await import('../../src/ai/context.ts');
            const context = compileContext(packet, ['a']);
            history.forContext(context);
            for (let index = 0; index < 20; index++) history.remember('Frame ' + index);
            expect(history.forContext(context)).toEqual(Array.from({ length: 6 }, (_, index) => 'Frame ' + (index + 14)));
            history.clear(); expect(history.forContext(context)).toEqual([]);
            await fixture.runtime.run('continue', 'Think further', ['a']);
            const authored = 'x'.repeat(12000);
            await fixture.runtime.run('continue', authored, ['a']);
            expect(fixture.requests[1].intent.text).toBe(authored);
            expect(JSON.stringify(fixture.requests[1])).not.toContain('An already tried frame.');
        } finally { fixture.runtime.dispose(); }
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

describe('repeated questions retain user agency (fixtures, not model-quality evidence)', () => {
    it('rotates single-question focus without old output, resets with context and preserves the maximum prompt', async () => {
        const fixture = setup([]);
        try {
            for (let run = 0; run < 5; run++) await fixture.runtime.run('question', 'Ask one question', ['a'], { maxCandidates: 1 });
            expect(new Set(fixture.requests.map(request => request.intent.text)).size).toBe(5);
            expect(fixture.requests[0].intent.text).toContain('missing definition or distinction');
            expect(fixture.requests[1].intent.text).toContain('missing observation');
            expect(fixture.requests[2].intent.text).toContain('unstated assumption');
            expect(fixture.requests.every(request => request.packet.scope.map(item => item.id).join() === 'a')).toBe(true);
            fixture.controller.dispatch({ type: 'thought.edit', id: 'a', text: 'A changed selected thought' }, 'user');
            await fixture.runtime.run('question', 'Ask one question', ['a'], { maxCandidates: 1 });
            expect(fixture.requests[5].intent.text).toBe(fixture.requests[0].intent.text);
            const authored = 'x'.repeat(12000);
            await fixture.runtime.run('question', authored, ['a'], { maxCandidates: 1 });
            expect(fixture.requests[6].intent.text).toBe(authored);
            await fixture.runtime.run('question', 'Ask three independent questions', ['a'], { maxCandidates: 3 });
            expect(fixture.requests[7].intent.text).toBe('Ask three independent questions');
            await fixture.runtime.run('ask', 'My own question', ['a'], { maxCandidates: 1 });
            expect(fixture.requests[8].intent.text).toBe('My own question');
            expect(fixture.requests).toHaveLength(9);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
        } finally { fixture.runtime.dispose(); }
    });
    it('remembers an ignored question, filters its punctuation variant, and never retries or submits it as context', async () => {
        const text = 'Which observation would change the stopping threshold?';
        const fixture = setup([{ type: 'surface_question', text }]);
        try {
            const before = structuredClone(fixture.controller.getSnapshot().project);
            expect((await fixture.runtime.run('question', 'Ask one question', ['a'], { maxCandidates: 1 })).emitted).toBe(1);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            fixture.provider.respond = async (packet, intent) => {
                fixture.requests.push({ packet, intent });
                return { providerLabel: 'Fixture / not live', mock: true, intents: [{ type: 'surface_question', text: text.slice(0, -1) + '!' }] };
            };
            expect((await fixture.runtime.run('question', 'Ask one question', ['a'], { maxCandidates: 1 })).emitted).toBe(0);
            expect(fixture.requests).toHaveLength(2);
            expect(JSON.stringify(fixture.requests[1])).not.toContain(text.slice(0, -1));
            expect(fixture.controller.getSnapshot().project).toEqual(before);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
        } finally { fixture.runtime.dispose(); }
    });
    it('allows a different unknown and an explicitly changed numerical criterion', async () => {
        const texts = ['Would error > 0.1 change the stopping decision?', 'Would error >= 0.1 change the stopping decision?', 'Would error > 0.2 change the stopping decision?', 'Which agent is allowed to spend the remaining budget?'];
        const fixture = setup();
        fixture.provider.respond = async (packet, intent) => {
            fixture.requests.push({ packet, intent });
            return { providerLabel: 'Fixture / not live', mock: true, intents: [{ type: 'surface_question', text: texts[fixture.requests.length - 1] }] };
        };
        try {
            for (const _text of texts) {
                expect((await fixture.runtime.run('question', 'Ask', ['a'])).emitted).toBe(1);
                fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            }
            expect(fixture.requests).toHaveLength(texts.length);
        } finally { fixture.runtime.dispose(); }
    });
    it('resets question history when the selected thought or its supplied parent changes', async () => {
        const fixture = setup([{ type: 'surface_question', text: 'Which missing measurement could change this judgment?' }]);
        fixture.controller.getSnapshot().project.thoughts.a.derivedFrom = ['b'];
        fixture.controller.getSnapshot().project.thoughts.a.generationAction = 'continue';
        try {
            expect((await fixture.runtime.run('question', 'Ask', ['a'])).emitted).toBe(1);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            fixture.controller.dispatch({ type: 'thought.edit', id: 'b', text: 'A revised direct source' }, 'user');
            expect((await fixture.runtime.run('question', 'Ask', ['a'])).emitted).toBe(1);
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            fixture.controller.dispatch({ type: 'thought.edit', id: 'a', text: 'A revised selected uncertainty' }, 'user');
            expect((await fixture.runtime.run('question', 'Ask', ['a'])).emitted).toBe(1);
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
