import { describe, expect, it } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { contextualActionModel } from '../../src/ui/commands/contextualActionModel.ts';
import { thinkingCommands } from '../../src/ui/commands/thinking.ts';
import type { CommandContext, DiffusionCommand } from '../../src/ui/commands/types.ts';

const noop = () => {};
const thinking = thinkingCommands({
    openSurface: noop,
    findRelation: noop,
    ask: noop,
    openThread: noop,
    previewCrystal: noop,
    continueCrystal: noop,
    openHandoff: noop,
    openSource: noop,
    openDiffuse: noop,
    continueThinking: noop,
    questions: noop,
    organize: noop,
    carry: noop,
    keep: noop,
    fade: noop,
});
const edit: DiffusionCommand[] = [
    { id: 'copy-text', group: 'edit', label: 'Copy Text', available: context => context.selection.length > 0, run: noop },
    { id: 'delete', group: 'edit', label: 'Delete', available: context => context.selection.length > 0, run: noop },
];
const commands = [...thinking, ...edit];

function context(kinds: Array<'thought' | 'source' | 'crystal'>): CommandContext {
    const project = createProject('actions');
    const selection = kinds.map((kind, index) => {
        const thought = makeThought(`${kind} ${index}`, { x: 0, y: index * 80 }, 1, String(index));
        thought.kind = kind;
        if (kind === 'source') thought.sourceId = `source-${index}`;
        project.thoughts[thought.id] = thought;
        return thought.id;
    });
    return { project, selection, editing: null, surface: 'none', canUndo: false, canRedo: false };
}

function assertBounded(model: ReturnType<typeof contextualActionModel>) {
    expect(model.primary.length).toBeLessThanOrEqual(3);
    expect(model.secondary.length).toBeLessThanOrEqual(6);
    const primaryIds = new Set(model.primary.map(action => action.id));
    expect(model.secondary.some(action => primaryIds.has(action.id))).toBe(false);
}

describe('contextual action model', () => {
    it('maps one Thought to Continue / Another angle / Ask without duplicates', () => {
        const model = contextualActionModel(commands, context(['thought']));
        expect(model.primary.map(action => [action.id, action.label])).toEqual([
            ['continue-thinking', 'Continue thinking'],
            ['diffuse', 'Another angle'],
            ['questions', 'Generate a question'],
        ]);
        assertBounded(model);
        expect(model.secondary.map(action => action.id)).toEqual(expect.arrayContaining(['ask', 'thread']));
        expect(model.primary[2]?.description).toBe('Generate a question that could move the thinking.');
    });

    it('maps two Thoughts to Find relation / Continue / Ask', () => {
        const model = contextualActionModel(commands, context(['thought', 'thought']));
        expect(model.primary.map(action => action.id)).toEqual(['find-relation', 'continue-thinking', 'questions']);
        assertBounded(model);
    });

    it('keeps 3+ selection to three supported intents', () => {
        const model = contextualActionModel(commands, context(['thought', 'thought', 'thought']));
        expect(model.primary.map(action => action.id)).toEqual(['continue-thinking', 'diffuse', 'organize']);
        expect(model.secondary.map(action => action.id)).not.toContain('run-settings');
        // The question preview and the Thread place keep an explicit entry of their own.
        expect(model.secondary.map(action => action.id)).toEqual(expect.arrayContaining(['ask', 'questions', 'thread']));
        assertBounded(model);
    });

    it('does not expose Crystallize for a sole Source and exposes its real reference action', () => {
        const model = contextualActionModel(commands, context(['source']));
        expect(model.primary.map(action => action.id)).toEqual(['continue-thinking', 'diffuse', 'questions']);
        expect(model.secondary.map(action => action.id)).toContain('open-reference');
        expect(model.secondary.map(action => action.id)).not.toContain('crystallize');
        assertBounded(model);
    });

    it('continues from a Crystal without also exposing the generic continue action', () => {
        const model = contextualActionModel(commands, context(['crystal']));
        expect(model.primary[0]?.id).toBe('continue-crystal');
        expect(model.secondary.map(action => action.id)).not.toContain('continue-crystal');
        assertBounded(model);
    });
});
