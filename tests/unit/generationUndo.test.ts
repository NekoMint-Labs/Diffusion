import { describe, expect, it, vi } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought, type Ghost } from '../../src/core/model.ts';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { UNKNOWN_CAPABILITIES, type AIProvider, type SemanticIntent } from '../../src/ai/contracts.ts';

const words = ['A small observation could test the uncertain assumption.', 'Compare the effort required before choosing the next experiment.', 'An explicit stopping condition would keep this exploration bounded.'];
const ghost = (key: string): Ghost => ({ id: key, text: key, x: 10, y: 20, scopeIds: ['source'], createdAt: Date.now() });
function setup() {
    const project = createProject('test');
    project.thoughts.source = makeThought('Which experiment could clarify this decision?', { x: 100, y: 200 }, 1, 'source');
    project.thoughts.other = makeThought('Existing independent content', { x: 400, y: 200 }, 1, 'other');
    const save = vi.fn(async () => {});
    const controller = new ProjectController(project, save);
    const provider: AIProvider = { label: 'Fixture, not live', mock: true,
        capabilities: async () => UNKNOWN_CAPABILITIES,
        structured: async () => { throw new Error('Not used'); },
        respond: vi.fn(async () => ({ providerLabel: 'Fixture, not live', mock: true,
            intents: words.map(text => ({ type: 'surface_possibility', text } satisfies SemanticIntent)) })),
    };
    const runtime = new AIRuntime(controller, async () => provider, { pending: () => {}, notice: () => {}, route: () => {}, anchor: () => ({ x: 400, y: 300 }) });
    return { controller, runtime, provider, project, save };
}

describe('completed unkept Continue generation history', () => {
    it('undoes the full invocation and redoes identical suggestions without saving or calling AI again', async () => {
        const { controller: c, runtime, provider, project, save } = setup();
        c.addGhost(ghost('older'));
        try {
            expect((await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 3 })).emitted).toBe(3);
            const generated = Object.values(c.getSnapshot().session.ghosts).filter(g => g.id !== 'older');
            c.moveGhost(generated[0].id, { x: 888, y: 777 }, { detach: true });
            const before = c.getSnapshot().session.ghosts;
            expect(c.undoLabel).toBe('Undo AI generation');
            c.undo();
            expect(Object.keys(c.getSnapshot().session.ghosts)).toEqual(['older']);
            expect(c.getSnapshot().project).toBe(project);
            expect(c.redoLabel).toBe('Redo AI generation');
            c.redo();
            expect(c.getSnapshot().session.ghosts).toEqual(before);
            expect(c.getSnapshot().project).toBe(project);
            expect(provider.respond).toHaveBeenCalledTimes(1);
            expect(save).not.toHaveBeenCalled();
        } finally { runtime.dispose(); }
    });
    it('orders an edit during generation before batch completion and an edit afterwards after it', async () => {
        const { controller: c, runtime } = setup();
        try {
            let edited = false;
            await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 3, onEmission: () => {
                if (!edited) { edited = true; c.dispatch({ type: 'thought.edit', id: 'other', text: 'During request' }); }
            } });
            c.dispatch({ type: 'thought.move', positions: { other: { x: 900, y: 600 } } });
            c.undo();
            expect(Object.keys(c.getSnapshot().session.ghosts)).toHaveLength(3);
            expect(c.getSnapshot().project.thoughts.other.x).toBe(400);
            c.undo();
            expect(Object.keys(c.getSnapshot().session.ghosts)).toHaveLength(0);
            expect(c.getSnapshot().project.thoughts.other.text).toBe('During request');
            c.undo();
            expect(c.getSnapshot().project.thoughts.other.text).toBe('Existing independent content');
        } finally { runtime.dispose(); }
    });
    it('keeps Undo Keep separate, including Keep All and synchronous history readers', async () => {
        const { controller: c, runtime } = setup();
        try {
            await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 3 });
            const ids = Object.keys(c.getSnapshot().session.ghosts);
            c.claimAll(ids);
            c.subscribe(() => { void c.canUndo; void c.undoLabel; });
            c.undo();
            expect(Object.keys(c.getSnapshot().session.ghosts)).toEqual(ids);
            expect(c.undoLabel).toBe('Undo AI generation');
            c.undo();
            expect(Object.keys(c.getSnapshot().session.ghosts)).toHaveLength(0);
            expect(Object.keys(c.getSnapshot().project.thoughts)).toEqual(['source', 'other']);
            c.redo(); c.redo();
            expect(ids.every(id => !!c.getSnapshot().project.thoughts[id])).toBe(true);
            expect(Object.keys(c.getSnapshot().session.ghosts)).toHaveLength(0);
        } finally { runtime.dispose(); }
    });
    it('restores only still-present suggestions after Ignore and removes dangling relation candidates', () => {
        const { controller: c } = setup();
        c.addGhost(ghost('one')); c.addGhost(ghost('two'));
        c.recordGeneration(['one', 'two']);
        c.dismissGhost('one');
        c.addPhenomenon({ id: 'edge', a: 'source', b: 'two', kind: 'tension', label: 'A comparison' });
        c.undo();
        expect(c.getSnapshot().session.phenomena).toEqual({});
        c.redo();
        expect(Object.keys(c.getSnapshot().session.ghosts)).toEqual(['two']);
        expect(c.getSnapshot().session.phenomena.edge.b).toBe('two');
    });
    it('skips a batch that was entirely ignored instead of swallowing the next Undo', () => {
        const { controller: c } = setup();
        c.dispatch({ type: 'thought.edit', id: 'source', text: 'Edited question' });
        c.addGhost(ghost('one')); c.recordGeneration(['one']); c.dismissGhost('one');
        expect(c.undoLabel).toBe('Undo');
        c.undo();
        expect(c.getSnapshot().project.thoughts.source.text).toBe('Which experiment could clarify this decision?');
        expect(c.getSnapshot().session.ghosts).toEqual({});
    });
    it('restores older proposals displaced by arrival capacity, without losing a later manual move', async () => {
        const { controller: c, runtime } = setup();
        for (let i = 0; i < 10; i++) c.addGhost({ ...ghost(`older-${i}`), createdAt: i + 1 });
        const before = c.getSnapshot().session.ghosts;
        try {
            await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 3 });
            expect(Object.keys(c.getSnapshot().session.ghosts)).toHaveLength(10);
            c.undo();
            expect(c.getSnapshot().session.ghosts).toEqual(before);
            c.moveGhost('older-0', { x: 123, y: 456 }, { detach: true });
            c.redo();
            expect(c.getSnapshot().session.ghosts['older-0']).toMatchObject({ x: 123, y: 456 });
        } finally { runtime.dispose(); }
    });
    it('does not register an active or cancelled reveal as a completed generation', async () => {
        const { controller: c, runtime } = setup();
        try {
            const result = await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 3, onEmission: () => {
                expect(c.canUndo).toBe(false); runtime.cancel();
            } });
            expect(result.status).toBe('cancelled');
            expect(c.canUndo).toBe(false);
            expect(Object.keys(c.getSnapshot().session.ghosts)).toHaveLength(1);
        } finally { runtime.dispose(); }
    });
    it('does not register empty, failed or already-kept generations', async () => {
        for (const mode of ['empty', 'failed', 'kept'] as const) {
            const { controller: c, runtime, provider } = setup();
            if (mode === 'empty') provider.respond = async () => ({ providerLabel: 'fixture', mock: true, intents: [] });
            if (mode === 'failed') provider.respond = async () => { throw new Error('Injected failure'); };
            try {
                await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 1, onEmission: id => { if (mode === 'kept') c.claim(id); } });
                expect(c.undoLabel).toBe('Undo');
                expect(c.canUndo).toBe(mode === 'kept');
            } finally { runtime.dispose(); }
        }
    });
    it('keeps requests separate even when they use the same scope and timestamp', () => {
        const { controller: c } = setup();
        c.addGhost({ ...ghost('one'), createdAt: 1 }); c.recordGeneration(['one']);
        c.addGhost({ ...ghost('two'), createdAt: 1 }); c.recordGeneration(['two']);
        c.undo(); expect(Object.keys(c.getSnapshot().session.ghosts)).toEqual(['one']);
        c.undo(); expect(c.getSnapshot().session.ghosts).toEqual({});
        c.redo(); expect(Object.keys(c.getSnapshot().session.ghosts)).toEqual(['one']);
        c.redo(); expect(Object.keys(c.getSnapshot().session.ghosts)).toEqual(['one', 'two']);
    });
    it('preserves Redo Keep when a proposal is kept and undone before generation completes', async () => {
        const { controller: c, runtime } = setup();
        let keptId = '';
        try {
            await runtime.run('continue', 'Continue', ['source'], { maxCandidates: 3, onEmission: key => {
                if (keptId) return;
                keptId = key;
                c.claim(key);
                c.undo();
                expect(c.canRedo).toBe(true);
            } });
            expect(c.undoLabel).toBe('Undo');
            expect(c.canRedo).toBe(true);
            c.redo();
            expect(c.getSnapshot().project.thoughts[keptId]).toBeDefined();
            expect(c.getSnapshot().session.ghosts[keptId]).toBeUndefined();
        } finally { runtime.dispose(); }
    });
    it('clears Redo after a new user edit and never carries temporary generation history across reopening', () => {
        const { controller: c } = setup();
        c.addGhost(ghost('one')); c.recordGeneration(['one']); c.undo();
        c.dispatch({ type: 'thought.edit', id: 'other', text: 'New deliberate edit' });
        expect(c.canRedo).toBe(false);
        const reopened = new ProjectController(c.getSnapshot().project, async () => {});
        expect(reopened.canUndo).toBe(false);
        expect(reopened.getSnapshot().session.ghosts).toEqual({});
    });
});
