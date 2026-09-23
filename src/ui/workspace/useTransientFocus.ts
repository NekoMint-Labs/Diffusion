import { useEffect, useRef } from 'react';
import type { Point } from '../../core/model.ts';
import { useUI } from '../store.ts';
import { mayRestoreFocus, type MenuScope, type MenuTarget } from '../transient.ts';

/** Anything the browser can put focus on. Used to answer "what did the pointer actually choose?" */
const FOCUSABLE = '[tabindex],button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[contenteditable="true"]';

/** Focus returns only after a real dismissal, never during an owner handoff.
 * Floating focus managers explicitly delegate returnFocus to this coordinator.
 *
 * Focus also follows the *gesture*. A popup library swallows an outside pointer press so the
 * browser never focuses what was clicked, which would leave the user's new target unfocused while
 * the owner's trigger took it back. The coordinator therefore records the press that dismissed an
 * open menu and hands focus to that element instead: dismissing a menu must never move focus
 * somewhere the user did not click. A keyboard dismissal has no such gesture and still returns to
 * the opener.
 */
export function useTransientFocus(fallback: () => void) {
    const opener = useRef<HTMLElement | null>(null);
    const pressed = useRef<HTMLElement | null>(null);
    const frame = useRef(0);
    const menuOpen = useUI(state => state.menu !== null);
    useEffect(() => {
        if (!menuOpen)
            return;
        const record = (event: PointerEvent) => {
            const target = event.target instanceof HTMLElement ? event.target : null;
            pressed.current = target && !target.closest('[data-surface],[role="menu"]') ? target : null;
        };
        window.addEventListener('pointerdown', record, true);
        return () => window.removeEventListener('pointerdown', record, true);
    }, [menuOpen]);
    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    function capture() {
        const state = useUI.getState();
        if (state.menu) opener.current = state.menu.anchor;
        else if (state.surface === 'none') {
            const active = document.activeElement;
            // A command's anchor was already captured before its menu unmounted.
            if (active instanceof HTMLElement && active !== document.body && !active.closest('[role="menu"]')) opener.current = active;
        }
    }
    function restore(force = false) {
        cancelAnimationFrame(frame.current);
        const epoch = useUI.getState().transientEpoch;
        const target = opener.current;
        const gesture = pressed.current;
        pressed.current = null;
        frame.current = requestAnimationFrame(() => {
            if (!mayRestoreFocus(useUI.getState(), epoch)) return;
            // A pointer dismissal is the user choosing a new target: focus what they pressed. If
            // what they pressed cannot hold focus, fall through and let the ordinary rules decide.
            if (!force && gesture && gesture.isConnected) {
                const focusable = gesture.closest<HTMLElement>(FOCUSABLE);
                if (focusable) {
                    focusable.focus({ preventScroll: true });
                    return;
                }
            }
            const active = document.activeElement;
            // Outside-click/Tab must not steal focus from the user's new target. Focus that is
            // still inside the owner being dismissed (a menu, or a surface already receding as a
            // visual echo) is not a new target, so dismissing it must return focus here. The
            // receding owner has already lost `role` and `data-exiting` is not always present, so
            // `inert` is the marker that actually survives the exit.
            if (!force && active instanceof HTMLElement && active !== document.body && !active.closest('[role="menu"],[data-exiting],[inert]')) return;
            if (target?.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true });
            else fallback();
        });
    }
    function closeMenu(target: MenuTarget) {
        if (useUI.getState().menu !== target) return; // Ignore the old owner's callback.
        useUI.getState().patch({ menu: null });
        restore();
    }
    function openMenu(anchor: HTMLElement | null, scope: MenuScope, target: {
        point?: Point;
        world?: Point;
        mode?: 'root' | 'secondary';
    } = {}) {
        const state = useUI.getState();
        if (state.menu?.anchor === anchor && anchor !== null) {
            // Scope Hub's More can first open from intentional hover and then receive a click.
            // That click means "keep this open", not "toggle it closed". Secondary panels
            // therefore stay open when the same trigger asks for the same secondary owner again.
            if (state.menu.mode === 'secondary' && target.mode === 'secondary') return;
            closeMenu(state.menu);
            return;
        }
        capture();
        opener.current = anchor ?? opener.current;
        state.patch({ menu: { anchor, scope, ...target } });
    }
    return { capture, restore, closeMenu, openMenu };
}
