import { t as msg } from '../../shared/i18n.ts';
import { commandGroupLabel } from '../commands/compose.ts';
import { shortcutLabel, type Platform } from '../commands/shortcuts.ts';
import type { CommandGroup, DiffusionCommand } from '../commands/types.ts';

/** One registry, one visible reference: the Shortcuts surface and any other listing render the same
 * rows, so a shortcut can never be documented in one place and wrong in another. The rows always
 * render the command's own registry shortcuts — there is no per-device override. */
export function ShortcutReference({ commands, platform, grouped }: {
    commands: DiffusionCommand[];
    platform: Platform;
    grouped?: boolean;
}) {
    const registered = commands.filter(command => command.shortcuts?.length);
    const readRow = (command: DiffusionCommand) => <div key={command.id} data-command={command.id}>
        <dt>{msg(command.label)}</dt>
        <dd>{command.shortcuts!.map(shortcut => <kbd key={shortcutLabel(shortcut, platform)}>{shortcutLabel(shortcut, platform)}</kbd>)}</dd>
    </div>;
    const list = (items: DiffusionCommand[]) => <dl className="shortcut-list">{items.map(readRow)}</dl>;
    if (!grouped)
        return list(registered);
    const groups = [...new Set(registered.map(command => command.group))] as CommandGroup[];
    const sections = groups.map(group => <section key={group} className="settings-shortcut-group">
        <h4>{msg(commandGroupLabel[group])}</h4>
        {list(registered.filter(command => command.group === group))}
    </section>);
    return <>{sections}</>;
}
