import { describe, expect, it } from 'vitest';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought, type ProjectState, type Thought } from '../../src/core/model.ts';
import { APP_MENU, BLANK_MENU, FIELD_MENU, FIELD_MORE_MENU, buildCommands, commandMatches, contextualRows, menuRows, orderedGroups, paletteCommands } from '../../src/ui/commands/compose.ts';
import { contextualActionModel } from '../../src/ui/commands/contextualActionModel.ts';
import { matchesShortcut, shortcutLabel } from '../../src/ui/commands/shortcuts.ts';
import { commandAvailable, type CommandContext, type DiffusionCommand } from '../../src/ui/commands/types.ts';
import { setLocale } from '../../src/shared/i18n.ts';

function project(thoughts: Thought[] = []): ProjectState {
    const base = createProject('field', 'A Field');
    return { ...base, thoughts: Object.fromEntries(thoughts.map(thought => [thought.id, thought])) };
}

const thought = (id: string, text = id) => makeThought(text, { x: 0, y: 0 }, 1, id);

function harness(state: ProjectState = project()) {
    const calls: string[] = [];
    const controller = new ProjectController(state, async () => { });
    const note = (name: string) => (...args: unknown[]) => { calls.push(`${name}:${JSON.stringify(args.length === 1 ? args[0] : args)}`); };
    const commands = buildCommands({
        openSurface: note('openSurface') as never,
        controller,
        findRelation: note('findRelation') as never,
        ask: note('ask') as never,
        openThread: note('openThread') as never,
        previewCrystal: note('previewCrystal') as never,
        continueCrystal: note('continueCrystal') as never,
        openHandoff: note('openHandoff') as never,
        openSource: note('openSource') as never,
        openDiffuse: note('openDiffuse') as never,
        continueThinking: note('continueThinking') as never,
        questions: note('questions') as never,
        organize: note('organize') as never,
        carry: note('carry') as never,
        keep: note('keep') as never,
        fade: note('fade') as never,
        beginRename: note('beginRename') as never,
        createField: note('createField') as never,
        duplicateField: note('duplicateField') as never,
        exportArchive: note('exportArchive') as never,
        exportMarkdown: note('exportMarkdown') as never,
        newThought: note('newThought') as never,
        duplicateThoughts: note('duplicateThoughts') as never,
        copyText: note('copyText') as never,
        deleteThoughts: note('deleteThoughts') as never,
        zoomOut: note('zoomOut') as never,
    });
    const context = (selection: string[] = [], extra: Partial<CommandContext> = {}): CommandContext => ({
        project: controller.getSnapshot().project,
        selection,
        editing: null,
        surface: 'none',
        canUndo: controller.canUndo,
        canRedo: controller.canRedo,
        ...extra,
    });
    return { calls, controller, commands, context };
}

const ids = (commands: DiffusionCommand[], context: CommandContext) => commands.filter(command => commandAvailable(command, context)).map(command => command.id);

describe('shared command model', () => {
    it('registers every semantic action exactly once', () => {
        const { commands } = harness();
        const seen = new Set(commands.map(command => command.id));
        expect(seen.size).toBe(commands.length);
        for (const command of commands) {
            expect(command.label.length).toBeGreaterThan(0);
            expect(command.id).toMatch(/^[a-z][a-z-]*$/);
            expect(['think', 'field', 'edit', 'find', 'view', 'app']).toContain(command.group);
        }
    });

    it('hides commands that make no contextual sense instead of disabling them', () => {
        const { commands, context } = harness(project([thought('a'), makeThought('', { x: 0, y: 0 }, 1, 'crystal-id')]));
        const empty = context();
        expect(ids(commands, empty)).not.toContain('crystallize');
        expect(ids(commands, empty)).not.toContain('delete');
        expect(ids(commands, empty)).not.toContain('copy-text');
        expect(ids(commands, empty)).toContain('new-thought');
        expect(ids(commands, context(['a']))).toContain('crystallize');
        expect(ids(commands, context(['a']))).toContain('delete');
    });

    it('keeps Crystal-only and fade-only actions bound to the real selection', () => {
        const crystal = { ...thought('crystal-id', 'Committed'), kind: 'crystal' as const };
        const { commands, context } = harness(project([thought('a'), crystal]));
        expect(ids(commands, context(['crystal-id']))).toContain('continue-crystal');
        expect(ids(commands, context(['crystal-id']))).toContain('handoff');
        expect(ids(commands, context(['crystal-id']))).not.toContain('crystallize');
        expect(ids(commands, context(['crystal-id']))).not.toContain('fade');
        expect(ids(commands, context(['a', 'crystal-id']))).toContain('crystallize');
        expect(ids(commands, context(['a', 'crystal-id']))).not.toContain('fade');
        expect(ids(commands, context(['a']))).toContain('fade');
    });

    it('routes Delete for transient proposal ids as well as canonical Thoughts', () => {
        const { commands, context, calls } = harness();
        const transient = context(['ghost-proposal']);
        const command = commands.find(candidate => candidate.id === 'delete')!;
        expect(commandAvailable(command, transient)).toBe(true);
        command.run(transient);
        expect(calls).toEqual(['deleteThoughts:[\"ghost-proposal\"]']);
    });

    it('tracks real history availability', () => {
        const { commands, context, controller } = harness();
        expect(ids(commands, context())).not.toContain('undo');
        controller.dispatch({ type: 'thought.create', thought: thought('a') });
        expect(ids(commands, context())).toContain('undo');
        controller.undo();
        expect(ids(commands, context())).toContain('redo');
        expect(ids(commands, context())).not.toContain('undo');
    });

    it('formats and matches shortcuts per platform', () => {
        expect(shortcutLabel({ key: 'z', mod: true }, 'other')).toBe('Ctrl+Z');
        expect(shortcutLabel({ key: 'z', mod: true }, 'mac')).toBe('\u2318Z');
        expect(shortcutLabel({ key: ',', mod: true }, 'other')).toBe('Ctrl+,');
        const event = (init: Partial<KeyboardEvent>) => ({ key: 'z', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init }) as KeyboardEvent;
        expect(matchesShortcut({ key: 'z', mod: true }, event({ ctrlKey: true }))).toBe(true);
        expect(matchesShortcut({ key: 'z', mod: true }, event({ metaKey: true }))).toBe(true);
        expect(matchesShortcut({ key: 'z', mod: true }, event({ ctrlKey: true, shiftKey: true }))).toBe(false);
        expect(matchesShortcut({ key: 'z', mod: true, shift: true }, event({ key: 'Z', ctrlKey: true, shiftKey: true }))).toBe(true);
        expect(matchesShortcut({ key: 'Delete' }, event({ key: 'Delete' }))).toBe(true);
        expect(matchesShortcut({ key: 'Delete' }, event({ key: 'Delete', ctrlKey: true }))).toBe(false);
    });
});

describe('one command, many presentations', () => {
    it('orders palette contents by the current context, deterministically', () => {
        const { commands, context } = harness(project([thought('a')]));
        const withSelection = paletteCommands(commands, context(['a']), '');
        expect(withSelection[0].group).toBe('think');
        expect(withSelection[0].id).toBe('ask');
        const withoutSelection = paletteCommands(commands, context(), '');
        expect(withoutSelection[0].id).toBe('new-thought');
        expect(withoutSelection.map(command => command.id)).not.toContain('find-relation');
        expect(orderedGroups(true)).toEqual(['think', 'edit', 'find', 'field', 'view', 'app']);
        expect(orderedGroups(false)).toEqual(['edit', 'find', 'field', 'view', 'app']);
    });

    it('searches localized labels, aliases and ids', () => {
        const { commands } = harness();
        const exportCommand = commands.find(command => command.id === 'export')!;
        const ask = commands.find(command => command.id === 'ask')!;
        expect(commandMatches(exportCommand, 'expo')).toBe(true);
        expect(commandMatches(exportCommand, 'json')).toBe(true);
        expect(commandMatches(ask, '追问')).toBe(true);
        expect(commandMatches(ask, 'zzzz')).toBe(false);
        setLocale('zh');
        expect(commandMatches(exportCommand, '导出')).toBe(true);
        expect(commandMatches(ask, '追问')).toBe(true);
        setLocale('en');
    });

    it('invokes the same semantics from a menu row and the palette', () => {
        const { commands, context, calls } = harness(project([thought('a'), thought('b')]));
        const state = context(['a', 'b']);
        const row = contextualRows(commands, state, contextualActionModel(commands, state).primary, 'other').find(item => item.id === 'find-relation')!;
        expect(row.hint).toBeUndefined();
        row.run();
        expect(calls).toEqual(['findRelation:["a","b"]']);
        const palette = paletteCommands(commands, state, 'find-relation')[0];
        palette.run(state);
        expect(calls).toEqual(['findRelation:["a","b"]', 'findRelation:["a","b"]']);
    });

    it('resolves shortcut hints and section dividers in menus', () => {
        const { commands, context } = harness(project([thought('a')]));
        const rows = menuRows(commands, context(), APP_MENU, 'other');
        expect(rows.map(item => item.id)).toEqual(['palette', 'find', 'shortcuts', 'settings', 'help']);
        expect(rows[0].hint).toBe('Ctrl+K');
        expect(rows.find(item => item.id === 'settings')!.hint).toBe('Ctrl+,');
        expect(rows.filter(item => item.separator).map(item => item.id)).toEqual(['shortcuts', 'help']);
        const selected = context(['a']);
        const selectionRows = contextualRows(commands, selected, contextualActionModel(commands, selected).secondary, 'other');
        expect(selectionRows.every(item => !item.separator)).toBe(true);
        expect(selectionRows.length).toBeLessThanOrEqual(6);
    });


    it('keeps the Field root small and its More page at six actions or fewer', () => {
        const { commands, context } = harness();
        expect(menuRows(commands, context(), FIELD_MENU, 'other')).toHaveLength(3);
        expect(menuRows(commands, context(), FIELD_MORE_MENU, 'other').length).toBeLessThanOrEqual(6);
    });

    it('keeps every selection More page at six actions or fewer', () => {
        const crystal = { ...thought('crystal-id', 'Committed'), kind: 'crystal' as const };
        const source = { ...thought('source-id', 'Reference'), kind: 'source' as const, sourceId: 'source-record' };
        const { commands, context } = harness(project([thought('a'), thought('b'), crystal, source]));
        for (const selection of [['a'], ['a', 'b'], ['crystal-id'], ['source-id']]) {
            const state = context(selection);
            const model = contextualActionModel(commands, state);
            expect(contextualRows(commands, state, model.secondary, 'other').length).toBeLessThanOrEqual(6);
            expect(model.secondary.map(action => action.id).some(id => model.primary.some(action => action.id === id))).toBe(false);
        }
    });

    it('passes the activated row origin to the command', () => {
        const { commands, context, calls } = harness();
        const row = menuRows(commands, context(), APP_MENU, 'other').find(item => item.id === 'settings')!;
        row.run({ x: 12, y: 34 });
        expect(calls).toEqual(['openSurface:["settings",{"x":12,"y":34}]']);
    });

    it('omits unavailable commands from every presentation', () => {
        const { commands, context } = harness();
        const empty = context();
        for (const list of [APP_MENU, FIELD_MENU, BLANK_MENU]) {
            const rendered = menuRows(commands, empty, list, 'other');
            expect(rendered.map(row => row.id)).not.toContain('find-relation');
            expect(rendered.map(row => row.id)).not.toContain('delete');
        }
        const selectionModel = contextualActionModel(commands, empty);
        expect(selectionModel.primary).toEqual([]);
        expect(selectionModel.secondary).toEqual([]);
        const menu = menuRows(commands, empty, APP_MENU, 'other');
        expect(menu).toHaveLength(5);
        expect(menuRows(commands, empty, BLANK_MENU, 'other').map(row => row.id)).toEqual(['new-thought', 'find']);
    });
});
