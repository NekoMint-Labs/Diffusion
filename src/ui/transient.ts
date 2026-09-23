import type { Point } from '../core/model.ts';
/** Ephemeral presentation state only. Never persisted into the Field. */
export type Surface = 'none' | 'thread' | 'thread-focus' | 'find' | 'history' | 'crystal' | 'source' | 'settings' | 'diffuse' | 'fork' | 'evidence' | 'relation' | 'region' | 'action-preview' | 'organize' | 'handoff' | 'restore' | 'help' | 'import' | 'palette' | 'shortcuts' | 'fields';
/** Which command set a menu presents. Semantics stay in the shared registry. */
export type MenuScope = 'global' | 'field' | 'thought' | 'blank';
export interface MenuTarget {
    /** Element the menu belongs to; null when the user pointed at empty space. */
    anchor: HTMLElement | null;
    /** Screen position for pointer menus. */
    point?: Point;
    /** Field coordinate this invocation came from, when the user actually pointed at one. */
    world?: Point;
    scope: MenuScope;
    /** Open only the secondary action panel, e.g. from the Scope Hub ellipsis. */
    mode?: 'root' | 'secondary';
}
export interface TransientState {
    surface: Surface;
    menu: MenuTarget | null;
    transientEpoch: number;
}
export const isGlobalModal = (surface: Surface): boolean =>
    ['settings', 'import', 'restore', 'help', 'thread-focus', 'palette', 'shortcuts', 'fields'].includes(surface);

/** Every entry point, including direct surface patches, obeys the same invariant.
 * Opening a menu dismisses the prior surface; opening a surface dismisses menus.
 * Epochs invalidate deferred focus work from an owner that has been replaced.
 */
export function transientPatch<T extends Partial<TransientState>>(state: TransientState, patch: T): T & Partial<TransientState> {
    const next: T & Partial<TransientState> = { ...patch };
    if (patch.menu) next.surface = 'none';
    else if (patch.surface !== undefined) next.menu = null;
    const surface = next.surface ?? state.surface;
    const menu = next.menu === undefined ? state.menu : next.menu;
    if (surface !== state.surface || menu !== state.menu) next.transientEpoch = state.transientEpoch + 1;
    return next;
}

export function mayRestoreFocus(state: TransientState, epoch: number): boolean {
    return state.transientEpoch === epoch && !state.menu && state.surface === 'none';
}
