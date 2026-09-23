import { t } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import { appCommands, type AppDeps } from './app.ts';
import { fieldCommands, type FieldDeps } from './field.ts';
import { ariaShortcut, shortcutLabel, type Platform } from './shortcuts.ts';
import { thinkingCommands, type ThinkingDeps } from './thinking.ts';
import { commandAvailable, type CommandContext, type CommandGroup, type DiffusionCommand } from './types.ts';
import type { ContextualAction } from './contextualActionModel.ts';
export interface CommandDeps extends AppDeps, FieldDeps, ThinkingDeps {
}
export const commandGroupLabel: Record<CommandGroup, string> = { think: 'Think', field: 'Field', edit: 'Edit', find: 'Find', view: 'View', app: 'Application' };
/** Which command appears where, and where the dividers fall, is a presentation decision.
 * Semantics are defined once. Sections are separated in the menu, not derived from groups.
 */
export const APP_MENU: string[][] = [['palette', 'find'], ['shortcuts', 'settings'], ['help']];
export const FIELD_MENU: string[][] = [['rename-field', 'new-field', 'open-field']];
export const FIELD_MORE_MENU: string[][] = [
    ['duplicate-field', 'import'],
    ['export', 'export-markdown'],
    ['history', 'fork', 'compare-fork'],
];
export const BLANK_MENU: string[][] = [['new-thought'], ['find']];
export function buildCommands(deps: CommandDeps): DiffusionCommand[] {
    return [...thinkingCommands(deps), ...fieldCommands(deps), ...appCommands(deps)];
}
/** Deterministic contextual priority. Not a hidden recommendation system. */
export function orderedGroups(hasSelection: boolean): CommandGroup[] {
    return hasSelection ? ['think', 'edit', 'find', 'field', 'view', 'app'] : ['edit', 'find', 'field', 'view', 'app'];
}
const normalize = (value: string): string => value.toLocaleLowerCase().trim();
function subsequence(needle: string, haystack: string): boolean {
    let index = 0;
    for (const character of haystack) {
        if (character === needle[index])
            index += 1;
    }
    return needle.length > 0 && index === needle.length;
}
/** Localized label, English/internal aliases and id: one query searches naturally in either locale. */
export function commandMatches(command: DiffusionCommand, query: string): boolean {
    const needle = normalize(query);
    if (!needle)
        return true;
    return [t(command.label), ...(command.keywords ?? []), command.id].some(field => {
        const haystack = normalize(field);
        return haystack.includes(needle) || subsequence(needle, haystack);
    });
}
export function paletteCommands(commands: DiffusionCommand[], context: CommandContext, query: string): DiffusionCommand[] {
    const visible = commands.filter(command => commandAvailable(command, context) && commandMatches(command, query));
    return orderedGroups(context.selection.length > 0).flatMap(group => visible.filter(command => command.group === group));
}
export interface MenuRow {
    id: string;
    label: string;
    description?: string;
    hint?: string;
    /** Machine-readable shortcut; the visible hint never becomes the accessible name. */
    keyshortcuts?: string;
    separator?: boolean;
    run: (origin?: Point) => void;
}
/** One projection: registry -> ordered rows with localized labels, shortcut hints and group dividers. */
export function menuRows(commands: DiffusionCommand[], context: CommandContext, sections: string[][], platform: Platform): MenuRow[] {
    const rows: MenuRow[] = [];
    for (const [index, section] of sections.entries()) {
        let first = true;
        for (const id of section) {
            const command = commands.find(candidate => candidate.id === id);
            if (!command || !commandAvailable(command, context))
                continue;
            const label = t(command.label);
            const hint = command.shortcuts?.[0] ? shortcutLabel(command.shortcuts[0], platform) : undefined;
            rows.push({ id, label, hint: hint === label ? undefined : hint, keyshortcuts: command.shortcuts?.[0] ? ariaShortcut(command.shortcuts[0], platform) : undefined, separator: first && index > 0 && rows.length > 0, run: origin => command.run(context, origin) });
            first = false;
        }
    }
    return rows;
}

/** Contextual projection with intent labels supplied by the centralized action model. */
export function contextualRows(commands: DiffusionCommand[], context: CommandContext, actions: ContextualAction[], platform: Platform): MenuRow[] {
    return actions.flatMap(action => {
        const command = commands.find(candidate => candidate.id === action.id);
        if (!command || !commandAvailable(command, context)) return [];
        const label = t(action.label);
        const hint = command.shortcuts?.[0] ? shortcutLabel(command.shortcuts[0], platform) : undefined;
        return [{
            id: action.id,
            label,
            description: t(action.description),
            hint: hint === label ? undefined : hint,
            keyshortcuts: command.shortcuts?.[0] ? ariaShortcut(command.shortcuts[0], platform) : undefined,
            run: (origin?: Point) => command.run(context, origin),
        } satisfies MenuRow];
    });
}

/** Consecutive group runs, preserving contextual priority order in the palette. */
export function groupRuns(commands: DiffusionCommand[]): {
    group: CommandGroup;
    commands: DiffusionCommand[];
}[] {
    const runs: {
        group: CommandGroup;
        commands: DiffusionCommand[];
    }[] = [];
    for (const command of commands) {
        const last = runs.at(-1);
        if (last && last.group === command.group)
            last.commands.push(command);
        else
            runs.push({ group: command.group, commands: [command] });
    }
    return runs;
}
