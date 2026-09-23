import { t as msg } from '../../shared/i18n.ts';
import { useCallback, useLayoutEffect, useRef, type ReactNode } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole, offset, flip, shift } from '@floating-ui/react';
import type { Point } from '../../core/model.ts';
import { useUI } from '../store.ts';
import { isGlobalModal } from '../transient.ts';
import { contentTransition, layoutTransition, recedeTransition } from '../motion.ts';
import { surfaceMotionRoles, type SurfaceLevel } from './surfaceMotion.ts';
import { Button } from '../primitives/Button.tsx';
export type { SurfaceLevel } from './surfaceMotion.ts';
/** One close affordance for every surface: same glyph, same placement, same states.
 * The accessible name stays "Return to Field" so screen readers describe the destination,
 * not the widget; the shortcut hint is decorative because Escape is routed globally.
 */
export function SurfaceClose({ onClose }: {
    onClose: () => void;
}) {
    return <Button variant="ghost" size="sm" className="surface-close" aria-label={msg('Return to Field')} title={msg('Return to Field')} onClick={onClose}>
        <span aria-hidden="true" className="surface-close-mark">&#10005;</span>
        <kbd aria-hidden="true" className="surface-close-hint">{msg('Esc')}</kbd>
    </Button>;
}
export function Surface({ title, subtitle, level = 'split', anchor, onClose, children, actions, className, sharedLayoutId }: {
    title: string;
    subtitle?: string;
    level?: SurfaceLevel;
    anchor?: Point;
    onClose: () => void;
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
    sharedLayoutId?: string;
}) {
    const reduced = useReducedMotion();
    /** While a surface recedes it is a visual echo only: it leaves the accessibility tree and
     * the interaction tree immediately, so two owners can never both claim the same dialog. */
    const present = useIsPresent();
    // A receding instance keeps the owner/epoch it mounted with. Reading the live owner here let an
    // outgoing Import surface briefly impersonate Restore and dismiss its successor.
    const owner = useRef(useUI.getState().surface).current;
    const epoch = useRef(useUI.getState().transientEpoch).current;
    const modal = isGlobalModal(owner);
    const initialFocus = useRef<HTMLElement | null>(null);
    const { refs, floatingStyles, context, update, placement } = useFloating({
        open: true,
        onOpenChange: open => {
            // A receding echo is not an owner, so it may not dismiss one. `present` is the same
            // signal that already takes this element out of the accessibility tree; without it, an
            // exiting place whose floating dismiss is still listening would be handed the
            // *successor's* name by the store subscription above and close the place that replaced
            // it, on the first click inside that place.
            if (open || !present)
                return;
            const current = useUI.getState();
            if (current.surface === owner && current.transientEpoch === epoch)
                onClose();
        },
        placement: 'right-start', strategy: 'fixed', transform: false,
        middleware: [offset(18), flip(), shift({ padding: 24 })],
    });
    useLayoutEffect(() => {
        if (anchor) {
            refs.setPositionReference({ getBoundingClientRect: () => new DOMRect(anchor.x, anchor.y, 1, 1) });
            void update();
        }
    }, [anchor?.x, anchor?.y, refs, update]);
    const setFloating = useCallback((element: HTMLElement | null) => {
        refs.setFloating(element);
        initialFocus.current = element?.querySelector<HTMLElement>('[data-autofocus], input:not([type="file"]), textarea, select, [role="combobox"]') ?? element;
    }, [refs]);
    const dismiss = useDismiss(context, { outsidePress: modal, outsidePressEvent: 'click' });
    const role = useRole(context, { role: 'dialog' });
    const { getFloatingProps } = useInteractions([dismiss, role]);
    const trapTab = (event: React.KeyboardEvent<HTMLElement>) => {
        if (!modal || event.key !== 'Tab')
            return;
        // Only things the browser can actually reach count as boundaries. A subtree that is
        // `hidden` or `inert` (an inactive tab panel, a receding echo) is matched by the selector
        // but skipped by the browser, so counting it would let Tab walk straight out of the place.
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')).filter(element => element.tabIndex >= 0 && !element.closest('[hidden],[inert]'));
        const index = tabs.indexOf(document.activeElement as HTMLElement);
        if (index < 0 || (event.shiftKey ? index !== 0 : index !== tabs.length - 1))
            return;
        event.preventDefault();
        tabs[event.shiftKey ? tabs.length - 1 : 0]?.focus();
    };
    const { initial: initialMotion, animate, exit: exitMotion, transition, transformOrigin } = surfaceMotionRoles({ level, placement, anchored: Boolean(anchor), reduced: Boolean(reduced), sharedLayout: Boolean(sharedLayoutId) });
    const classes = `surface ${level}${className ? ` ${className}` : ''}${sharedLayoutId ? ' shared-layout-host' : ''}`;
    const content = <>
        <header className="surface-header"><div className="surface-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
            <SurfaceClose onClose={onClose}/>
        </header>
        {actions && <div className="surface-actions">{actions}</div>}
        <div className="surface-body">{children}</div>
    </>;
    return <FloatingPortal>
        {/* Transparent, temporary input ownership, not a visual Focus overlay.
            A place that owns input also dims what it covers, so depth is legible.
            Dismiss on click (not pointerdown) so the whole gesture stays here. */}
        {modal && <motion.div className="surface-input-shield" aria-hidden="true" data-testid="surface-input-shield" data-scrim={level} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={recedeTransition(!!reduced)}/>}
        <FloatingFocusManager context={context} disabled={!present} modal={modal} initialFocus={initialFocus} returnFocus={false} closeOnFocusOut={false}>
            <motion.aside ref={setFloating} tabIndex={-1} data-surface="true" data-level={level} data-global-owner={modal && present ? owner : undefined} className={classes} {...getFloatingProps({ 'aria-label': title, 'aria-modal': modal || undefined })} role={present ? 'dialog' : undefined} inert={present ? undefined : true} aria-hidden={present ? undefined : true} onKeyDownCapture={trapTab} style={{ ...(level === 'anchored' && anchor ? { ...floatingStyles, right: 'auto', bottom: 'auto' } : {}), transformOrigin }} initial={initialMotion} animate={animate} exit={exitMotion} transition={transition}>
                {sharedLayoutId ? <>
                    <motion.div aria-hidden="true" className="surface-shared-shell" layoutId={sharedLayoutId} transition={{ layout: layoutTransition(!!reduced) }}/>
                    <motion.div className="surface-content" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 3 }} animate={{ opacity: 1, y: 0 }} transition={contentTransition(!!reduced)}>{content}</motion.div>
                </> : content}
            </motion.aside>
        </FloatingFocusManager>
    </FloatingPortal>;
}
