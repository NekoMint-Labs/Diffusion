import type { Shortcut } from './types.ts';
export type Platform = 'mac' | 'other';
export function detectPlatform(): Platform {
    if (typeof navigator === 'undefined')
        return 'other';
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? 'mac' : 'other';
}
/** Platform-appropriate label. Shared UI never hardcodes a Windows or macOS spelling. */
export function shortcutLabel(shortcut: Shortcut, platform: Platform): string {
    const parts: string[] = [];
    if (shortcut.mod)
        parts.push(platform === 'mac' ? '\u2318' : 'Ctrl');
    if (shortcut.shift)
        parts.push(platform === 'mac' ? '\u21e7' : 'Shift');
    if (shortcut.alt)
        parts.push(platform === 'mac' ? '\u2325' : 'Alt');
    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
    return parts.join(platform === 'mac' ? '' : '+');
}
/** Machine-readable shortcut for assistive technology; the visible kbd hint stays decorative. */
export function ariaShortcut(shortcut: Shortcut, platform: Platform): string {
    const parts: string[] = [];
    if (shortcut.mod)
        parts.push(platform === 'mac' ? 'Meta' : 'Control');
    if (shortcut.shift)
        parts.push('Shift');
    if (shortcut.alt)
        parts.push('Alt');
    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
    return parts.join('+');
}
/** Exact modifier match, so Ctrl+Shift+Z never resolves to Undo. Control is accepted on macOS too. */
export function matchesShortcut(shortcut: Shortcut, event: KeyboardEvent): boolean {
    return event.key.toLowerCase() === shortcut.key.toLowerCase()
        && (event.metaKey || event.ctrlKey) === Boolean(shortcut.mod)
        && event.shiftKey === Boolean(shortcut.shift)
        && event.altKey === Boolean(shortcut.alt);
}
/** IME composition must never be mistaken for a command. */
export const isComposing = (event: KeyboardEvent): boolean => event.isComposing || event.keyCode === 229;
