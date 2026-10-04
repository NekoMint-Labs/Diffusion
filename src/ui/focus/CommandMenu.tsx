import type React from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { Menu } from '@base-ui/react/menu';
import { t } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import type { MenuRow } from '../commands/compose.ts';
import { EXIT_UNOWNED, GLOBAL_TRANSIENT_SHELL_LAYOUT_ID, layoutTransition, recedeTransition, surfaceTransition } from '../motion.ts';

const MORE_HOVER_DELAY = 160;
// A tall submenu can put the destination well below More. Let diagonal travel finish
// before Base UI's hover close commits; click pinning and explicit dismissal stay separate.
const MORE_CLOSE_DELAY = 400;

/** Base UI owns each popup's positioning, submenu pointer travel and keyboard focus.
 * Click pins the hover-open submenu; the existing transient owner closes the entire menu.
 * Commands remain projections of the shared command registry. */
export function CommandMenu({ anchor, point, rows, moreRows = [], scope, note, placement = 'bottom-end', onClose }: {
    anchor?: HTMLElement | null;
    point?: Point;
    rows: MenuRow[];
    moreRows?: MenuRow[];
    scope: 'global' | 'field' | 'thought' | 'blank';
    note?: string;
    placement?: 'bottom-end' | 'bottom-start' | 'right-start';
    onClose: () => void;
}) {
    const reduced = useReducedMotion();
    const present = useIsPresent();
    const [secondaryOpen, setSecondaryOpen] = useState(false);
    const [pinned, setPinned] = useState(false);
    const moreButton = useRef<HTMLElement | null>(null);
    const secondaryPopup = useRef<HTMLDivElement | null>(null);
    useLayoutEffect(() => {
        if (!present) return;
        setSecondaryOpen(false);
        setPinned(false);
    }, [present, anchor, point?.x, point?.y]);

    const anchorProp = useMemo(() => {
        if (anchor) {
            // A successor surface can hide the strip while this menu is still exiting.
            // Keep its last real rectangle throughout that transition instead of jumping to (0,0).
            let last = anchor.getBoundingClientRect();
            return () => ({ getBoundingClientRect: () => {
                const next = anchor.getBoundingClientRect();
                if (next.width > 0 && next.height > 0) last = next;
                return last;
            } });
        }
        if (point) return () => ({ getBoundingClientRect: () => new DOMRect(point.x, point.y, 1, 1) });
        return null;
    }, [anchor, point?.x, point?.y]);
    const activate = (row: MenuRow) => (event: React.MouseEvent<HTMLElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onClose();
        row.run({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    };
    const sharedShell = scope === 'global' ? GLOBAL_TRANSIENT_SHELL_LAYOUT_ID : undefined;
    const side = placement === 'right-start' ? 'right' : 'bottom';
    const align = placement === 'bottom-end' ? 'end' : 'start';
    const label = scope === 'global' ? 'Application actions' : scope === 'field' ? 'Field actions' : 'Thought actions';

    return <Menu.Root open={present} modal={false} onOpenChange={open => { if (!open && present) onClose(); }} loopFocus>
        {/* Register the root in Base UI's floating tree. Actual openers and return focus are
            coordinated by Workspace; virtual pointer anchors still position the popup. */}
        <Menu.Trigger hidden tabIndex={-1} aria-hidden="true"/>
        <Menu.Portal>
            <Menu.Positioner anchor={anchorProp} className="command-menu-positioner" positionMethod="fixed"
                side={side} align={align} sideOffset={placement === 'right-start' ? 3 : 8}
                collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'end' }} collisionPadding={16}>
                <Menu.Popup finalFocus={false} render={(props, state) => <motion.div {...(props as React.ComponentProps<typeof motion.div>)} role={present ? 'menu' : undefined} aria-hidden={present ? undefined : true} inert={present ? undefined : true}
                    data-surface="true" data-testid={present ? `${scope}-menu` : undefined} data-side={state.side}
                    id={`${scope}-command-menu`} aria-label={t(label)}
                    className="command-menu" style={{ ...props.style, transformOrigin: 'var(--transform-origin)', pointerEvents: present ? 'auto' : 'none' }}
                    initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .986, y: reduced ? 0 : -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ ...EXIT_UNOWNED, scale: reduced ? 1 : .985, y: reduced ? 0 : -2, transition: recedeTransition(Boolean(reduced)) }}
                    transition={surfaceTransition(Boolean(reduced))}
                    onKeyDownCapture={event => {
                        if (event.key === 'Tab') {
                            event.preventDefault();
                            onClose();
                            return;
                        }
                        if (event.key === 'ArrowRight' && event.target instanceof HTMLElement && event.target.closest('[data-command="more"]')) {
                            // The controlled child may already be hover-open; entering it still
                            // transfers focus, including when viewport collision flips its side.
                            event.preventDefault();
                            event.stopPropagation();
                            setSecondaryOpen(true);
                            requestAnimationFrame(() => secondaryPopup.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                            return;
                        }
                        if ((event.key === 'ArrowLeft' || event.key === 'Escape') && secondaryOpen && event.target instanceof HTMLElement && event.target.closest('[data-secondary-panel]')) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSecondaryOpen(false);
                            setPinned(false);
                            requestAnimationFrame(() => moreButton.current?.focus());
                        }
                    }}>
                    <motion.div aria-hidden="true" className="command-menu-shared-shell" layoutId={sharedShell} transition={{ layout: layoutTransition(Boolean(reduced)) }}/>
                    <div className="command-menu-columns">
                        <div className="command-menu-content" data-primary-panel="true">
                            {note && <p className="command-menu-note">{note}</p>}
                            {rows.map(row => <Menu.Item key={row.id} className="command-menu-item" data-command={row.id} data-separator={row.separator || undefined} aria-keyshortcuts={row.keyshortcuts} label={row.label} onClick={activate(row)}>
                                <span className="command-menu-copy"><span>{row.label}</span>{row.description && <small>{row.description}</small>}</span>{row.hint && <kbd aria-hidden="true">{row.hint}</kbd>}
                            </Menu.Item>)}
                            {moreRows.length > 0 && <Menu.SubmenuRoot open={secondaryOpen} onOpenChange={(open, details) => {
                                if (!open && pinned && String(details.reason).includes('hover')) { details.cancel(); return; }
                                setSecondaryOpen(open); if (!open) setPinned(false);
                            }}>
                                <Menu.SubmenuTrigger ref={moreButton} className="command-menu-item command-menu-more" data-command="more" label={t('More')} delay={MORE_HOVER_DELAY} closeDelay={MORE_CLOSE_DELAY} onClick={event => { setPinned(true); setSecondaryOpen(true); if (event.detail === 0) requestAnimationFrame(() => secondaryPopup.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()); }}>
                                    <span>{t('More')}</span><span className="command-menu-caret" aria-hidden="true"/>
                                </Menu.SubmenuTrigger>
                                <Menu.Portal><Menu.Positioner side="right" align="start" sideOffset={3} collisionPadding={16} collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'end' }} className="command-menu-positioner" positionMethod="fixed">
                                    <Menu.Popup ref={secondaryPopup} className="command-menu-content command-menu-secondary" data-secondary-panel="true" data-testid={`${scope}-more-menu`} aria-label={t(scope === 'field' ? 'Field actions' : 'More thought actions')}>
                                        {moreRows.map(row => <Menu.Item key={row.id} className="command-menu-item" data-command={row.id} data-separator={row.separator || undefined} label={row.label} onClick={activate(row)}>
                                            <span className="command-menu-copy"><span>{row.label}</span>{row.description && <small>{row.description}</small>}</span>{row.hint && <kbd aria-hidden="true">{row.hint}</kbd>}
                                        </Menu.Item>)}
                                    </Menu.Popup>
                                </Menu.Positioner></Menu.Portal>
                            </Menu.SubmenuRoot>}
                        </div>
                    </div>
                </motion.div>}/>
            </Menu.Positioner>
        </Menu.Portal>
    </Menu.Root>;
}
