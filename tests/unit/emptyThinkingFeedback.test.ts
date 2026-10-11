import { describe, expect, it } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type SemanticIntent } from '../../src/ai/contracts.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { setLocale } from '../../src/shared/i18n.ts';

setLocale('en');
function setup(intents: SemanticIntent[]) {
    const project = createProject('empty-feedback', 'Empty feedback fixture', 1);
    project.thoughts.a = makeThought('A selected uncertainty', { x: 100, y: 200 }, 1, 'a');
    const controller = new ProjectController(project, async () => {});
    const notices: string[] = [];
    let calls = 0;
    const provider: AIProvider = { label: 'Feedback fixture / not live', mock: false,
        capabilities: async () => UNKNOWN_CAPABILITIES, structured: async () => { throw Error('Not used'); },
        respond: async () => { calls++; return { providerLabel: 'Feedback fixture / not live', mock: false, intents }; },
    };
    const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: text => notices.push(text), route: () => { throw Error('Must not open a place'); }, anchor: () => ({ x: 400, y: 300 }) });
    return { controller, runtime, notices, calls: () => calls };
}

describe('feedback reports surfaced content, not just a completed provider request', () => {
    it.each(['ask', 'continue', 'angle', 'question', 'organize', 'diffuse'] as const)('%s clearly reports an empty completed response without retry or mutation', async action => {
        const fixture = setup([]);
        const before = structuredClone(fixture.controller.getSnapshot().project);
        try {
            const result = await fixture.runtime.run(action, 'A bounded check', ['a'], { maxCandidates: 1 });
            expect(result).toEqual({ status: 'completed', emitted: 0 });
            expect(fixture.notices.at(-1)).toBe('No new suggestion was surfaced this time.');
            expect(fixture.calls()).toBe(1);
            expect(fixture.controller.getSnapshot().project).toEqual(before);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
        } finally { fixture.runtime.dispose(); }
    });
    it('also reports no card when a response exists but the generic-question gate rejects it', async () => {
        const fixture = setup([{ type: 'surface_question', text: '你有什么想法？' }]);
        try {
            expect(await fixture.runtime.run('question', 'Ask one question', ['a'])).toEqual({ status: 'completed', emitted: 0 });
            expect(fixture.notices.at(-1)).toBe('No new suggestion was surfaced this time.');
            expect(fixture.calls()).toBe(1);
        } finally { fixture.runtime.dispose(); }
    });
    it('retains success feedback when a real proposal is surfaced', async () => {
        const fixture = setup([{ type: 'surface_possibility', text: 'A concrete authored fixture' }]);
        try {
            expect(await fixture.runtime.run('continue', 'Continue', ['a'])).toEqual({ status: 'completed', emitted: 1 });
            expect(fixture.notices.at(-1)).toBe('Possibilities returned. No commitment was made on your behalf.');
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(1);
        } finally { fixture.runtime.dispose(); }
    });
});
