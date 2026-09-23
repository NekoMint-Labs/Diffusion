import { t as msg } from '../../shared/i18n.ts';
import type { DiffusionCommand } from '../commands/types.ts';
import type { Platform } from '../commands/shortcuts.ts';
import { Surface } from './Surface.tsx';
import { ShortcutReference } from './ShortcutReference.tsx';
/** Shortcut reference derived from the shared registry, so it can never drift from real behavior. */
export function ShortcutsSurface({ commands, platform, onClose }: {
    commands: DiffusionCommand[];
    platform: Platform;
    onClose: () => void;
}) {
    return <Surface title={msg('Keyboard Shortcuts')} subtitle={msg('Every shortcut is one command')} onClose={onClose}>
        <ShortcutReference commands={commands} platform={platform}/>
    </Surface>;
}
