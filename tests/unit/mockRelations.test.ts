import { afterEach, describe, expect, it } from 'vitest';
import { MockAIProvider } from '../../src/ai/mock.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { demoProject } from '../../src/core/demo.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { setLocale } from '../../src/shared/i18n.ts';

function runtime(controller: ProjectController) {
    return new AIRuntime(controller, async () => new MockAIProvider(), {
        pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 0, y: 0 }),
    });
}
afterEach(() => setLocale('system'));

describe('authored Demo relationships use the production quality gate', () => {
    for (const locale of ['en', 'zh'] as const) {
        for (const ids of [['attention', 'structure'], ['unfinished', 'quiet']]) {
            it(`${locale}: proposes a specific relationship for ${ids.join(' / ')} in either order`, async () => {
                setLocale(locale);
                for (const scope of [ids, [...ids].reverse()]) {
                    const controller = new ProjectController(demoProject(), async () => {});
                    const original = controller.getSnapshot().project;
                    const result = await runtime(controller).run('probe', 'Find a relation', scope);
                    expect(result).toMatchObject({ status: 'completed', emitted: 1 });
                    const candidates = Object.values(controller.getSnapshot().session.phenomena);
                    expect(candidates).toHaveLength(1);
                    expect(candidates[0]).toMatchObject({ a: scope[0], b: scope[1] });
                    expect(candidates[0].label).not.toMatch(/Possible missing link|可能缺少连接/);
                    expect(candidates[0].explanation).toBeTruthy();
                    expect(controller.getSnapshot().project).toEqual(original);
                }
            });
        }
    }
    it('leaves an unsupported pair unanswered instead of inventing a generic relationship', async () => {
        const project = createProject('unknown-demo', 'Unknown pair');
        project.thoughts.a = makeThought('A different thought', { x: 0, y: 0 }, 1, 'a');
        project.thoughts.b = makeThought('An unrelated thought', { x: 400, y: 0 }, 1, 'b');
        const controller = new ProjectController(project, async () => {});
        expect(await runtime(controller).run('probe', 'Find a relation', ['a', 'b'])).toMatchObject({ status: 'completed', emitted: 0 });
        expect(Object.values(controller.getSnapshot().session.phenomena)).toHaveLength(0);
        expect(Object.values(controller.getSnapshot().project.relations)).toHaveLength(0);
    });
});


describe('authored Demo Ask remains usable under the direct-answer contract', () => {
    for (const locale of ['en', 'zh'] as const) {
        it(`${locale}: admits its limitations in one uncommitted answer instead of emitting reframing`, async () => {
            setLocale(locale);
            const project = createProject('demo-ask-' + locale, 'Demo Ask');
            project.thoughts.a = makeThought(locale === 'zh' ? '我的问题' : 'My question', { x: 0, y: 0 }, 1, 'a');
            const controller = new ProjectController(project, async () => {});
            const before = JSON.stringify(controller.getSnapshot().project);
            const ai = runtime(controller);
            try {
                expect(await ai.run('ask', locale === 'zh' ? '请直接回答' : 'Give a direct answer', ['a'])).toMatchObject({ status: 'completed', emitted: 1 });
                const ghosts = Object.values(controller.getSnapshot().session.ghosts);
                expect(ghosts).toHaveLength(1);
                expect(ghosts[0]).toMatchObject({ proposalAction: 'ask', scopeIds: ['a'] });
                expect(ghosts[0].text).toMatch(locale === 'zh' ? /演示.*实质回答/u : /deterministic demo.*substantive answer/u);
                expect(JSON.stringify(controller.getSnapshot().project)).toBe(before);
            } finally { ai.dispose(); }
        });
    }
});
