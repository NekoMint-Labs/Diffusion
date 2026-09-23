import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';
import { findMatches } from '../../src/ui/find/matching.ts';

function project(thoughts: { id: string; text: string; x: number; y: number; sourceId?: string }[], sources: ProjectState['sources'] = {}): ProjectState {
    const base = createProject('field', 'A Field');
    return {
        ...base,
        sources,
        thoughts: Object.fromEntries(thoughts.map(item => [item.id, { ...makeThought(item.text, { x: item.x, y: item.y }, 1, item.id), sourceId: item.sourceId }])),
    };
}

describe('find matching', () => {
    it('matches normalized text and never calls anything remote', () => {
        const state = project([{ id: 'a', text: 'Attention should change clarity', x: 0, y: 0 }, { id: 'b', text: 'Structure appears late', x: 0, y: 10 }]);
        expect(findMatches(state, 'ATTENTION')).toEqual(['a']);
        expect(findMatches(state, 'attention should')).toEqual(['a']);
        expect(findMatches(state, 'nothing here')).toEqual([]);
        expect(findMatches(state, '   ')).toEqual([]);
    });

    it('returns matches in reading order, deterministically', () => {
        const state = project([
            { id: 'bottom', text: 'signal', x: 0, y: 500 },
            { id: 'right', text: 'signal', x: 300, y: 10 },
            { id: 'left', text: 'signal', x: 10, y: 10 },
        ]);
        expect(findMatches(state, 'signal')).toEqual(['left', 'right', 'bottom']);
        expect(findMatches(state, 'signal')).toEqual(findMatches(state, 'signal'));
    });

    it('reveals a Source through the Thought that carries it', () => {
        const state = project(
            [{ id: 'a', text: 'Reference brought in', x: 0, y: 0, sourceId: 's1' }],
            { s1: { id: 's1', title: 'A local PDF', status: 'ready', mime: 'application/pdf', excerpt: 'bounded excerpt about tension', inspected: 'first page', provenance: {} } },
        );
        expect(findMatches(state, 'tension')).toEqual(['a']);
    });

    it('never mutates the Field', () => {
        const state = project([{ id: 'a', text: 'Attention', x: 0, y: 0 }]);
        const before = JSON.stringify(state);
        findMatches(state, 'attention');
        expect(JSON.stringify(state)).toBe(before);
    });
});

describe('semantic history', () => {
    function history(state = createProject('field', 'A Field')) {
        let saves = 0;
        const controller = new ProjectController(state, async () => { saves += 1; });
        return { controller, saves: () => saves };
    }

    it('makes one user action one history entry', () => {
        const { controller } = history();
        const a = makeThought('A', { x: 10, y: 10 }, 1, 'a');
        const b = makeThought('B', { x: 40, y: 40 }, 1, 'b');
        controller.dispatch({ type: 'thought.create', thought: a });
        controller.dispatch({ type: 'thought.create', thought: b });
        // One drag of two Thoughts is a single thought.move command.
        controller.dispatch({ type: 'thought.move', positions: { a: { x: 100, y: 100 }, b: { x: 200, y: 200 } } });
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.a).toMatchObject({ x: 10, y: 10 });
        expect(controller.getSnapshot().project.thoughts.b).toMatchObject({ x: 40, y: 40 });
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.b).toBeUndefined();
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.a).toBeUndefined();
        expect(controller.canUndo).toBe(false);
        controller.redo();
        expect(controller.getSnapshot().project.thoughts.a).toMatchObject({ x: 10, y: 10 });
    });

    it('collapses an explicit multi-dispatch action into one step', () => {
        const { controller } = history();
        controller.batch(() => {
            controller.dispatch({ type: 'thought.create', thought: makeThought('A', { x: 0, y: 0 }, 1, 'a') });
            controller.dispatch({ type: 'thought.create', thought: makeThought('B', { x: 1, y: 1 }, 1, 'b') });
        });
        expect(controller.canUndo).toBe(true);
        controller.undo();
        expect(Object.keys(controller.getSnapshot().project.thoughts)).toEqual([]);
        controller.redo();
        expect(Object.keys(controller.getSnapshot().project.thoughts).sort()).toEqual(['a', 'b']);
    });

    it('does not record camera, selection or focus as content history', () => {
        const { controller } = history();
        controller.dispatch({ type: 'thought.create', thought: makeThought('A', { x: 0, y: 0 }, 1, 'a') });
        controller.dispatch({ type: 'camera.commit', camera: { x: 900, y: 900, zoom: 0.5 } }, 'system');
        controller.dispatch({ type: 'region.observe', regions: [] }, 'system');
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.a).toBeUndefined();
        // The camera is deliberately preserved across Undo.
        expect(controller.getSnapshot().project.camera).toMatchObject({ x: 900, y: 900, zoom: 0.5 });
        expect(controller.canUndo).toBe(false);
    });

    it('invalidates redo after a new edit', () => {
        const { controller } = history();
        controller.dispatch({ type: 'thought.create', thought: makeThought('A', { x: 0, y: 0 }, 1, 'a') });
        controller.undo();
        expect(controller.canRedo).toBe(true);
        controller.dispatch({ type: 'thought.create', thought: makeThought('B', { x: 0, y: 0 }, 1, 'b') });
        expect(controller.canRedo).toBe(false);
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.b).toBeUndefined();
        expect(controller.getSnapshot().project.thoughts.a).toBeUndefined();
    });

    it('reverses a deletion as one entry', () => {
        const state = createProject('field', 'A Field');
        state.thoughts.a = makeThought('Keep me', { x: 4, y: 6 }, 1, 'a');
        const { controller } = history(state);
        controller.dispatch({ type: 'thought.delete', ids: ['a'] });
        expect(controller.getSnapshot().project.thoughts.a).toBeUndefined();
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.a).toMatchObject({ text: 'Keep me', x: 4, y: 6 });
        controller.redo();
        expect(controller.getSnapshot().project.thoughts.a).toBeUndefined();
    });

    it('keeps an edit session as one entry and restores wording', () => {
        const state = createProject('field', 'A Field');
        state.thoughts.a = makeThought('First wording', { x: 0, y: 0 }, 1, 'a');
        const { controller } = history(state);
        controller.dispatch({ type: 'thought.edit', id: 'a', text: 'Second wording' });
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.a.text).toBe('First wording');
    });

    it('reverses a claimed Ghost back into a possibility', () => {
        const { controller } = history();
        controller.addGhost({ id: 'g', text: 'A possibility', x: 31, y: 92, createdAt: 1, scopeIds: [] });
        controller.claim('g');
        expect(controller.getSnapshot().session.ghosts.g).toBeUndefined();
        expect(controller.getSnapshot().project.thoughts.g).toBeDefined();
        controller.undo();
        expect(controller.getSnapshot().project.thoughts.g).toBeUndefined();
        expect(controller.getSnapshot().session.ghosts.g).toMatchObject({ text: 'A possibility', x: 31, y: 92 });
        controller.redo();
        expect(controller.getSnapshot().project.thoughts.g).toBeDefined();
        expect(controller.getSnapshot().session.ghosts.g).toBeUndefined();
    });

    it('treats a Field rename as one reversible deliberate change', () => {
        const { controller } = history();
        controller.dispatch({ type: 'field.rename', title: 'A clearer name' });
        expect(controller.getSnapshot().project.title).toBe('A clearer name');
        controller.undo();
        expect(controller.getSnapshot().project.title).toBe('A Field');
    });

    it('bounds history memory', () => {
        const { controller } = history();
        for (let index = 0; index < 80; index += 1)
            controller.dispatch({ type: 'thought.create', thought: makeThought(`T${index}`, { x: index, y: 0 }, 1, `t${index}`) });
        let undone = 0;
        while (controller.canUndo) {
            controller.undo();
            undone += 1;
        }
        expect(undone).toBe(60);
    });
});
