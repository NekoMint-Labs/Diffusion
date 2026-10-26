import type { ProjectController } from '../../core/controller.ts';
import type { CommandContext, DiffusionCommand, SurfaceDeps } from './types.ts';
import { selectedIds, selectedThoughts } from './types.ts';
import { feedback } from '../workspace/feedback.ts';
export interface AppDeps extends SurfaceDeps {
    controller: ProjectController;
    newThought(): void;
    duplicateThoughts(ids: string[]): void;
    copyText(ids: string[]): void;
    deleteThoughts(ids: string[]): void;
    zoomOut(): void;
}
/** EDIT, FIND, VIEW and APP. Core owns both canonical and transient generation history. */
export function appCommands(deps: AppDeps): DiffusionCommand[] {
    const anySelected = (context: CommandContext) => selectedThoughts(context).length > 0;
    const editCommands: DiffusionCommand[] = [
        { id: 'undo', group: 'edit', get label() { return deps.controller.undoLabel; }, keywords: ['revert', '撤销'], shortcuts: [{ key: 'z', mod: true }], available: context => context.canUndo, run: () => {
            const generation = deps.controller.undoLabel === 'Undo AI generation';
            deps.controller.undo();
            if (generation) feedback('generation-undone');
        } },
        { id: 'redo', group: 'edit', get label() { return deps.controller.redoLabel; }, keywords: ['again', '重做'], shortcuts: [{ key: 'z', mod: true, shift: true }, { key: 'y', mod: true }], available: context => context.canRedo, run: () => {
            const generation = deps.controller.redoLabel === 'Redo AI generation';
            deps.controller.redo();
            if (generation) feedback('generation-restored');
        } },
        { id: 'new-thought', group: 'edit', label: 'New thought', keywords: ['place', 'create', '新建思绪'], run: () => deps.newThought() },
        { id: 'duplicate-thought', group: 'edit', label: 'Duplicate Thought', keywords: ['copy', '复制思绪'], available: anySelected, run: context => deps.duplicateThoughts(selectedIds(context)) },
        { id: 'copy-text', group: 'edit', label: 'Copy Text', keywords: ['clipboard', '复制文本'], available: anySelected, run: context => deps.copyText(selectedIds(context)) },
        {
            id: 'delete', group: 'edit', label: 'Delete', keywords: ['remove', '删除'],
            shortcuts: [{ key: 'Delete' }, { key: 'Backspace' }],
            available: context => context.selection.length > 0 && context.surface === 'none' && !context.editing,
            run: context => deps.deleteThoughts(context.selection),
        },
    ];
    const findCommands: DiffusionCommand[] = [
        { id: 'find', group: 'find', label: 'Find in Field', keywords: ['search', 'locate', '查找'], shortcuts: [{ key: 'f', mod: true }], global: true, run: () => deps.openSurface('find') },
    ];
    const viewCommands: DiffusionCommand[] = [
        { id: 'settings', group: 'view', label: 'Settings', keywords: ['preferences', '设置'], shortcuts: [{ key: ',', mod: true }], global: true, run: (_, origin) => deps.openSurface('settings', origin) },
        { id: 'shortcuts', group: 'view', label: 'Keyboard Shortcuts', keywords: ['keys', 'help', '快捷键'], global: true, run: () => deps.openSurface('shortcuts') },
        { id: 'atlas', group: 'view', label: 'Zoom toward Atlas', keywords: ['overview', '全图'], run: () => deps.zoomOut() },
    ];
    const appCommandsList: DiffusionCommand[] = [
        { id: 'palette', group: 'app', label: 'Command Palette', keywords: ['commands', 'run', '命令面板'], shortcuts: [{ key: 'k', mod: true }], global: true, run: () => deps.openSurface('palette') },
        { id: 'help', group: 'app', label: 'Help', keywords: ['about', '帮助'], run: () => deps.openSurface('help') },
    ];
    return [...editCommands, ...findCommands, ...viewCommands, ...appCommandsList];
}
