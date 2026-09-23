import type React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { Menu } from '@base-ui/react/menu';
import { t } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import type { MenuRow } from '../commands/compose.ts';
import { EXIT_UNOWNED, GLOBAL_TRANSIENT_SHELL_LAYOUT_ID, layoutTransition, recedeTransition, surfaceTransition } from '../motion.ts';

const MORE_HOVER_DELAY = 160;

/** One coordinated popup owns both the primary menu and its secondary column.
 *
 * The important boundary is pointer ownership: More never portals a submenu across a gap, and it
 * never replaces the primary choices. Hover reveals the secondary column after a short deliberate
 * delay; click/keyboard pins it until the popup itself is dismissed. The command registry still
 * owns semantics — this component only owns presentation and ordinary menu mechanics.
 */
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
    const secondary = useRef<HTMLDivElement>(null);
    const moreButton = useRef<HTMLElement | null>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelMoreHover = () => {
        if (!hoverTimer.current) return;
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
    };
    const openSecondary = (pin = false, focus = false) => {
        cancelMoreHover();
        setSecondaryOpen(true);
        if (pin) setPinned(true);
        if (focus) requestAnimationFrame(() => secondary.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    };
    const scheduleMoreHover = () => {
        cancelMoreHover();
        hoverTimer.current = setTimeout(() => {
            setSecondaryOpen(true);
            hoverTimer.current = null;
        }, MORE_HOVER_DELAY);
    };
    useEffect(() => () => cancelMoreHover(), []);
    useLayoutEffect(() => {
        if (!present) return;
        setSecondaryOpen(false);
        setPinned(false);
    }, [present, anchor, point?.x, point?.y]);

    const anchorProp = useMemo(() => {
        if (anchor) return anchor;
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
        <Menu.Portal>
            <Menu.Positioner anchor={anchorProp} className="command-menu-positioner" positionMethod="fixed"
                side={side} align={align} sideOffset={placement === 'right-start' ? 3 : 8}
                style={{ pointerEvents: 'none' }}
                collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' }} collisionPadding={16}>
                <Menu.Popup finalFocus={false} render={(props, state) => <motion.div {...(props as React.ComponentProps<typeof motion.div>)} role={present ? 'menu' : undefined} aria-hidden={present ? undefined : true} inert={present ? undefined : true}
                    data-surface="true" data-testid={present ? `${scope}-menu` : undefined} data-side={state.side}
                    id={`${scope}-command-menu`} aria-label={t(label)}
                    className="command-menu" style={{ ...props.style, transformOrigin: 'var(--transform-origin)', pointerEvents: present ? 'auto' : 'none' }}
                    initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .986, y: reduced ? 0 : -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ ...EXIT_UNOWNED, scale: reduced ? 1 : .985, y: reduced ? 0 : -2, transition: recedeTransition(Boolean(reduced)) }}
                    transition={surfaceTransition(Boolean(reduced))}
                    onPointerLeave={() => { cancelMoreHover(); if (!pinned) setSecondaryOpen(false); }}
                    onKeyDownCapture={event => {
                        if (event.key === 'Tab') {
                            event.preventDefault();
                            onClose();
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
                            {moreRows.length > 0 && <Menu.Item key="more" className="command-menu-item command-menu-more" data-command="more" closeOnClick={false} label={t('More')}
                                aria-haspopup="menu" aria-expanded={secondaryOpen}
                                ref={element => { moreButton.current = element; }}
                                onPointerEnter={scheduleMoreHover} onPointerLeave={cancelMoreHover}
                                onKeyDown={event => {
                                    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openSecondary(true, true);
                                    }
                                }}
                                onClick={() => openSecondary(true, true)}>
                                <span>{t('More')}</span><span className="command-menu-caret" aria-hidden="true"/>
                            </Menu.Item>}
                        </div>
                        {secondaryOpen && moreRows.length > 0 && <div ref={secondary} className="command-menu-content command-menu-secondary" data-secondary-panel="true" data-testid={`${scope}-more-menu`} aria-label={t(scope === 'field' ? 'Field actions' : 'More thought actions')}>
                            {moreRows.map(row => <Menu.Item key={row.id} className="command-menu-item" data-command={row.id} data-separator={row.separator || undefined} aria-keyshortcuts={row.keyshortcuts} label={row.label} onClick={activate(row)}>
                                <span className="command-menu-copy"><span>{row.label}</span>{row.description && <small>{row.description}</small>}</span>{row.hint && <kbd aria-hidden="true">{row.hint}</kbd>}
                            </Menu.Item>)}
                        </div>}
                    </div>
                </motion.div>}/>
            </Menu.Positioner>
        </Menu.Portal>
    </Menu.Root>;
}
