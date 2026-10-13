import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileContext } from '../../src/ai/context.ts';
import { LINEAGE_LIMITS } from '../../src/ai/lineageContext.ts';
import { packetSchema } from '../../src/ai/schemas.ts';
import { semanticInstructions } from '../../src/ai/prompt.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { MockAIProvider } from '../../src/ai/mock.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import type { AIResponse } from '../../src/ai/contracts.ts';

function chain() {
    const p = createProject('bounded', 'Synthetic chain', 1);
    const texts = { root: 'Build on Difix3D+ and introduce an agent for sparse-view reconstruction.', first: 'A repair proposal could compare reconstructions.', second: 'Compare the uncertainty on candidate regions.', selected: 'Use a region score to choose the next operation.', sibling: 'Unrelated sibling about cooking.', organization: 'Visual folder only.' };
    for (const [key, text] of Object.entries(texts)) p.thoughts[key] = makeThought(text, { x: 0, y: 0 }, 1, key);
    for (const [child, parent] of [['first', 'root'], ['second', 'first'], ['selected', 'second']])
        Object.assign(p.thoughts[child], { derivedFrom: [parent], generationAction: 'continue', origin: { note: 'Model fixture / not authored' } });
    p.thoughts.sibling.derivedFrom = ['first'];
    p.thoughts.selected.organizingParentId = 'organization';
    return p;
}
const runtimes: AIRuntime[] = [];
afterEach(() => { runtimes.splice(0).forEach(runtime => runtime.dispose()); });
describe('bounded ancestor context', () => {
    it('keeps a multi-hop user goal while selection, evidence permissions and unrelated siblings stay scoped', () => {
        const p = chain(), before = JSON.stringify(p);
        const packet = packetSchema.parse(compileContext(p, ['selected']));
        expect(packet.scope.map(item => item.id)).toEqual(['selected']);
        expect(packet.local.map(item => item.id)).toEqual(['second', 'root', 'first']);
        expect(packet.local.find(item => item.id === 'root')).toMatchObject({ authored: true, text: p.thoughts.root.text });
        expect(packet.scope[0].authored).toBe(false);
        expect(packet.ancestry).toContainEqual({ thoughtId: 'selected', path: ['selected', 'second', 'first', 'root'] });
        expect(packet.local.some(item => ['sibling', 'organization'].includes(item.id))).toBe(false);
        expect(packet.permissions).toEqual({ web: false, projectSources: false });
        expect(packet.retrieved.sources).toEqual([]);
        expect(JSON.stringify(p)).toBe(before);
    });
    it('prioritizes the nearer authored redirection over the earlier goal without treating AI Keep as human wording', () => {
        const p = chain();
        p.thoughts.first.text = 'Change of goal: no agent; compare offline repair quality only.';
        p.inputs.redirect = { id: 'redirect', text: p.thoughts.first.text, createdAt: 2 };
        p.thoughts.first.origin = { inputId: 'redirect' };
        const packet = compileContext(p, ['selected']);
        expect(packet.local.map(item => item.id)).toEqual(['second', 'first', 'root']);
        expect(packet.local[1].authored).toBe(true);
        const prompt = semanticInstructions({ kind: 'continue', text: 'Continue', requestId: 'r' });
        expect(prompt).toContain('nearer user-authored redirection');
        expect(prompt).toContain('Never restore a superseded goal');
        expect(semanticInstructions({ kind: 'angle', text: 'Another angle', requestId: 'a' })).toContain('meaningfully different lens');
    });
    it('bounds depth, branching and text even with long thoughts, cycles and repeated references', () => {
        const p = chain();
        for (let i = 0; i < 150; i++) {
            const key = 'n' + i;
            p.thoughts[key] = { ...makeThought('Long context '.repeat(1000), { x: 0, y: 0 }, 1, key), derivedFrom: Array.from({ length: 10 }, (_, j) => 'n' + ((i + j + 1) % 150)), generationAction: 'continue' };
        }
        p.thoughts.selected.derivedFrom = ['n0', 'n1', 'n2', 'n3', 'n4', 'selected', 'missing'];
        const packet = packetSchema.parse(compileContext(p, ['selected']));
        expect(packet.local.length).toBeLessThanOrEqual(6);
        expect(packet.local.reduce((n, item) => n + item.text.length, 0)).toBeLessThanOrEqual(6400);
        expect(packet.continuations![0].sourceIds).toEqual(['n0', 'n1', 'n2', 'n3']);
        expect(packet.ancestry?.every(link => link.path.length <= LINEAGE_LIMITS.depth + 1 && new Set(link.path).size === link.path.length)).toBe(true);
        expect(packet.local.every(item => item.text.length <= 1600)).toBe(true);
        expect(packet.local.filter(item => packet.ancestry?.some(link => link.path.at(-1) === item.id)).every(item => item.text.length <= 800)).toBe(true);
    });
    it('does not exceed four hops or invent a deleted or missing goal', () => {
        const p = chain();
        p.thoughts.extra = { ...makeThought('An extra intermediate', { x: 0, y: 0 }, 1, 'extra'), derivedFrom: ['selected'], generationAction: 'continue' };
        p.thoughts.last = { ...makeThought('Most recent', { x: 0, y: 0 }, 1, 'last'), derivedFrom: ['extra'], generationAction: 'continue' };
        expect(compileContext(p, ['last']).local.some(item => item.id === 'root')).toBe(false);
        delete p.thoughts.root;
        expect(compileContext(p, ['selected']).local.some(item => item.id === 'root')).toBe(false);
        delete p.thoughts.selected.derivedFrom;
        expect(compileContext(p, ['selected']).ancestry).toBeUndefined();
        expect(compileContext(p, []).ancestry).toBeUndefined();
    });
    it('rejects forged or cyclic ancestry packets and accepts old packets', () => {
        const p = chain(), packet = compileContext(p, ['selected']);
        const { ancestry, ...legacy } = packet;
        expect(packetSchema.safeParse(legacy).success).toBe(true);
        for (const path of [['selected', 'second', 'selected'], ['selected', 'sibling', 'root'], ['other', 'second', 'root'], ['selected', 'second', 'missing'], ['selected', 'second', 'first', 'root', 'n1', 'n2']])
            expect(packetSchema.safeParse({ ...packet, ancestry: [{ thoughtId: 'selected', path }] }).success).toBe(false);
    });
    it.each(['second', 'root'])('discards late answers after appending a goal to supplied %s', async key => {
        const controller = new ProjectController(chain(), async () => {});
        const provider = new MockAIProvider();
        let finish!: (value: AIResponse) => void, entered!: () => void;
        const called = new Promise<void>(resolve => { entered = resolve; });
        vi.spyOn(provider, 'respond').mockImplementation(async () => { entered(); return new Promise(resolve => { finish = resolve; }); });
        const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 500, y: 300 }) });
        runtimes.push(runtime);
        const pending = runtime.run('continue', 'Continue', ['selected']); await called;
        const original = controller.getSnapshot().project.thoughts[key].text;
        const redirection = ' Change of goal: do not choose new camera positions; compare offline reconstruction only.';
        controller.dispatch({ type: 'thought.edit', id: key, text: original + redirection });
        expect(compileContext(controller.getSnapshot().project, ['selected']).local.find(item => item.id === key)?.text).toContain(redirection);
        finish({ providerLabel: 'Fixture', mock: true, intents: [{ type: 'surface_possibility', text: 'An obsolete suggestion' }] });
        expect(await pending).toMatchObject({ status: 'failed', emitted: 0 });
        expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(0);
    });
    it.each([
        { key: 'second', appendOutsideBudget: false }, { key: 'root', appendOutsideBudget: false },
        { key: 'second', appendOutsideBudget: true }, { key: 'root', appendOutsideBudget: true },
    ])('accepts the same truncated context from $key (outside-budget append: $appendOutsideBudget)', async ({ key, appendOutsideBudget }) => {
        const project = chain();
        project.thoughts[key].text = 'A long supplied context. '.repeat(200);
        const controller = new ProjectController(project, async () => {});
        const provider = new MockAIProvider();
        let finish!: (value: AIResponse) => void, entered!: () => void;
        const called = new Promise<void>(resolve => { entered = resolve; });
        vi.spyOn(provider, 'respond').mockImplementation(async () => { entered(); return new Promise(resolve => { finish = resolve; }); });
        const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 500, y: 300 }) });
        runtimes.push(runtime);
        const pending = runtime.run('continue', 'Continue', ['selected']); await called;
        expect(compileContext(project, ['selected']).local.find(item => item.id === key)?.text.length).toBe(key === 'root' ? 800 : 1600);
        if (appendOutsideBudget) controller.dispatch({ type: 'thought.edit', id: key, text: project.thoughts[key].text + ' An unsupplied suffix.' });
        finish({ providerLabel: 'Fixture', mock: true, intents: [{ type: 'surface_possibility', text: 'A bounded suggestion for the unchanged context' }] });
        expect(await pending).toMatchObject({ status: 'completed', emitted: 1 });
        expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(1);
    });
    it.each(['edit', 'delete', 'unlink'] as const)('discards late answers after an ancestor changes: %s', async change => {
        const controller = new ProjectController(chain(), async () => {});
        const provider = new MockAIProvider();
        let finish!: (value: AIResponse) => void, entered!: () => void;
        const called = new Promise<void>(resolve => { entered = resolve; });
        vi.spyOn(provider, 'respond').mockImplementation(async () => { entered(); return new Promise(resolve => { finish = resolve; }); });
        const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 500, y: 300 }) });
        runtimes.push(runtime);
        const pending = runtime.run('continue', 'Continue', ['selected']); await called;
        if (change === 'edit') controller.dispatch({ type: 'thought.edit', id: 'root', text: 'A revised user goal' });
        if (change === 'delete') controller.dispatch({ type: 'thought.delete', ids: ['root'] });
        if (change === 'unlink') controller.getSnapshot().project.thoughts.first.derivedFrom = [];
        finish({ providerLabel: 'Fixture', mock: true, intents: [{ type: 'surface_possibility', text: 'An obsolete suggestion' }] });
        expect((await pending).status).toBe('failed');
        expect(Object.keys(controller.getSnapshot().session.ghosts)).toHaveLength(0);
    });
});
