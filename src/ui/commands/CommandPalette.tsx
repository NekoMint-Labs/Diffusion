import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { t } from '../../shared/i18n.ts';
import { surfaceTransition } from '../motion.ts';
import { commandGroupLabel, groupRuns, paletteCommands } from './compose.ts';
import { ariaShortcut, isComposing, shortcutLabel, type Platform } from './shortcuts.ts';
import type { CommandContext, DiffusionCommand } from './types.ts';
/** Keyboard-first, localized, grouped and contextually ordered. One presentation of the shared registry. */
export function CommandPalette({ commands, context, platform, onClose }: {
    commands: DiffusionCommand[];
    context: CommandContext;
    platform: Platform;
    onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const input = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();
    const matches = useMemo(() => paletteCommands(commands, context, query), [commands, context, query]);
    const runs = useMemo(() => groupRuns(matches), [matches]);
    const { refs, context: floating } = useFloating({ open: true, onOpenChange: open => { if (!open)
            onClose(); }, strategy: 'fixed' });
    const dismiss = useDismiss(floating);
    const role = useRole(floating, { role: 'dialog' });
    const { getFloatingProps } = useInteractions([dismiss, role]);
    useEffect(() => setActive(0), [query]);
    useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active, matches.length]);
    function move(delta: number) {
        if (!matches.length)
            return;
        setActive(current => (current + delta + matches.length) % matches.length);
    }
    function run(command: DiffusionCommand) {
        onClose();
        command.run(context);
    }
    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (isComposing(event.nativeEvent))
            return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            move(event.key === 'ArrowDown' ? 1 : -1);
        }
        else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            setActive(event.key === 'Home' ? 0 : Math.max(0, matches.length - 1));
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            const command = matches[active];
            if (command)
                run(command);
        }
    }
    let index = -1;
    return <FloatingPortal>
        <div className="surface-input-shield" aria-hidden="true" data-testid="surface-input-shield"/>
        <FloatingFocusManager context={floating} modal initialFocus={input} returnFocus={false}>
            <motion.div ref={refs.setFloating} className="command-palette" data-surface="true" data-testid="command-palette" {...getFloatingProps({ 'aria-label': t('Command Palette') })} initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .994, y: reduced ? 0 : -3 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={surfaceTransition(Boolean(reduced))}>
                <label className="sr-only" htmlFor="command-palette-input">{t('Command Palette')}</label>
                <input ref={input} id="command-palette-input" data-autofocus="true" role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-controls="command-palette-list" aria-activedescendant={matches[active] ? `command-option-${matches[active].id}` : undefined} autoComplete="off" spellCheck={false} placeholder={t('Type a command...')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}/>
                {context.selection.length > 1 && <p className="command-palette-scope">{t('{count} thoughts', { count: context.selection.length })}</p>}
                <div ref={list} id="command-palette-list" role="listbox" aria-label={t('Commands')} className="command-palette-list">
                    {runs.map(runGroup => <div className="command-palette-group" key={runGroup.group} role="group" aria-label={t(commandGroupLabel[runGroup.group])}>
                        <p aria-hidden="true" className="command-palette-heading">{t(commandGroupLabel[runGroup.group])}</p>
                        {runGroup.commands.map(command => {
                            index += 1;
                            const position = index;
                            return <button key={command.id} id={`command-option-${command.id}`} data-command={command.id} type="button" role="option" aria-selected={position === active} aria-keyshortcuts={command.shortcuts?.[0] ? ariaShortcut(command.shortcuts[0], platform) : undefined} tabIndex={-1} data-active={position === active || undefined} onPointerMove={() => setActive(position)} onClick={() => run(command)}>
                                <span>{t(command.label)}</span>
                                {command.shortcuts?.[0] && <kbd aria-hidden="true">{shortcutLabel(command.shortcuts[0], platform)}</kbd>}
                            </button>;
                        })}
                    </div>)}
                </div>
                {!matches.length && <p className="command-palette-empty" role="status">{t('No matching command.')}</p>}
                <p className="command-palette-hint">{t('Enter to run. Escape to close.')}</p>
            </motion.div>
        </FloatingFocusManager>
    </FloatingPortal>;
}
