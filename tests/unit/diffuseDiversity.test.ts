import { describe, expect, it, vi } from 'vitest';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { DiffuseSession, type DiffuseConfig } from '../../src/ai/diffuse.ts';
import { explorationPrompt, repeatedWording } from '../../src/ai/diversity.ts';
import { semanticInstructions } from '../../src/ai/prompt.ts';
import { compileContext } from '../../src/ai/context.ts';
import { requestSchema } from '../../src/ai/schemas.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type ContextPacket, type UserIntent, type SemanticIntent } from '../../src/ai/contracts.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';

const config: DiffuseConfig = { scopeIds: ['a'], prompt: 'Explore this uncertainty', steps: 3, seconds: 30, projectSources: false, web: false };
function setup(answer: (call: number) => SemanticIntent[] | Promise<SemanticIntent[]>, delay = 0) {
    const project = createProject('diversity', 'Diversity fixture', 1);
    project.thoughts.a = makeThought('采集代价可能比重建误差更影响这个选择', { x: 100, y: 200 }, 1, 'a');
    const controller = new ProjectController(project, async () => {});
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const provider: AIProvider = { label: 'Diversity fixture / not live', mock: true, capabilities: async () => UNKNOWN_CAPABILITIES,
        structured: async () => { throw Error('Not used'); },
        respond: async (packet, intent) => { requests.push({ packet, intent }); return { providerLabel: 'Diversity fixture / not live', mock: true, intents: await answer(requests.length) }; },
    };
    const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => { throw Error('No surface navigation'); }, anchor: () => ({ x: 400, y: 300 }) });
    const session = new DiffuseSession(controller, runtime, () => null, delay);
    return { controller, requests, session, dispose: () => { session.dispose(); runtime.dispose(); } };
}
const candidate = (text: string): SemanticIntent => ({ type: 'surface_possibility', text });
async function completed(session: DiffuseSession) { await vi.waitFor(() => expect(session.getSnapshot().phase).toBe('complete'), { interval: 5, timeout: 2500 }); }

describe('bounded exploration diversity (authored fixtures, not model-quality evidence)', () => {
    it('rotates attempted Angle lenses across explicit runs without promoting prior model output', async () => {
        const fixture = setup(call => [candidate('Distinct fixture ' + call)]);
        try {
            for (let run = 0; run < 7; run++) {
                // The mounted preview clears its presentation before each explicit run.
                fixture.session.clear();
                fixture.session.start({ ...config, mode: 'angle', steps: 1 });
                await completed(fixture.session);
                fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            }
            expect(new Set(fixture.requests.map(request => request.intent.text)).size).toBe(7);
            expect(fixture.requests[5].intent.text).toContain('plausible failure case');
            expect(fixture.requests[6].intent.text).toContain('surrounding system');
            expect(fixture.requests.every(request => request.intent.kind === 'angle' && request.packet.maxCandidates === 1)).toBe(true);
            expect(fixture.requests.every(request => !JSON.stringify(request).includes('Distinct fixture'))).toBe(true);
            fixture.session.start({ ...config, mode: 'angle', steps: 1 });
            await completed(fixture.session);
            expect(fixture.requests[7].intent.text).toBe(fixture.requests[0].intent.text);
            expect(Object.keys(fixture.controller.getSnapshot().project.thoughts)).toEqual(['a']);
        } finally { fixture.dispose(); }
    });
    it('resets Angle lenses for changed wording or permissions and leaves ordinary Diffuse separate', async () => {
        const fixture = setup(() => []);
        try {
            fixture.session.start({ ...config, mode: 'angle', steps: 1 }); await completed(fixture.session);
            const initial = fixture.requests[0].intent.text;
            fixture.session.start({ ...config, mode: 'angle', steps: 1 }); await completed(fixture.session);
            expect(fixture.requests[1].intent.text).not.toBe(initial);
            fixture.session.start({ ...config, mode: 'angle', steps: 1, projectSources: true }); await completed(fixture.session);
            expect(fixture.requests[2].intent.text).toBe(initial);
            fixture.controller.dispatch({ type: 'thought.edit', id: 'a', text: 'A different selected object' }, 'user');
            fixture.session.start({ ...config, mode: 'angle', steps: 1, projectSources: true }); await completed(fixture.session);
            expect(fixture.requests[3].intent.text).toBe(initial);
            fixture.session.start({ ...config, steps: 1 }); await completed(fixture.session);
            expect(fixture.requests[4].intent.kind).toBe('diffuse');
            expect(fixture.requests[4].intent.text).toContain('Name a missing question.');
            fixture.session.clear();
            fixture.session.start({ ...config, mode: 'angle', steps: 1, projectSources: true }); await completed(fixture.session);
            expect(fixture.requests[5].intent.text).toContain('cost of an alternative');
            expect(fixture.requests).toHaveLength(6);
        } finally { fixture.dispose(); }
    });
    it.each(['diffuse', 'angle'] as const)('limits %s to one proposal per direction even when a provider overproduces', async mode => {
        const fixture = setup(call => [candidate('Distinct fixture ' + call), candidate('Extra fixture ' + call)]);
        try {
            fixture.session.start({ ...config, mode, steps: 5 }); await completed(fixture.session);
            expect(fixture.requests).toHaveLength(5);
            expect(fixture.requests.every(request => request.packet.maxCandidates === 1 && request.intent.kind === mode)).toBe(true);
            expect(Object.values(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(5);
            expect(fixture.session.getSnapshot()).toMatchObject({ used: 5, surfaced: 5 });
            expect(fixture.controller.getSnapshot().project.thoughts).toEqual({ a: expect.objectContaining({ text: '采集代价可能比重建误差更影响这个选择', x: 100, y: 200 }) });
            await new Promise(resolve => setTimeout(resolve, 20)); expect(fixture.requests).toHaveLength(5);
        } finally { fixture.dispose(); }
    });
    it('does not force a single Angle to reverse a premise already qualified by the selection', async () => {
        const fixture = setup(() => [candidate('A distinct fixture frame')]);
        try {
            fixture.controller.dispatch({ type: 'thought.edit', id: 'a', text: 'The local interaction feels useful, but repeated real-case quality is still unverified.' });
            fixture.session.start({ ...config, mode: 'angle', steps: 1 });
            await completed(fixture.session);
            expect(fixture.requests).toHaveLength(1);
            const request = fixture.requests[0];
            expect(request.intent.kind).toBe('angle');
            expect(request.intent.text).not.toContain('Reverse one assumption');
            expect(request.intent.text).toContain('supported by this scope');
            expect(request.intent.text).toContain('Do not invent a premise to reverse');
            expect(request.intent.text).toContain('An already stated caveat');
            expect(request.packet.scope.map(thought => thought.text)).toEqual(['The local interaction feels useful, but repeated real-case quality is still unverified.']);
            expect(request.packet.local).toEqual([]);
        } finally { fixture.dispose(); }
    });
    it('stops on repeated wording, keeps prior Ghost temporary, and excludes it from scope/background/evidence', async () => {
        const fixture = setup(call => [candidate(call === 1 ? '采集的时间成本也许难以被误差分数表达。' : '  采集的时间成本也许难以被误差分数表达！')]);
        try {
            fixture.session.start(config); await completed(fixture.session);
            expect(fixture.requests).toHaveLength(2);
            expect(fixture.session.getSnapshot()).toMatchObject({ used: 2, surfaced: 1 });
            expect(fixture.session.getSnapshot().reason).toMatch(/No new direction|没有出现新的方向/);
            const second = fixture.requests[1];
            expect(second.intent.text).not.toContain('avoiding repetition only');
            expect(JSON.stringify(second)).not.toContain('采集的时间成本也许难以被误差分数表达');
            expect(second.packet.scope.map(item => item.id)).toEqual(['a']);
            expect(second.packet.local).toEqual([]); expect(second.packet.retrieved.sources).toEqual([]);
            expect(Object.keys(fixture.controller.getSnapshot().project.thoughts)).toEqual(['a']);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(1);
        } finally { fixture.dispose(); }
    });
    it('does not regenerate an ignored proposal; a new explicit run resets the exclusion', async () => {
        const fixture = setup(() => [candidate('One already tried fixture')], 30);
        try {
            fixture.session.start(config);
            await vi.waitFor(() => expect(fixture.session.getSnapshot().surfaced).toBe(1), { interval: 5 });
            fixture.controller.dismissGhost(Object.keys(fixture.controller.getSnapshot().session.ghosts)[0]);
            await completed(fixture.session); expect(fixture.requests).toHaveLength(2);
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0);
            fixture.session.start({ ...config, steps: 1 }); await completed(fixture.session);
            expect(fixture.requests).toHaveLength(3); expect(fixture.requests[2].intent.text).not.toContain('One already tried fixture');
            expect(fixture.session.getSnapshot().surfaced).toBe(1);
        } finally { fixture.dispose(); }
    });
    it('keeps exclusion and actual count across pause/resume', async () => {
        const fixture = setup(() => [candidate('A repeated fixture')], 100);
        try {
            fixture.session.start(config);
            await vi.waitFor(() => expect(fixture.session.getSnapshot().surfaced).toBe(1), { interval: 5 });
            fixture.session.pause(); expect(fixture.session.getSnapshot().phase).toBe('paused');
            fixture.session.resume(); await completed(fixture.session);
            expect(fixture.requests).toHaveLength(2); expect(fixture.session.getSnapshot()).toMatchObject({ used: 2, surfaced: 1 });
        } finally { fixture.dispose(); }
    });
    it.each(['empty', 'verbatim', 'wrong action'] as const)('ends without replacement requests for a %s step', async kind => {
        const fixture = setup(() => kind === 'empty' ? [] : kind === 'verbatim' ? [candidate('采集代价可能比重建误差更影响这个选择。')] : [{ type: 'surface_question', text: 'A wrong action fixture?' }]);
        try { fixture.session.start(config); await completed(fixture.session); expect(fixture.requests).toHaveLength(1); expect(fixture.session.getSnapshot()).toMatchObject({ used: 1, surfaced: 0 }); }
        finally { fixture.dispose(); }
    });
    it('discards a late result after explicit Stop', async () => {
        let release!: (value: SemanticIntent[]) => void;
        const fixture = setup(() => new Promise(resolve => { release = resolve; }));
        try {
            fixture.session.start(config); await vi.waitFor(() => expect(fixture.requests).toHaveLength(1), { interval: 5 });
            fixture.session.stop(); release([candidate('Late fixture')]);
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(fixture.session.getSnapshot()).toMatchObject({ phase: 'stopped', surfaced: 0 });
            expect(Object.keys(fixture.controller.getSnapshot().session.ghosts)).toHaveLength(0); expect(fixture.requests).toHaveLength(1);
        } finally { fixture.dispose(); }
    });
    it('preserves the authored prompt and existing request schema without adding prior model output', () => {
        const text = explorationPrompt('x'.repeat(9000), 5, 'A boundary');
        expect(text.length).toBeLessThanOrEqual(12000);
        expect(text).toContain('x'.repeat(9000));
        expect(text).not.toContain('avoidance excerpts');
        const fixture = setup(() => []);
        try {
            const packet = compileContext(fixture.controller.getSnapshot().project, ['a']);
            // Wire compatibility uses the same strict schema, no extra negative-context field.
            expect(requestSchema.safeParse({ packet, intent: { kind: 'diffuse', text, requestId: 'request' } }).success).toBe(true);
        } finally { fixture.dispose(); }
    });
    it('preserves internal technical distinctions and does not label synonym paraphrases as detected', () => {
        expect(repeatedWording('Cost  >  value！', ['cost > value.'])).toBe(true);
        expect(repeatedWording('cost >= value', ['cost > value'])).toBe(false);
        expect(repeatedWording('error != 0', ['error = 0'])).toBe(false);
        expect(repeatedWording('A synonym-level rewrite', ['The same idea in other words'])).toBe(false);
        expect(semanticInstructions({ kind: 'diffuse', text: 'Explore', requestId: 'request' })).toContain('Action contract — Diffuse');
    });
});
