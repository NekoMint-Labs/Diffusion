import { describe, expect, it, vi } from 'vitest';
import { activeBranch, buildTrialContext, emptyNotebook, newId, notebookSchema, restoreNotebook, type Notebook, type TrialNote } from '../../src/next/state.ts';
import { ExplorationSession } from '../../src/next/session.ts';
import { decisionSchema, modelDecider, STEP_INSTRUCTIONS, type DecideStep, type StepResult } from '../../src/next/decision.ts';
import { structuredRequestSchema } from '../../src/ai/schemas.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider } from '../../src/ai/contracts.ts';
import { createGateway } from '../../server/app.ts';
import { loadConfig } from '../../server/config.ts';

function notebook() {
    const state = emptyNotebook(); state.goal = 'Decide whether a campus trading tool is useful'; state.priorities = 'Cost before scope; verify assumptions';
    activeBranch(state).question = 'Which trust assumptions need checking?'; return state;
}
const step = (text = 'A tentative idea'): StepResult => ({ origin: 'model', decision: { action: 'explore', reason: 'The current branch has an untested assumption', text } });
const note = (text: string): TrialNote => ({ id: newId(), action: 'user', reason: '', text, status: 'kept', origin: 'user', at: 1, briefRevision: 0, questionRevision: 0 });

describe('Next trial context and checkpoints', () => {
    it('pins user goals exactly and isolates other branches until explicit sharing', () => {
        const state = notebook(), otherId = newId(), privateNote = note('Other branch private detail');
        state.branches.push({ id: otherId, title: 'other', question: 'Do not leak this', questionRevision: 0, notes: [privateNote], sourceIds: [], recalledIds: [] });
        expect(buildTrialContext(state).overview.priorities).toBe(state.priorities);
        expect(JSON.stringify(buildTrialContext(state))).not.toContain(privateNote.text);
        state.sharedIds.push(privateNote.id);
        expect(buildTrialContext(state).overview.shared[0].text).toBe(privateNote.text);
        expect(JSON.stringify(buildTrialContext(state))).not.toContain('Do not leak this');
    });
    it('keeps old detail addressable while preserving source provenance and excluding unselected text', () => {
        const state = notebook(), branch = activeBranch(state);
        branch.notes = Array.from({ length: 15 }, (_, i) => note(`record ${i}`)); branch.recalledIds = [branch.notes[0].id];
        state.sources = [{ id: 'selected', title: 'Selected', body: 'An actual source passage.' }, { id: 'hidden', title: 'Hidden', body: 'Not authorized in this branch.' }]; branch.sourceIds = ['selected'];
        const context = buildTrialContext(state);
        expect(context.branch.recent).toHaveLength(8); expect(context.branch.recalled[0].text).toBe('record 0');
        expect(context.branch.archiveIndex).toHaveLength(7);
        expect(JSON.stringify(context)).not.toContain('Not authorized');
        expect(context.sources[0].provenance).toContain('not fetched');
    });
    it('refuses corrupted, secret-bearing, duplicate-ID and unkept-shared checkpoints', () => {
        expect(() => restoreNotebook('{broken')).toThrow();
        expect(() => notebookSchema.parse({ ...notebook(), apiKey: 'not-a-real-secret' })).toThrow();
        const state = notebook(); activeBranch(state).notes.push({ ...note('proposal'), status: 'proposed' }); state.sharedIds = [activeBranch(state).notes[0].id];
        expect(() => notebookSchema.parse(state)).toThrow();
        state.sharedIds = []; state.branches.push(structuredClone(activeBranch(state)));
        expect(() => notebookSchema.parse(state)).toThrow();
    });
    it('restores interrupted work paused and never calls a model on restore', () => {
        const state = notebook(); state.phase = 'running'; state.requests = 2;
        const restored = restoreNotebook(JSON.stringify(state)); const decide = vi.fn();
        const session = new ExplorationSession(restored, () => {});
        expect(session.getSnapshot().phase).toBe('paused'); expect(session.getSnapshot().requests).toBe(2); expect(decide).not.toHaveBeenCalled();
    });
    it('fits a maximally populated Chinese branch into the gateway request budget', () => {
        const state = notebook(); state.goal = '目'.repeat(4000); state.priorities = '先'.repeat(2000);
        const branch = activeBranch(state); branch.title = '分'.repeat(120); branch.question = '问'.repeat(2000);
        state.sources = Array.from({ length: 3 }, () => ({ id: newId(), title: '文'.repeat(200), body: '原'.repeat(6000) })); branch.sourceIds = state.sources.map(s => s.id);
        branch.notes = Array.from({ length: 80 }, (_, i) => ({ ...note(String(i) + '录'.repeat(1598)), citation: { sourceId: state.sources[0].id, quote: '原'.repeat(1200), outcome: 'partial' as const } }));
        branch.recalledIds = branch.notes.slice(0, 3).map(n => n.id); state.sharedIds = branch.notes.slice(3, 11).map(n => n.id);
        notebookSchema.parse(state);
        expect(new TextEncoder().encode(JSON.stringify({ purpose: 'exploration-step', instructions: STEP_INSTRUCTIONS, input: buildTrialContext(state) })).length).toBeLessThan(192 * 1024);
    });
    it('marks retained discoveries for review when the user changes the brief', async () => {
        const session = new ExplorationSession(notebook(), () => {}); await session.run(async () => step(), 1);
        session.edit(draft => { draft.priorities = 'New priority'; });
        expect(buildTrialContext(session.getSnapshot()).branch.recent[0].needsReview).toBe(true);
        expect(activeBranch(session.getSnapshot()).notes[0].text).toBe('A tentative idea');
    });
});

describe('Next bounded exploration', () => {
    it('runs at most the explicitly requested number and presents fresh findings to the following step', async () => {
        const contexts: Notebook[] = [], saved: Notebook[] = [];
        const decide: DecideStep = async state => { contexts.push(state); return step(`finding ${contexts.length}`); };
        const session = new ExplorationSession(notebook(), state => saved.push(structuredClone(state)));
        await session.run(decide, 3);
        expect(contexts).toHaveLength(3); expect(activeBranch(contexts[1]).notes[0].text).toBe('finding 1');
        expect(session.getSnapshot().phase).toBe('paused'); expect(session.getSnapshot().requests).toBe(3);
        expect(saved[0].checkpoint).toBe('requested'); expect(activeBranch(saved[0]).notes).toHaveLength(0);
    });
    it.each(['ask-user', 'finish'] as const)('halts the loop when the model chooses %s', async action => {
        const decide = vi.fn(async (): Promise<StepResult> => ({ origin: 'model', decision: { action, reason: 'A specific stopping condition', text: 'Here is the remaining question' } }));
        const session = new ExplorationSession(notebook(), () => {}); await session.run(decide, 3);
        expect(decide).toHaveBeenCalledTimes(1); expect(session.getSnapshot().phase).toBe(action === 'ask-user' ? 'waiting' : 'complete');
    });
    it('does not make a request when saving the pre-request checkpoint fails', async () => {
        const decide = vi.fn(async () => step()); const session = new ExplorationSession(notebook(), () => { throw new Error('disk full'); });
        await session.run(decide, 3); expect(decide).not.toHaveBeenCalled(); expect(session.getSnapshot().phase).toBe('failed');
    });
    it('rejects invented or unselected quotations without retaining the model output', async () => {
        for (const selected of [true, false]) {
            const state = notebook(); state.sources.push({ id: 's', title: 'source', body: 'This is the actual original passage.' });
            if (selected) activeBranch(state).sourceIds = ['s'];
            const session = new ExplorationSession(state, () => {});
            await session.run(async () => ({ origin: 'model', decision: { action: 'assess-source', reason: 'Check evidence', text: 'unsupported result', sourceId: 's', quote: selected ? 'This quotation was invented.' : state.sources[0].body, outcome: 'support' } }), 1);
            expect(activeBranch(session.getSnapshot()).notes).toHaveLength(0); expect(session.error).toBe('citation');
        }
    });
    it('retains a real text match as a provisional proposal, never an accepted fact', async () => {
        const state = notebook(), body = 'This is an original passage with its limiting condition.';
        state.sources.push({ id: 's', title: 'source', body }); activeBranch(state).sourceIds = ['s'];
        const session = new ExplorationSession(state, () => {});
        await session.run(async () => ({ origin: 'model', decision: { action: 'assess-source', reason: 'Check the condition', text: 'This supports the claim only under the condition.', sourceId: 's', quote: body, outcome: 'partial' } }), 1);
        expect(activeBranch(session.getSnapshot()).notes[0]).toMatchObject({ status: 'proposed', citation: { quote: body, outcome: 'partial' } });
        expect(session.getSnapshot().sharedIds).toHaveLength(0);
    });
    it('ignores late results after pause or a goal change, including a provider that ignores abort', async () => {
        for (const changeGoal of [false, true]) {
            let deliver!: (result: StepResult) => void;
            const session = new ExplorationSession(notebook(), () => {});
            const running = session.run(() => new Promise(resolve => { deliver = resolve; }), 3);
            if (changeGoal) session.edit(draft => { draft.goal = 'Changed goal'; }); else session.pause();
            deliver(step('Late result')); await running;
            expect(activeBranch(session.getSnapshot()).notes).toHaveLength(0); expect(session.getSnapshot().phase).not.toBe('running');
            if (changeGoal) expect(session.getSnapshot().goal).toBe('Changed goal');
        }
    });
    it('stops on timeout without calling it a user pause', async () => {
        const session = new ExplorationSession(notebook(), () => {});
        await session.run(async (_state, signal) => {
            await new Promise(resolve => setTimeout(resolve, 15)); signal.throwIfAborted(); return step();
        }, 1, 2);
        expect(session.getSnapshot().phase).toBe('failed'); expect(activeBranch(session.getSnapshot()).notes).toHaveLength(0);
    });
    it('enforces the deadline even when a provider never settles or observes its abort signal', async () => {
        const session = new ExplorationSession(notebook(), () => {});
        await session.run(() => new Promise(() => {}), 1, 5);
        expect(session.getSnapshot().phase).toBe('failed'); expect(session.getSnapshot().requests).toBe(1);
    });
    it('rejects cross-branch recall and stops repeating the same suggestion', async () => {
        const session = new ExplorationSession(notebook(), () => {});
        await session.run(async () => ({ origin: 'model', decision: { action: 'recall', reason: 'Read history', text: 'Look back', noteIds: ['other-branch-note'] } }), 1);
        expect(activeBranch(session.getSnapshot()).notes).toHaveLength(0);
        await session.run(async () => step(), 3);
        expect(activeBranch(session.getSnapshot()).notes).toHaveLength(1); expect(session.getSnapshot().checkpoint).toBe('repeated');
    });
    it('recalls only older current-branch details and makes them available on the next step', async () => {
        const state = notebook(); activeBranch(state).notes = Array.from({ length: 12 }, (_, i) => note(`record ${i}`));
        const old = activeBranch(state).notes[0]; const session = new ExplorationSession(state, () => {});
        await session.run(async () => ({ origin: 'model', decision: { action: 'recall', reason: 'Check the old condition', text: 'Revisit the first condition', noteIds: [old.id] } }), 1);
        expect(buildTrialContext(session.getSnapshot()).branch.recalled[0].id).toBe(old.id);
    });
    it('rejects mutation-shaped decisions and unsupported extra fields', () => {
        expect(() => decisionSchema.parse({ action: 'delete-field', reason: 'bad', text: 'bad' })).toThrow();
        expect(() => decisionSchema.parse({ ...step().decision, confirmed: true })).toThrow();
    });
});

describe('Next provider integration', () => {
    it('uses the existing structured seam with the bounded branch context', async () => {
        const structured = vi.fn(async () => ({ value: step().decision, providerLabel: 'fixture', mock: false }));
        const provider: AIProvider = { label: 'fixture', mock: false, structured, respond: vi.fn(), capabilities: async () => UNKNOWN_CAPABILITIES };
        const result = await modelDecider(async () => provider)(notebook(), new AbortController().signal);
        expect(result.origin).toBe('model'); expect(structured.mock.calls[0]).toBeDefined();
        const request = (structured.mock.calls[0] as unknown[])[0];
        expect(request).toMatchObject({ purpose: 'exploration-step', input: { permissions: { web: false, fieldMutation: false } } });
        expect(structuredRequestSchema.safeParse(request).success).toBe(true);
    });
    it('carries the new narrow purpose through the real gateway route with an injected upstream', async () => {
        const fetcher = vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify(step().decision) } }] }));
        const app = createGateway(loadConfig({ AI_MODEL: 'test', AI_BASE_URL: 'https://provider.example/v1' }), fetcher as typeof fetch);
        const response = await app.request('/api/structured', { method: 'POST', headers: { Origin: 'http://127.0.0.1:40000', 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'exploration-step', instructions: 'Return a bounded JSON decision', input: buildTrialContext(notebook()) }) });
        expect(response.status).toBe(200); expect((await response.json()).value).toEqual(step().decision); expect(fetcher).toHaveBeenCalledTimes(1);
    });
});
