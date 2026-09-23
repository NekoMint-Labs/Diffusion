import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useUI } from '../store.ts';
import { isGlobalModal } from '../transient.ts';
import { isComposing, matchesShortcut } from '../commands/shortcuts.ts';
import { commandAvailable, type CommandContext, type DiffusionCommand } from '../commands/types.ts';

/** One keyboard router over the shared command registry.
 * Escape closes exactly one transient owner, in the established ownership order.
 * Text editing keeps normal typing; IME composition never triggers a command.
 *
 * The window listener is wired with the commit, not after paint. The DOM is interactive as soon
 * as React commits it, so a key press delivered before a passive effect flushes would be dropped:
 * a user pressing a shortcut as the Field appears would see nothing happen. Measured before this
 * change: one lost first key press in thirty loaded boots (v0.3.2 record, e2e section).
 */
export function useWorkspaceKeyboard({ commands, context, speak, closeSurface, closeMenu, onExitSpeak }: {
    commands: DiffusionCommand[];
    context: CommandContext;
    speak: RefObject<HTMLTextAreaElement | null>;
    closeSurface: () => void;
    closeMenu: () => void;
    onExitSpeak: () => void;
}) {
    const latest = useRef({ commands, context, closeSurface, closeMenu, onExitSpeak });
    latest.current = { commands, context, closeSurface, closeMenu, onExitSpeak };
    useLayoutEffect(() => {
        const handle = (event: KeyboardEvent) => {
            if (event.defaultPrevented || isComposing(event))
                return;
            const target = event.target instanceof HTMLElement ? event.target : null;
            const typing = Boolean(target?.closest('input,textarea,select,[contenteditable="true"]'));
            const state = useUI.getState();
            if (event.key === 'Escape') {
                event.preventDefault();
                // Usually consumed by Floating UI. This fallback has the same priority.
                if (state.menu)
                    latest.current.closeMenu();
                else if (state.surface !== 'none')
                    latest.current.closeSurface();
                else if (state.editing)
                    state.patch({ editing: null });
                else if (state.carry.length)
                    state.patch({ carry: [] });
                else if (state.speakFocused) {
                    latest.current.onExitSpeak();
                    speak.current?.blur();
                }
                else
                    state.patch({ selection: [] });
                return;
            }
            if (state.dragging)
                return;
            const owned = Boolean(state.menu) || isGlobalModal(state.surface) || Boolean(target?.closest('[data-surface]'));
            const command = latest.current.commands.find(candidate => Boolean(candidate.shortcuts?.some(shortcut => matchesShortcut(shortcut, event)))
                && commandAvailable(candidate, latest.current.context)
                // Navigation commands may supersede an open menu or modal; content edits may not.
                && (candidate.global || (!typing && !owned)));
            if (!command)
                return;
            event.preventDefault();
            command.run(latest.current.context);
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [speak]);
}
